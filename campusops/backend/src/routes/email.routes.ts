import { Router } from 'express';
import * as emailCtrl from '../controllers/email.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/latest', emailCtrl.getLatestEmails);
router.post('/send', authorize('ADMIN', 'SCOLARITE'), emailCtrl.sendEmail);
router.post('/sync', authorize('ADMIN', 'SCOLARITE'), emailCtrl.syncEmails);

export default router;
