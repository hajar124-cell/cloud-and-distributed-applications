import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const updates = [
  { old: 'prof.khalid@euromed-fes.ma',  newEmail: 'someoner774@gmail.com' },
  { old: 'prof.sara@euromed-fes.ma',    newEmail: 'marcilinemarciline58@gmail.com' },
  { old: 'prof.amine@euromed-fes.ma',   newEmail: 'armyhajar26@gmail.com' },
  { old: 'prof.nadia@euromed-fes.ma',   newEmail: 'belghalihajar0@gmail.com' },
];

for (const u of updates) {
  const user = await p.user.findUnique({ where: { email: u.old } });
  if (user) {
    await p.user.update({ where: { email: u.old }, data: { email: u.newEmail } });
    console.log(`✓ ${u.old}  →  ${u.newEmail}`);
  } else {
    console.log(`✗ Introuvable: ${u.old}`);
  }
}

await p.$disconnect();
console.log('\nEmails mis à jour !');
