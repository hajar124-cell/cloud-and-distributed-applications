import { prisma } from '../utils/prisma';

export async function getSessionsByDate(date: string) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.session.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      module: true,
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      group: true,
      room: true,
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getSessionsByWeek(startDate: string) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return prisma.session.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      module: true,
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      group: true,
      room: true,
      _count: { select: { absences: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getSessionsByStudent(studentId: string, startDate?: string, endDate?: string) {
  const student = await prisma.student.findUnique({ where: { userId: studentId } });
  if (!student?.groupId) return [];

  const where: Record<string, unknown> = { groupId: student.groupId };
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  return prisma.session.findMany({
    where,
    include: { module: true, teacher: { select: { id: true, firstName: true, lastName: true } }, group: true, room: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getSessionsByTeacher(teacherId: string, startDate?: string, endDate?: string) {
  const where: Record<string, unknown> = { teacherId };
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
  return prisma.session.findMany({
    where,
    include: { module: true, group: true, room: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

export async function createSession(data: {
  moduleId: string; teacherId: string; groupId: string; roomId?: string;
  date: string; startTime: string; endTime: string; type?: string; notes?: string;
}) {
  return prisma.session.create({
    data: { ...data, date: new Date(data.date) },
    include: { module: true, teacher: { select: { id: true, firstName: true, lastName: true, email: true, telegramChatId: true } }, group: true, room: true },
  });
}

export async function updateSession(id: string, data: Partial<{ date: string; startTime: string; endTime: string; roomId: string; notes: string; type: string }>) {
  const payload = { ...data } as Record<string, unknown>;
  if (data.date) payload.date = new Date(data.date);
  return prisma.session.update({ where: { id }, data: payload, include: { module: true, group: true, room: true } });
}

export async function deleteSession(id: string) {
  return prisma.session.delete({ where: { id } });
}

export async function getSessionStudents(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Séance introuvable');

  const students = await prisma.student.findMany({
    where: { groupId: session.groupId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { user: { lastName: 'asc' } },
  });

  const existingAbsences = await prisma.absence.findMany({ where: { sessionId } });

  return students.map(s => ({
    id: s.user.id,
    firstName: s.user.firstName,
    lastName: s.user.lastName,
    email: s.user.email,
    studentId: s.studentId,
    status: existingAbsences.find(a => a.studentId === s.user.id)?.status || null,
  }));
}

export async function getTodaySessionsForAllTeachers() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  return prisma.session.findMany({
    where: { date: { gte: today, lte: end } },
    include: {
      module: true,
      teacher: { select: { id: true, firstName: true, lastName: true, email: true, telegramChatId: true } },
      group: true,
      room: true,
    },
  });
}
