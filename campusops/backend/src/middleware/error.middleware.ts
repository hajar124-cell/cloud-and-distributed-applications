import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`${req.method} ${req.path} - ${err.message}`, err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, message: 'Erreur serveur interne', error: err.message });
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route introuvable: ${req.path}` });
}
