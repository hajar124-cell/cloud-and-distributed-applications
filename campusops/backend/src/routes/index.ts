import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './users.routes';
import planningRoutes from './planning.routes';
import absenceRoutes from './absence.routes';
import paymentRoutes from './payment.routes';
import progressRoutes from './progress.routes';
import emailRoutes from './email.routes';
import notificationRoutes from './notification.routes';
import openclawRoutes from './openclaw.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/planning', planningRoutes);
router.use('/absences', absenceRoutes);
router.use('/payments', paymentRoutes);
router.use('/progress', progressRoutes);
router.use('/mail', emailRoutes);
router.use('/notifications', notificationRoutes);
router.use('/openclaw', openclawRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'CampusOps', version: '1.0.0' });
});

export default router;
