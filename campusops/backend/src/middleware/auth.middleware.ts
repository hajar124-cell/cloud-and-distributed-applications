import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
type Role = 'ADMIN' | 'SCOLARITE' | 'ENSEIGNANT' | 'ETUDIANT';
import { sendError } from '../utils/response';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Token manquant ou invalide', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return sendError(res, 'Token expiré ou invalide', 401);
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Non authentifié', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Accès refusé: permissions insuffisantes', 403);
    }
    next();
  };
}
