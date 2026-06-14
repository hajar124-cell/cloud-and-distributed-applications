import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { createNotification } from './notification.service';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"CampusOps Euromed Fès" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  await prisma.emailLog.create({
    data: { fromAddress: process.env.SMTP_USER!, toAddress: to, subject, direction: 'OUTBOUND', processedAt: new Date() },
  });
  logger.info(`Email envoyé à ${to}: ${subject}`);
  return info;
}

export async function fetchLatestEmails(limit = 10): Promise<ParsedMail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER!,
      password: process.env.IMAP_PASS!,
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const emails: ParsedMail[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) return reject(err);
        const total = box.messages.total;
        const start = Math.max(1, total - limit + 1);
        const fetch = imap.seq.fetch(`${start}:*`, { bodies: '', struct: true });

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            simpleParser(stream as any, {}, (parseErr, mail) => {
              if (!parseErr) emails.push(mail);
            });
          });
        });

        fetch.once('end', () => {
          imap.end();
          resolve(emails.reverse());
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

export async function getLatestEmailsFromDB(limit = 10) {
  return prisma.emailLog.findMany({
    where: { direction: 'INBOUND' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function syncEmailsToDb() {
  try {
    const emails = await fetchLatestEmails(10);
    for (const mail of emails) {
      const messageId = mail.messageId || `${Date.now()}-${Math.random()}`;
      const fromAddress = typeof mail.from?.value[0]?.address === 'string' ? mail.from.value[0].address : 'unknown';

      await prisma.emailLog.upsert({
        where: { messageId },
        create: {
          messageId,
          fromAddress,
          subject: mail.subject || '(sans objet)',
          preview: mail.text?.substring(0, 200),
          body: mail.text,
          direction: 'INBOUND',
          processedAt: new Date(),
          createdAt: mail.date || new Date(),
        },
        update: { processedAt: new Date() },
      });

      await processEmailNotification(fromAddress, mail.subject || '', mail.text || '');
    }
    logger.info(`${emails.length} emails synchronisés`);
  } catch (err) {
    logger.error('Erreur synchronisation email', err as Error);
  }
}

async function processEmailNotification(from: string, subject: string, body: string) {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  if (lowerSubject.includes('absence justifi') || lowerBody.includes('absence justifi')) {
    const user = await prisma.user.findFirst({ where: { email: from } });
    if (user) {
      await createNotification(user.id, 'EMAIL_ENTRANT', 'Justificatif reçu', `Email de justification reçu de ${from}: ${subject}`);
    }
  }
  if (lowerSubject.includes('paiement') || lowerBody.includes('virement')) {
    const user = await prisma.user.findFirst({ where: { email: from } });
    if (user) {
      await createNotification(user.id, 'EMAIL_ENTRANT', 'Email paiement reçu', `Email de paiement reçu: ${subject}`);
    }
  }
}

export async function sendDailyPlanningEmail(teacher: { email: string; firstName: string }, sessions: { startTime: string; endTime: string; module: { name: string }; group: { name: string }; room?: { name: string } | null }[], date: string) {
  const rows = sessions.map(s =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${s.startTime}–${s.endTime}</td><td style="padding:8px;border:1px solid #ddd">${s.module.name}</td><td style="padding:8px;border:1px solid #ddd">${s.group.name}</td><td style="padding:8px;border:1px solid #ddd">${s.room?.name || '—'}</td></tr>`
  ).join('');
  await sendEmail(
    teacher.email,
    `Planning du ${date}`,
    `<div style="font-family:Arial;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;color:white;padding:20px;text-align:center"><h2 style="margin:0">Planning du jour — ${date}</h2></div>
      <div style="padding:24px">
        <p>Bonjour <strong>${teacher.firstName}</strong>,</p>
        <p>Voici votre planning pour aujourd'hui :</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr style="background:#C8A951"><th style="padding:8px;border:1px solid #ddd;text-align:left">Horaire</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Module</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Groupe</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Salle</th></tr>
          ${rows}
        </table>
      </div>
      <div style="background:#f5f7fa;padding:12px;text-align:center;font-size:12px;color:#888">CampusOps — Université Euromed de Fès</div>
    </div>`
  );
}

export async function sendNewSessionEmail(teacher: { email: string; firstName: string }, session: { date: string | Date; startTime: string; endTime: string; type: string; module: { name: string }; group: { name: string }; room?: { name: string } | null }) {
  const date = new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  await sendEmail(
    teacher.email,
    `Nouvelle séance — ${session.module.name}`,
    `<div style="font-family:Arial;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;color:white;padding:20px;text-align:center"><h2 style="margin:0">Nouvelle séance planifiée</h2></div>
      <div style="padding:24px">
        <p>Bonjour <strong>${teacher.firstName}</strong>,</p>
        <p>Une nouvelle séance a été ajoutée à votre planning :</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold;width:40%">Module</td><td style="padding:10px;border-bottom:1px solid #eee">${session.module.name}</td></tr>
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold">Date</td><td style="padding:10px;border-bottom:1px solid #eee;text-transform:capitalize">${date}</td></tr>
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold">Horaire</td><td style="padding:10px;border-bottom:1px solid #eee">${session.startTime} – ${session.endTime}</td></tr>
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold">Groupe</td><td style="padding:10px;border-bottom:1px solid #eee">${session.group.name}</td></tr>
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold">Salle</td><td style="padding:10px;border-bottom:1px solid #eee">${session.room?.name || 'Non définie'}</td></tr>
          <tr><td style="padding:10px;background:#f5f7fa;font-weight:bold">Type</td><td style="padding:10px">${session.type}</td></tr>
        </table>
      </div>
      <div style="background:#f5f7fa;padding:12px;text-align:center;font-size:12px;color:#888">CampusOps — Université Euromed de Fès</div>
    </div>`
  );
}

export async function sendAbsenceNotification(studentEmail: string, moduleName: string, date: string) {
  await sendEmail(studentEmail, `Absence enregistrée - ${moduleName}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E3A5F; color: white; padding: 20px; text-align: center;">
        <h1>CampusOps - Université Euromed Fès</h1>
      </div>
      <div style="padding: 30px; background: #f5f7fa;">
        <h2>Absence enregistrée</h2>
        <p>Une absence a été enregistrée pour votre compte lors du cours de <strong>${moduleName}</strong> du <strong>${date}</strong>.</p>
        <p>Si cette absence est injustifiée, veuillez contacter votre scolarité.</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">Cet email est automatique. Ne pas répondre directement.</p>
      </div>
    </div>
  `);
}

export async function sendPaymentAlert(studentEmail: string, label: string, amount: number, dueDate: string) {
  await sendEmail(studentEmail, `Rappel paiement - ${label}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E3A5F; color: white; padding: 20px; text-align: center;">
        <h1>CampusOps - Université Euromed Fès</h1>
      </div>
      <div style="padding: 30px; background: #f5f7fa;">
        <h2 style="color: #e53e3e;">Rappel de paiement</h2>
        <p>Votre paiement <strong>"${label}"</strong> d'un montant de <strong>${amount} MAD</strong> était dû le <strong>${dueDate}</strong>.</p>
        <p>Veuillez régulariser votre situation auprès du service de scolarité.</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">Service de scolarité - Université Euromed de Fès</p>
      </div>
    </div>
  `);
}
