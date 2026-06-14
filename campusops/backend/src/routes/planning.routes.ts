import { Router } from 'express';
import * as planningCtrl from '../controllers/planning.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/today', planningCtrl.getToday);
router.get('/week', planningCtrl.getWeek);
router.get('/student/:studentId?', planningCtrl.getByStudent);
router.get('/teacher/:teacherId?', planningCtrl.getByTeacher);
router.get('/:id/students', planningCtrl.getSessionStudents);
router.post('/send-email', planningCtrl.sendPlanningEmail);
router.get('/export/csv', authorize('ADMIN', 'SCOLARITE', 'ENSEIGNANT'), planningCtrl.exportPlanningCSV);
router.post('/', authorize('ADMIN', 'SCOLARITE'), planningCtrl.createSession);
router.put('/:id', authorize('ADMIN', 'SCOLARITE'), planningCtrl.updateSession);
router.delete('/:id', authorize('ADMIN', 'SCOLARITE'), planningCtrl.deleteSession);

export default router;
