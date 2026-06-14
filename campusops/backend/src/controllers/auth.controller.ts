import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export const loginValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

export async function login(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 'Validation échouée', 400, errors.array().map((e) => e.msg));

  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, result, 'Connexion réussie');
  } catch (err) {
    return sendError(res, (err as Error).message, 401);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token requis', 400);
    const result = await authService.refresh(refreshToken);
    return sendSuccess(res, result, 'Token renouvelé');
  } catch (err) {
    return sendError(res, (err as Error).message, 401);
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    return sendSuccess(res, null, 'Déconnexion réussie');
  } catch {
    return sendSuccess(res, null, 'Déconnexion réussie');
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    return sendSuccess(res, profile, 'Profil récupéré');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    await authService.sendPasswordResetEmail(req.body.email);
    return sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé');
  } catch {
    return sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé');
  }
}

export async function resetPassword(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 'Validation échouée', 400, errors.array().map((e) => e.msg));

  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    return sendSuccess(res, null, 'Mot de passe réinitialisé avec succès');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token requis'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe min 8 caractères'),
];

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const { firstName, lastName, phone } = req.body;
    const updated = await authService.updateProfile(req.user!.userId, { firstName, lastName, phone });
    return sendSuccess(res, updated, 'Profil mis à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return sendError(res, 'Champs requis', 400);
    if (newPassword.length < 8) return sendError(res, 'Nouveau mot de passe min 8 caractères', 400);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    return sendSuccess(res, null, 'Mot de passe modifié avec succès');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}
