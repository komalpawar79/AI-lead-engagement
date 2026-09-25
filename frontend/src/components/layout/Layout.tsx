import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getNotifications } from '../../services/api';

export const Layout: React.FC = () => {
  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 15000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const followUpCount = summary?.metrics.followUpLeads ?? 4;

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Fixed Header */}
      <Header unreadNotificationsCount={unreadCount} />

      {/* Main Body: Fixed Sidebar + Scrollable Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Non-Scrolling Sidebar */}
        <Sidebar followUpCount={followUpCount} />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

