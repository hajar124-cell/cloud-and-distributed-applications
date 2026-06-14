import { Response } from 'express';
import { AuthRequest } from '../types';
type PaymentStatus = 'PAYE' | 'PARTIEL' | 'IMPAYE';
import * as paymentService from '../services/payment.service';
import * as notifService from '../services/notification.service';
import * as emailService from '../services/email.service';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export async function getPayments(req: AuthRequest, res: Response) {
  const studentId = req.params.studentId || req.user!.userId;
  const payments = await paymentService.getPaymentsByStudent(studentId);
  const summary = await paymentService.getPaymentSummary(studentId);
  return sendSuccess(res, { payments, summary });
}

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const payment = await paymentService.createPayment(req.body);
    return sendSuccess(res, payment, 'Paiement créé', 201);
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function updatePaymentStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, method, reference } = req.body;
    const payment = await paymentService.updatePaymentStatus(id, status as PaymentStatus, method, reference);
    return sendSuccess(res, payment, 'Statut mis à jour');
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function getOverdue(req: AuthRequest, res: Response) {
  const overdueList = await paymentService.getOverduePayments();
  return sendSuccess(res, overdueList);
}

export async function sendPaymentReminders(req: AuthRequest, res: Response) {
  try {
    const overdueList = await paymentService.getOverduePayments();
    let count = 0;
    for (const payment of overdueList) {
      await notifService.notifyPaymentOverdue(payment.studentId, payment.label, payment.amount);
      if (payment.student?.email) {
        emailService.sendPaymentAlert(payment.student.email, payment.label, payment.amount, payment.dueDate.toLocaleDateString('fr-FR')).catch(() => {});
      }
      count++;
    }
    return sendSuccess(res, { sent: count }, `${count} rappels envoyés`);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getStats(req: AuthRequest, res: Response) {
  const stats = await paymentService.getAllPaymentsStats();
  return sendSuccess(res, stats);
}

export async function exportPaymentsCSV(req: AuthRequest, res: Response) {
  const status = req.query.status as string | undefined;
  const payments = await prisma.payment.findMany({
    where: status ? { status } : {},
    include: { student: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { dueDate: 'asc' },
  });

  const header = 'Étudiant,Email,Libellé,Montant (MAD),Date échéance,Statut,Payé le,Méthode\n';
  const rows = payments.map((p) => [
    `${p.student?.firstName} ${p.student?.lastName}`,
    p.student?.email || '',
    p.label,
    p.amount,
    new Date(p.dueDate).toLocaleDateString('fr-FR'),
    p.status,
    p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : '',
    p.method || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="paiements.csv"');
  res.send('﻿' + header + rows);
}

export async function createPaymentPlan(req: AuthRequest, res: Response) {
  try {
    const { studentId, totalAmount, installments, startDate, label } = req.body;
    if (!studentId || !totalAmount || !installments || !startDate) return sendError(res, 'Paramètres manquants', 400);
    const count = parseInt(installments);
    const amount = Math.round((parseFloat(totalAmount) / count) * 100) / 100;
    const payments = [];
    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      payments.push(await prisma.payment.create({
        data: { studentId, label: `${label || 'Frais de scolarité'} — Versement ${i + 1}/${count}`, amount, dueDate, status: 'IMPAYE' },
      }));
    }
    return sendSuccess(res, payments, `Plan de ${count} versements créé`);
  } catch (err) {
    return sendError(res, (err as Error).message, 400);
  }
}

export async function getAllPayments(req: AuthRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const status = req.query.status as PaymentStatus | undefined;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: status ? { status } : {},
      skip: (page - 1) * limit,
      take: limit,
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.payment.count({ where: status ? { status } : {} }),
  ]);

  return sendSuccess(res, { payments, total, page, totalPages: Math.ceil(total / limit) });
}
