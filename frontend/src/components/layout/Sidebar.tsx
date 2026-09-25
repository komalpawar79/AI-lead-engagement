import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Upload,
  MessageSquareCode,
  Building2,
  Settings,
  Flame,
  User,
  Bell,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  followUpCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ followUpCount = 0 }) => {
  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('auth_user');
      const parsed = u ? JSON.parse(u) : null;
      if (parsed && (parsed.name === 'Sales Director' || parsed.name === 'Admin User')) {
        parsed.name = 'Admin';
        localStorage.setItem('auth_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const [currentUser, setCurrentUser] = useState(getStoredUser);

  useEffect(() => {
    const handleUpdate = (e?: any) => {
      if (e?.detail) {
        setCurrentUser(e.detail);
      } else {
        setCurrentUser(getStoredUser());
      }
    };
    window.addEventListener('auth_user_updated', handleUpdate as EventListener);
    window.addEventListener('storage', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('auth_user_updated', handleUpdate as EventListener);
      window.removeEventListener('storage', handleUpdate as EventListener);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  };

  const adminName = currentUser?.name || 'Admin';
  const adminEmail = currentUser?.email || 'admin@leadengage.ai';
  const initials = adminName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/follow-up-leads',
      label: 'Follow-up Leads',
      icon: UserCheck,
      badge: followUpCount > 0 ? followUpCount : null,
      isHero: true,
    },
    {
      to: '/leads',
      label: 'All Leads',
      icon: Users,
      badge: null,
    },
    {
      to: '/upload-leads',
      label: 'Upload Leads',
      icon: Upload,
      badge: null,
    },
    {
      to: '/test-conversations',
      label: 'Test Simulator',
      icon: MessageSquareCode,
      badge: 'LIVE',
    },
    {
      to: '/projects',
      label: 'Projects Knowledge',
      icon: Building2,
      badge: null,
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: null,
    },
    {
      to: '/profile',
      label: 'Admin Profile',
      icon: User,
      badge: null,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-full border-r border-slate-800 overflow-y-auto select-none">
      {/* Positioning Pill */}
      <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shrink-0">
        <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400">
          <Flame className="w-4 h-4" />
          <span>Core Output Hub</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
          Transform raw Excel leads into actionable human follow-ups.
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? item.isHero
                      ? 'bg-orange-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${item.isHero ? 'text-orange-400 group-hover:text-orange-300' : ''}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    item.isHero
                      ? 'bg-white text-orange-700'
                      : item.badge === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile & Logout Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40 shrink-0">
        {/* Admin Profile Quick Card */}
        <NavLink
          to="/profile"
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-800/80 transition-colors group"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={adminName}
              className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/40 shadow-sm shrink-0 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate group-hover:text-orange-400 transition-colors flex items-center space-x-1">
              <span className="truncate">{adminName}</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {adminEmail}
            </div>
          </div>
        </NavLink>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 transition-all border border-transparent hover:border-rose-500/30 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
