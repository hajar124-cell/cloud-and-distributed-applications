import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const users = await p.user.findMany({ select: { email: true, role: true } });
  console.log(JSON.stringify(users, null, 2));
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
