import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Trash2, Shield, GraduationCap, BookOpen, Briefcase,
  Edit2, KeyRound, Building2, Layers, X, Check, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Users; class: string }> = {
  ADMIN: { label: 'Admin', icon: Shield, class: 'badge-red' },
  SCOLARITE: { label: 'Scolarité', icon: Briefcase, class: 'badge-blue' },
  ENSEIGNANT: { label: 'Enseignant', icon: BookOpen, class: 'badge-green' },
  ETUDIANT: { label: 'Étudiant', icon: GraduationCap, class: 'badge-gold' },
};

type Tab = 'users' | 'groups' | 'rooms' | 'modules';

export default function UsersPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SCOLARITE';

  const [tab, setTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState<Record<string, unknown> | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editRoom, setEditRoom] = useState<Record<string, unknown> | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [editModule, setEditModule] = useState<Record<string, unknown> | null>(null);
  const [showCreateModule, setShowCreateModule] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, roleFilter, search],
    queryFn: () => usersApi.getAll({ page, limit: 20, role: roleFilter || undefined, search: search || undefined }),
    enabled: tab === 'users',
    placeholderData: (prev) => prev,
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.getGroups(),
    enabled: tab === 'groups' || tab === 'users',
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => usersApi.getRooms(),
    enabled: tab === 'rooms',
  });

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: () => usersApi.getModules(),
    enabled: tab === 'modules',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: () => toast.error('Erreur suppression'),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteGroup(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Groupe supprimé'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Impossible de supprimer'),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteRoom(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Salle supprimée'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Impossible de supprimer'),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteModule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Module supprimé'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Impossible de supprimer'),
  });

  const users = data?.data?.data || [];
  const pagination = data?.data?.pagination;
  const groups = groupsData?.data?.data || [];
  const rooms = roomsData?.data?.data || [];
  const modules = modulesData?.data?.data || [];

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'groups', label: 'Groupes', icon: GraduationCap },
    { id: 'rooms', label: 'Salles', icon: Building2 },
    { id: 'modules', label: 'Modules', icon: Layers },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Gestion des comptes, groupes, salles et modules</p>
        </div>
        {isAdmin && (
          <button onClick={() => {
            if (tab === 'users') setShowCreate(true);
            else if (tab === 'groups') setShowCreateGroup(true);
            else if (tab === 'rooms') setShowCreateRoom(true);
            else if (tab === 'modules') setShowCreateModule(true);
          }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {tab === 'users' ? 'Nouvel utilisateur' : tab === 'groups' ? 'Nouveau groupe' : tab === 'rooms' ? 'Nouvelle salle' : 'Nouveau module'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-euromed-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <button key={role} onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                className={`stat-card cursor-pointer transition-all ${roleFilter === role ? 'ring-2 ring-euromed-navy' : 'hover:shadow-card-hover'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'ADMIN' ? 'bg-red-100 text-red-600' : role === 'SCOLARITE' ? 'bg-blue-100 text-blue-600' : role === 'ENSEIGNANT' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                  <cfg.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                  <p className="text-xl font-bold text-euromed-navy">-</p>
                </div>
              </button>
            ))}
          </div>

          <div className="card p-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="Rechercher un utilisateur..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', ...Object.keys(ROLE_CONFIG)].map(r => (
                <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-euromed-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {r === '' ? 'Tous' : ROLE_CONFIG[r]?.label || r}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-euromed-navy">Utilisateurs ({pagination?.total || 0})</h2>
            </div>
            {isLoading ? (
              <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" /></div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="table-base">
                    <thead>
                      <tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Téléphone</th><th>Statut</th>{isAdmin && <th>Actions</th>}</tr>
                    </thead>
                    <tbody>
                      {(users as { id: string; firstName: string; lastName: string; email: string; role: string; phone?: string; isActive: boolean }[]).map(u => {
                        const cfg = ROLE_CONFIG[u.role];
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-euromed flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {u.firstName[0]}{u.lastName[0]}
                                </div>
                                <p className="font-medium">{u.firstName} {u.lastName}</p>
                              </div>
                            </td>
                            <td className="text-gray-500 text-sm">{u.email}</td>
                            <td>
                              <span className={`badge gap-1 ${cfg?.class || 'badge-gray'}`}>
                                {cfg && <cfg.icon className="w-3 h-3" />}
                                {cfg?.label || u.role}
                              </span>
                            </td>
                            <td className="text-gray-500 text-sm">{u.phone || '-'}</td>
                            <td>
                              <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                                {u.isActive ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setEditUser(u as unknown as Record<string, unknown>)}
                                    className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setResetUserId(u.id)}
                                    className="p-1.5 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors" title="Réinitialiser mot de passe">
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                  {u.id !== user?.id && (
                                    <button onClick={() => { if (window.confirm(`Supprimer ${u.firstName} ${u.lastName} ?`)) deleteMutation.mutate(u.id); }}
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Précédent</button>
                      <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Suivant</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* GROUPS TAB */}
      {tab === 'groups' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-euromed-navy">Groupes ({(groups as unknown[]).length})</h2>
          </div>
          {groupsLoading ? (
            <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table-base">
                <thead><tr><th>Nom</th><th>Filière</th><th>Niveau</th><th>Capacité</th><th>Étudiants</th>{isAdmin && <th>Actions</th>}</tr></thead>
                <tbody>
                  {(groups as { id: string; name: string; filiere: string; level: string; capacity: number; _count?: { students: number } }[]).map(g => (
                    <tr key={g.id}>
                      <td className="font-medium">{g.name}</td>
                      <td className="text-gray-500">{g.filiere}</td>
                      <td><span className="badge badge-blue">{g.level}</span></td>
                      <td className="text-gray-500">{g.capacity}</td>
                      <td><span className="badge badge-gray">{g._count?.students ?? 0}</span></td>
                      {isAdmin && (
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => setEditGroup(g as unknown as Record<string, unknown>)}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (window.confirm(`Supprimer le groupe "${g.name}" ?`)) deleteGroupMutation.mutate(g.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ROOMS TAB */}
      {tab === 'rooms' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-euromed-navy">Salles ({(rooms as unknown[]).length})</h2>
          </div>
          {roomsLoading ? (
            <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table-base">
                <thead><tr><th>Nom</th><th>Type</th><th>Bâtiment</th><th>Capacité</th>{isAdmin && <th>Actions</th>}</tr></thead>
                <tbody>
                  {(rooms as { id: string; name: string; type: string; building?: string; capacity: number }[]).map(r => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}</td>
                      <td><span className="badge badge-blue">{r.type}</span></td>
                      <td className="text-gray-500">{r.building || '-'}</td>
                      <td className="text-gray-500">{r.capacity}</td>
                      {isAdmin && (
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => setEditRoom(r as unknown as Record<string, unknown>)}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (window.confirm(`Supprimer la salle "${r.name}" ?`)) deleteRoomMutation.mutate(r.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODULES TAB */}
      {tab === 'modules' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-euromed-navy">Modules ({(modules as unknown[]).length})</h2>
          </div>
          {modulesLoading ? (
            <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-euromed-navy/20 border-t-euromed-navy rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table-base">
                <thead><tr><th>Code</th><th>Nom</th><th>Semestre</th><th>Crédits</th><th>V.H.</th><th>Statut</th>{isAdmin && <th>Actions</th>}</tr></thead>
                <tbody>
                  {(modules as { id: string; code: string; name: string; semester: number; credits: number; volumeHours: number; isActive: boolean }[]).map(m => (
                    <tr key={m.id}>
                      <td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{m.code}</span></td>
                      <td className="font-medium">{m.name}</td>
                      <td className="text-gray-500">S{m.semester}</td>
                      <td className="text-gray-500">{m.credits}</td>
                      <td className="text-gray-500">{m.volumeHours}h</td>
                      <td><span className={`badge ${m.isActive ? 'badge-green' : 'badge-red'}`}>{m.isActive ? 'Actif' : 'Inactif'}</span></td>
                      {isAdmin && (
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => setEditModule(m as unknown as Record<string, unknown>)}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (window.confirm(`Supprimer le module "${m.name}" ?`)) deleteModuleMutation.mutate(m.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateUserModal groups={groups as { id: string; name: string }[]} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }); }} />}
      {editUser && <EditUserModal userData={editUser} onClose={() => setEditUser(null)} onSuccess={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }); }} currentUserId={user?.id || ''} />}
      {resetUserId && <ResetPasswordModal userId={resetUserId} onClose={() => setResetUserId(null)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onSuccess={() => { setShowCreateGroup(false); qc.invalidateQueries({ queryKey: ['groups'] }); }} />}
      {editGroup && <EditGroupModal groupData={editGroup} onClose={() => setEditGroup(null)} onSuccess={() => { setEditGroup(null); qc.invalidateQueries({ queryKey: ['groups'] }); }} />}
      {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onSuccess={() => { setShowCreateRoom(false); qc.invalidateQueries({ queryKey: ['rooms'] }); }} />}
      {editRoom && <EditRoomModal roomData={editRoom} onClose={() => setEditRoom(null)} onSuccess={() => { setEditRoom(null); qc.invalidateQueries({ queryKey: ['rooms'] }); }} />}
      {showCreateModule && <CreateModuleModal onClose={() => setShowCreateModule(false)} onSuccess={() => { setShowCreateModule(false); qc.invalidateQueries({ queryKey: ['modules'] }); }} />}
      {editModule && <EditModuleModal moduleData={editModule} onClose={() => setEditModule(null)} onSuccess={() => { setEditModule(null); qc.invalidateQueries({ queryKey: ['modules'] }); }} />}
    </div>
  );
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-euromed-navy">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function CreateUserModal({ groups, onClose, onSuccess }: { groups: { id: string; name: string }[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'ETUDIANT', phone: '', groupId: '' });
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.create(data),
    onSuccess: () => { toast.success('Utilisateur créé'); onSuccess(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur création'),
  });
  return (
    <ModalWrapper title="Nouvel utilisateur" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom *"><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Nom *"><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Email *"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field text-sm" /></Field>
      <Field label="Mot de passe *"><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field text-sm" placeholder="Min 8 caractères" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Rôle">
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field text-sm">
            {Object.entries(ROLE_CONFIG).map(([r, c]) => <option key={r} value={r}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Téléphone"><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field text-sm" placeholder="+212..." /></Field>
      </div>
      {form.role === 'ETUDIANT' && (
        <Field label="Groupe">
          <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))} className="input-field text-sm">
            <option value="">Non assigné</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate(form as Record<string, unknown>)} disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Création...' : 'Créer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function EditUserModal({ userData, onClose, onSuccess, currentUserId }: { userData: Record<string, unknown>; onClose: () => void; onSuccess: () => void; currentUserId: string }) {
  const [form, setForm] = useState({ firstName: String(userData.firstName || ''), lastName: String(userData.lastName || ''), phone: String(userData.phone || ''), isActive: Boolean(userData.isActive) });
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [currentRole, setCurrentRole] = useState(String(userData.role || 'ETUDIANT'));

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.update(userData.id as string, data),
    onSuccess: () => { toast.success('Utilisateur mis à jour'); onSuccess(); },
    onError: () => toast.error('Erreur mise à jour'),
  });

  const roleMutation = useMutation({
    mutationFn: (role: string) => usersApi.updateRole(userData.id as string, role),
    onSuccess: (_, role) => { setCurrentRole(role); setShowRoleChange(false); toast.success('Rôle mis à jour'); },
    onError: () => toast.error('Erreur changement de rôle'),
  });

  const isSelf = userData.id === currentUserId;

  return (
    <ModalWrapper title={`Modifier — ${userData.firstName} ${userData.lastName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom"><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Nom"><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Téléphone"><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field text-sm" /></Field>
      <Field label="Statut">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
          <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-gray-700">{form.isActive ? 'Actif' : 'Inactif'}</span>
        </div>
      </Field>

      {!isSelf && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Rôle : <span className={`badge ${ROLE_CONFIG[currentRole]?.class || ''}`}>{ROLE_CONFIG[currentRole]?.label || currentRole}</span></p>
            <button onClick={() => setShowRoleChange(!showRoleChange)} className="text-xs text-euromed-navy hover:underline flex items-center gap-1">
              Changer <ChevronDown className={`w-3 h-3 transition-transform ${showRoleChange ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {showRoleChange && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                <button key={r} onClick={() => roleMutation.mutate(r)} disabled={roleMutation.isPending}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${currentRole === r ? 'border-euromed-navy bg-euromed-navy/5 text-euromed-navy font-medium' : 'border-gray-200 hover:border-gray-300'}`}>
                  <c.icon className="w-3.5 h-3.5" />
                  {c.label}
                  {currentRole === r && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => updateMutation.mutate({ firstName: form.firstName, lastName: form.lastName, phone: form.phone, isActive: form.isActive } as Record<string, unknown>)} disabled={updateMutation.isPending} className="btn-primary flex-1">
          {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function ResetPasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(userId, newPassword),
    onSuccess: () => { toast.success('Mot de passe réinitialisé'); onClose(); },
    onError: () => toast.error('Erreur réinitialisation'),
  });
  return (
    <ModalWrapper title="Réinitialiser le mot de passe" onClose={onClose}>
      <Field label="Nouveau mot de passe">
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field text-sm" placeholder="Min 8 caractères" autoFocus />
      </Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={newPassword.length < 8 || mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Enregistrement...' : 'Confirmer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function CreateGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', level: 'L3', filiere: '', capacity: '30' });
  const mutation = useMutation({
    mutationFn: () => usersApi.createGroup(form as Record<string, unknown>),
    onSuccess: () => { toast.success('Groupe créé'); onSuccess(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur'),
  });
  return (
    <ModalWrapper title="Nouveau groupe" onClose={onClose}>
      <Field label="Nom *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="ex: ING3-INFO-A" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Filière *"><input value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))} className="input-field text-sm" placeholder="ex: Informatique" /></Field>
        <Field label="Niveau">
          <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input-field text-sm">
            {['L1','L2','L3','M1','M2','ING1','ING2','ING3'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Capacité"><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.filiere} className="btn-primary flex-1">
          {mutation.isPending ? 'Création...' : 'Créer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function EditGroupModal({ groupData, onClose, onSuccess }: { groupData: Record<string, unknown>; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: String(groupData.name || ''), level: String(groupData.level || 'L3'), filiere: String(groupData.filiere || ''), capacity: String(groupData.capacity || 30) });
  const mutation = useMutation({
    mutationFn: () => usersApi.updateGroup(groupData.id as string, form as Record<string, unknown>),
    onSuccess: () => { toast.success('Groupe mis à jour'); onSuccess(); },
    onError: () => toast.error('Erreur'),
  });
  return (
    <ModalWrapper title={`Modifier — ${groupData.name}`} onClose={onClose}>
      <Field label="Nom"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Filière"><input value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Niveau">
          <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input-field text-sm">
            {['L1','L2','L3','M1','M2','ING1','ING2','ING3'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Capacité"><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function CreateRoomModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', capacity: '30', building: '', type: 'Salle TD' });
  const mutation = useMutation({
    mutationFn: () => usersApi.createRoom(form as Record<string, unknown>),
    onSuccess: () => { toast.success('Salle créée'); onSuccess(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur'),
  });
  return (
    <ModalWrapper title="Nouvelle salle" onClose={onClose}>
      <Field label="Nom *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="ex: A101" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field text-sm">
            {['Salle TD','Amphi','Labo','Salle TP','Salle de réunion'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Capacité"><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Bâtiment"><input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} className="input-field text-sm" placeholder="ex: Bât. A" /></Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name} className="btn-primary flex-1">
          {mutation.isPending ? 'Création...' : 'Créer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function EditRoomModal({ roomData, onClose, onSuccess }: { roomData: Record<string, unknown>; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: String(roomData.name || ''), capacity: String(roomData.capacity || 30), building: String(roomData.building || ''), type: String(roomData.type || 'Salle TD') });
  const mutation = useMutation({
    mutationFn: () => usersApi.updateRoom(roomData.id as string, form as Record<string, unknown>),
    onSuccess: () => { toast.success('Salle mise à jour'); onSuccess(); },
    onError: () => toast.error('Erreur'),
  });
  return (
    <ModalWrapper title={`Modifier — ${roomData.name}`} onClose={onClose}>
      <Field label="Nom"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field text-sm">
            {['Salle TD','Amphi','Labo','Salle TP','Salle de réunion'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Capacité"><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Bâtiment"><input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function CreateModuleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', semester: '1', credits: '3', volumeHours: '30', description: '' });
  const mutation = useMutation({
    mutationFn: () => usersApi.createModule({ ...form, semester: parseInt(form.semester), credits: parseInt(form.credits), volumeHours: parseInt(form.volumeHours) } as Record<string, unknown>),
    onSuccess: () => { toast.success('Module créé'); onSuccess(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erreur'),
  });
  return (
    <ModalWrapper title="Nouveau module" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Code *"><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field text-sm" placeholder="ex: INF301" /></Field>
        <Field label="Semestre">
          <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="input-field text-sm">
            {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s}>S{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nom *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="ex: Algorithmes et structures de données" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Crédits"><input type="number" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Volume horaire (h)"><input type="number" value={form.volumeHours} onChange={e => setForm(f => ({ ...f, volumeHours: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm resize-none" rows={2} /></Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.code || !form.name} className="btn-primary flex-1">
          {mutation.isPending ? 'Création...' : 'Créer'}
        </button>
      </div>
    </ModalWrapper>
  );
}

function EditModuleModal({ moduleData, onClose, onSuccess }: { moduleData: Record<string, unknown>; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ code: String(moduleData.code || ''), name: String(moduleData.name || ''), semester: String(moduleData.semester || 1), credits: String(moduleData.credits || 3), volumeHours: String(moduleData.volumeHours || 30), description: String(moduleData.description || ''), isActive: Boolean(moduleData.isActive !== false) });
  const mutation = useMutation({
    mutationFn: () => usersApi.updateModule(moduleData.id as string, { ...form, semester: parseInt(form.semester), credits: parseInt(form.credits), volumeHours: parseInt(form.volumeHours) } as Record<string, unknown>),
    onSuccess: () => { toast.success('Module mis à jour'); onSuccess(); },
    onError: () => toast.error('Erreur'),
  });
  return (
    <ModalWrapper title={`Modifier — ${moduleData.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Code"><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Semestre">
          <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="input-field text-sm">
            {['1','2','3','4','5','6','7','8'].map(s => <option key={s} value={s}>S{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nom"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Crédits"><input type="number" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} className="input-field text-sm" /></Field>
        <Field label="Volume horaire (h)"><input type="number" value={form.volumeHours} onChange={e => setForm(f => ({ ...f, volumeHours: e.target.value }))} className="input-field text-sm" /></Field>
      </div>
      <Field label="Statut">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
          <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-gray-700">{form.isActive ? 'Actif' : 'Inactif'}</span>
        </div>
      </Field>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
          {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </ModalWrapper>
  );
}
