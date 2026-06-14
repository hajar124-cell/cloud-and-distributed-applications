import { prisma } from '../utils/prisma';
const AbsenceStatus = { PRESENT: 'PRESENT', ABSENT: 'ABSENT', RETARD: 'RETARD' } as const;
type AbsenceStatus = typeof AbsenceStatus[keyof typeof AbsenceStatus];

export async function recordAbsences(sessionId: string, records: { studentId: string; status: AbsenceStatus; justification?: string }[], recordedBy: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Session introuvable');

  const ops = records.map((r) =>
    prisma.absence.upsert({
      where: { studentId_sessionId: { studentId: r.studentId, sessionId } },
      create: { studentId: r.studentId, sessionId, groupId: session.groupId, status: r.status, justification: r.justification, recordedBy },
      update: { status: r.status, justification: r.justification, recordedBy },
    })
  );

  return prisma.$transaction(ops);
}

export async function getAbsencesByStudent(studentId: string, startDate?: string, endDate?: string) {
  return prisma.absence.findMany({
    where: {
      studentId,
      ...(startDate || endDate ? {
        session: {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        },
      } : {}),
    },
    include: { session: { include: { module: true } } },
    orderBy: { session: { date: 'desc' } },
  });
}

export async function getAbsencesByGroup(groupId: string, startDate?: string, endDate?: string) {
  return prisma.absence.findMany({
    where: {
      groupId,
      ...(startDate || endDate ? {
        session: {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        },
      } : {}),
    },
    include: { student: { select: { id: true, firstName: true, lastName: true } }, session: { include: { module: true } } },
    orderBy: { session: { date: 'desc' } },
  });
}

export async function getAbsenceStats(studentId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, monthTotal, justified, byStatus] = await Promise.all([
    prisma.absence.count({ where: { studentId, status: { in: [AbsenceStatus.ABSENT, AbsenceStatus.RETARD] } } }),
    prisma.absence.count({ where: { studentId, status: { in: [AbsenceStatus.ABSENT, AbsenceStatus.RETARD] }, session: { date: { gte: startOfMonth } } } }),
    prisma.absence.count({ where: { studentId, status: AbsenceStatus.ABSENT, justification: { not: null } } }),
    prisma.absence.groupBy({ by: ['status'], where: { studentId }, _count: { status: true } }),
  ]);

  return { total, monthTotal, justified, byStatus };
}

export async function getAbsencesRecordedBy(teacherId: string, startDate?: string, endDate?: string) {
  return prisma.absence.findMany({
    where: {
      session: {
        teacherId,
        ...(startDate || endDate ? { date: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } } : {}),
      },
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      session: { include: { module: true } },
    },
    orderBy: { session: { date: 'desc' } },
  });
}

export async function getAbsenceStatsForTeacher(teacherId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, monthTotal, justified] = await Promise.all([
    prisma.absence.count({ where: { status: { in: ['ABSENT', 'RETARD'] }, session: { teacherId } } }),
    prisma.absence.count({ where: { status: { in: ['ABSENT', 'RETARD'] }, session: { teacherId, date: { gte: startOfMonth } } } }),
    prisma.absence.count({ where: { status: 'ABSENT', justification: { not: null }, session: { teacherId } } }),
  ]);

  return { total, monthTotal, justified, byStatus: [] };
}

export async function justifyAbsence(absenceId: string, justification: string) {
  return prisma.absence.update({
    where: { id: absenceId },
    data: { justification, justifiedAt: new Date() },
  });
}
