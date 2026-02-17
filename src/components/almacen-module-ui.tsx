"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search, Plus, Eye, X, AlertCircle } from "lucide-react";
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

type Props = {
  productores: { id: number; nombre_completo: string }[];
  categorias: { id: number; codigo: string; nombre: string; precio_kg: number; orden: number }[];
  lotes: Lote[];
  productorMap: Record<string, string>;
  fotoIngresoMap: Record<string, string>;
  resumen: { totalLotes: number; sinClasificar: number; clasificados: number; kgAlmacen: number };
  // detalle opcionals
  loteVerDetalleId?: number;
  clasificaciones?: any[];
  asignaciones?: any[];
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
    <main className="mx-auto max-w-7xl p-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Módulo 2: Almacén</h1>
          <p className="text-sm text-gray-600">Control del ciclo físico de lotes con clasificación y asignación.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lote o productor..."
              className="rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="sin_clasificar">Sin clasificar</option>
            <option value="clasificado">Clasificado</option>
            <option value="asignado">Asignado</option>
            <option value="liquidado">Liquidado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2 text-white">
            <Plus /> Nuevo Lote
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-600">Total Lotes</p>
          <p className="mt-2 text-2xl font-bold">{resumen.totalLotes}</p>
        </div>
        <div className="rounded-lg border p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-600">Sin clasificar</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{resumen.sinClasificar}</p>
        </div>
        <div className="rounded-lg border p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-600">Clasificados</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{resumen.clasificados}</p>
        </div>
        <div className="rounded-lg border p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-600">Kg en almacén</p>
          <p className="mt-2 text-2xl font-bold">{resumen.kgAlmacen}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle size={32} />
            <p className="mt-2">No hay lotes con los filtros actuales</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Productor</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lote) => (
                  <tr key={lote.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 w-20">
                      {fotoIngresoMap[String(lote.id)] ? (
                        <a href={fotoIngresoMap[String(lote.id)]} target="_blank" rel="noreferrer">
                          <Image src={fotoIngresoMap[String(lote.id)]} alt="foto" width={56} height={40} className="rounded object-cover" />
                        </a>
                      ) : (
                        <div className="h-10 w-14 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{lote.numero_lote}</td>
                    <td className="px-4 py-3">{productorMap[String(lote.productor_id)] ?? "-"}</td>
                    <td className="px-4 py-3">{lote.peso_bruto_ingreso} kg</td>
                    <td className="px-4 py-3">{formatDate(lote.fecha_ingreso)}</td>
                    <td className="px-4 py-3">{lote.estado}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openDetalle(lote)} className="rounded-lg border px-3 py-1 text-xs">Ver</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Crear Lote Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-t-2xl md:rounded-xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Crear Lote</h3>
                <p className="text-xs text-gray-500">Registra un lote rápido desde aquí.</p>
              </div>
              <button onClick={closeCreate} className="rounded p-1.5 hover:bg-gray-100"><X /></button>
            </div>

            <form action={createLoteAction} className="mt-4 grid gap-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Número de Lote (opcional)</span>
                  <input name="numero_lote" className="rounded-lg border px-3 py-2" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Productor</span>
                  <select name="productor_id" className="rounded-lg border px-3 py-2" required>
                    <option value="">Seleccionar</option>
                    {productores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Producto</span>
                  <input name="producto" className="rounded-lg border px-3 py-2" placeholder="Jengibre" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Categoria</span>
                  <select name="categoria_id" className="rounded-lg border px-3 py-2">
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Fecha ingreso</span>
                  <input type="date" name="fecha_ingreso" className="rounded-lg border px-3 py-2" required />
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Peso bruto (kg)</span>
                  <input type="number" step="0.01" name="peso_bruto_ingreso" className="rounded-lg border px-3 py-2" required />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Número de jabas</span>
                  <input type="number" name="numero_jabas" className="rounded-lg border px-3 py-2" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Guía de ingreso</span>
                  <input name="guia_ingreso" className="rounded-lg border px-3 py-2" />
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Chofer</span>
                  <input name="chofer" className="rounded-lg border px-3 py-2" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Placa vehículo</span>
                  <input name="placa_vehiculo" className="rounded-lg border px-3 py-2" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm">Foto ingreso</span>
                  <input type="file" name="foto_lote_ingreso" accept="image/*" className="rounded-lg border px-3 py-2" />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-sm">Observaciones</span>
                <textarea name="observaciones" className="rounded-lg border px-3 py-2" rows={3} />
              </label>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <button type="submit" className="rounded-lg bg-[#1A73E8] px-4 py-2 text-white">Crear</button>
                <button type="button" onClick={closeCreate} className="rounded-lg border px-4 py-2">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ver detalle modal */}
      {selectedLote && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-t-2xl md:rounded-xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Detalle Lote {selectedLote.numero_lote}</h3>
                <p className="text-xs text-gray-500">Productor: {productorMap[String(selectedLote.productor_id)]}</p>
              </div>
              <button onClick={closeDetalle} className="rounded p-1.5 hover:bg-gray-100"><X /></button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded border p-3">
                  <p className="text-xs text-gray-500">Peso bruto</p>
                  <p className="font-medium">{selectedLote.peso_bruto_ingreso} kg</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-xs text-gray-500">Estado</p>
                  <p className="font-medium">{selectedLote.estado}</p>
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="text-xs text-gray-500">Observaciones</p>
                <p className="text-sm text-gray-700">{selectedLote.observaciones ?? "-"}</p>
              </div>

              {/* Clasificaciones y asignaciones (si llegaron) */}
              {clasificaciones.length > 0 && (
                <div className="rounded border p-3">
                  <p className="text-sm font-semibold">Clasificaciones</p>
                  <div className="mt-2 grid gap-2">
                    {clasificaciones.map((c: any) => (
                      <div key={c.id} className="text-sm">{categoriaMap[String(c.categoria_id)] ?? c.categoria_id}: {c.peso_neto} kg</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
