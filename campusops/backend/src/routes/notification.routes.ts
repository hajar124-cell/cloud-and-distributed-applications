import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notifService from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const notifications = await notifService.getNotifications(req.user!.userId, limit);
  const unread = await notifService.getUnreadCount(req.user!.userId);
  return sendSuccess(res, { notifications, unreadCount: unread });
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await notifService.markAsRead(req.params.id, req.user!.userId);
  return sendSuccess(res, null, 'Marqué comme lu');
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await notifService.markAllAsRead(req.user!.userId);
  return sendSuccess(res, null, 'Toutes les notifications marquées comme lues');
});

export default router;
