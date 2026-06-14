import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Trash2, ClipboardList, CheckCircle, XCircle, AlertCircle, Mail, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { planningApi, usersApi, absenceApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TYPE_COLORS: Record<string, string> = {
  CM: 'bg-blue-100 border-blue-300 text-blue-800',
  TD: 'bg-green-100 border-green-300 text-green-800',
  TP: 'bg-purple-100 border-purple-300 text-purple-800',
};

interface Session {
  id: string; startTime: string; endTime: string; type: string; date: string; notes?: string;
  module: { name: string; code: string };
  group: { name: string };
  room?: { name: string };
  teacher: { id: string; firstName: string; lastName: string };
  _count?: { absences: number };
}

interface StudentAttendance {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  status: string | null;
}

export default function PlanningPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const monday = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const startDate = format(monday, 'yyyy-MM-dd');
  const weekLabel = `Semaine du ${format(monday, 'd MMM', { locale: fr })} au ${format(addDays(monday, 5), 'd MMM yyyy', { locale: fr })}`;

  const endDate = format(addDays(monday, 5), 'yyyy-MM-dd');
  const isStudent = user?.role === 'ETUDIANT';

  const { data, isLoading } = useQuery({
    queryKey: ['planning-week', startDate, isStudent],
    queryFn: () => isStudent
      ? planningApi.getByStudent(undefined, { startDate, endDate })
      : planningApi.getWeek(startDate),
  });
  const { data: modulesData } = useQuery({ queryKey: ['modules'], queryFn: () => usersApi.getModules(), enabled: showCreate });
  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => usersApi.getGroups(), enabled: showCreate });
  const { data: roomsData } = useQuery({ queryKey: ['rooms'], queryFn: () => usersApi.getRooms(), enabled: showCreate });

  const sessions: Session[] = data?.data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planningApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-week'] }); toast.success('Séance supprimée'); },
    onError: () => toast.error('Erreur suppression'),
  });

  const getSessionsForDay = (dayIndex: number): Session[] => {
    const dayDate = format(addDays(monday, dayIndex), 'yyyy-MM-dd');
    return sessions.filter(s => s.date.startsWith(dayDate)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SCOLARITE';
  const canTakeAttendance = user?.role === 'ENSEIGNANT' || user?.role === 'ADMIN' || user?.role === 'SCOLARITE';
  const isTeacher = user?.role === 'ENSEIGNANT';

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await planningApi.sendEmail();
      toast.success((res.data as { message: string }).message || 'Planning envoyé par email');
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  const isMySession = (s: Session) => user?.role === 'ENSEIGNANT' ? s.teacher?.id === user.id : true;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Planning</h1>
          <p className="page-subtitle">Gestion des séances de cours</p>
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="btn-ghost flex items-center gap-2 text-sm border border-gray-200"
              title="Envoyer mon planning du jour par email et Telegram"
            >
              <Mail className="w-4 h-4" />
              {sendingEmail ? 'Envoi...' : 'Envoyer planning'}
            </button>
          )}
          {(canEdit || isTeacher) && (
            <button onClick={async () => {
              try {
                const params: Record<string, string> = { startDate, endDate };
                const res = await planningApi.exportCSV(params);
                const url = URL.createObjectURL((res as { data: Blob }).data);
                const a = document.createElement('a'); a.href = url; a.download = 'planning.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error('Erreur export'); }
            }} className="btn-ghost flex items-center gap-2 text-sm border border-gray-200">
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Nouvelle séance
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="card px-6 py-4 flex items-center gap-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-euromed-navy" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-euromed-navy capitalize">{weekLabel}</p>
        </div>
        <button onClick={() => setWeekOffset(0)} className="btn-ghost text-sm px-3 py-1.5">
          Aujourd'hui
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-euromed-navy" />
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement du planning...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {DAYS_FR.map((day, idx) => {
            const daySessions = getSessionsForDay(idx);
            const dayDate = format(addDays(monday, idx), 'd MMM', { locale: fr });
            const isToday = format(addDays(monday, idx), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={day} className="card overflow-visible">
                <div className={`px-3 py-3 text-center border-b ${isToday ? 'bg-euromed-navy text-white' : 'bg-gray-50 text-euromed-navy'}`}>
                  <p className="font-semibold text-sm">{day}</p>
                  <p className={`text-xs ${isToday ? 'text-euromed-gold' : 'text-gray-500'}`}>{dayDate}</p>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {daySessions.length === 0 ? (
                    <div className="text-center py-6 text-gray-300 text-xs">Libre</div>
                  ) : (
                    daySessions.map(s => (
                      <div key={s.id} className={`p-2 rounded-lg border text-xs group relative ${TYPE_COLORS[s.type] || 'bg-gray-100 border-gray-300'}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{s.startTime}-{s.endTime}</span>
                        </div>
                        <p className="font-semibold truncate">{s.module.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" />
                          <span>{s.group.name}</span>
                        </div>
                        {s.room && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{s.room.name}</span>
                          </div>
                        )}
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-white/60 rounded text-xs font-medium">{s.type}</span>

                        {/* Attendance button */}
                        {canTakeAttendance && isMySession(s) && (
                          s._count && s._count.absences > 0 ? (
                            <button
                              onClick={() => setSelectedSession(s)}
                              title="Voir / modifier les présences"
                              className="mt-1.5 w-full flex items-center justify-center gap-1 px-1.5 py-1 bg-green-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Appel fait
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedSession(s)}
                              title="Marquer les présences"
                              className="mt-1.5 w-full flex items-center justify-center gap-1 px-1.5 py-1 bg-white/70 hover:bg-white rounded text-xs font-medium transition-colors border border-current/20"
                            >
                              <ClipboardList className="w-3 h-3" />
                              Appel
                            </button>
                          )
                        )}

                        {canEdit && (
                          <button
                            onClick={() => deleteMutation.mutate(s.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded transition-all"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          modules={modulesData?.data?.data || []}
          groups={groupsData?.data?.data || []}
          rooms={roomsData?.data?.data || []}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['planning-week'] }); }}
        />
      )}

      {selectedSession && (
        <AttendanceModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

/* ── Attendance Modal ─────────────────────────────────────────────── */

function AttendanceModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const qc = useQueryClient();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['session-students', session.id],
    queryFn: () => planningApi.getSessionStudents(session.id),
  });

  const students: StudentAttendance[] = data?.data?.data || [];

  useEffect(() => {
    if (students.length > 0 && Object.keys(statuses).length === 0) {
      const init: Record<string, string> = {};
      students.forEach(s => { init[s.id] = s.status || 'PRESENT'; });
      setStatuses(init);
    }
  }, [students]);

  const mutation = useMutation({
    mutationFn: () => {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      return absenceApi.record(session.id, records);
    },
    onSuccess: () => {
      toast.success('Présences enregistrées');
      qc.invalidateQueries({ queryKey: ['planning-week'] });
      qc.invalidateQueries({ queryKey: ['absence-stats'] });
      qc.invalidateQueries({ queryKey: ['absences'] });
      qc.invalidateQueries({ queryKey: ['session-students', session.id] });
      onClose();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const setAll = (status: string) => {
    const updated: Record<string, string> = {};
    students.forEach(s => { updated[s.id] = status; });
    setStatuses(updated);
  };

  const countByStatus = (s: string) => Object.values(statuses).filter(v => v === s).length;

  const sessionDate = new Date(session.date);
  const dateLabel = format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-euromed-navy flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Appel — {session.module.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                {session.group.name} · {dateLabel} · {session.startTime}–{session.endTime}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0">✕</button>
          </div>

          {/* Quick actions */}
          {students.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">Tout marquer :</span>
              <button onClick={() => setAll('PRESENT')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Présent
              </button>
              <button onClick={() => setAll('ABSENT')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Absent
              </button>
            </div>
          )}
        </div>

        {/* Students list */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-euromed-navy rounded-full animate-spin mr-2" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucun étudiant dans ce groupe
            </div>
          ) : (
            <ul className="space-y-1.5 py-2">
              {students.map((s, idx) => {
                const current = statuses[s.id] || 'PRESENT';
                return (
                  <li key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {s.lastName} {s.firstName}
                      </p>
                      <p className="text-xs text-gray-400">{s.studentId}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setStatuses(prev => ({ ...prev, [s.id]: 'PRESENT' }))}
                        title="Présent"
                        className={`p-1.5 rounded-lg transition-colors ${current === 'PRESENT' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatuses(prev => ({ ...prev, [s.id]: 'RETARD' }))}
                        title="Retard"
                        className={`p-1.5 rounded-lg transition-colors ${current === 'RETARD' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'}`}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatuses(prev => ({ ...prev, [s.id]: 'ABSENT' }))}
                        title="Absent"
                        className={`p-1.5 rounded-lg transition-colors ${current === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {students.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3 text-xs">
              <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> {countByStatus('PRESENT')} présents
              </span>
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" /> {countByStatus('RETARD')} retards
              </span>
              <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> {countByStatus('ABSENT')} absents
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-ghost flex-1 text-sm">Annuler</button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || Object.keys(statuses).length === 0}
                className="btn-primary flex-1 text-sm"
              >
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer les présences'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Create Session Modal ─────────────────────────────────────────── */

function CreateSessionModal({ modules, groups, rooms, onClose, onSuccess }: {
  modules: { id: string; name: string; code: string }[];
  groups: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => usersApi.getAll({ role: 'ENSEIGNANT', limit: 100 }),
  });
  const teachers = teachersData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => planningApi.create(data),
    onSuccess: () => { toast.success('Séance créée'); onSuccess(); },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const [form, setForm] = useState({ moduleId: '', teacherId: '', groupId: '', roomId: '', date: '', startTime: '08:00', endTime: '10:00', type: 'CM', notes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.moduleId || !form.teacherId || !form.groupId || !form.date) return toast.error('Veuillez remplir tous les champs requis');
    mutation.mutate(form as Record<string, unknown>);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Nouvelle séance
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module *</label>
              <select value={form.moduleId} onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))} className="input-field text-sm">
                <option value="">Sélectionner...</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant *</label>
              <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))} className="input-field text-sm">
                <option value="">Sélectionner...</option>
                {(teachers as { id: string; firstName: string; lastName: string }[]).map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe *</label>
              <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))} className="input-field text-sm">
                <option value="">Sélectionner...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salle</label>
              <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))} className="input-field text-sm">
                <option value="">Non définie</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field text-sm">
                {['CM', 'TD', 'TP', 'Examen'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure début</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-field text-sm resize-none" placeholder="Notes optionnelles..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Création...' : 'Créer la séance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
