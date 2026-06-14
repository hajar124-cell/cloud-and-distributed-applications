import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, BookOpen, Edit2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { progressApi, usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ProgressItem {
  id: string; percentage: number; chaptersDone: number; chaptersTotal: number; notes?: string; lastUpdated: string;
  module: { id: string; name: string; code: string; chapters: { id: string; title: string }[] };
  group: { id: string; name: string };
}

function ProgressBar({ value, color = 'bg-euromed-navy' }: { value: number; color?: string }) {
  const pct = Math.min(Math.round(value), 100);
  const barColor = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-euromed-gold' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});

  const isStudent = user?.role === 'ETUDIANT';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SCOLARITE' || user?.role === 'ENSEIGNANT';

  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => usersApi.getGroups() });
  const groups = groupsData?.data?.data || [];

  const isTeacher = user?.role === 'ENSEIGNANT';

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['progress', isStudent ? 'student' : isTeacher && !selectedGroup ? 'teacher' : selectedGroup ? `group-${selectedGroup}` : 'all'],
    queryFn: () => {
      if (isStudent) return progressApi.getByStudent();
      if (selectedGroup) return progressApi.getByGroup(selectedGroup);
      if (isTeacher) return progressApi.getByTeacher();
      return progressApi.getAll();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { moduleId: string; groupId: string; chaptersDone: number; notes?: string }) => progressApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['progress'] }); toast.success('Avancement mis à jour'); setEditing(null); },
    onError: () => toast.error('Erreur mise à jour'),
  });

  const progressList: ProgressItem[] = progressData?.data?.data || [];

  const avgProgress = progressList.length > 0 ? Math.round(progressList.reduce((s, p) => s + p.percentage, 0) / progressList.length) : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Suivi d'avancement</h1>
          <p className="page-subtitle">Progression pédagogique par module</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Avancement moyen', value: `${avgProgress}%`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
          { label: 'Modules suivis', value: progressList.length, icon: BookOpen, color: 'bg-green-100 text-green-600' },
          { label: 'Modules complétés', value: progressList.filter(p => p.percentage >= 100).length, icon: TrendingUp, color: 'bg-teal-100 text-teal-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-euromed-navy">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Filter */}
      {!isStudent && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedGroup('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedGroup ? 'bg-euromed-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
            Tous les groupes
          </button>
          {(groups as { id: string; name: string }[]).map(g => (
            <button key={g.id} onClick={() => setSelectedGroup(g.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedGroup === g.id ? 'bg-euromed-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Progress cards */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Chargement...</p>
        </div>
      ) : progressList.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun avancement enregistré</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progressList.map(p => {
            const isEdit = editing === p.id;
            const editVal = editValues[p.id] ?? p.chaptersDone;
            return (
              <div key={p.id} className="card p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge-gold badge text-xs">{p.module.code}</span>
                      {!isStudent && <span className="badge-gray badge text-xs">{p.group.name}</span>}
                    </div>
                    <h3 className="font-semibold text-euromed-navy mt-1 truncate">{p.module.name}</h3>
                  </div>
                  {canEdit && !isEdit && (
                    <button onClick={() => { setEditing(p.id); setEditValues(v => ({ ...v, [p.id]: p.chaptersDone })); setEditNotes(n => ({ ...n, [p.id]: '' })); }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-euromed-navy transition-colors flex-shrink-0">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <ProgressBar value={p.percentage} />

                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  {isEdit ? (
                    <div className="space-y-2 w-full">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-500">Chapitres faits :</label>
                        <input type="number" min={0} max={p.chaptersTotal} value={editVal}
                          onChange={e => setEditValues(v => ({ ...v, [p.id]: parseInt(e.target.value) || 0 }))}
                          className="input-field py-1.5 text-sm w-20" />
                        <span className="text-xs text-gray-500">/ {p.chaptersTotal}</span>
                      </div>
                      <textarea
                        value={editNotes[p.id] || ''}
                        onChange={e => setEditNotes(n => ({ ...n, [p.id]: e.target.value }))}
                        placeholder="Note de mise à jour (ex: Chapitre 5 terminé, TP corrigé...)"
                        rows={2}
                        className="input-field text-xs resize-none w-full"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => updateMutation.mutate({ moduleId: p.module.id, groupId: p.group.id, chaptersDone: editVal, notes: editNotes[p.id] || undefined })}
                          disabled={updateMutation.isPending}
                          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 flex-1">
                          <Save className="w-3.5 h-3.5" /> Sauver
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-ghost py-1.5 px-3 text-xs">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{p.chaptersDone} / {p.chaptersTotal} chapitres</span>
                        <span className="text-xs text-gray-400">MàJ: {new Date(p.lastUpdated).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {p.notes && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 italic">
                          📝 {p.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Chapter details */}
                {p.module.chapters.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Chapitres ({p.module.chapters.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {p.module.chapters.slice(0, 8).map((ch, i) => (
                        <span key={ch.id}
                          className={`text-xs px-2 py-0.5 rounded-full border ${i < p.chaptersDone ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                          {i < p.chaptersDone ? '✓' : `Ch.${i + 1}`}
                        </span>
                      ))}
                      {p.module.chapters.length > 8 && <span className="text-xs text-gray-400">+{p.module.chapters.length - 8} autres</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
