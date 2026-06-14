import { Router } from 'express';
import * as absenceCtrl from '../controllers/absence.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/record', authorize('ADMIN', 'SCOLARITE', 'ENSEIGNANT'), absenceCtrl.recordAbsences);
router.get('/student/:studentId?', absenceCtrl.getStudentAbsences);
router.get('/group/:groupId', authorize('ADMIN', 'SCOLARITE', 'ENSEIGNANT'), absenceCtrl.getGroupAbsences);
router.get('/stats/:studentId?', absenceCtrl.getAbsenceStats);
router.patch('/:id/justify', absenceCtrl.justifyAbsence);
router.get('/export/csv', authorize('ADMIN', 'SCOLARITE', 'ENSEIGNANT'), absenceCtrl.exportAbsencesCSV);

export default router;
