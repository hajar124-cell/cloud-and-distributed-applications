import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, AlertTriangle, CheckCircle, Clock, Plus, Send, TrendingUp, Download, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_LABELS: Record<string, { label: string; class: string; icon: typeof CheckCircle }> = {
  PAYE: { label: 'Payé', class: 'badge-green', icon: CheckCircle },
  PARTIEL: { label: 'Partiel', class: 'badge-yellow', icon: Clock },
  IMPAYE: { label: 'Impayé', class: 'badge-red', icon: AlertTriangle },
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

async function downloadBlob(promise: Promise<{ data: Blob }>, filename: string) {
  try {
    const res = await promise;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Erreur lors de l\'export');
  }
}

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const isStudent = user?.role === 'ETUDIANT';

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', filter],
    queryFn: () => isStudent ? paymentApi.getByStudent() : paymentApi.getAll({ status: filter || undefined }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => paymentApi.getStats(),
    enabled: !isStudent,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => paymentApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['payment-stats'] }); toast.success('Statut mis à jour'); },
  });

  const reminderMutation = useMutation({
    mutationFn: () => paymentApi.sendReminders(),
    onSuccess: (res) => toast.success(`${res.data.data.sent} rappels envoyés`),
    onError: () => toast.error('Erreur envoi rappels'),
  });

  const payments = isStudent
    ? (paymentsData?.data?.data?.payments || [])
    : (paymentsData?.data?.data?.payments || []);
  const summary = isStudent ? paymentsData?.data?.data?.summary : null;
  const stats = statsData?.data?.data;

  const pieData = stats ? [
    { name: 'Payé', value: stats.paid },
    { name: 'Partiel', value: stats.partial },
    { name: 'Impayé', value: stats.unpaid },
  ] : [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Paiements</h1>
          <p className="page-subtitle">Gestion des frais de scolarité</p>
        </div>
        <div className="flex gap-2">
          {!isStudent && (
            <>
              <button onClick={() => downloadBlob(paymentApi.exportCSV(filter ? { status: filter } : {}), 'paiements.csv')}
                className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
                <Download className="w-4 h-4" /> Exporter CSV
              </button>
              <button onClick={() => reminderMutation.mutate()} disabled={reminderMutation.isPending}
                className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
                <Send className="w-4 h-4" />
                {reminderMutation.isPending ? 'Envoi...' : 'Envoyer rappels'}
              </button>
              {user?.role !== 'ENSEIGNANT' && (
                <>
                  <button onClick={() => setShowPlan(true)} className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
                    <Layers className="w-4 h-4" /> Plan de paiement
                  </button>
                  <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Nouveau paiement
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {isStudent && summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total dû', value: `${summary.total?.toLocaleString('fr-FR')} MAD`, color: 'bg-blue-50 text-blue-700' },
            { label: 'Payé', value: `${summary.paid?.toLocaleString('fr-FR')} MAD`, color: 'bg-green-50 text-green-700' },
            { label: 'Restant', value: `${summary.remaining?.toLocaleString('fr-FR')} MAD`, color: 'bg-orange-50 text-orange-700' },
            { label: 'Retards', value: summary.overdueCount, color: 'bg-red-50 text-red-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`card p-4 ${color}`}>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total recouvrement', value: `${stats.totalAmount?.toLocaleString('fr-FR')} MAD`, icon: CreditCard, color: 'bg-blue-100 text-blue-600' },
              { label: 'Encaissé', value: `${stats.paidAmount?.toLocaleString('fr-FR')} MAD`, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
              { label: 'Payés', value: stats.paid, icon: TrendingUp, color: 'bg-teal-100 text-teal-600' },
              { label: 'En retard', value: stats.unpaid, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-euromed-navy">{value}</p></div>
              </div>
            ))}
          </div>
          <div className="card p-4 flex flex-col items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Répartition</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-gray-600">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {!isStudent && (
        <div className="flex gap-2">
          {['', 'PAYE', 'PARTIEL', 'IMPAYE'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-euromed-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {s === '' ? 'Tous' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-euromed-navy">Paiements ({payments.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table-base">
              <thead>
                <tr>
                  {!isStudent && <th>Étudiant</th>}
                  <th>Libellé</th>
                  <th>Montant</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th>Payé le</th>
                  {!isStudent && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Record<string, unknown>) => {
                  const cfg = STATUS_LABELS[p.status as string];
                  const Icon = cfg?.icon || CheckCircle;
                  const isOverdue = p.status !== 'PAYE' && new Date(p.dueDate as string) < new Date();
                  return (
                    <tr key={p.id as string} className={isOverdue ? '!bg-red-50' : ''}>
                      {!isStudent && (
                        <td>
                          <p className="font-medium">{(p.student as { firstName: string; lastName: string })?.firstName} {(p.student as { firstName: string; lastName: string })?.lastName}</p>
                          <p className="text-xs text-gray-400">{(p.student as { email: string })?.email}</p>
                        </td>
                      )}
                      <td>
                        <span className="font-medium">{p.label as string}</span>
                        {isOverdue && <span className="ml-2 badge badge-red text-xs">En retard</span>}
                      </td>
                      <td className="font-semibold">{Number(p.amount).toLocaleString('fr-FR')} MAD</td>
                      <td>{new Date(p.dueDate as string).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span className={`badge gap-1 ${cfg?.class || 'badge-gray'}`}>
                          <Icon className="w-3 h-3" />
                          {cfg?.label || p.status as string}
                        </span>
                      </td>
                      <td className="text-gray-500">{p.paidAt ? new Date(p.paidAt as string).toLocaleDateString('fr-FR') : '-'}</td>
                      {!isStudent && (
                        <td>
                          {p.status !== 'PAYE' && (
                            <button onClick={() => updateMutation.mutate({ id: p.id as string, status: 'PAYE' })}
                              className="text-xs text-green-600 hover:underline font-medium">
                              Marquer payé
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreatePaymentModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['payments'] }); }} />}
      {showPlan && <PaymentPlanModal onClose={() => setShowPlan(false)} onSuccess={() => { setShowPlan(false); qc.invalidateQueries({ queryKey: ['payments'] }); }} />}
    </div>
  );
}

function CreatePaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ studentId: '', label: 'Frais de scolarité', amount: '', dueDate: '', notes: '' });
  const { data: studentsData } = useQuery({ queryKey: ['students'], queryFn: () => import('../services/api').then(m => m.usersApi.getAll({ role: 'ETUDIANT', limit: 200 })) });
  const students = studentsData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentApi.create(data),
    onSuccess: () => { toast.success('Paiement créé'); onSuccess(); },
    onError: () => toast.error('Erreur création'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy">Nouveau paiement</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Étudiant</label>
            <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className="input-field text-sm">
              <option value="">Sélectionner...</option>
              {(students as { id: string; firstName: string; lastName: string }[]).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (MAD)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input-field text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button onClick={() => mutation.mutate({ ...form, amount: parseFloat(form.amount) } as Record<string, unknown>)}
              disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentPlanModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ studentId: '', label: 'Frais de scolarité', totalAmount: '', installments: '3', startDate: new Date().toISOString().split('T')[0] });
  const { data: studentsData } = useQuery({ queryKey: ['students'], queryFn: () => import('../services/api').then(m => m.usersApi.getAll({ role: 'ETUDIANT', limit: 200 })) });
  const students = studentsData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: () => paymentApi.createPlan({ ...form, totalAmount: parseFloat(form.totalAmount), installments: parseInt(form.installments) } as Record<string, unknown>),
    onSuccess: (res) => { toast.success(res.data.message || 'Plan créé'); onSuccess(); },
    onError: () => toast.error('Erreur création du plan'),
  });

  const perInstallment = form.totalAmount && form.installments
    ? (parseFloat(form.totalAmount) / parseInt(form.installments)).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy flex items-center gap-2"><Layers className="w-4 h-4" /> Plan de paiement</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Étudiant</label>
            <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className="input-field text-sm">
              <option value="">Sélectionner...</option>
              {(students as { id: string; firstName: string; lastName: string }[]).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant total (MAD)</label>
              <input type="number" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nb versements</label>
              <select value={form.installments} onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} className="input-field text-sm">
                {['2','3','4','6','10','12'].map(n => <option key={n} value={n}>{n} versements</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date du 1er versement</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field text-sm" />
          </div>
          {perInstallment && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              → {form.installments} versements de <strong>{perInstallment} MAD</strong> / mois
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.studentId || !form.totalAmount} className="btn-primary flex-1">
              {mutation.isPending ? 'Création...' : 'Créer le plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
