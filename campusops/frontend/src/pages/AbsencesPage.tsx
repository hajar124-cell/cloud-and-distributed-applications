import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX, AlertTriangle, Clock, CheckCircle, Users, Search, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { absenceApi, usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Absence {
  id: string; status: string; justification?: string; recordedAt: string;
  session: { date: string; startTime: string; endTime: string; module: { name: string } };
  student?: { firstName: string; lastName: string; email: string };
}

const STATUS_CONFIG = {
  PRESENT: { label: 'Présent', icon: CheckCircle, class: 'badge-green', color: 'text-green-600' },
  ABSENT: { label: 'Absent', icon: AlertTriangle, class: 'badge-red', color: 'text-red-600' },
  RETARD: { label: 'Retard', icon: Clock, class: 'badge-yellow', color: 'text-yellow-600' },
};

function JustifyModal({ absenceId, onClose, onSuccess }: { absenceId: string; onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState('');
  const mutation = useMutation({
    mutationFn: () => absenceApi.justify(absenceId, text.trim()),
    onSuccess: () => { toast.success('Absence justifiée'); onSuccess(); onClose(); },
    onError: () => toast.error('Erreur lors de la justification'),
  });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy flex items-center gap-2">
            <FileText className="w-4 h-4" /> Justifier l'absence
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            className="input-field w-full text-sm resize-none"
            rows={4}
            placeholder="Motif de justification (ex: certificat médical, raison familiale...)"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!text.trim() || mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default function AbsencesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [search, setSearch] = useState('');
  const [justifyAbsenceId, setJustifyAbsenceId] = useState<string | null>(null);

  const isStudent = user?.role === 'ETUDIANT';

  const { data: absencesData, isLoading } = useQuery({
    queryKey: ['absences', isStudent ? 'student' : `group-${selectedGroup}`],
    queryFn: () => isStudent ? absenceApi.getByStudent() : selectedGroup ? absenceApi.getByGroup(selectedGroup) : absenceApi.getByStudent(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['absence-stats'],
    queryFn: () => absenceApi.getStats(),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.getGroups(),
    enabled: !isStudent,
  });


  const absences: Absence[] = absencesData?.data?.data || [];
  const stats = statsData?.data?.data;
  const groups = groupsData?.data?.data || [];

  const filtered = absences.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.session?.module?.name?.toLowerCase().includes(q) ||
           a.student?.firstName?.toLowerCase().includes(q) ||
           a.student?.lastName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Absences & Présences</h1>
          <p className="page-subtitle">Suivi des présences et justificatifs</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SCOLARITE' || user?.role === 'ENSEIGNANT') && (
          <button onClick={() => downloadBlob(absenceApi.exportCSV(selectedGroup ? { groupId: selectedGroup } : {}), 'absences.csv')}
            className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total absences', value: stats?.total ?? 0, icon: UserX, color: 'bg-red-100 text-red-600' },
          { label: 'Ce mois', value: stats?.monthTotal ?? 0, icon: AlertTriangle, color: 'bg-orange-100 text-orange-600' },
          { label: 'Justifiées', value: stats?.justified ?? 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
          { label: 'Non justifiées', value: (stats?.total ?? 0) - (stats?.justified ?? 0), icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-euromed-navy">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          {!isStudent && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="input-field w-40 text-sm py-2">
                <option value="">Tous les groupes</option>
                {(groups as { id: string; name: string }[]).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-euromed-navy">Historique des absences ({filtered.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune absence enregistrée</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table-base">
              <thead>
                <tr>
                  {!isStudent && <th>Étudiant</th>}
                  <th>Module</th>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Statut</th>
                  <th>Justification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const cfg = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG];
                  const Icon = cfg?.icon || CheckCircle;
                  return (
                    <tr key={a.id}>
                      {!isStudent && (
                        <td>
                          <div>
                            <p className="font-medium">{a.student?.firstName} {a.student?.lastName}</p>
                            <p className="text-xs text-gray-400">{a.student?.email}</p>
                          </div>
                        </td>
                      )}
                      <td className="font-medium">{a.session?.module?.name}</td>
                      <td>{new Date(a.session?.date).toLocaleDateString('fr-FR')}</td>
                      <td>{a.session?.startTime} - {a.session?.endTime}</td>
                      <td>
                        <span className={`badge gap-1 ${cfg?.class || 'badge-gray'}`}>
                          <Icon className="w-3 h-3" />
                          {cfg?.label || a.status}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 max-w-48 truncate">
                        {a.justification || <span className="text-gray-300 italic">Non justifiée</span>}
                      </td>
                          {(user?.role === 'ADMIN' || user?.role === 'SCOLARITE' || user?.role === 'ENSEIGNANT' || user?.role === 'ETUDIANT') && (
                        <td>
                          {!a.justification && (a.status === 'ABSENT' || a.status === 'RETARD') && (
                            <button
                              onClick={() => setJustifyAbsenceId(a.id)}
                              className="text-xs text-euromed-navy hover:underline font-medium flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {user?.role === 'ETUDIANT' ? 'Soumettre justificatif' : 'Justifier'}
                            </button>
                          )}
                          {a.justification && user?.role === 'ETUDIANT' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Soumis
                            </span>
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

      {justifyAbsenceId && (
        <JustifyModal
          absenceId={justifyAbsenceId}
          onClose={() => setJustifyAbsenceId(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['absences'] });
            qc.invalidateQueries({ queryKey: ['absence-stats'] });
          }}
        />
      )}
    </div>
  );
}
