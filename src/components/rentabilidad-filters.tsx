'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoteOption {
  id: number;
  numero_lote: string;
}

interface RentabilidadFiltersProps {
  lotesOptions: LoteOption[];
  currentProducto: 'todos' | 'Jengibre' | 'Curcuma';
  currentLote: number;
}

export function RentabilidadFilters({
  lotesOptions,
  currentProducto,
  currentLote,
}: RentabilidadFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [productoFilter, setProductoFilter] = React.useState(currentProducto);
  const [loteFilter, setLoteFilter] = React.useState(currentLote > 0 ? String(currentLote) : '');

  const handleApply = () => {
    const params = new URLSearchParams();
    if (productoFilter !== 'todos') {
      params.set('producto', productoFilter);
    }
    if (loteFilter) {
      params.set('lote', loteFilter);
    }
    router.push(`/rentabilidad-lotes?${params.toString()}`);
  };

  const handleReset = () => {
    setProductoFilter('todos');
    setLoteFilter('');
    router.push('/rentabilidad-lotes');
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 transition-all duration-200">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Filtrar por:
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => {
        e.preventDefault();
        handleApply();
      }}>
        <div className="flex-1 min-w-fit">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
              Producto
            </span>
            <select
              value={productoFilter}
              onChange={(e) => setProductoFilter(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              <option value="todos">Todos los productos</option>
              <option value="Jengibre">Jengibre</option>
              <option value="Curcuma">Cúrcuma</option>
            </select>
          </label>
        </div>

        <div className="flex-1 min-w-fit">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
              Lote (Opcional)
            </span>
            <select
              value={loteFilter}
              onChange={(e) => setLoteFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              <option value="">Todos los lotes</option>
              {lotesOptions.map((lote) => (
                <option key={lote.id} value={String(lote.id)}>
                  {lote.numero_lote}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md transition-colors duration-150"
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
}
