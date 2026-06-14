import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
const Role = { ADMIN: 'ADMIN', SCOLARITE: 'SCOLARITE', ENSEIGNANT: 'ENSEIGNANT', ETUDIANT: 'ETUDIANT' } as const;
type Role = typeof Role[keyof typeof Role];
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { hashPassword } from '../services/auth.service';

export const createUserValidation = [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe min 8 caractères'),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('role').isIn(Object.values(Role)),
];

export async function getUsers(req: AuthRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const role = req.query.role as Role | undefined;
  const search = req.query.search as string | undefined;

  const where = {
    ...(role ? { role } : {}),
    ...(search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' as const } }, { lastName: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, createdAt: true }, orderBy: { lastName: 'asc' } }),
    prisma.user.count({ where }),
  ]);

  return sendPaginated(res, users, total, page, limit);
}

export async function createUser(req: AuthRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 'Validation échouée', 400, errors.array().map((e) => e.msg));

  const { email, password, firstName, lastName, role, phone, groupId, parentId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return sendError(res, 'Email déjà utilisé', 409);

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName, role, phone },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  });

  if (role === Role.ETUDIANT) {
    const studentId = `ETU-${Date.now()}`;
    await prisma.student.create({ data: { userId: user.id, studentId, groupId, parentId } });
  }

  return sendSuccess(res, user, 'Utilisateur créé', 201);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { firstName, lastName, phone, isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, phone, isActive },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true },
  });

  return sendSuccess(res, user, 'Utilisateur mis à jour');
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (req.user?.userId === id) return sendError(res, 'Impossible de se supprimer soi-même', 400);
  await prisma.user.delete({ where: { id } });
  return sendSuccess(res, null, 'Utilisateur supprimé');
}

export async function getUserById(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, createdAt: true, student: { include: { group: true } } },
  });
  if (!user) return sendError(res, 'Utilisateur introuvable', 404);
  return sendSuccess(res, user);
}

export async function getGroups(_req: AuthRequest, res: Response) {
  const groups = await prisma.group.findMany({ include: { _count: { select: { students: true } } }, orderBy: { name: 'asc' } });
  return sendSuccess(res, groups);
}

export async function createGroup(req: AuthRequest, res: Response) {
  const { name, level, filiere, capacity } = req.body;
  const group = await prisma.group.create({ data: { name, level, filiere, capacity: capacity || 30 } });
  return sendSuccess(res, group, 'Groupe créé', 201);
}

export async function getRooms(_req: AuthRequest, res: Response) {
  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
  return sendSuccess(res, rooms);
}

export async function getModules(_req: AuthRequest, res: Response) {
  const modules = await prisma.module.findMany({ include: { chapters: true }, orderBy: { name: 'asc' } });
  return sendSuccess(res, modules);
}

export async function createModule(req: AuthRequest, res: Response) {
  const { code, name, description, credits, volumeHours, semester } = req.body;
  const module = await prisma.module.create({ data: { code, name, description, credits, volumeHours, semester } });
  return sendSuccess(res, module, 'Module créé', 201);
}

export async function createRoom(req: AuthRequest, res: Response) {
  const { name, capacity, building, type } = req.body;
  if (!name || !capacity) return sendError(res, 'Nom et capacité requis', 400);
  const existing = await prisma.room.findUnique({ where: { name } });
  if (existing) return sendError(res, 'Salle déjà existante', 409);
  const room = await prisma.room.create({ data: { name, capacity: parseInt(capacity), building, type: type || 'Salle TD' } });
  return sendSuccess(res, room, 'Salle créée', 201);
}

export async function resetPassword(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return sendError(res, 'Mot de passe min 8 caractères', 400);
  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
  return sendSuccess(res, null, 'Mot de passe réinitialisé');
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'];
  if (!validRoles.includes(role)) return sendError(res, 'Rôle invalide', 400);
  if (id === req.user?.userId) return sendError(res, 'Impossible de changer son propre rôle', 400);
  const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true, firstName: true, lastName: true } });
  return sendSuccess(res, user, 'Rôle mis à jour');
}

export async function updateGroup(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, level, filiere, capacity } = req.body;
    const group = await prisma.group.update({ where: { id }, data: { ...(name && { name }), ...(level && { level }), ...(filiere && { filiere }), ...(capacity && { capacity: parseInt(capacity) }) } });
    return sendSuccess(res, group, 'Groupe mis à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function deleteGroup(req: AuthRequest, res: Response) {
  try {
    await prisma.group.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Groupe supprimé');
  } catch {
    return sendError(res, 'Impossible de supprimer ce groupe (des étudiants ou sessions y sont liés)', 400);
  }
}

export async function updateRoom(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, capacity, building, type } = req.body;
    const room = await prisma.room.update({ where: { id }, data: { ...(name && { name }), ...(capacity && { capacity: parseInt(capacity) }), ...(building !== undefined && { building }), ...(type && { type }) } });
    return sendSuccess(res, room, 'Salle mise à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function deleteRoom(req: AuthRequest, res: Response) {
  try {
    await prisma.room.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Salle supprimée');
  } catch {
    return sendError(res, 'Impossible de supprimer cette salle (des sessions y sont liées)', 400);
  }
}

export async function updateModule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { code, name, description, credits, volumeHours, semester, isActive } = req.body;
    const module = await prisma.module.update({ where: { id }, data: { ...(code && { code }), ...(name && { name }), ...(description !== undefined && { description }), ...(credits && { credits: parseInt(credits) }), ...(volumeHours && { volumeHours: parseInt(volumeHours) }), ...(semester && { semester: parseInt(semester) }), ...(isActive !== undefined && { isActive }) } });
    return sendSuccess(res, module, 'Module mis à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function deleteModule(req: AuthRequest, res: Response) {
  try {
    await prisma.module.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Module supprimé');
  } catch {
    return sendError(res, 'Impossible de supprimer ce module (des sessions y sont liées)', 400);
  }
}

export async function getLogs(_req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return sendSuccess(res, notifications);
}

export async function getDashboardStats(_req: AuthRequest, res: Response) {
  const [totalUsers, totalStudents, totalTeachers, totalGroups, totalModules,
    payStats, absenceStats, todaySessions, overduePayments] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'ETUDIANT', isActive: true } }),
    prisma.user.count({ where: { role: 'ENSEIGNANT', isActive: true } }),
    prisma.group.count(),
    prisma.module.count({ where: { isActive: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.absence.count({ where: { status: { in: ['ABSENT', 'RETARD'] } } }),
    prisma.session.count({ where: { date: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } } }),
    prisma.payment.count({ where: { status: { in: ['IMPAYE', 'PARTIEL'] }, dueDate: { lt: new Date() } } }),
  ]);

  const paidAmount = await prisma.payment.aggregate({ where: { status: 'PAYE' }, _sum: { amount: true } });

  return sendSuccess(res, {
    users: { total: totalUsers, students: totalStudents, teachers: totalTeachers },
    academic: { groups: totalGroups, modules: totalModules, todaySessions },
    payments: { total: payStats._count, totalAmount: payStats._sum.amount || 0, paidAmount: paidAmount._sum.amount || 0, overdueCount: overduePayments },
    absences: { total: absenceStats },
    collectionRate: payStats._sum.amount ? Math.round(((paidAmount._sum.amount || 0) / payStats._sum.amount) * 100) : 0,
  });
}
