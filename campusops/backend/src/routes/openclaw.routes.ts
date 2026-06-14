import { Router } from 'express';
import * as openclawCtrl from '../controllers/openclaw.controller';

const router = Router();

router.get('/status', openclawCtrl.getOpenClawStatus);
router.post('/daily-planning', openclawCtrl.webhookDailyPlanning);
router.post('/payment-reminders', openclawCtrl.webhookPaymentReminders);
router.post('/absence-alert', openclawCtrl.webhookAbsenceAlert);

export default router;
