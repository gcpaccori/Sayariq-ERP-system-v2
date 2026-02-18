'use client';

import React from 'react';

type StatusType = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: StatusType;
  icon?: React.ReactNode;
  sparkline?: boolean;
  compact?: boolean;
}

const statusColors: Record<StatusType, { bg: string; text: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  neutral: {
    bg: 'bg-slate-50 dark:bg-slate-900',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  status = 'neutral',
  icon,
  compact = false,
}: StatsCardProps) {
  const colors = statusColors[status];

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200 ease-out
        hover:shadow-md hover:border-opacity-100
        ${colors.border} ${colors.bg}
        p-3 sm:p-4
      `}
    >
      {/* Header con icono y título */}
      <div className="mb-1.5 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 line-clamp-2">
            {title}
          </p>
        </div>
        {icon && <span className="ml-2 text-lg opacity-60 flex-shrink-0">{icon}</span>}
      </div>

      {/* Valor principal */}
      <p className="text-lg sm:text-2xl font-bold ${colors.text} line-clamp-2">
        {value}
      </p>

      {/* Subtítulo */}
      {subtitle && (
        <p className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  );
}
