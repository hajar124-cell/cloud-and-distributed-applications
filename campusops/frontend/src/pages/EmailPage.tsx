import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw, Send, Inbox, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailApi } from '../services/api';

interface EmailLog {
  id: string; subject: string; fromAddress: string; toAddress?: string; preview?: string; direction: string; createdAt: string; processedAt?: string;
}

export default function EmailPage() {
  const qc = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState<EmailLog | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['emails'], queryFn: () => emailApi.getLatest(20) });

  const syncMutation = useMutation({
    mutationFn: () => emailApi.sync(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emails'] }); toast.success('Emails synchronisés'); },
    onError: () => toast.error('Erreur synchronisation - vérifiez la configuration IMAP'),
  });

  const emails: EmailLog[] = data?.data?.data || [];
  const inbox = emails.filter(e => e.direction === 'INBOUND');
  const sent = emails.filter(e => e.direction === 'OUTBOUND');

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Messagerie Email</h1>
          <p className="page-subtitle">Lecture IMAP et envoi SMTP sans navigateur</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
            className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Sync...' : 'Synchroniser'}
          </button>
          <button onClick={() => setShowCompose(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Send className="w-4 h-4" /> Composer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Reçus', value: inbox.length, icon: Inbox, color: 'bg-blue-100 text-blue-600' },
          { label: 'Envoyés', value: sent.length, icon: ArrowUpRight, color: 'bg-green-100 text-green-600' },
          { label: 'Total', value: emails.length, icon: Mail, color: 'bg-purple-100 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-euromed-navy">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email list */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-euromed-navy" />
            <h2 className="font-semibold text-euromed-navy">Derniers emails reçus</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="w-6 h-6 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" />
            </div>
          ) : inbox.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun email reçu</p>
              <p className="text-xs mt-1">Configurez IMAP dans le fichier .env</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inbox.map(e => (
                <div key={e.id} onClick={() => setSelected(e)}
                  className={`px-6 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${selected?.id === e.id ? 'bg-euromed-cream/50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-800 truncate">{e.subject}</p>
                      <p className="text-xs text-gray-500 truncate">De: {e.fromAddress}</p>
                      {e.preview && <p className="text-xs text-gray-400 truncate mt-0.5">{e.preview}</p>}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{new Date(e.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email viewer / Sent */}
        <div className="card">
          {selected ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-euromed-navy truncate flex-1">{selected.subject}</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm ml-2">✕</button>
              </div>
              <div className="p-6">
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 text-sm"><span className="text-gray-500 w-16">De:</span><span className="font-medium">{selected.fromAddress}</span></div>
                  <div className="flex gap-2 text-sm"><span className="text-gray-500 w-16">Date:</span><span>{new Date(selected.createdAt).toLocaleString('fr-FR')}</span></div>
                </div>
                <hr className="mb-4" />
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{selected.preview || 'Aperçu non disponible'}</div>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-euromed-navy" />
                <h2 className="font-semibold text-euromed-navy">Emails envoyés</h2>
              </div>
              {sent.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun email envoyé</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sent.map(e => (
                    <div key={e.id} className="px-6 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-800 truncate">{e.subject}</p>
                          <p className="text-xs text-gray-500 truncate">À: {e.toAddress}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0">{new Date(e.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSuccess={() => { setShowCompose(false); qc.invalidateQueries({ queryKey: ['emails'] }); }} />}
    </div>
  );
}

function ComposeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ to: '', subject: '', text: '' });
  const mutation = useMutation({
    mutationFn: () => emailApi.send({ to: form.to, subject: form.subject, text: form.text }),
    onSuccess: () => { toast.success('Email envoyé'); onSuccess(); },
    onError: () => toast.error('Erreur envoi - vérifiez la configuration SMTP'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy flex items-center gap-2"><Mail className="w-4 h-4" /> Nouveau message</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire *</label>
            <input type="email" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} className="input-field text-sm" placeholder="email@exemple.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={6} className="input-field text-sm resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              {mutation.isPending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
