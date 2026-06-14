import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface LoginForm { email: string; password: string; }

const demoAccounts = [
  { label: 'Admin', email: 'admin@euromed-fes.ma', pass: 'Admin@2025!', color: '#EF4444' },
  { label: 'Scolarité', email: 'belghalihajar0@gmail.com', pass: 'Scolarite@2025!', color: '#3B82F6' },
  { label: 'Enseignant', email: 'someoner774@gmail.com', pass: 'Teacher@2025!', color: '#10B981' },
  { label: 'Étudiant', email: 'hajar.belghali@eidia.ueuromed.org', pass: 'Student@2025!', color: '#8B5CF6' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Bienvenue, ${user.firstName} !`);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — Photo campus Euromed Fès ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">

        {/* Photo réelle du campus Euromed de Fès */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('https://backend.ueuromed.org/uploads/3_4_04b96c787d.webp')` }} />

        {/* Overlay dégradé bleu-vert Euromed par-dessus la photo */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, rgba(10,31,61,0.85) 0%, rgba(13,59,110,0.75) 40%, rgba(11,78,74,0.80) 70%, rgba(13,122,95,0.70) 100%)',
        }} />

        {/* Vignette bas */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{
          background: 'linear-gradient(to top, rgba(10,31,61,0.95), transparent)',
        }} />

        {/* Contenu */}
        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Université Euromed</p>
              <p className="text-emerald-300 text-xs">de Fès</p>
            </div>
          </div>

          {/* Texte central */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="mb-6">
              <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
                Plateforme académique
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Bienvenue sur<br />
              <span style={{ background: 'linear-gradient(90deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CampusOps
              </span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Gérez vos plannings, absences, paiements et bien plus depuis une seule plateforme.
            </p>

            {/* Stats */}
            <div className="flex gap-8 mt-10">
              {[
                { value: '4', label: 'Rôles' },
                { value: '100%', label: 'Digital' },
                { value: '24/7', label: 'Disponible' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer bas */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-white/40 text-xs">Système en ligne · Fès, Maroc</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Formulaire ── */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0D3B6E, #0D7A5F)' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800">CampusOps</p>
              <p className="text-xs text-gray-500">Euromed Fès</p>
            </div>
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-500 text-sm">Accédez à votre espace académique</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('email', { required: 'Email requis', pattern: { value: /\S+@\S+\.\S+/, message: 'Email invalide' } })}
                  type="email" placeholder="votre@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm outline-none transition-all
                    ${errors.email
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'}`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  className={`w-full pl-11 pr-11 py-3 rounded-2xl border text-sm outline-none transition-all
                    ${errors.password
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
              style={{ background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0D3B6E, #0D7A5F)' }}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion...</>
              ) : (
                <>Se connecter <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">Comptes démo</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Demo accounts */}
          <div className="grid grid-cols-2 gap-2.5">
            {demoAccounts.map(({ label, email, pass, color }) => (
              <button key={label} type="button"
                onClick={() => { setValue('email', email); setValue('password', pass); onSubmit({ email, password: pass }); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all text-left">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-xs font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 truncate max-w-24" style={{ fontSize: '10px' }}>{email.split('@')[0]}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-gray-300 text-xs mt-8">
            © 2025 Université Euromed de Fès
          </p>
        </div>
      </div>
    </div>
  );
}
