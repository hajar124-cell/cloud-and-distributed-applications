import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import * as planningService from '../services/planning.service';
import * as absenceService from '../services/absence.service';
import * as progressService from '../services/progress.service';
import { logger } from '../utils/logger';

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN non défini. Bot Telegram désactivé.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  logger.info('Bot Telegram démarré');

  bot.onText(/\/start/, handleStart);
  bot.onText(/\/help/, handleHelp);
  bot.onText(/\/link (.+)/, handleLink);
  bot.onText(/\/today/, handleToday);
  bot.onText(/\/week/, handleWeek);
  bot.onText(/\/absence/, handleAbsence);
  bot.onText(/\/progress/, handleProgress);
  bot.onText(/\/otp/, handleRequestOtp);

  bot.on('polling_error', (err) => logger.error('Telegram polling error', err));

  return bot;
}

async function getAuthUser(chatId: number) {
  return prisma.user.findFirst({ where: { telegramChatId: String(chatId) } });
}

async function handleStart(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const user = await getAuthUser(chatId);

  if (user) {
    await bot!.sendMessage(chatId, `Bonjour ${user.firstName} ! Vous êtes connecté(e) à CampusOps.\n\nUtilisez /help pour voir les commandes disponibles.`);
  } else {
    await bot!.sendMessage(chatId, `Bienvenue sur le bot CampusOps - Université Euromed de Fès!\n\nPour vous connecter:\n1. Connectez-vous sur l'application web\n2. Allez dans "Mon Profil"\n3. Cliquez "Lier Telegram"\n4. Envoyez le code OTP avec /link <CODE>\n\nExemple: /link 123456`);
  }
}

async function handleHelp(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const helpText = `*CampusOps Bot - Commandes:*\n\n` +
    `/today - Planning du jour\n` +
    `/week - Planning de la semaine\n` +
    `/absence - Mes absences du mois\n` +
    `/progress - Mon avancement pédagogique\n` +
    `/help - Afficher cette aide\n\n` +
    `_Université Euromed de Fès_`;
  await bot!.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

async function handleRequestOtp(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  await bot!.sendMessage(chatId, `Pour générer un code OTP, connectez-vous sur l'application web et allez dans votre profil > "Lier Telegram".`);
}

async function handleLink(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  const chatId = msg.chat.id;
  const otp = match?.[1]?.trim();
  if (!otp) {
    await bot!.sendMessage(chatId, 'Format incorrect. Exemple: /link 123456');
    return;
  }

  const user = await prisma.user.findFirst({
    where: { telegramOtp: otp, otpExpiresAt: { gt: new Date() } },
  });

  if (!user) {
    await bot!.sendMessage(chatId, 'Code invalide ou expiré. Veuillez générer un nouveau code depuis l\'application.');
    return;
  }

  // Libérer l'ancien compte lié à ce chatId si besoin
  await prisma.user.updateMany({
    where: { telegramChatId: String(chatId), id: { not: user.id } },
    data: { telegramChatId: null },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: String(chatId), telegramOtp: null, otpExpiresAt: null },
  });

  await bot!.sendMessage(chatId, `Compte lié avec succès ! Bonjour ${user.firstName} ${user.lastName}.\n\nUtilisez /help pour voir les commandes disponibles.`);
}

async function handleToday(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const user = await getAuthUser(chatId);

  if (!user) {
    await bot!.sendMessage(chatId, 'Vous devez d\'abord lier votre compte. Envoyez /start pour les instructions.');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[];

    if (user.role === 'ENSEIGNANT') {
      sessions = await planningService.getSessionsByTeacher(user.id, today, today);
    } else {
      sessions = await planningService.getSessionsByStudent(user.id, today, today);
    }

    if (sessions.length === 0) {
      await bot!.sendMessage(chatId, `Aucun cours aujourd\'hui (${new Date().toLocaleDateString('fr-FR')}).`);
      return;
    }

    let text = `*Planning du ${new Date().toLocaleDateString('fr-FR')}*\n\n`;
    for (const s of sessions) {
      text += `🕐 ${s.startTime} - ${s.endTime}\n`;
      text += `📚 ${(s as { module: { name: string } }).module.name}\n`;
      text += `👥 ${'group' in s ? (s as { group: { name: string } }).group.name : ''}\n`;
      text += `🏛 ${'room' in s && (s as { room?: { name: string } }).room ? (s as { room: { name: string } }).room.name : 'Non défini'}\n\n`;
    }

    await bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    await bot!.sendMessage(chatId, `Erreur: ${(err as Error).message}`);
  }
}

async function handleWeek(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const user = await getAuthUser(chatId);

  if (!user) {
    await bot!.sendMessage(chatId, 'Vous devez d\'abord lier votre compte. Envoyez /start pour les instructions.');
    return;
  }

  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const startDate = monday.toISOString().split('T')[0];
    const endDate = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[];
    if (user.role === 'ENSEIGNANT') {
      sessions = await planningService.getSessionsByTeacher(user.id, startDate, endDate);
    } else {
      sessions = await planningService.getSessionsByStudent(user.id, startDate, endDate);
    }

    if (sessions.length === 0) {
      await bot!.sendMessage(chatId, 'Aucun cours cette semaine.');
      return;
    }

    const grouped = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const dateKey = new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(s);
    }

    let text = `*Planning de la semaine*\n\n`;
    for (const [day, daySessions] of grouped) {
      text += `📅 *${day}*\n`;
      for (const s of daySessions) {
        text += `  • ${s.startTime}-${s.endTime} | ${(s as { module: { name: string } }).module.name}\n`;
      }
      text += '\n';
    }

    await bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    await bot!.sendMessage(chatId, `Erreur: ${(err as Error).message}`);
  }
}

async function handleAbsence(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const user = await getAuthUser(chatId);

  if (!user) {
    await bot!.sendMessage(chatId, 'Vous devez d\'abord lier votre compte.');
    return;
  }

  try {
    const now = new Date();
    const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (user.role === 'ENSEIGNANT') {
      const stats = await absenceService.getAbsenceStatsForTeacher(user.id);
      let text = `*Absences de mes séances — ${monthName}*\n\n`;
      text += `Ce mois: *${stats.monthTotal}* absence(s)\n`;
      text += `Total: *${stats.total}* absence(s)\n`;
      text += `Justifiées: *${stats.justified}*\n`;
      await bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } else {
      const stats = await absenceService.getAbsenceStats(user.id);
      let text = `*Mes absences — ${monthName}*\n\n`;
      text += `Ce mois: *${stats.monthTotal}* absence(s)\n`;
      text += `Total: *${stats.total}* absence(s)\n`;
      text += `Justifiées: *${stats.justified}*\n\n`;
      if (stats.byStatus.length > 0) {
        text += `*Détail:*\n`;
        for (const s of stats.byStatus as { status: string; _count: { status: number } }[]) {
          const emoji = s.status === 'ABSENT' ? '❌' : s.status === 'RETARD' ? '⏰' : '✅';
          text += `${emoji} ${s.status}: ${s._count.status}\n`;
        }
      }
      await bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot!.sendMessage(chatId, `Erreur: ${(err as Error).message}`);
  }
}

async function handleProgress(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const user = await getAuthUser(chatId);

  if (!user) {
    await bot!.sendMessage(chatId, 'Vous devez d\'abord lier votre compte.');
    return;
  }

  try {
    const progressList = user.role === 'ENSEIGNANT'
      ? await progressService.getProgressByTeacher(user.id)
      : await progressService.getProgressByStudent(user.id);

    if (progressList.length === 0) {
      await bot!.sendMessage(chatId, 'Aucun module en cours.');
      return;
    }

    const title = user.role === 'ENSEIGNANT' ? '*Avancement de mes groupes*' : '*Mon avancement pédagogique*';
    let text = `${title}\n\n`;
    for (const p of progressList) {
      const pct = Math.round(p.percentage);
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      text += `📖 *${(p as { module: { name: string } }).module.name}*`;
      if (user.role === 'ENSEIGNANT') text += ` — ${(p as unknown as { group: { name: string } }).group.name}`;
      text += `\n${bar} ${pct}%\n`;
      text += `Chapitres: ${p.chaptersDone}/${p.chaptersTotal}\n\n`;
    }

    await bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    await bot!.sendMessage(chatId, `Erreur: ${(err as Error).message}`);
  }
}

export async function generateOtpForUser(userId: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { telegramOtp: otp, otpExpiresAt: expiresAt },
  });

  return otp;
}

export async function sendTelegramNotification(chatId: string, message: string) {
  if (!bot) return;
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Telegram notification error for chatId ${chatId}`, err as Error);
  }
}

export { bot };
