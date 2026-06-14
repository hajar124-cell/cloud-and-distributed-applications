import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { JwtPayload, Role } from '../types';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new Error('Identifiants invalides');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Identifiants invalides');

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role as Role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = uuidv4();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info(`Connexion réussie: ${email}`);
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar },
  };
}

export async function refresh(refreshToken: string) {
  const token = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });
  if (!token || token.expiresAt < new Date()) throw new Error('Token de rafraîchissement invalide');

  const payload: JwtPayload = { userId: token.user.id, email: token.user.email, role: token.user.role as Role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  return { accessToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function sendPasswordResetEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const token = uuidv4();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"CampusOps Euromed Fès" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - CampusOps',
    html: `
      <div style="font-family:Arial;max-width:600px;margin:0 auto">
        <div style="background:#1E3A5F;color:white;padding:20px;text-align:center">
          <h1>CampusOps - Euromed Fès</h1>
        </div>
        <div style="padding:30px;background:#f5f7fa">
          <h2>Réinitialisation du mot de passe</h2>
          <p>Bonjour ${user.firstName},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valide 1 heure) :</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${resetUrl}" style="background:#C8A951;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#666;font-size:12px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      </div>
    `,
  }).catch(() => logger.warn(`Email non envoyé (SMTP non configuré) - Token reset: ${token}`));

  logger.info(`Reset password requested for ${email}`);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) throw new Error('Token invalide ou expiré');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  logger.info(`Password reset for ${user.email}`);
}

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, avatar: true, createdAt: true },
  });
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, avatar: true },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Utilisateur introuvable');
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error('Mot de passe actuel incorrect');
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}
