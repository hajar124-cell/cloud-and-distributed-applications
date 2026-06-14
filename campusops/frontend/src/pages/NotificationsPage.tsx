import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, AlertTriangle, CreditCard, Calendar, Info, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationApi } from '../services/api';

const TYPE_CONFIG: Record<string, { icon: typeof Bell; class: string; label: string }> = {
  ABSENCE: { icon: AlertTriangle, class: 'text-red-500 bg-red-50', label: 'Absence' },
  PAIEMENT: { icon: CreditCard, class: 'text-orange-500 bg-orange-50', label: 'Paiement' },
  PLANNING: { icon: Calendar, class: 'text-blue-500 bg-blue-50', label: 'Planning' },
  SYSTEME: { icon: Info, class: 'text-gray-500 bg-gray-50', label: 'Système' },
  EMAIL_ENTRANT: { icon: Mail, class: 'text-purple-500 bg-purple-50', label: 'Email' },
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.getAll(50) });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Toutes marquées comme lues'); },
  });

  const markMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data?.data?.notifications || [];
  const unread = data?.data?.data?.unreadCount || 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} non lue(s)` : 'Tout est lu'}</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}
            className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
            <CheckCheck className="w-4 h-4" /> Tout marquer lu
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucune notification</p>
          <p className="text-sm mt-1">Les alertes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(notifications as { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string }[]).map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEME;
            const Icon = cfg.icon;
            return (
              <div key={n.id}
                onClick={() => !n.isRead && markMutation.mutate(n.id)}
                className={`card px-5 py-4 flex items-start gap-4 transition-all cursor-pointer hover:shadow-card-hover
                  ${!n.isRead ? 'border-l-4 border-euromed-navy bg-blue-50/30' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.class}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`badge text-xs mb-1 ${n.type === 'ABSENCE' ? 'badge-red' : n.type === 'PAIEMENT' ? 'badge-yellow' : n.type === 'EMAIL_ENTRANT' ? 'badge-blue' : 'badge-gray'}`}>
                        {cfg.label}
                      </span>
                      <p className="font-semibold text-gray-800">{n.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {!n.isRead && <div className="w-2.5 h-2.5 bg-euromed-navy rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
