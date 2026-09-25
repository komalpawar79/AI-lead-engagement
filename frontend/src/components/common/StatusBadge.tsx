import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'leadStatus' | 'interestLevel' | 'priority';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'leadStatus' }) => {
  const normalized = status?.toUpperCase().replace(/\s+/g, '_') || 'UNKNOWN';

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'leadStatus') {
    switch (normalized) {
      case 'FOLLOW_UP':
        bgClass = 'bg-orange-50 text-orange-700 border-orange-200 font-semibold';
        break;
      case 'INTERESTED':
        bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
        break;
      case 'RESPONDED':
        bgClass = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'CONTACTED':
        bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'NOT_INTERESTED':
        bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'NO_RESPONSE':
        bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
      case 'IMPORTED':
      case 'PENDING':
      default:
        bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'interestLevel') {
    switch (normalized) {
      case 'HIGH':
        bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
        break;
      case 'MEDIUM':
        bgClass = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        break;
      case 'LOW':
        bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
      case 'NOT_INTERESTED':
        bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'priority') {
    switch (normalized) {
      case 'HIGH':
        bgClass = 'bg-red-50 text-red-700 border-red-200 font-semibold';
        break;
      case 'MEDIUM':
        bgClass = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        break;
      case 'LOW':
        bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  }

  const label = normalized.replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${bgClass}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          normalized === 'FOLLOW_UP'
            ? 'bg-orange-500 animate-pulse'
            : normalized === 'INTERESTED' || normalized === 'HIGH'
            ? 'bg-emerald-500'
            : normalized === 'NOT_INTERESTED'
            ? 'bg-rose-500'
            : 'bg-slate-400'
        }`}
      />
      {label}
    </span>
  );
};

