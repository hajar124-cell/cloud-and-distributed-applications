import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { initTelegramBot, sendTelegramNotification } from './bots/telegram.bot';
import * as planningService from './services/planning.service';
import * as paymentService from './services/payment.service';
import * as notifService from './services/notification.service';
import * as emailService from './services/email.service';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'CampusOps API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1E3A5F; } .swagger-ui .topbar-wrapper img { content: none; } .swagger-ui .topbar-wrapper::after { content: "CampusOps - Euromed Fès"; color: #C8A951; font-weight: bold; font-size: 1.2rem; }',
}));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Cron: Tous les matins à 7h → envoyer le planning du jour
cron.schedule('0 7 * * 1-6', async () => {
  logger.info('[CRON] Envoi planning du jour aux enseignants');
  try {
    const sessions = await planningService.getTodaySessionsForAllTeachers();
    const teachers = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const tid = session.teacher.id;
      if (!teachers.has(tid)) teachers.set(tid, []);
      teachers.get(tid)!.push(session);
    }
    const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    for (const [, teacherSessions] of teachers) {
      const teacher = teacherSessions[0].teacher;

      if (teacher.email) {
        await emailService.sendDailyPlanningEmail(teacher, teacherSessions, dateLabel);
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
      }
    }
  } catch (err) { logger.error('[CRON] Erreur planning journalier', err as Error); }
}, { timezone: 'Africa/Casablanca' });

// Cron: Tous les lundis à 9h → vérifier paiements en retard
cron.schedule('0 9 * * 1', async () => {
  logger.info('[CRON] Vérification paiements en retard');
  try {
    const overdueList = await paymentService.getOverduePayments();
    for (const payment of overdueList) {
      await notifService.notifyPaymentOverdue(payment.studentId, payment.label, payment.amount);
      if (payment.student?.email) {
        await emailService.sendPaymentAlert(payment.student.email, payment.label, payment.amount, payment.dueDate.toLocaleDateString('fr-FR'));
      }
    }
    logger.info(`[CRON] ${overdueList.length} rappels paiement envoyés`);
  } catch (err) { logger.error('[CRON] Erreur rappels paiement', err as Error); }
}, { timezone: 'Africa/Casablanca' });

// Start server
app.listen(PORT, () => {
  logger.info(`CampusOps Backend démarré sur le port ${PORT}`);
  logger.info(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  initTelegramBot();
});

export default app;
