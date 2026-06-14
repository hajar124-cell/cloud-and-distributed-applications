import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.findMany({ select: { email: true, role: true, isActive: true } })
  .then(users => {
    console.log('Total utilisateurs:', users.length);
    users.forEach(u => console.log(' -', u.email, '|', u.role, '| actif:', u.isActive));
  })
  .finally(() => p.$disconnect());
