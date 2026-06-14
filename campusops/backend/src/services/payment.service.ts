import { prisma } from '../utils/prisma';
const PaymentStatus = { PAYE: 'PAYE', PARTIEL: 'PARTIEL', IMPAYE: 'IMPAYE' } as const;
type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export async function getPaymentsByStudent(studentId: string) {
  return prisma.payment.findMany({
    where: { studentId },
    orderBy: { dueDate: 'asc' },
  });
}

export async function getOverduePayments() {
  return prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.IMPAYE, PaymentStatus.PARTIEL] },
      dueDate: { lt: new Date() },
    },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true, telegramChatId: true, phone: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  });
}

export async function createPayment(data: {
  studentId: string; label: string; amount: number; dueDate: string; notes?: string;
}) {
  return prisma.payment.create({ data: { ...data, dueDate: new Date(data.dueDate) } });
}

export async function updatePaymentStatus(id: string, status: PaymentStatus, method?: string, reference?: string) {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      paidAt: status === PaymentStatus.PAYE ? new Date() : undefined,
      method,
      reference,
    },
  });
}

export async function getPaymentSummary(studentId: string) {
  const payments = await prisma.payment.findMany({ where: { studentId } });
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const paid = payments.filter((p) => p.status === PaymentStatus.PAYE).reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status !== PaymentStatus.PAYE && p.dueDate < new Date());
  return { total, paid, remaining: total - paid, overdueCount: overdue.length };
}

export async function getAllPaymentsStats() {
  const [total, paid, partial, unpaid] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.count({ where: { status: PaymentStatus.PAYE } }),
    prisma.payment.count({ where: { status: PaymentStatus.PARTIEL } }),
    prisma.payment.count({ where: { status: PaymentStatus.IMPAYE } }),
  ]);
  const amounts = await prisma.payment.aggregate({ _sum: { amount: true } });
  const paidAmounts = await prisma.payment.aggregate({ where: { status: PaymentStatus.PAYE }, _sum: { amount: true } });
  return { total, paid, partial, unpaid, totalAmount: amounts._sum.amount || 0, paidAmount: paidAmounts._sum.amount || 0 };
}
