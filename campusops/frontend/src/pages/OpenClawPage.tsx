import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Zap, Send, Calendar, CreditCard, AlertTriangle, CheckCircle, ExternalLink, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { openclawApi } from '../services/api';

interface WebhookDef {
  label: string;
  description: string;
  path: string;
  icon: typeof Zap;
  color: string;
  mutation: () => Promise<unknown>;
}

export default function OpenClawPage() {
  const [lastResult, setLastResult] = useState<{ webhook: string; result: unknown } | null>(null);

  const { data: statusData, isLoading } = useQuery({ queryKey: ['openclaw-status'], queryFn: () => openclawApi.getStatus() });
  const status = statusData?.data?.data;

  const planningMutation = useMutation({
    mutationFn: () => openclawApi.triggerDailyPlanning(),
    onSuccess: (res) => { setLastResult({ webhook: 'Planning journalier', result: res.data }); toast.success('Planning envoyé aux enseignants'); },
    onError: () => toast.error('Erreur - vérifiez le secret OpenClaw'),
  });

  const paymentMutation = useMutation({
    mutationFn: () => openclawApi.triggerPaymentReminders(),
    onSuccess: (res) => { setLastResult({ webhook: 'Rappels paiements', result: res.data }); toast.success('Rappels envoyés'); },
    onError: () => toast.error('Erreur - vérifiez le secret OpenClaw'),
  });

  const webhooks: WebhookDef[] = [
    {
      label: 'Planning journalier',
      description: 'Envoie le planning du jour par email à tous les enseignants. Déclenché automatiquement chaque matin à 7h.',
      path: '/api/openclaw/daily-planning',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
      mutation: () => planningMutation.mutateAsync(),
    },
    {
      label: 'Rappels paiements',
      description: 'Envoie des notifications et emails aux étudiants ayant des paiements en retard.',
      path: '/api/openclaw/payment-reminders',
      icon: CreditCard,
      color: 'bg-orange-100 text-orange-600',
      mutation: () => paymentMutation.mutateAsync(),
    },
    {
      label: 'Alerte absence',
      description: 'Webhook déclenché automatiquement lors de l\'enregistrement d\'une absence pour notifier l\'étudiant.',
      path: '/api/openclaw/absence-alert',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
      mutation: async () => { toast('Ce webhook est déclenché automatiquement à l\'enregistrement d\'une absence', { icon: 'ℹ️' }); },
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Zap className="w-6 h-6 text-euromed-gold" /> OpenClaw
        </h1>
        <p className="page-subtitle">Orchestration et automatisation des workflows</p>
      </div>

      {/* Status */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLoading ? 'bg-gray-100' : status ? 'bg-green-100' : 'bg-red-100'}`}>
            <Server className={`w-6 h-6 ${isLoading ? 'text-gray-400' : status ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h2 className="font-semibold text-euromed-navy">Statut de l'intégration</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${status ? 'text-green-600' : 'text-red-600'}`}>
                {isLoading ? 'Vérification...' : status ? 'En ligne' : 'Hors ligne'}
              </span>
              {status?.version && <span className="text-xs text-gray-400">v{status.version}</span>}
            </div>
          </div>
          {status?.timestamp && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">Dernière vérification</p>
              <p className="text-sm text-gray-600">{new Date(status.timestamp).toLocaleTimeString('fr-FR')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Architecture */}
      <div className="card p-6">
        <h2 className="font-semibold text-euromed-navy mb-4">Architecture du flux</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'OpenClaw', sub: 'Orchestrateur', color: 'bg-euromed-navy text-white' },
            { label: '→', sub: '', color: 'text-gray-400 bg-transparent shadow-none' },
            { label: 'CampusOps API', sub: 'Webhook endpoint', color: 'bg-euromed-gold/20 text-euromed-navy border border-euromed-gold/40' },
            { label: '→', sub: '', color: 'text-gray-400 bg-transparent shadow-none' },
            { label: 'Services', sub: 'Email / Notif', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
            { label: '→', sub: '', color: 'text-gray-400 bg-transparent shadow-none' },
            { label: 'Canaux', sub: 'Email / Telegram', color: 'bg-green-50 text-green-700 border border-green-200' },
          ].map((node, i) => (
            <div key={i} className={`px-4 py-2 rounded-xl text-center text-sm font-medium shadow-sm ${node.color}`}>
              <p>{node.label}</p>
              {node.sub && <p className="text-xs opacity-70">{node.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {webhooks.map((wh) => {
          const Icon = wh.icon;
          const isPending = wh.path.includes('planning') ? planningMutation.isPending : wh.path.includes('payment') ? paymentMutation.isPending : false;
          return (
            <div key={wh.path} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wh.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-euromed-navy">{wh.label}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">{wh.description}</p>
              <div className="bg-gray-50 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 bg-blue-100 text-blue-700 px-2 py-0.5 rounded">POST</span>
                  <code className="text-xs text-gray-600 truncate">{wh.path}</code>
                </div>
              </div>
              <button onClick={() => wh.mutation()} disabled={isPending}
                className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2">
                {isPending ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exécution...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" />Déclencher</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Result */}
      {lastResult && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-euromed-navy">Résultat: {lastResult.webhook}</h3>
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-48">
            {JSON.stringify(lastResult.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Config hint */}
      <div className="card p-5 border-l-4 border-euromed-gold bg-euromed-cream/30">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-euromed-gold flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-euromed-navy">Configuration OpenClaw</p>
            <p className="text-sm text-gray-600 mt-1">
              Pour connecter OpenClaw, configurez ces webhooks dans votre workflow OpenClaw avec le header
              <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">x-openclaw-secret: votre_secret</code>
              défini dans le fichier <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">.env</code> (variable <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">OPENCLAW_SECRET</code>).
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Planification automatique: Planning du jour → tous les matins à 7h · Rappels paiements → tous les lundis à 9h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
