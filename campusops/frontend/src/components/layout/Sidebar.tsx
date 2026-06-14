import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, UserX, CreditCard, TrendingUp,
  Users, Mail, Bell, User, Zap, ChevronLeft, ChevronRight,
  GraduationCap
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
  { to: '/planning', icon: Calendar, label: 'Planning', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
  { to: '/absences', icon: UserX, label: 'Absences', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
  { to: '/payments', icon: CreditCard, label: 'Paiements', roles: ['ADMIN', 'SCOLARITE', 'ETUDIANT'] },
  { to: '/progress', icon: TrendingUp, label: 'Avancement', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
  { to: '/users', icon: Users, label: 'Utilisateurs', roles: ['ADMIN', 'SCOLARITE'] },
  { to: '/email', icon: Mail, label: 'Messagerie', roles: ['ADMIN', 'SCOLARITE'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
  { to: '/openclaw', icon: Zap, label: 'OpenClaw', roles: ['ADMIN', 'SCOLARITE'] },
  { to: '/profile', icon: User, label: 'Mon Profil', roles: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
];

interface SidebarProps { isOpen: boolean; onToggle: () => void; }

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user } = useAuthStore();

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className={`fixed left-0 top-0 h-full z-30 flex flex-col shadow-sidebar transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}
      style={{ background: 'linear-gradient(180deg, #0A1F3D 0%, #0D3B6E 50%, #0B4E3A 100%)' }}>

      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}>
            <GraduationCap className="w-5 h-5 text-euromed-navy-dark" />
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">CampusOps</p>
              <p className="text-euromed-gold text-xs truncate">Euromed Fès</p>
            </div>
          )}
        </div>
        <button onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-euromed-gold text-euromed-navy-dark font-semibold shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-euromed-navy-dark' : ''}`} />
                  {isOpen ? (
                    <span className="text-sm truncate">{label}</span>
                  ) : (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-euromed-navy-dark text-white text-xs rounded-lg
                                    opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User info */}
      {user && (
        <div className={`p-4 border-t border-white/10 ${isOpen ? '' : 'flex justify-center'}`}>
          <div className={`flex items-center gap-3 ${isOpen ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-euromed-navy-dark"
              style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-white/50 text-xs truncate">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
