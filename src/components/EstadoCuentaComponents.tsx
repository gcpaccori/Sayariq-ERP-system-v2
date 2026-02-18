'use client';

import { ReactNode, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'critical' | 'success';
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
}

export function KPICard({ label, value, variant = 'default', trend, icon }: KPICardProps) {
  const bgVariants = {
    default: 'bg-white border-[#E5E7EB]',
    critical: 'bg-[#FCE8E6] border-[#FADBD8]',
    success: 'bg-[#E6F4EA] border-[#C6E9D9]',
  };

  const trendColor = trend === 'up' ? 'text-[#0D652D]' : trend === 'down' ? 'text-[#D33B27]' : 'text-[#5F6368]';
  const trendIcon = trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : null;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-4 md:p-5 transition-all duration-300 hover:shadow-[0_10px_24px_rgba(16,24,40,0.08)] hover:border-[#D2E3FC] ${bgVariants[variant]}`}>
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#1A73E8] to-[#5B9CF5] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F6368] mb-1">{label}</p>
          <p className="text-xl md:text-2xl font-bold text-[#202124] break-words">{value}</p>
        </div>
        {icon && <div className="text-[#1A73E8] opacity-60 flex-shrink-0 ml-2">{icon}</div>}
      </div>

      {trend && (
        <div className="flex items-center gap-1">
          {trendIcon && <span className={trendColor}>{trendIcon}</span>}
        </div>
      )}
    </div>
  );
}

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'orange' | 'red';
}

export function AccordionItem({ title, children, defaultOpen = false, badge, badgeColor = 'blue' }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const badgeColorClass = {
    blue: 'bg-[#E8F0FE] text-[#1A73E8]',
    green: 'bg-[#E6F4EA] text-[#0D652D]',
    orange: 'bg-[#FEF7E0] text-[#EA8300]',
    red: 'bg-[#FCE8E6] text-[#D33B27]',
  }[badgeColor];

  return (
    <div className="border-b border-[#E5E7EB] last:border-b-0 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 md:px-5 py-3.5 md:py-4 flex items-center justify-between hover:bg-[#F8FBFF] transition-colors group"
      >
        <div className="flex items-center gap-2.5 flex-1 text-left min-w-0">
          <span className="text-[#202124] font-semibold text-sm group-hover:text-[#1A73E8] transition-colors">{title}</span>
          {badge && <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${badgeColorClass} flex-shrink-0`}>{badge}</span>}
        </div>
        <ChevronDown 
          size={18} 
          className={`text-[#5F6368] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 md:px-5 py-4 md:py-5 bg-[#F8FBFF] border-t border-[#E5E7EB]">
          {children}
        </div>
      )}
    </div>
  );
}

interface TabsProps {
  tabs: { label: string; content: ReactNode }[];
}

export function Tabs({ tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex gap-0.5 border-b border-[#E5E7EB] overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === idx
                ? 'border-[#1A73E8] text-[#1A73E8] bg-[#F8FBFF]'
                : 'border-transparent text-[#5F6368] hover:text-[#202124] hover:bg-[#F8FBFF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 md:p-5">{tabs[activeTab].content}</div>
    </div>
  );
}

interface DataCardProps {
  fields: { label: string; value: string | number }[];
  highlight?: boolean;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export function DataCard({ fields, highlight = false, icon, color = 'blue' }: DataCardProps) {
  const bgColor = {
    blue: 'bg-[#E8F0FE] border-[#D2E3FC]',
    green: 'bg-[#E6F4EA] border-[#C6E9D9]',
    orange: 'bg-[#FEF7E0] border-[#FCE5CD]',
    red: 'bg-[#FCE8E6] border-[#FADBD8]',
  }[color];

  const textColor = {
    blue: 'text-[#1A73E8]',
    green: 'text-[#0D652D]',
    orange: 'text-[#EA8300]',
    red: 'text-[#D33B27]',
  }[color];

  return (
    <div className={`rounded-xl border p-3.5 md:p-4 ${highlight ? bgColor : 'bg-white border-[#E5E7EB]'}`}>
      {fields.map((field, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-2.5' : ''}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5F6368]">{field.label}</p>
          <p className={`text-base md:text-lg font-bold mt-1 break-words ${highlight ? textColor : 'text-[#202124]'}`}>{field.value}</p>
        </div>
      ))}
    </div>
  );
}

interface CompactTableProps {
  headers: string[];
  rows: (string | number | ReactNode)[][];
  compact?: boolean;
  emptyMessage?: string;
}

export function CompactTable({ headers, rows, compact = true, emptyMessage = 'Sin registros' }: CompactTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8FBFF] px-4 py-6 text-center text-sm text-[#5F6368]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr className="bg-[#F8FBFF] border-b border-[#E5E7EB]">
            {headers.map((h, i) => (
              <th key={i} className={`text-left font-semibold text-xs uppercase tracking-[0.08em] text-[#5F6368] ${compact ? 'p-2.5 md:p-3' : 'p-3 md:p-4'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FBFF] transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className={`text-[#202124] ${compact ? 'p-2.5 md:p-3' : 'p-3 md:p-4'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function Section({ title, subtitle, children, icon }: SectionProps) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="border-b border-[#E5E7EB] bg-[#F8FBFF] px-4 md:px-6 py-3.5 md:py-4">
        <div className="flex items-center gap-2.5 mb-1">
          {icon && <span className="text-[#1A73E8]">{icon}</span>}
          <h2 className="text-sm font-semibold text-[#202124]">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-[#5F6368] ml-7">{subtitle}</p>}
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </section>
  );
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  productoresValidos?: { id: number; nombre_completo: string }[];
  productorSeleccionadoId?: number;
}

export function Header({ title = 'Estado de Cuenta', subtitle, productoresValidos = [], productorSeleccionadoId = 0 }: HeaderProps) {
  return (
    <header className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-white to-[#F8FBFF] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="px-4 md:px-6 py-4 md:py-5">
        <div className="mb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-1 w-1 rounded-full bg-[#1A73E8]" />
            <h1 className="text-2xl md:text-3xl font-bold text-[#202124]">{title}</h1>
          </div>
          {subtitle && <p className="text-sm text-[#5F6368] ml-3.5">{subtitle}</p>}
        </div>

        {productoresValidos.length > 1 && (
          <ProductorSelector 
            productoresValidos={productoresValidos}
            productorSeleccionadoId={productorSeleccionadoId}
          />
        )}
      </div>
    </header>
  );
}

interface ProductorSelectorProps {
  productoresValidos: Array<{ id: number; nombre_completo: string }>;
  productorSeleccionadoId: number;
}

function ProductorSelector({ productoresValidos, productorSeleccionadoId }: ProductorSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set('productor', e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="pt-3.5 md:pt-4 border-t border-[#E5E7EB]">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F6368] block mb-2">Productor actual</label>
      <select
        onChange={handleChange}
        defaultValue={String(productorSeleccionadoId)}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CCD3DF] bg-white text-[#202124] focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#E8F0FE] transition-all font-medium"
      >
        {productoresValidos.map((row) => (
          <option key={row.id} value={String(row.id)}>
            {row.nombre_completo}
          </option>
        ))}
      </select>
    </div>
  );
}
