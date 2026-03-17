'use client';

import React, { useState } from 'react';
// Force rebuild - v2

interface LoteCategoriaRow {
  categoria: string;
  codigoClasificacion: string;
  kgClasif: number;
  kgVendido: number;
  kgSobrante: number;
  estadoSalida: 'no_vendido' | 'parcial' | 'vendido_total';
  precioVentaProm: number;
  ventaTotal: number;
  particiones: string;
  pedidos: string;
}

interface LoteProfitabilityCardProps {
  numeroLote: string;
  producto: 'Jengibre' | 'Curcuma';
  productor: string;
  fechaIngreso: string;
  kgClasif: number;
  kgVendido: number;
  kgSobrante: number;
  ventasTotales: number;
  costoComprometido: number;
  pagadoReal: number;
  saldoPorPagar: number;
  gananciaSobrePagado: number;
  gananciaSobreComprometido: number;
  categorias: LoteCategoriaRow[];
}

const getStatusBadge = (status: 'no_vendido' | 'parcial' | 'vendido_total') => {
  const statusConfig = {
    vendido_total: {
      label: 'Vendido Total',
      color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    },
    parcial: {
      label: 'Parcial',
      color: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
    },
    no_vendido: {
      label: 'No Vendido',
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    },
  };
  const config = statusConfig[status];
  return <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.color}`}>{config.label}</span>;
};

export function LoteProfitabilityCard({
  numeroLote,
  producto,
  productor,
  fechaIngreso,
  kgClasif,
  kgVendido,
  kgSobrante,
  ventasTotales,
  costoComprometido,
  pagadoReal,
  saldoPorPagar,
  gananciaSobrePagado,
  gananciaSobreComprometido,
  categorias,
}: LoteProfitabilityCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return `S/ ${value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header - Click to expand */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3 sm:px-4 py-3 sm:py-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Título y producto */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {numeroLote}
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded flex-shrink-0">
                {producto}
              </span>
            </div>
            
            {/* Productor e ingreso (más compacto) */}
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 space-y-0.5">
              <div><span className="font-medium">Productor:</span> {productor}</div>
              <div><span className="font-medium">Ingreso:</span> {fechaIngreso}</div>
            </div>
            
            {/* Volumen en línea */}
            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{kgClasif}</span>
                <span className="text-slate-500">kg clasif.</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{kgVendido}</span>
                <span className="text-slate-500">kg vendido</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{kgSobrante}</span>
                <span className="text-slate-500">kg sobrante</span>
              </div>
            </div>
          </div>

          {/* Ganancia y chevron */}
          <div className="flex flex-col items-end flex-shrink-0 pt-1">
            <div className={`text-lg sm:text-2xl font-bold whitespace-nowrap ${
              gananciaSobrePagado >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(gananciaSobrePagado)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">Ganancia</p>
            {/* Chevron sin botón anidado */}
            <span
              className="mt-1 text-slate-400 dark:text-slate-500 transition-transform duration-200 inline-block"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </div>
        </div>
      </button>

      {/* Detalles expandibles */}
      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 sm:px-4 py-3 sm:py-4 space-y-4">
          
          {/* Resumen compacto de 6 métricas principales */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Ventas</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatCurrency(ventasTotales)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Costo</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatCurrency(costoComprometido)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Pagado</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatCurrency(pagadoReal)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Saldo</p>
              <p className={`text-sm font-bold mt-0.5 ${
                saldoPorPagar <= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(saldoPorPagar)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Gan. pago</p>
              <p className={`text-sm font-bold mt-0.5 ${
                gananciaSobrePagado >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(gananciaSobrePagado)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">Gan. costo</p>
              <p className={`text-sm font-bold mt-0.5 ${
                gananciaSobreComprometido >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(gananciaSobreComprometido)}
              </p>
            </div>
          </div>

          {/* Tabla de categorías */}
          {categorias.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">
                Detalles por categoría
              </h4>
              <div className="sx-table-wrap">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800">
                      <th className="px-2 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Categoría</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Clasif</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Vendido</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Sobrante</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-900 dark:text-slate-100">Estado</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Precio</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {categorias.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-2 py-1.5 sm:py-2 text-slate-900 dark:text-slate-100 font-medium">{cat.categoria}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-right text-slate-600 dark:text-slate-400">{cat.kgClasif}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{cat.kgVendido}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-right text-amber-600 dark:text-amber-400">{cat.kgSobrante}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-center">{getStatusBadge(cat.estadoSalida)}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-right text-slate-600 dark:text-slate-400">S/ {cat.precioVentaProm.toFixed(2)}</td>
                        <td className="px-2 py-1.5 sm:py-2 text-right text-slate-900 dark:text-slate-100 font-semibold">
                          S/ {cat.ventaTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
