import { Response } from 'express';
import { AuthRequest } from '../types';
import * as absenceService from '../services/absence.service';
import * as notifService from '../services/notification.service';
import * as emailService from '../services/email.service';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export async function recordAbsences(req: AuthRequest, res: Response) {
  try {
    const { sessionId, records } = req.body;
    const result = await absenceService.recordAbsences(sessionId, records, req.user!.userId);

    // Notify each absent student
    for (const r of records) {
      if (r.status === 'ABSENT' || r.status === 'RETARD') {
        const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { module: true } });
        if (session) {
          const student = await prisma.user.findUnique({ where: { id: r.studentId } });
          await notifService.notifyAbsence(r.studentId, session.module.name, session.date.toLocaleDateString('fr-FR'));
          if (student?.email) {
            emailService.sendAbsenceNotification(student.email, session.module.name, session.date.toLocaleDateString('fr-FR')).catch(() => {});
          }
        }
      }
    }

    return sendSuccess(res, result, `${result.length} présences enregistrées`);
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function getStudentAbsences(req: AuthRequest, res: Response) {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  if (req.user!.role === 'ENSEIGNANT' && !req.params.studentId) {
    const absences = await absenceService.getAbsencesRecordedBy(req.user!.userId, startDate, endDate);
    return sendSuccess(res, absences);
  }
  const studentId = req.params.studentId || req.user!.userId;
  const absences = await absenceService.getAbsencesByStudent(studentId, startDate, endDate);
  return sendSuccess(res, absences);
}

export async function getGroupAbsences(req: AuthRequest, res: Response) {
  const { groupId } = req.params;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const absences = await absenceService.getAbsencesByGroup(groupId, startDate, endDate);
  return sendSuccess(res, absences);
}

export async function getAbsenceStats(req: AuthRequest, res: Response) {
  if (req.user!.role === 'ENSEIGNANT' && !req.params.studentId) {
    const stats = await absenceService.getAbsenceStatsForTeacher(req.user!.userId);
    return sendSuccess(res, stats);
  }
  const studentId = req.params.studentId || req.user!.userId;
  const stats = await absenceService.getAbsenceStats(studentId);
  return sendSuccess(res, stats);
}

export async function justifyAbsence(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { justification } = req.body;
    if (!justification?.trim()) return sendError(res, 'Justification requise', 400);

    const absence = await prisma.absence.findUnique({ where: { id }, include: { session: true } });
    if (!absence) return sendError(res, 'Absence introuvable', 404);

    const role = req.user!.role;
    if (role === 'ENSEIGNANT' && absence.session.teacherId !== req.user!.userId) {
      return sendError(res, 'Non autorisé : cette absence ne correspond pas à vos séances', 403);
    }
    if (role === 'ETUDIANT' && absence.studentId !== req.user!.userId) {
      return sendError(res, 'Non autorisé : vous ne pouvez justifier que vos propres absences', 403);
    }

    const result = await absenceService.justifyAbsence(id, justification.trim());
    return sendSuccess(res, result, 'Absence justifiée');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function exportAbsencesCSV(req: AuthRequest, res: Response) {
  const { groupId, studentId, startDate, endDate } = req.query as Record<string, string>;

  let absences;
  if (groupId) {
    absences = await absenceService.getAbsencesByGroup(groupId, startDate, endDate);
  } else {
    absences = await absenceService.getAbsencesByStudent(studentId || req.user!.userId, startDate, endDate);
  }

  const header = 'Étudiant,Email,Module,Date,Horaire,Statut,Justification\n';
  const rows = absences.map((a: Record<string, unknown>) => {
    const student = (a.student as { firstName?: string; lastName?: string; email?: string } | undefined);
    const session = a.session as { date: string; startTime: string; endTime: string; module: { name: string } };
    return [
      student ? `${student.firstName} ${student.lastName}` : '',
      student?.email || '',
      session.module.name,
      new Date(session.date).toLocaleDateString('fr-FR'),
      `${session.startTime}-${session.endTime}`,
      a.status,
      (a.justification as string | null) || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="absences.csv"');
  res.send('﻿' + header + rows);
}
