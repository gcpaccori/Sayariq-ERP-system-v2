'use client';

import React from 'react';

type StatusType = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: StatusType;
  icon?: React.ReactNode;
  compact?: boolean;
}

const statusColors: Record<StatusType, { bg: string; text: string }> = {
  success: {
    bg: 'bg-gradient-to-br from-emerald-50 to-white',
    text: 'text-emerald-700',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-50 to-white',
    text: 'text-red-700',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-white',
    text: 'text-amber-700',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-white to-gray-100',
    text: 'text-gray-900',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-50 to-white',
    text: 'text-blue-700',
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  status = 'neutral',
  icon,
}: StatsCardProps) {
  const colors = statusColors[status];

  return (
    <div
      className={`rounded-xl p-3 sm:p-4 shadow-sm transition-all duration-200 ease-out hover:shadow-md ${colors.bg}`}
    >
      {/* Header */}
      <div className="mb-1.5 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 line-clamp-2">
            {title}
          </p>
        </div>
        {icon && <span className="ml-2 flex-shrink-0 text-lg opacity-60">{icon}</span>}
      </div>

      {/* Valor principal */}
      <p className={`text-lg sm:text-2xl font-bold line-clamp-2 ${colors.text}`}>
        {value}
      </p>

      {/* Subtítulo */}
      {subtitle && (
        <p className="mt-1 text-[10px] sm:text-xs text-slate-600 leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  );
}
