import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Récupérer les étudiants actuels
const students = await p.user.findMany({
  where: { role: 'ETUDIANT' },
  select: { id: true, email: true, firstName: true, lastName: true },
  orderBy: { createdAt: 'asc' },
});

console.log('Étudiants actuels:');
students.forEach((s, i) => console.log(`  ${i+1}. ${s.firstName} ${s.lastName} → ${s.email}`));

const newEmails = [
  { old: students[0]?.email, newEmail: 'hajar.belghali@eidia.ueuromed.org' },
  { old: students[1]?.email, newEmail: 'houda.fettouh@eidia.ueuromed.org' },
  { old: students[2]?.email, newEmail: 'abderahmane.fathi@eidia.ueuromed.org' },
];

console.log('\nMise à jour:');
for (const u of newEmails) {
  if (!u.old) continue;
  await p.user.update({ where: { email: u.old }, data: { email: u.newEmail } });
  console.log(`  ✓ ${u.old}  →  ${u.newEmail}`);
}

await p.$disconnect();
console.log('\nEmails étudiants mis à jour !');
