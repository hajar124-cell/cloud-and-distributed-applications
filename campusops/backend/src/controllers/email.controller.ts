import { Response } from 'express';
import { AuthRequest } from '../types';
import * as emailService from '../services/email.service';
import { sendSuccess, sendError } from '../utils/response';

export async function getLatestEmails(req: AuthRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const emails = await emailService.getLatestEmailsFromDB(limit);
    return sendSuccess(res, emails, `${emails.length} emails récupérés`);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function sendEmail(req: AuthRequest, res: Response) {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject) return sendError(res, 'Destinataire et sujet requis', 400);
    await emailService.sendEmail(to, subject, html || `<p>${text}</p>`);
    return sendSuccess(res, null, 'Email envoyé avec succès');
  } catch (err) {
    return sendError(res, `Erreur envoi email: ${(err as Error).message}`, 500);
  }
}

export async function syncEmails(req: AuthRequest, res: Response) {
  try {
    await emailService.syncEmailsToDb();
    return sendSuccess(res, null, 'Synchronisation email terminée');
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
