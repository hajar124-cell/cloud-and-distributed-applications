import { Response } from 'express';
import { AuthRequest } from '../types';
import * as planningService from '../services/planning.service';
import * as emailService from '../services/email.service';
import { sendTelegramNotification } from '../bots/telegram.bot';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export async function getToday(req: AuthRequest, res: Response) {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const sessions = await planningService.getSessionsByDate(date);
  return sendSuccess(res, sessions);
}

export async function getWeek(req: AuthRequest, res: Response) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const startDate = (req.query.startDate as string) || monday.toISOString().split('T')[0];
  const sessions = await planningService.getSessionsByWeek(startDate);
  return sendSuccess(res, sessions);
}

export async function getByStudent(req: AuthRequest, res: Response) {
  const studentId = req.params.studentId || req.user!.userId;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const sessions = await planningService.getSessionsByStudent(studentId, startDate, endDate);
  return sendSuccess(res, sessions);
}

export async function getByTeacher(req: AuthRequest, res: Response) {
  const teacherId = req.params.teacherId || req.user!.userId;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const sessions = await planningService.getSessionsByTeacher(teacherId, startDate, endDate);
  return sendSuccess(res, sessions);
}

export async function createSession(req: AuthRequest, res: Response) {
  try {
    const session = await planningService.createSession(req.body);
    notifyTeacherNewSession(session).catch(() => {});
    return sendSuccess(res, session, 'Séance créée', 201);
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

async function notifyTeacherNewSession(session: Awaited<ReturnType<typeof planningService.createSession>>) {
  const teacher = session.teacher as { email?: string; firstName: string; telegramChatId?: string | null };
  const dateStr = new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (teacher.email) {
    emailService.sendNewSessionEmail(teacher as { email: string; firstName: string }, session).catch(() => {});
  }

  if (teacher.telegramChatId) {
    const text =
      `📅 *Nouvelle séance planifiée*\n\n` +
      `📚 *${session.module.name}*\n` +
      `🗓 ${dateStr}\n` +
      `🕐 ${session.startTime} – ${session.endTime}\n` +
      `👥 Groupe : ${session.group.name}\n` +
      `🏛 Salle : ${session.room?.name || 'Non définie'}\n` +
      `📝 Type : ${session.type}`;
    sendTelegramNotification(teacher.telegramChatId, text).catch(() => {});
  }
}

export async function updateSession(req: AuthRequest, res: Response) {
  try {
    const session = await planningService.updateSession(req.params.id, req.body);
    return sendSuccess(res, session, 'Séance mise à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function deleteSession(req: AuthRequest, res: Response) {
  try {
    await planningService.deleteSession(req.params.id);
    return sendSuccess(res, null, 'Séance supprimée');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function sendPlanningEmail(req: AuthRequest, res: Response) {
  try {
    const teacher = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!teacher) return sendError(res, 'Utilisateur introuvable', 404);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const allSessions = await planningService.getSessionsByTeacher(req.user!.userId);
    const sessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
    const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    if (sessions.length === 0) {
      return sendSuccess(res, null, 'Aucun cours aujourd\'hui — aucun email envoyé');
    }

    await emailService.sendDailyPlanningEmail(teacher, sessions as Parameters<typeof emailService.sendDailyPlanningEmail>[1], dateLabel);

    if (teacher.telegramChatId) {
      let text = `📅 *Planning du ${dateLabel}*\n\n`;
      for (const s of sessions) {
        text += `🕐 ${s.startTime} – ${s.endTime}\n`;
        text += `📚 ${(s as { module: { name: string } }).module.name}\n`;
        text += `👥 ${(s as { group: { name: string } }).group.name}\n\n`;
      }
      sendTelegramNotification(teacher.telegramChatId, text).catch(() => {});
    }

    return sendSuccess(res, null, `Planning envoyé à ${teacher.email}`);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function exportPlanningCSV(req: AuthRequest, res: Response) {
  const { startDate, endDate, teacherId, groupId } = req.query as Record<string, string>;
  let sessions;
  if (teacherId) {
    sessions = await planningService.getSessionsByTeacher(teacherId, startDate, endDate);
  } else if (groupId) {
    sessions = await prisma.session.findMany({
      where: { groupId, ...(startDate ? { date: { gte: new Date(startDate), ...(endDate ? { lte: new Date(endDate) } : {}) } } : {}) },
      include: { module: true, teacher: { select: { firstName: true, lastName: true } }, group: true, room: true },
      orderBy: { date: 'asc' },
    });
  } else {
    sessions = await planningService.getSessionsByWeek(startDate || new Date().toISOString().split('T')[0]);
  }
  const header = 'Date,Horaire,Module,Enseignant,Groupe,Salle,Type\n';
  const rows = (sessions as Record<string, unknown>[]).map((s) => {
    const mod = s.module as { name: string };
    const teacher = s.teacher as { firstName?: string; lastName?: string } | null;
    const group = s.group as { name: string };
    const room = s.room as { name: string } | null;
    return [
      new Date(s.date as string).toLocaleDateString('fr-FR'),
      `${s.startTime}-${s.endTime}`,
      mod.name,
      teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
      group.name,
      room?.name || '',
      (s.type as string) || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  }).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="planning.csv"');
  res.send('﻿' + header + rows);
}

export async function getSessionStudents(req: AuthRequest, res: Response) {
  try {
    const students = await planningService.getSessionStudents(req.params.id);
    return sendSuccess(res, students);
  } catch (err) {
    return sendError(res, (err as Error).message, 404);
  }
}
