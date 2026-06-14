import { useQuery } from '@tanstack/react-query';
import { Calendar, UserX, CreditCard, TrendingUp, Users, Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { planningApi, absenceApi, paymentApi, usersApi, notificationApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function StatCard({ title, value, sub, icon: Icon, color, onClick }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; onClick?: () => void;
}) {
  return (
    <div className={`stat-card ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-all' : ''}`} onClick={onClick}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-euromed-navy mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const { data: todayData } = useQuery({ queryKey: ['planning-today'], queryFn: () => planningApi.getToday() });
  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.getAll(10) });
  const { data: payStatsData } = useQuery({ queryKey: ['payment-stats'], queryFn: () => paymentApi.getStats(), enabled: user?.role !== 'ETUDIANT' });
  const { data: usersData } = useQuery({ queryKey: ['users-count'], queryFn: () => usersApi.getAll({ limit: 1 }), enabled: user?.role === 'ADMIN' });
  const { data: absenceStatsData } = useQuery({ queryKey: ['absence-stats'], queryFn: () => absenceApi.getStats(), enabled: user?.role === 'ETUDIANT' });

  const todaySessions = todayData?.data?.data || [];
  const notifications = notifData?.data?.data?.notifications || [];
  const unread = notifData?.data?.data?.unreadCount || 0;
  const payStats = payStatsData?.data?.data;
  const absStats = absenceStatsData?.data?.data;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A1F3D 0%, #0D3B6E 50%, #0B4E3A 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-full opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #10B981 0%, transparent 60%)' }} />
        <p className="text-euromed-gold font-medium capitalize text-sm mb-1">{today}</p>
        <h1 className="text-2xl font-bold">{greeting()}, {user?.firstName} {user?.lastName}</h1>
        <p className="text-white/60 text-sm mt-1">
          {user?.role === 'ETUDIANT' ? 'Suivez votre parcours académique' :
           user?.role === 'ENSEIGNANT' ? 'Gérez vos cours et étudiants' :
           'Tableau de bord administratif - Université Euromed de Fès'}
        </p>
        <span className="inline-flex mt-3 px-3 py-1 bg-euromed-gold/20 text-euromed-gold text-xs rounded-full border border-euromed-gold/30">
          {user?.role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cours aujourd'hui" value={todaySessions.length}
          sub={todaySessions.length > 0 ? `${todaySessions[0]?.startTime} - premier cours` : 'Pas de cours'}
          icon={Calendar} color="bg-blue-100 text-blue-600" onClick={() => navigate('/planning')} />

        {user?.role === 'ETUDIANT' ? (
          <StatCard title="Absences ce mois" value={absStats?.monthTotal ?? 0}
            sub={`Total: ${absStats?.total ?? 0} absence(s)`}
            icon={UserX} color="bg-red-100 text-red-600" onClick={() => navigate('/absences')} />
        ) : (
          <StatCard title="Paiements en retard" value={payStats?.unpaid ?? 0}
            sub={`${payStats?.paid ?? 0} payés / ${payStats?.total ?? 0} total`}
            icon={CreditCard} color="bg-orange-100 text-orange-600" onClick={() => navigate('/payments')} />
        )}

        <StatCard title="Notifications" value={unread}
          sub={`${notifications.length} récentes`}
          icon={Bell} color="bg-purple-100 text-purple-600" onClick={() => navigate('/notifications')} />

        {user?.role === 'ADMIN' ? (
          <StatCard title="Utilisateurs" value={usersData?.data?.data?.pagination?.total ?? 0}
            sub="Tous rôles confondus"
            icon={Users} color="bg-green-100 text-green-600" onClick={() => navigate('/users')} />
        ) : (
          <StatCard title="Avancement moyen" value="62%"
            sub="Sur tous les modules"
            icon={TrendingUp} color="bg-teal-100 text-teal-600" onClick={() => navigate('/progress')} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's planning */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-euromed-navy flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Planning du jour
            </h2>
            <button onClick={() => navigate('/planning')} className="text-xs text-euromed-gold hover:underline">Voir tout</button>
          </div>
          <div className="p-4 space-y-3">
            {todaySessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun cours aujourd'hui</p>
              </div>
            ) : (
              todaySessions.slice(0, 5).map((s: Record<string, unknown>) => (
                <div key={s.id as string} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-euromed-cream/50 transition-colors">
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xs font-bold text-euromed-navy">{s.startTime as string}</p>
                    <p className="text-xs text-gray-400">{s.endTime as string}</p>
                  </div>
                  <div className="w-px h-full bg-euromed-gold/40 flex-shrink-0 mt-1" style={{ minHeight: '32px' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{(s.module as { name: string })?.name}</p>
                    <p className="text-xs text-gray-500">{(s.group as { name: string })?.name} · {(s.room as { name: string } | null)?.name || 'Non défini'}</p>
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ${s.type === 'CM' ? 'badge-blue' : s.type === 'TD' ? 'badge-green' : 'badge-yellow'}`}>
                    {s.type as string}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-euromed-navy flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications récentes
            </h2>
            <button onClick={() => navigate('/notifications')} className="text-xs text-euromed-gold hover:underline">Voir tout</button>
          </div>
          <div className="p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((n: Record<string, unknown>) => {
                const Icon = n.type === 'ABSENCE' ? AlertTriangle : n.type === 'PAIEMENT' ? CreditCard : n.type === 'PLANNING' ? Calendar : CheckCircle;
                const color = n.type === 'ABSENCE' ? 'text-red-500' : n.type === 'PAIEMENT' ? 'text-orange-500' : 'text-blue-500';
                return (
                  <div key={n.id as string} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${!n.isRead ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title as string}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body as string}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment summary (admin/scolarite only) */}
      {payStats && user?.role !== 'ETUDIANT' && user?.role !== 'ENSEIGNANT' && (
        <div className="card p-6">
          <h2 className="font-semibold text-euromed-navy mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Résumé des paiements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: payStats.totalAmount, color: 'text-euromed-navy', bg: 'bg-blue-50' },
              { label: 'Encaissé', value: payStats.paidAmount, color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Restant', value: payStats.totalAmount - payStats.paidAmount, color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Retards', value: payStats.unpaid, color: 'text-red-700', bg: 'bg-red-50', isCount: true },
            ].map(({ label, value, color, bg, isCount }) => (
              <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>
                  {isCount ? value : `${Number(value).toLocaleString('fr-FR')} MAD`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-gradient-gold rounded-full transition-all duration-500"
              style={{ width: `${payStats.totalAmount > 0 ? (payStats.paidAmount / payStats.totalAmount) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {payStats.totalAmount > 0 ? Math.round((payStats.paidAmount / payStats.totalAmount) * 100) : 0}% collecté
          </p>
        </div>
      )}
    </div>
  );
}
