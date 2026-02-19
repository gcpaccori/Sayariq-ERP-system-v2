'use client';

import React from 'react';
import ActionFormModal from '@/components/action-form-modal';
import { useRouter } from 'next/navigation';

interface LoteOption {
  id: number;
  numero_lote: string;
}

type ProductoFilter = "todos" | "Jengibre" | "Curcuma";

interface RentabilidadFiltersProps {
  lotesOptions: LoteOption[];
  currentProducto: ProductoFilter;
  currentLote: number;
}

export function RentabilidadFilters({
  lotesOptions,
  currentProducto,
  currentLote,
}: RentabilidadFiltersProps) {
  const router = useRouter();
  const [productoFilter, setProductoFilter] = React.useState(currentProducto);
  const [loteFilter, setLoteFilter] = React.useState(currentLote > 0 ? String(currentLote) : '');
  const [isOpen, setIsOpen] = React.useState(false);

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
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 sm:p-4 transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Filtros:
        </p>
        <ActionFormModal
          title="Filtros de rentabilidad"
          description="Aplica filtros por producto y lote."
          open={isOpen}
          onOpenChange={setIsOpen}
          size="md"
          trigger={
            <button
              type="button"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150"
            >
              Abrir filtros
            </button>
          }
        >
          <form 
            className="flex flex-col sm:flex-row sm:items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleApply();
              setIsOpen(false);
            }}
          >
        {/* Producto */}
        <div className="flex-1 min-w-0">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
              Producto
            </span>
            <select
              value={productoFilter}
              onChange={(e) => setProductoFilter(e.target.value as ProductoFilter)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              <option value="todos">Todos</option>
              <option value="Jengibre">Jengibre</option>
              <option value="Curcuma">Cúrcuma</option>
            </select>
          </label>
        </div>

        {/* Lote */}
        <div className="flex-1 min-w-0">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
              Lote (Opcional)
            </span>
            <select
              value={loteFilter}
              onChange={(e) => setLoteFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              <option value="">Todos</option>
              {lotesOptions.map((lote) => (
                <option key={lote.id} value={String(lote.id)}>
                  {lote.numero_lote}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Botones */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md transition-colors duration-150"
          >
            Limpiar
          </button>
        </div>
          </form>
        </ActionFormModal>
      </div>
    </div>
  );
}
