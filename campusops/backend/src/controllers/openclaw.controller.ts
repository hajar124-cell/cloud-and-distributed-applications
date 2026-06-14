import { Request, Response } from 'express';
import * as planningService from '../services/planning.service';
import * as paymentService from '../services/payment.service';
import * as notifService from '../services/notification.service';
import * as emailService from '../services/email.service';
import { sendTelegramNotification } from '../bots/telegram.bot';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

function verifyOpenClawSecret(req: Request): boolean {
  const secret = req.headers['x-openclaw-secret'];
  return secret === process.env.OPENCLAW_SECRET;
}

export async function webhookDailyPlanning(req: Request, res: Response) {
  if (!verifyOpenClawSecret(req)) return sendError(res, 'Secret invalide', 401);

  try {
    logger.info('[OpenClaw] Déclenchement: envoi planning du jour');
    const sessions = await planningService.getTodaySessionsForAllTeachers();
    const teachers = new Map<string, typeof sessions>();

    for (const session of sessions) {
      const tid = session.teacher.id;
      if (!teachers.has(tid)) teachers.set(tid, []);
      teachers.get(tid)!.push(session);
    }

    const results: string[] = [];
    for (const [, teacherSessions] of teachers) {
      const teacher = teacherSessions[0].teacher;
      const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

      if (teacher.email) {
        await emailService.sendDailyPlanningEmail(teacher, teacherSessions, dateLabel);
        results.push(`Email → ${teacher.email}`);
      }

      if (teacher.telegramChatId) {
        let text = `📅 *Planning du ${dateLabel}*\n\n`;
        for (const s of teacherSessions) {
          text += `🕐 ${s.startTime}–${s.endTime} | *${s.module.name}*\n`;
          text += `   👥 ${s.group.name}`;
          if (s.room) text += ` · 🏛 ${s.room.name}`;
          text += '\n\n';
        }
        await sendTelegramNotification(teacher.telegramChatId, text);
        results.push(`Telegram → ${teacher.firstName}`);
      }
    }

    return sendSuccess(res, { sent: results.length, results }, 'Planning envoyé');
  } catch (err) {
    logger.error('[OpenClaw] Erreur planning journalier', err as Error);
    return sendError(res, (err as Error).message, 500);
  }
}

export async function webhookPaymentReminders(req: Request, res: Response) {
  if (!verifyOpenClawSecret(req)) return sendError(res, 'Secret invalide', 401);

  try {
    logger.info('[OpenClaw] Déclenchement: rappels paiements en retard');
    const overdueList = await paymentService.getOverduePayments();
    let notified = 0;

    for (const payment of overdueList) {
      await notifService.notifyPaymentOverdue(payment.studentId, payment.label, payment.amount);
      if (payment.student?.email) {
        await emailService.sendPaymentAlert(payment.student.email, payment.label, payment.amount, payment.dueDate.toLocaleDateString('fr-FR'));
      }
      notified++;
    }

    return sendSuccess(res, { overdueCount: overdueList.length, notified }, 'Rappels envoyés');
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function webhookAbsenceAlert(req: Request, res: Response) {
  if (!verifyOpenClawSecret(req)) return sendError(res, 'Secret invalide', 401);

  try {
    const { studentId, sessionId, status } = req.body;
    logger.info(`[OpenClaw] Alerte absence: étudiant ${studentId}, session ${sessionId}`);

    if (status === 'ABSENT' || status === 'RETARD') {
      await notifService.createNotification(studentId, 'ABSENCE', 'Absence signalée', `Votre ${status === 'RETARD' ? 'retard' : 'absence'} a été enregistré(e).`);
    }

    return sendSuccess(res, null, 'Alerte absence traitée');
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getOpenClawStatus(_req: Request, res: Response) {
  return sendSuccess(res, {
    status: 'online',
    version: '1.0.0',
    webhooks: [
      { path: '/api/openclaw/daily-planning', description: 'Envoyer le planning du jour aux enseignants' },
      { path: '/api/openclaw/payment-reminders', description: 'Envoyer rappels paiements en retard' },
      { path: '/api/openclaw/absence-alert', description: 'Notifier un étudiant d\'une absence' },
    ],
    timestamp: new Date().toISOString(),
  });
}
