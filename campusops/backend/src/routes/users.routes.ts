import { Router } from 'express';
import * as usersCtrl from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'SCOLARITE'), usersCtrl.getUsers);
router.post('/', authorize('ADMIN', 'SCOLARITE'), usersCtrl.createUserValidation, usersCtrl.createUser);

router.get('/groups', usersCtrl.getGroups);
router.post('/groups', authorize('ADMIN', 'SCOLARITE'), usersCtrl.createGroup);
router.put('/groups/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.updateGroup);
router.delete('/groups/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.deleteGroup);

router.get('/rooms', usersCtrl.getRooms);
router.post('/rooms', authorize('ADMIN', 'SCOLARITE'), usersCtrl.createRoom);
router.put('/rooms/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.updateRoom);
router.delete('/rooms/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.deleteRoom);

router.get('/modules', usersCtrl.getModules);
router.post('/modules', authorize('ADMIN', 'SCOLARITE'), usersCtrl.createModule);
router.put('/modules/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.updateModule);
router.delete('/modules/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.deleteModule);

router.get('/stats/dashboard', authorize('ADMIN', 'SCOLARITE'), usersCtrl.getDashboardStats);
router.get('/logs', authorize('ADMIN', 'SCOLARITE'), usersCtrl.getLogs);

router.get('/:id', usersCtrl.getUserById);
router.put('/:id/role', authorize('ADMIN', 'SCOLARITE'), usersCtrl.updateUserRole);
router.post('/:id/reset-password', authorize('ADMIN', 'SCOLARITE'), usersCtrl.resetPassword);
router.put('/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.updateUser);
router.delete('/:id', authorize('ADMIN', 'SCOLARITE'), usersCtrl.deleteUser);

export default router;
