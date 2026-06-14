import { PrismaClient } from '@prisma/client';
const Role = { ADMIN: 'ADMIN', SCOLARITE: 'SCOLARITE', ENSEIGNANT: 'ENSEIGNANT', ETUDIANT: 'ETUDIANT' };
const PaymentStatus = { PAYE: 'PAYE', PARTIEL: 'PARTIEL', IMPAYE: 'IMPAYE' };
const AbsenceStatus = { PRESENT: 'PRESENT', ABSENT: 'ABSENT', RETARD: 'RETARD' };
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Démarrage du seed CampusOps - Euromed Fès...');

  // Rooms
  const rooms = await Promise.all([
    prisma.room.upsert({ where: { name: 'Amphi A' }, update: {}, create: { name: 'Amphi A', capacity: 200, building: 'Bâtiment Principal', type: 'Amphi' } }),
    prisma.room.upsert({ where: { name: 'Amphi B' }, update: {}, create: { name: 'Amphi B', capacity: 150, building: 'Bâtiment Principal', type: 'Amphi' } }),
    prisma.room.upsert({ where: { name: 'Salle 101' }, update: {}, create: { name: 'Salle 101', capacity: 40, building: 'Bloc A', type: 'Salle TD' } }),
    prisma.room.upsert({ where: { name: 'Salle 102' }, update: {}, create: { name: 'Salle 102', capacity: 40, building: 'Bloc A', type: 'Salle TD' } }),
    prisma.room.upsert({ where: { name: 'Labo Info 1' }, update: {}, create: { name: 'Labo Info 1', capacity: 30, building: 'Bloc B', type: 'Laboratoire' } }),
    prisma.room.upsert({ where: { name: 'Labo Info 2' }, update: {}, create: { name: 'Labo Info 2', capacity: 30, building: 'Bloc B', type: 'Laboratoire' } }),
  ]);
  console.log(`${rooms.length} salles créées`);

  // Groups
  const groups = await Promise.all([
    prisma.group.upsert({ where: { name: 'GI1-A' }, update: {}, create: { name: 'GI1-A', level: 'L1', filiere: 'Génie Informatique', capacity: 30 } }),
    prisma.group.upsert({ where: { name: 'GI1-B' }, update: {}, create: { name: 'GI1-B', level: 'L1', filiere: 'Génie Informatique', capacity: 30 } }),
    prisma.group.upsert({ where: { name: 'GI2-A' }, update: {}, create: { name: 'GI2-A', level: 'L2', filiere: 'Génie Informatique', capacity: 28 } }),
    prisma.group.upsert({ where: { name: 'GL3-A' }, update: {}, create: { name: 'GL3-A', level: 'L3', filiere: 'Génie Logiciel', capacity: 25 } }),
    prisma.group.upsert({ where: { name: 'IA-M1' }, update: {}, create: { name: 'IA-M1', level: 'M1', filiere: 'Intelligence Artificielle', capacity: 20 } }),
  ]);
  console.log(`${groups.length} groupes créés`);

  // Modules
  const modules = await Promise.all([
    prisma.module.upsert({ where: { code: 'INF101' }, update: {}, create: { code: 'INF101', name: 'Algorithmique & Structures de données', credits: 6, volumeHours: 45, semester: 1 } }),
    prisma.module.upsert({ where: { code: 'INF102' }, update: {}, create: { code: 'INF102', name: 'Programmation Orientée Objet', credits: 6, volumeHours: 45, semester: 1 } }),
    prisma.module.upsert({ where: { code: 'MATH101' }, update: {}, create: { code: 'MATH101', name: 'Mathématiques Discrètes', credits: 4, volumeHours: 30, semester: 1 } }),
    prisma.module.upsert({ where: { code: 'INF201' }, update: {}, create: { code: 'INF201', name: 'Base de Données Avancées', credits: 6, volumeHours: 45, semester: 3 } }),
    prisma.module.upsert({ where: { code: 'INF202' }, update: {}, create: { code: 'INF202', name: 'Développement Web Full Stack', credits: 6, volumeHours: 60, semester: 3 } }),
    prisma.module.upsert({ where: { code: 'INF301' }, update: {}, create: { code: 'INF301', name: 'Génie Logiciel & Méthodes Agiles', credits: 4, volumeHours: 30, semester: 5 } }),
    prisma.module.upsert({ where: { code: 'IA401' }, update: {}, create: { code: 'IA401', name: 'Machine Learning & Deep Learning', credits: 6, volumeHours: 60, semester: 7 } }),
    prisma.module.upsert({ where: { code: 'INF102B' }, update: {}, create: { code: 'INF102B', name: 'Réseaux & Sécurité', credits: 4, volumeHours: 30, semester: 2 } }),
  ]);
  console.log(`${modules.length} modules créés`);

  // Chapters for modules
  for (const mod of modules) {
    const chapterCount = mod.volumeHours >= 45 ? 8 : 5;
    const chapterTitles: string[] = Array.from({ length: chapterCount }, (_, i) => `Chapitre ${i + 1}`);
    for (let i = 0; i < chapterTitles.length; i++) {
      await prisma.chapter.upsert({
        where: { id: `${mod.id}-ch-${i}` },
        update: {},
        create: { id: `${mod.id}-ch-${i}`, moduleId: mod.id, title: chapterTitles[i], order: i + 1 },
      });
    }
  }

  // Admin
  const adminPassword = await bcrypt.hash('Admin@2025!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@euromed-fes.ma' },
    update: {},
    create: { email: 'admin@euromed-fes.ma', password: adminPassword, firstName: 'Mohammed', lastName: 'Alami', role: Role.ADMIN, phone: '+212661000001' },
  });

  // Scolarité
  const scolaritePassword = await bcrypt.hash('Scolarite@2025!', 12);
  const scolarite = await prisma.user.upsert({
    where: { email: 'scolarite@euromed-fes.ma' },
    update: {},
    create: { email: 'scolarite@euromed-fes.ma', password: scolaritePassword, firstName: 'Fatima', lastName: 'Benali', role: Role.SCOLARITE, phone: '+212661000002' },
  });

  // Enseignants
  const teacherPassword = await bcrypt.hash('Teacher@2025!', 12);
  const teachers = await Promise.all([
    prisma.user.upsert({ where: { email: 'prof.khalid@euromed-fes.ma' }, update: {}, create: { email: 'prof.khalid@euromed-fes.ma', password: teacherPassword, firstName: 'Khalid', lastName: 'Moussaoui', role: Role.ENSEIGNANT, phone: '+212661000010' } }),
    prisma.user.upsert({ where: { email: 'prof.sara@euromed-fes.ma' }, update: {}, create: { email: 'prof.sara@euromed-fes.ma', password: teacherPassword, firstName: 'Sara', lastName: 'Idrissi', role: Role.ENSEIGNANT, phone: '+212661000011' } }),
    prisma.user.upsert({ where: { email: 'prof.amine@euromed-fes.ma' }, update: {}, create: { email: 'prof.amine@euromed-fes.ma', password: teacherPassword, firstName: 'Amine', lastName: 'Tazi', role: Role.ENSEIGNANT, phone: '+212661000012' } }),
    prisma.user.upsert({ where: { email: 'prof.nadia@euromed-fes.ma' }, update: {}, create: { email: 'prof.nadia@euromed-fes.ma', password: teacherPassword, firstName: 'Nadia', lastName: 'Chraibi', role: Role.ENSEIGNANT, phone: '+212661000013' } }),
  ]);

  // Étudiants
  const studentPassword = await bcrypt.hash('Student@2025!', 12);
  const studentData = [
    { email: 'yassine.amrani@etud.euromed-fes.ma', firstName: 'Yassine', lastName: 'Amrani', groupName: 'GI1-A' },
    { email: 'houda.bensaid@etud.euromed-fes.ma', firstName: 'Houda', lastName: 'Bensaid', groupName: 'GI1-A' },
    { email: 'karim.el-fassi@etud.euromed-fes.ma', firstName: 'Karim', lastName: 'El Fassi', groupName: 'GI1-A' },
    { email: 'imane.ouali@etud.euromed-fes.ma', firstName: 'Imane', lastName: 'Ouali', groupName: 'GI1-B' },
    { email: 'mehdi.berrada@etud.euromed-fes.ma', firstName: 'Mehdi', lastName: 'Berrada', groupName: 'GI1-B' },
    { email: 'zineb.lahlou@etud.euromed-fes.ma', firstName: 'Zineb', lastName: 'Lahlou', groupName: 'GI2-A' },
    { email: 'adil.hassani@etud.euromed-fes.ma', firstName: 'Adil', lastName: 'Hassani', groupName: 'GI2-A' },
    { email: 'sanaa.kabbaj@etud.euromed-fes.ma', firstName: 'Sanaa', lastName: 'Kabbaj', groupName: 'GL3-A' },
    { email: 'omar.bensouda@etud.euromed-fes.ma', firstName: 'Omar', lastName: 'Bensouda', groupName: 'IA-M1' },
    { email: 'rania.tahiri@etud.euromed-fes.ma', firstName: 'Rania', lastName: 'Tahiri', groupName: 'IA-M1' },
  ];

  const students: { user: Awaited<ReturnType<typeof prisma.user.upsert>>; groupId: string }[] = [];
  for (let i = 0; i < studentData.length; i++) {
    const d = studentData[i];
    const group = groups.find((g) => g.name === d.groupName)!;
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: { email: d.email, password: studentPassword, firstName: d.firstName, lastName: d.lastName, role: Role.ETUDIANT },
    });
    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, studentId: `ETU-2024-${String(i + 1).padStart(4, '0')}`, groupId: group.id },
    });
    students.push({ user, groupId: group.id });
  }
  console.log(`${students.length} étudiants créés`);

  // Sessions (planning) - semaine en cours
  const today = new Date();
  const getMonday = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); };
  const monday = getMonday(new Date(today));

  const sessionsData = [
    { dOffset: 0, start: '08:00', end: '10:00', moduleCode: 'INF101', teacherEmail: 'prof.khalid@euromed-fes.ma', groupName: 'GI1-A', roomName: 'Amphi A', type: 'CM' },
    { dOffset: 0, start: '10:00', end: '12:00', moduleCode: 'INF102', teacherEmail: 'prof.sara@euromed-fes.ma', groupName: 'GI1-A', roomName: 'Salle 101', type: 'TD' },
    { dOffset: 0, start: '14:00', end: '16:00', moduleCode: 'MATH101', teacherEmail: 'prof.amine@euromed-fes.ma', groupName: 'GI1-B', roomName: 'Amphi B', type: 'CM' },
    { dOffset: 1, start: '08:00', end: '10:00', moduleCode: 'INF201', teacherEmail: 'prof.khalid@euromed-fes.ma', groupName: 'GI2-A', roomName: 'Salle 102', type: 'CM' },
    { dOffset: 1, start: '10:00', end: '12:00', moduleCode: 'INF202', teacherEmail: 'prof.sara@euromed-fes.ma', groupName: 'GL3-A', roomName: 'Labo Info 1', type: 'TP' },
    { dOffset: 1, start: '14:00', end: '16:00', moduleCode: 'IA401', teacherEmail: 'prof.nadia@euromed-fes.ma', groupName: 'IA-M1', roomName: 'Labo Info 2', type: 'CM' },
    { dOffset: 2, start: '08:00', end: '10:00', moduleCode: 'INF101', teacherEmail: 'prof.khalid@euromed-fes.ma', groupName: 'GI1-B', roomName: 'Amphi A', type: 'CM' },
    { dOffset: 2, start: '10:00', end: '12:00', moduleCode: 'INF301', teacherEmail: 'prof.amine@euromed-fes.ma', groupName: 'GL3-A', roomName: 'Salle 101', type: 'TD' },
    { dOffset: 3, start: '08:00', end: '10:00', moduleCode: 'INF202', teacherEmail: 'prof.sara@euromed-fes.ma', groupName: 'GI2-A', roomName: 'Labo Info 1', type: 'TP' },
    { dOffset: 3, start: '14:00', end: '16:00', moduleCode: 'IA401', teacherEmail: 'prof.nadia@euromed-fes.ma', groupName: 'IA-M1', roomName: 'Labo Info 2', type: 'TP' },
    { dOffset: 4, start: '08:00', end: '10:00', moduleCode: 'MATH101', teacherEmail: 'prof.amine@euromed-fes.ma', groupName: 'GI1-A', roomName: 'Amphi B', type: 'CM' },
    { dOffset: 4, start: '10:00', end: '12:00', moduleCode: 'INF102B', teacherEmail: 'prof.khalid@euromed-fes.ma', groupName: 'GI2-A', roomName: 'Salle 102', type: 'TD' },
  ];

  for (const s of sessionsData) {
    const sessionDate = new Date(monday);
    sessionDate.setDate(monday.getDate() + s.dOffset);
    const module = modules.find((m) => m.code === s.moduleCode)!;
    const teacher = teachers.find((t) => t.email === s.teacherEmail)!;
    const group = groups.find((g) => g.name === s.groupName)!;
    const room = rooms.find((r) => r.name === s.roomName)!;

    await prisma.session.create({
      data: { moduleId: module.id, teacherId: teacher.id, groupId: group.id, roomId: room.id, date: sessionDate, startTime: s.start, endTime: s.end, type: s.type },
    });
  }
  console.log(`${sessionsData.length} séances créées`);

  // Absences
  const sessions = await prisma.session.findMany({ take: 5 });
  const gi1aStudents = students.filter((s) => s.groupId === groups.find((g) => g.name === 'GI1-A')!.id);

  for (let i = 0; i < Math.min(2, gi1aStudents.length); i++) {
    if (sessions[i]) {
      await prisma.absence.upsert({
        where: { studentId_sessionId: { studentId: gi1aStudents[i].user.id, sessionId: sessions[i].id } },
        update: {},
        create: { studentId: gi1aStudents[i].user.id, sessionId: sessions[i].id, groupId: gi1aStudents[i].groupId, status: i === 0 ? AbsenceStatus.ABSENT : AbsenceStatus.RETARD },
      });
    }
  }

  // Payments
  const paymentStudents = students.slice(0, 5);
  const paymentStatuses = [PaymentStatus.PAYE, PaymentStatus.IMPAYE, PaymentStatus.PARTIEL, PaymentStatus.PAYE, PaymentStatus.IMPAYE];

  for (let i = 0; i < paymentStudents.length; i++) {
    await prisma.payment.create({
      data: {
        studentId: paymentStudents[i].user.id,
        label: 'Frais de scolarité S1 2024-2025',
        amount: 15000,
        dueDate: new Date('2024-10-15'),
        status: paymentStatuses[i],
        paidAt: paymentStatuses[i] === PaymentStatus.PAYE ? new Date('2024-10-10') : null,
        method: paymentStatuses[i] === PaymentStatus.PAYE ? 'Virement bancaire' : null,
      },
    });
    await prisma.payment.create({
      data: {
        studentId: paymentStudents[i].user.id,
        label: 'Frais de scolarité S2 2024-2025',
        amount: 15000,
        dueDate: new Date('2025-02-28'),
        status: i < 2 ? PaymentStatus.PAYE : PaymentStatus.IMPAYE,
        paidAt: i < 2 ? new Date('2025-02-20') : null,
      },
    });
  }
  console.log(`Paiements créés`);

  // Progress
  const gi1aGroup = groups.find((g) => g.name === 'GI1-A')!;
  const gi2aGroup = groups.find((g) => g.name === 'GI2-A')!;
  const iaGroup = groups.find((g) => g.name === 'IA-M1')!;

  const progressData = [
    { moduleCode: 'INF101', groupId: gi1aGroup.id, chaptersDone: 5, total: 8 },
    { moduleCode: 'INF102', groupId: gi1aGroup.id, chaptersDone: 3, total: 8 },
    { moduleCode: 'MATH101', groupId: gi1aGroup.id, chaptersDone: 4, total: 5 },
    { moduleCode: 'INF201', groupId: gi2aGroup.id, chaptersDone: 6, total: 8 },
    { moduleCode: 'INF202', groupId: gi2aGroup.id, chaptersDone: 4, total: 8 },
    { moduleCode: 'IA401', groupId: iaGroup.id, chaptersDone: 3, total: 8 },
  ];

  for (const p of progressData) {
    const module = modules.find((m) => m.code === p.moduleCode)!;
    const existing = await prisma.progress.findFirst({ where: { moduleId: module.id, groupId: p.groupId, studentId: null } });
    if (!existing) {
      await prisma.progress.create({
        data: { moduleId: module.id, groupId: p.groupId, studentId: null, chaptersTotal: p.total, chaptersDone: p.chaptersDone, percentage: (p.chaptersDone / p.total) * 100 },
      });
    }
  }
  console.log('Avancement pédagogique créé');

  console.log('\n===== COMPTES DE DÉMONSTRATION =====');
  console.log('Admin:      admin@euromed-fes.ma     / Admin@2025!');
  console.log('Scolarité:  scolarite@euromed-fes.ma / Scolarite@2025!');
  console.log('Enseignant: prof.khalid@euromed-fes.ma / Teacher@2025!');
  console.log('Étudiant:   yassine.amrani@etud.euromed-fes.ma / Student@2025!');
  console.log('=====================================\n');

  console.log('Seed terminé avec succès !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
