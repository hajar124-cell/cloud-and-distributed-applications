import { Menu, Bell, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authApi, notificationApi } from '../../services/api';

interface HeaderProps { onToggleSidebar: () => void; sidebarOpen: boolean; }

export default function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll(5),
    refetchInterval: 60_000,
  });

  const unreadCount = notifData?.data?.data?.unreadCount || 0;

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 z-20">
      <button onClick={onToggleSidebar} className="p-2 rounded-lg text-gray-500 hover:text-euromed-navy hover:bg-gray-100 transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex items-center gap-2 flex-1">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Rechercher..." className="input-field pl-9 py-2 text-sm" />
        </div>
      </div>

      <div className="hidden md:block text-sm text-gray-500 capitalize">{today}</div>

      <div className="flex items-center gap-2 ml-auto">
        <button onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-gray-500 hover:text-euromed-navy hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-euromed-navy-dark cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}
            onClick={() => navigate('/profile')}>
            {user?.firstName[0]}{user?.lastName[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <button onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Déconnexion">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
