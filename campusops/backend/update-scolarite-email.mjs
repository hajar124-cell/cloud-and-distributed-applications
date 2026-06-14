import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Libérer belghalihajar0@gmail.com de Nadia (remettre son email original)
await p.user.update({
  where: { email: 'belghalihajar0@gmail.com' },
  data: { email: 'prof.nadia@euromed-fes.ma' }
});

// Assigner belghalihajar0@gmail.com à la scolarité
await p.user.update({
  where: { email: 'scolarite@euromed-fes.ma' },
  data: { email: 'belghalihajar0@gmail.com' }
});

const u = await p.user.findUnique({ where: { email: 'belghalihajar0@gmail.com' }, select: { email: true, role: true, firstName: true } });
console.log('Scolarité mise à jour :', u);

await p.$disconnect();
