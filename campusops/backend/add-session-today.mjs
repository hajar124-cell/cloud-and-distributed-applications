import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Trouver l'enseignant Khalid (maintenant someoner774@gmail.com)
const teacher = await p.user.findUnique({ where: { email: 'someoner774@gmail.com' } });
const module = await p.module.findFirst({ where: { code: 'INF101' } });
const group = await p.group.findFirst({ where: { name: 'GI1-A' } });
const room = await p.room.findFirst({ where: { name: 'Amphi A' } });

if (!teacher || !module || !group || !room) {
  console.log('Données manquantes:', { teacher: !!teacher, module: !!module, group: !!group, room: !!room });
  process.exit(1);
}

// Créer une séance pour aujourd'hui
const today = new Date();
today.setHours(0, 0, 0, 0);

const session = await p.session.create({
  data: {
    moduleId: module.id,
    teacherId: teacher.id,
    groupId: group.id,
    roomId: room.id,
    date: today,
    startTime: '08:00',
    endTime: '10:00',
    type: 'CM',
  },
});

console.log(`Séance créée pour aujourd'hui (${today.toLocaleDateString('fr-FR')})`);
console.log(`Module: ${module.name} | Groupe: ${group.name} | Salle: ${room.name}`);

await p.$disconnect();
