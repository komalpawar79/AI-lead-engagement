import React, { useState, useEffect } from 'react';
import { Bell, Download, Sparkles, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportFollowUpsUrl, logout } from '../../services/api';

export const Header: React.FC<{ unreadNotificationsCount?: number }> = ({
  unreadNotificationsCount = 2,
}) => {
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

  const adminName = currentUser?.name || 'Admin';
  const adminEmail = currentUser?.email || 'admin@leadengage.ai';
  const initials = adminName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand / Positioning */}
      <div className="flex items-center space-x-4">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center text-white shadow-sm border border-slate-700">
            <Sparkles className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-navy">
                AI LeadEngage
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                Real Estate
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Smarter Leads. Faster Sales.
            </p>
          </div>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Live AI Status Badge */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>AI Engine Active</span>
        </div>

        {/* 1-Click Hero Action: Download Follow-Up Leads */}
        <a
          href={exportFollowUpsUrl}
          download="follow_up_leads.xlsx"
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Follow-Ups</span>
        </a>

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-white" />
          )}
        </Link>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <Link
            to="/profile"
            className="flex items-center space-x-2.5 hover:opacity-85 transition-opacity group"
            title="View Admin Profile"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={adminName}
                className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                {adminName}
              </div>
              <div className="text-[11px] text-slate-500">{adminEmail}</div>
            </div>
          </Link>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
