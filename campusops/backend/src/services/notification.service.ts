import { prisma } from '../utils/prisma';
const NotificationType = { PLANNING: 'PLANNING', ABSENCE: 'ABSENCE', PAIEMENT: 'PAIEMENT', SYSTEME: 'SYSTEME', EMAIL_ENTRANT: 'EMAIL_ENTRANT' } as const;
type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export async function createNotification(userId: string, type: NotificationType | string, title: string, body: string, metadata?: Record<string, unknown>) {
  return prisma.notification.create({ data: { userId, type: type as NotificationType, title, body, metadata: metadata ? JSON.stringify(metadata) : undefined } });
}

export async function getNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function notifyAbsence(studentId: string, moduleName: string, date: string) {
  return createNotification(
    studentId,
    NotificationType.ABSENCE,
    'Absence enregistrée',
    `Une absence a été enregistrée pour le cours de ${moduleName} du ${date}.`
  );
}

export async function notifyPaymentOverdue(studentId: string, label: string, amount: number) {
  return createNotification(
    studentId,
    NotificationType.PAIEMENT,
    'Paiement en retard',
    `Votre paiement "${label}" d'un montant de ${amount} MAD est en retard. Veuillez régulariser votre situation.`
  );
}
