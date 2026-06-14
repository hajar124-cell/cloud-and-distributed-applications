import { prisma } from '../utils/prisma';

export async function getProgressByGroup(groupId: string) {
  return prisma.progress.findMany({
    where: { groupId, studentId: null },
    include: { module: { include: { chapters: true } }, group: true },
    orderBy: { module: { name: 'asc' } },
  });
}

export async function getProgressByStudent(studentId: string) {
  const student = await prisma.student.findUnique({ where: { userId: studentId } });
  if (!student?.groupId) return [];

  const groupProgress = await prisma.progress.findMany({
    where: { groupId: student.groupId, studentId: null },
    include: { module: { include: { chapters: true } } },
  });

  return groupProgress;
}

export async function updateProgress(moduleId: string, groupId: string, chaptersDone: number, notes?: string) {
  const module = await prisma.module.findUnique({ where: { id: moduleId }, include: { chapters: true } });
  if (!module) throw new Error('Module introuvable');

  const chaptersTotal = module.chapters.length || module.volumeHours;
  const percentage = chaptersTotal > 0 ? Math.min((chaptersDone / chaptersTotal) * 100, 100) : 0;

  const existing = await prisma.progress.findFirst({ where: { moduleId, groupId, studentId: null } });
  if (existing) {
    return prisma.progress.update({ where: { id: existing.id }, data: { chaptersDone, percentage, notes, lastUpdated: new Date() } });
  }
  return prisma.progress.create({ data: { moduleId, groupId, studentId: null, chaptersTotal, chaptersDone, percentage, notes, lastUpdated: new Date() } });
}

export async function getAllProgress() {
  return prisma.progress.findMany({
    where: { studentId: null },
    include: { module: true, group: true },
    orderBy: [{ group: { name: 'asc' } }, { module: { name: 'asc' } }],
  });
}

export async function getProgressByTeacher(teacherId: string) {
  const sessions = await prisma.session.findMany({
    where: { teacherId },
    select: { groupId: true },
    distinct: ['groupId'],
  });
  const groupIds = sessions.map((s) => s.groupId);
  if (groupIds.length === 0) return [];

  return prisma.progress.findMany({
    where: { groupId: { in: groupIds }, studentId: null },
    include: { module: { include: { chapters: true } }, group: true },
    orderBy: [{ group: { name: 'asc' } }, { module: { name: 'asc' } }],
  });
}
