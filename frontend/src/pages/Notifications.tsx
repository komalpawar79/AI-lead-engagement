import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Flame, Megaphone, Info } from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api';
import { NotificationItem } from '../types';

export const Notifications: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Notifications</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alerts on qualified follow-ups, completed campaigns, and lead events.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-slate-500" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No notifications found.</div>
        ) : (
          notifications.map((n: NotificationItem) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              className={`p-5 flex items-start justify-between space-x-4 cursor-pointer transition-colors ${
                n.isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-orange-50/40 hover:bg-orange-50/70'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`p-2 rounded-xl mt-0.5 ${
                    n.type === 'FOLLOW_UP_IDENTIFIED'
                      ? 'bg-orange-100 text-orange-600'
                      : n.type === 'CAMPAIGN_COMPLETED'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {n.type === 'FOLLOW_UP_IDENTIFIED' ? (
                    <Flame className="w-4 h-4" />
                  ) : n.type === 'CAMPAIGN_COMPLETED' ? (
                    <Megaphone className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markReadMutation.mutate(n.id);
                  }}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

