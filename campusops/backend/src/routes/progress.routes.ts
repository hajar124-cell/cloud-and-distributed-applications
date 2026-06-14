import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as progressService from '../services/progress.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

router.get('/group/:groupId', async (req: AuthRequest, res: Response) => {
  const progress = await progressService.getProgressByGroup(req.params.groupId);
  return sendSuccess(res, progress);
});

router.get('/student/:studentId?', async (req: AuthRequest, res: Response) => {
  const studentId = req.params.studentId || req.user!.userId;
  const progress = await progressService.getProgressByStudent(studentId);
  return sendSuccess(res, progress);
});

router.get('/teacher/:teacherId?', async (req: AuthRequest, res: Response) => {
  const teacherId = req.params.teacherId || req.user!.userId;
  const progress = await progressService.getProgressByTeacher(teacherId);
  return sendSuccess(res, progress);
});

router.get('/all', authorize('ADMIN', 'SCOLARITE'), async (_req: AuthRequest, res: Response) => {
  const progress = await progressService.getAllProgress();
  return sendSuccess(res, progress);
});

router.post('/update', authorize('ADMIN', 'SCOLARITE', 'ENSEIGNANT'), async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId, groupId, chaptersDone, notes } = req.body;
    const result = await progressService.updateProgress(moduleId, groupId, chaptersDone, notes);
    return sendSuccess(res, result, 'Avancement mis à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
});

export default router;
