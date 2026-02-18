'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';

interface KPICardProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'critical' | 'success';
}

export function KPICard({ label, value, variant = 'default' }: KPICardProps) {
  const bgVariants = {
    default: 'bg-white border-blue-200',
    critical: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`rounded border p-2.5 md:p-3 ${bgVariants[variant]}`}>
      <p className="truncate text-xs font-medium text-gray-600 md:text-sm">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900 md:text-base line-clamp-2">{value}</p>
    </div>
  );
}

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded mb-2 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-blue-50 hover:bg-blue-100 px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-gray-900 transition"
      >
        <span>{title}</span>
        <span className={`text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="bg-white p-3 md:p-4">{children}</div>}
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
      <div className="flex gap-1 border-b bg-gray-50 overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-3 py-2 text-xs md:text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeTab === idx
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white p-3 md:p-4">{tabs[activeTab].content}</div>
    </div>
  );
}

interface DataCardProps {
  fields: { label: string; value: string | number }[];
  highlight?: boolean;
}

export function DataCard({ fields, highlight = false }: DataCardProps) {
  return (
    <div className={`rounded border p-2.5 md:p-3 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
      {fields.map((field, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
          <p className="text-xs font-medium text-gray-600">{field.label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{field.value}</p>
        </div>
      ))}
    </div>
  );
}

interface CompactTableProps {
  headers: string[];
  rows: (string | number | ReactNode)[][];
  compact?: boolean;
}

export function CompactTable({ headers, rows, compact = true }: CompactTableProps) {
  if (rows.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm">Sin datos</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            {headers.map((h, i) => (
              <th key={i} className={`text-left font-semibold text-gray-700 ${compact ? 'p-1.5 md:p-2' : 'p-2 md:p-3'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className={`text-gray-800 ${compact ? 'p-1.5 md:p-2' : 'p-2 md:p-3'}`}>
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
}

export function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="mb-4 rounded border bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b px-3 py-2.5 md:px-4 md:py-3">
        <h2 className="text-sm md:text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3 md:p-4">{children}</div>
    </section>
  );
}

interface HeaderProps {
  productorNombre: string;
  exposicionTotal: string;
  productoresValidos: { id: number; nombre_completo: string }[];
  productorSeleccionadoId: number;
}

export function Header({
  productorNombre,
  exposicionTotal,
  productoresValidos,
  productorSeleccionadoId,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-blue-200 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3">
        <div>
          <h1 className="text-sm md:text-base font-bold text-gray-900">Estado de Cuenta</h1>
          <p className="text-xs text-gray-600 mt-0.5">Exposición: <span className="font-bold text-red-600">{exposicionTotal}</span></p>
        </div>
        <div className="flex gap-1">
          <Link href="/liquidaciones" className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">
            Liquidar
          </Link>
          <Link href="/" className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
            ←
          </Link>
        </div>
      </div>
      {productoresValidos.length > 1 && (
        <form className="px-3 py-2 md:px-4 border-t bg-gray-50" onChange={(e: React.FormEvent<HTMLFormElement>) => {
          const form = e.currentTarget;
          const select = form.querySelector('select') as HTMLSelectElement;
          if (select) {
            const url = new URL(window.location.href);
            url.searchParams.set('productor', select.value);
            window.location.href = url.toString();
          }
        }}>
          <label className="text-xs font-medium text-gray-700 block mb-1">Cambiar productor</label>
          <select
            name="productor"
            defaultValue={String(productorSeleccionadoId)}
            className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 focus:outline-none focus:border-blue-500"
          >
            {productoresValidos.map((row) => (
              <option key={row.id} value={String(row.id)}>
                {row.nombre_completo}
              </option>
            ))}
          </select>
        </form>
      )}
    </header>
  );
}
