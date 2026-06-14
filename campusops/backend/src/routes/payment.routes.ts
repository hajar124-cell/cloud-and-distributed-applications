import { Router } from 'express';
import * as paymentCtrl from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.getStats);
router.get('/overdue', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.getOverdue);
router.post('/reminders', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.sendPaymentReminders);
router.get('/all', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.getAllPayments);
router.get('/export/csv', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.exportPaymentsCSV);
router.get('/student/:studentId?', paymentCtrl.getPayments);
router.post('/plan', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.createPaymentPlan);
router.post('/', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.createPayment);
router.patch('/:id/status', authorize('ADMIN', 'SCOLARITE'), paymentCtrl.updatePaymentStatus);

export default router;
