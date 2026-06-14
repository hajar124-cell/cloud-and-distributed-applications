import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Shield, Phone, Mail, Key, Copy, Check, Edit2, Lock, Eye, EyeOff, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [otp, setOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const generateOtpMutation = useMutation({
    mutationFn: () => import('../services/api').then(m => m.default.post('/auth/telegram-otp')),
    onSuccess: (res: { data: { data: { otp: string } } }) => { setOtp(res.data.data.otp); toast.success('Code OTP généré (valide 10 min)'); },
    onError: () => toast.error('Erreur génération OTP'),
  });

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile(profileForm),
    onSuccess: (res) => {
      updateUser(res.data.data);
      setEditingProfile(false);
      toast.success('Profil mis à jour');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Erreur mise à jour'),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(pwForm.currentPassword, pwForm.newPassword),
    onSuccess: () => {
      setEditingPassword(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Mot de passe modifié');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Erreur modification'),
  });

  function startEditProfile() {
    setProfileForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: '' });
    setEditingProfile(true);
  }

  function submitPassword() {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Remplissez tous les champs');
    if (pwForm.newPassword.length < 8) return toast.error('Nouveau mot de passe min 8 caractères');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Les mots de passe ne correspondent pas');
    passwordMutation.mutate();
  }

  function copyOtp() {
    if (!otp) return;
    navigator.clipboard.writeText(`/link ${otp}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur', SCOLARITE: 'Scolarité / Secrétariat',
    ENSEIGNANT: 'Enseignant', ETUDIANT: 'Étudiant',
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="page-title">Mon Profil</h1>
        <p className="page-subtitle">Informations personnelles et paramètres</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0D3B6E, #0D7A5F)' }}>
              {user?.firstName[0]}{user?.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-euromed-navy">{user?.firstName} {user?.lastName}</h2>
              <p className="text-gray-500">{user?.email}</p>
              <span className="badge-gold badge mt-1">{roleLabels[user?.role || ''] || user?.role}</span>
            </div>
          </div>
          {!editingProfile && (
            <button onClick={startEditProfile} className="btn-ghost flex items-center gap-2 text-sm">
              <Edit2 className="w-4 h-4" /> Modifier
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                  className="input-field text-sm" placeholder="Prénom" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                  className="input-field text-sm" placeholder="Nom" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                className="input-field text-sm" placeholder="+212 6XX XXX XXX" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingProfile(false)} className="btn-ghost flex items-center gap-2 text-sm flex-1">
                <X className="w-4 h-4" /> Annuler
              </button>
              <button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm flex-1">
                <Save className="w-4 h-4" /> {profileMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Prénom', value: user?.firstName, icon: User },
              { label: 'Nom', value: user?.lastName, icon: User },
              { label: 'Email', value: user?.email, icon: Mail },
              { label: 'Rôle', value: roleLabels[user?.role || ''] || user?.role, icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-euromed-navy">Mot de passe</h3>
              <p className="text-xs text-gray-500">Modifier votre mot de passe de connexion</p>
            </div>
          </div>
          {!editingPassword && (
            <button onClick={() => setEditingPassword(true)} className="btn-ghost flex items-center gap-2 text-sm">
              <Key className="w-4 h-4" /> Changer
            </button>
          )}
        </div>

        {editingPassword && (
          <div className="space-y-4">
            {[
              { key: 'currentPassword', label: 'Mot de passe actuel', show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { key: 'newPassword', label: 'Nouveau mot de passe', show: showNew, toggle: () => setShowNew(v => !v) },
              { key: 'confirmPassword', label: 'Confirmer le nouveau', show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwForm[key as keyof typeof pwForm]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input-field text-sm pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400">Minimum 8 caractères</p>
            <div className="flex gap-3">
              <button onClick={() => { setEditingPassword(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                className="btn-ghost flex items-center gap-2 text-sm flex-1">
                <X className="w-4 h-4" /> Annuler
              </button>
              <button onClick={submitPassword} disabled={passwordMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm flex-1">
                <Save className="w-4 h-4" /> {passwordMutation.isPending ? 'Modification...' : 'Modifier'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Telegram link */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-euromed-navy mb-1">Lier le bot Telegram</h3>
            <p className="text-sm text-gray-600 mb-4">
              Connectez votre compte pour recevoir votre planning et notifications sur <strong>@CampusOpsFes_bot</strong>.
            </p>
            {otp ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium mb-2">Envoyez ce message au bot <strong>@CampusOpsFes_bot</strong> :</p>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-blue-800 flex-1">/link {otp}</code>
                    <button onClick={copyOtp}
                      className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-blue-400 mt-2">Ce code expire dans 10 minutes</p>
                </div>
                <button onClick={() => generateOtpMutation.mutate()} className="btn-ghost text-sm">
                  Régénérer un code
                </button>
              </div>
            ) : (
              <button onClick={() => generateOtpMutation.mutate()} disabled={generateOtpMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm">
                <Key className="w-4 h-4" />
                {generateOtpMutation.isPending ? 'Génération...' : 'Générer un code OTP'}
              </button>
            )}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-600 mb-2">Commandes disponibles :</p>
              <div className="grid grid-cols-3 gap-1">
                {['/today', '/week', '/absence', '/progress', '/help'].map(cmd => (
                  <code key={cmd} className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700">{cmd}</code>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
