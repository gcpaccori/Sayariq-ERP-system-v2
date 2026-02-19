"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search, Plus, Eye, X, AlertCircle, Package, Gauge } from "lucide-react";
import { createLoteAction, clasificarLoteAction } from "@/app/almacen/actions";

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  categoria_id: number | null;
  fecha_ingreso: string;
  guia_ingreso: string | null;
  peso_bruto_ingreso: number;
  numero_jabas: number | null;
  chofer: string | null;
  placa_vehiculo: string | null;
  estado: string;
  observaciones: string | null;
};

type ClasificacionDetalle = {
  id: number;
  categoria_id: number;
  peso_neto: number;
};

type Props = {
  productores: { id: number; nombre_completo: string }[];
  categorias: { id: number; codigo: string; nombre: string; precio_kg: number; orden: number }[];
  lotes: Lote[];
  productorMap: Record<string, string>;
  fotoIngresoMap: Record<string, string>;
  resumen: { totalLotes: number; sinClasificar: number; clasificados: number; kgAlmacen: number };
  // detalle opcionals
  loteVerDetalleId?: number;
  clasificaciones?: ClasificacionDetalle[];
  asignaciones?: unknown[];
  categoriaMap?: Record<string, string>;
};

export default function AlmacenModuleUI({
  productores,
  categorias,
  lotes,
  productorMap,
  fotoIngresoMap,
  resumen,
  loteVerDetalleId,
  clasificaciones = [],
  asignaciones = [],
  categoriaMap = {},
}: Props) {
  const formatDate = (s?: string | null) => {
    if (!s) return "-";
    // Prefer extracting the YYYY-MM-DD part to avoid timezone shifts
    const datePart = String(s).split("T")[0];
    const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, yyyy, mm, dd] = m;
      return `${dd}/${mm}/${yyyy}`;
    }
    // Fallback: parse and use UTC components to be deterministic
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  };
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return lotes.filter((lote) => {
      if (estadoFilter !== "todos" && lote.estado !== estadoFilter) return false;
      if (!term) return true;
      return (
        lote.numero_lote.toLowerCase().includes(term) ||
        (productorMap[String(lote.productor_id)] || "").toLowerCase().includes(term)
      );
    });
  }, [lotes, query, estadoFilter, productorMap]);

  const openCreate = () => {
    setIsCreateOpen(true);
  };

  const closeCreate = () => setIsCreateOpen(false);

  const openDetalle = (lote: Lote) => setSelectedLote(lote);
  const closeDetalle = () => setSelectedLote(null);

  return (
    <main className="relative min-h-screen bg-white text-gray-900">
      {/* Grid Background Pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10">
        <section className="mx-auto max-w-7xl px-3 md:px-6">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6 pt-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo 2: Almacén</h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Control del ciclo físico de lotes con clasificación y trazabilidad
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:shadow-md active:shadow-none"
              >
                <Plus size={18} className="flex-shrink-0" />
                <span>Registrar Lote</span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50"
              >
                ← Inicio
              </Link>
            </div>
          </div>

          {/* Resumen Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            {[
              {
                label: "Total de Lotes",
                value: resumen.totalLotes,
                color: "from-blue-50 to-blue-50",
                textColor: "text-[#1A73E8]",
                icon: "📦",
              },
              {
                label: "Sin Clasificar",
                value: resumen.sinClasificar,
                color: "from-yellow-50 to-yellow-50",
                textColor: "text-yellow-700",
                icon: "⚠️",
              },
              {
                label: "Clasificados",
                value: resumen.clasificados,
                color: "from-green-50 to-green-50",
                textColor: "text-green-700",
                icon: "✓",
              },
              {
                label: "Kg en Almacén",
                value: resumen.kgAlmacen,
                color: "from-purple-50 to-purple-50",
                textColor: "text-purple-700",
                icon: "⚖️",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`rounded-xl border border-gray-200 bg-gradient-to-br ${card.color} p-4 shadow-sm transition duration-300 hover:shadow-md hover:border-gray-300`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                  </div>
                  <div className="text-4xl opacity-30">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Buscador y Filtros */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative sm:col-span-2">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por número de lote o productor..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition duration-200 placeholder:text-gray-500 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </div>

              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
              >
                <option value="todos">Todos los estados</option>
                <option value="sin_clasificar">Sin clasificar</option>
                <option value="clasificado">Clasificado</option>
                <option value="asignado">Asignado</option>
                <option value="liquidado">Liquidado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Tabla de Lotes */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="font-medium">No hay lotes con los filtros actuales</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Foto</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Lote</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Productor</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Peso (kg)</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lote) => (
                      <tr key={lote.id} className="border-b border-gray-200 transition hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {fotoIngresoMap[String(lote.id)] ? (
                            <a href={fotoIngresoMap[String(lote.id)]} target="_blank" rel="noreferrer">
                              <Image src={fotoIngresoMap[String(lote.id)]} alt="foto" width={56} height={40} className="rounded object-cover" />
                            </a>
                          ) : (
                            <div className="h-10 w-14 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{lote.numero_lote}</td>
                        <td className="px-4 py-3">{productorMap[String(lote.productor_id)] ?? "-"}</td>
                        <td className="px-4 py-3 font-medium">{lote.peso_bruto_ingreso}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(lote.fecha_ingreso)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor:
                                lote.estado === "sin_clasificar"
                                  ? "#FFF3E0"
                                  : lote.estado === "clasificado"
                                    ? "#E8F5E9"
                                    : lote.estado === "asignado"
                                      ? "#E3F2FD"
                                      : "#FFEBEE",
                              color:
                                lote.estado === "sin_clasificar"
                                  ? "#E65100"
                                  : lote.estado === "clasificado"
                                    ? "#2E7D32"
                                    : lote.estado === "asignado"
                                      ? "#1565C0"
                                      : "#C62828",
                            }}
                          >
                            {lote.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openDetalle(lote)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      {/* Crear Lote Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-t-2xl md:rounded-xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registrar Lote</h3>
                <p className="mt-1 text-xs text-gray-500">Ingresa un nuevo lote al almacén con sus detalles operativos.</p>
              </div>
              <button onClick={closeCreate} className="rounded-full p-1.5 hover:bg-gray-100 transition">
                <X size={20} />
              </button>
            </div>

            <form action={createLoteAction} className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Número de Lote (opcional)</span>
                  <input name="numero_lote" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Productor *</span>
                  <select name="productor_id" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required>
                    <option value="">Seleccionar productor</option>
                    {productores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Producto *</span>
                  <input name="producto" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" placeholder="Jengibre" required />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Categoría</span>
                  <select name="categoria_id" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Fecha ingreso *</span>
                  <input type="date" name="fecha_ingreso" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Peso bruto (kg) *</span>
                  <input type="number" step="0.01" name="peso_bruto_ingreso" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Número de jabas</span>
                  <input type="number" name="numero_jabas" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Guía de ingreso</span>
                  <input name="guia_ingreso" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Chofer</span>
                  <input name="chofer" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Placa vehículo</span>
                  <input name="placa_vehiculo" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Foto ingreso</span>
                  <input type="file" name="foto_lote_ingreso" accept="image/*" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-gray-700">Observaciones</span>
                <textarea name="observaciones" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" rows={3} />
              </label>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                <button type="button" onClick={closeCreate} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1765CC]">
                  Crear Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ver detalle modal */}
      {selectedLote && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-t-2xl md:rounded-xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Detalle Lote {selectedLote.numero_lote}</h3>
                <p className="mt-1 text-xs text-gray-500">Productor: <span className="font-medium">{productorMap[String(selectedLote.productor_id)]}</span></p>
              </div>
              <button onClick={closeDetalle} className="rounded-full p-1.5 hover:bg-gray-100 transition">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Peso bruto</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedLote.peso_bruto_ingreso} kg</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Estado</p>
                  <p className="mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor:
                        selectedLote.estado === "sin_clasificar"
                          ? "#FFF3E0"
                          : selectedLote.estado === "clasificado"
                            ? "#E8F5E9"
                            : "#E3F2FD",
                      color:
                        selectedLote.estado === "sin_clasificar"
                          ? "#E65100"
                          : selectedLote.estado === "clasificado"
                            ? "#2E7D32"
                            : "#1565C0",
                    }}
                  >
                    {selectedLote.estado}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Observaciones</p>
                <p className="mt-2 text-sm text-gray-700">{selectedLote.observaciones ?? "-"}</p>
              </div>

              {clasificaciones.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">Clasificaciones</p>
                  <div className="mt-3 grid gap-2">
                    {clasificaciones.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded bg-white px-3 py-2">
                        <span className="text-sm text-gray-700">{categoriaMap[String(c.categoria_id)] ?? c.categoria_id}</span>
                        <span className="text-sm font-medium text-gray-900">{c.peso_neto} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
