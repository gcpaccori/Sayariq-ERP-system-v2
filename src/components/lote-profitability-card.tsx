'use client';

import React, { useState } from 'react';

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
        className="w-full text-left px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Lote: {numeroLote}
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                {producto}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
              <div>
                <span className="font-medium">Productor:</span> {productor}
              </div>
              <div>
                <span className="font-medium">Ingreso:</span> {fechaIngreso}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{kgClasif}</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">kg clasificados</p>
              </div>
              <div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{kgVendido}</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">kg vendidos</p>
              </div>
              <div>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{kgSobrante}</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">kg sobrantes</p>
              </div>
            </div>
          </div>

          {/* Ganancia destacada */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-2xl font-bold ${
              gananciaSobrePagado >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(gananciaSobrePagado)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Ganancia</p>
            <button
              className="mt-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-transform duration-200"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </button>
          </div>
        </div>
      </button>

      {/* Detalles expandibles */}
      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-4">
          {/* Grid de métricas */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Ventas totales</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(ventasTotales)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Costo comprometido</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(costoComprometido)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Pagado real</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(pagadoReal)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Saldo por pagar</p>
              <p className={`text-lg font-bold mt-1 ${
                saldoPorPagar <= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(saldoPorPagar)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Ganancia s/ pagado</p>
              <p className={`text-lg font-bold mt-1 ${
                gananciaSobrePagado >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(gananciaSobrePagado)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-medium">Ganancia s/ comprometido</p>
              <p className={`text-lg font-bold mt-1 ${
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
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Detalles por categoría:
              </h4>
              <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800">
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Categoría</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Kg Clasif.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Kg Vendido</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Kg Sobrante</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-900 dark:text-slate-100">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Precio Prom.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Venta Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {categorias.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium">{cat.categoria}</td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{cat.kgClasif}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{cat.kgVendido}</td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">{cat.kgSobrante}</td>
                        <td className="px-3 py-2 text-center">{getStatusBadge(cat.estadoSalida)}</td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">S/ {cat.precioVentaProm.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 font-semibold">
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
