"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import PersonSearchField from "@/components/person-search-field";

type Cliente = {
  id: number;
  nombre_completo: string;
  tipo_documento?: string | null;
  documento?: string | null;
};

type CategoriaOption = {
  id: number;
  codigo: string;
  nombre: string;
  stockReferencial: number;
};

type PedidoEditorLine = {
  key: string;
  categoria_id: number;
  kg_solicitados: number;
  precio_kg: number;
  prioridad: number;
  permite_sustitucion: boolean;
  observaciones: string;
  requiere_revision?: boolean;
};

type PedidoEditorInitial = {
  numero_pedido?: string;
  cliente_id?: number;
  producto?: "Jengibre" | "Curcuma";
  fecha_pedido?: string;
  fecha_entrega?: string | null;
  observaciones?: string | null;
  lineas: PedidoEditorLine[];
};

type Props = {
  clientes: Cliente[];
  categorias: CategoriaOption[];
  initial: PedidoEditorInitial;
  submitLabel: string;
  showNumeroPedido?: boolean;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildLine(key: string, defaults?: Partial<PedidoEditorLine>): PedidoEditorLine {
  return {
    key,
    categoria_id: defaults?.categoria_id ?? 0,
    kg_solicitados: defaults?.kg_solicitados ?? 0,
    precio_kg: defaults?.precio_kg ?? 0,
    prioridad: defaults?.prioridad ?? 1,
    permite_sustitucion: defaults?.permite_sustitucion ?? false,
    observaciones: defaults?.observaciones ?? "",
    requiere_revision: defaults?.requiere_revision ?? false,
  };
}

export default function PedidoEditor({
  clientes,
  categorias,
  initial,
  submitLabel,
  showNumeroPedido = false,
}: Props) {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [lineas, setLineas] = useState<PedidoEditorLine[]>(
    initial.lineas.length > 0 ? initial.lineas : [buildLine("line-1")],
  );

  const categoriasFiltradas = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return categorias;

    return categorias.filter((categoria) => {
      const text = `${categoria.codigo} ${categoria.nombre}`.toLowerCase();
      return text.includes(query);
    });
  }, [categorias, categoryQuery]);

  const duplicateCategoriaIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const line of lineas) {
      const categoriaId = Number(line.categoria_id);
      if (categoriaId <= 0) continue;
      counts.set(categoriaId, (counts.get(categoriaId) ?? 0) + 1);
    }

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([categoriaId]) => categoriaId),
    );
  }, [lineas]);

  const resumen = useMemo(() => {
    const kgSolicitados = round2(lineas.reduce((acc, line) => acc + Number(line.kg_solicitados ?? 0), 0));
    const totalEstimado = round2(lineas.reduce((acc, line) => acc + Number(line.kg_solicitados ?? 0) * Number(line.precio_kg ?? 0), 0));
    const lineasValidas = lineas.filter((line) => Number(line.categoria_id) > 0 && Number(line.kg_solicitados) > 0).length;

    return {
      kgSolicitados,
      totalEstimado,
      lineasValidas,
    };
  }, [lineas]);

  const addLine = () => {
    setLineas((current) => [
      ...current,
      buildLine(`line-${Date.now()}-${current.length + 1}`, { prioridad: current.length + 1 }),
    ]);
  };

  const removeLine = (key: string) => {
    setLineas((current) => {
      if (current.length === 1) {
        return [buildLine(`line-${Date.now()}`, { prioridad: 1 })];
      }

      return current
        .filter((line) => line.key !== key)
        .map((line, index) => ({ ...line, prioridad: index + 1 }));
    });
  };

  const updateLine = (key: string, patch: Partial<PedidoEditorLine>) => {
    setLineas((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {showNumeroPedido ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-gray-900">Numero pedido</span>
            <input
              name="numero_pedido"
              defaultValue={initial.numero_pedido ?? ""}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
            />
          </label>
        ) : null}

        <PersonSearchField
          name="cliente_id"
          label="Cliente"
          people={clientes}
          defaultId={Number(initial.cliente_id ?? 0)}
          required
          placeholder="Buscar cliente por nombre o DNI"
        />

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-gray-900">Producto *</span>
          <select
            name="producto"
            defaultValue={initial.producto ?? "Jengibre"}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
            required
          >
            <option value="Jengibre">Jengibre</option>
            <option value="Curcuma">Curcuma</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-gray-900">Fecha pedido *</span>
          <input
            name="fecha_pedido"
            type="date"
            defaultValue={initial.fecha_pedido ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
            required
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-gray-900">Fecha entrega</span>
          <input
            name="fecha_entrega"
            type="date"
            defaultValue={initial.fecha_entrega ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
          />
        </label>

        <label className="grid gap-1.5 sm:col-span-3">
          <span className="text-sm font-semibold text-gray-900">Observaciones generales</span>
          <textarea
            name="observaciones"
            defaultValue={initial.observaciones ?? ""}
            className="min-h-20 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
          />
        </label>
      </div>

      <section className="rounded-xl border border-gray-200 bg-slate-50 p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Lineas del pedido</h3>
            <p className="mt-1 text-sm text-gray-600">Define cuanto pide de cada categoria, con su precio, prioridad y posibilidad de sustitucion.</p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1A73E8] bg-white px-4 py-2 text-sm font-semibold text-[#1A73E8] transition hover:bg-blue-50"
          >
            <Plus size={16} />
            Agregar categoria
          </button>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar categoria</span>
            <input
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder="Filtrar por codigo o nombre"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
            />
          </label>
          <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Lineas validas</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{resumen.lineasValidas}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kg solicitados</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{resumen.kgSolicitados}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total estimado</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{resumen.totalEstimado}</p>
            </div>
          </div>
        </div>

        {categorias.length === 0 ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No se encontraron categorias activas reales en este entorno. Revisa la migracion o el catalogo antes de guardar pedidos.
          </div>
        ) : null}

        <div className="grid gap-4">
          {lineas.map((line, index) => {
            const categoria = categorias.find((item) => Number(item.id) === Number(line.categoria_id));
            const isDuplicate = duplicateCategoriaIds.has(Number(line.categoria_id));

            return (
              <div key={line.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <input type="hidden" name="detalle_ids" value={line.key} />
                <input type="hidden" name={`detalle_permite_sustitucion_${line.key}`} value={line.permite_sustitucion ? "1" : "0"} />

                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Linea {index + 1}</p>
                    <p className="text-xs text-slate-500">
                      {categoria ? `${categoria.codigo} | ${categoria.nombre}` : "Selecciona la categoria real del pedido"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                    Quitar
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                  <label className="grid gap-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-gray-900">Categoria *</span>
                    <select
                      name={`detalle_categoria_id_${line.key}`}
                      value={String(line.categoria_id || "")}
                      onChange={(event) => updateLine(line.key, { categoria_id: Number(event.target.value || 0) })}
                      className={`rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 ${isDuplicate ? "border-red-300" : "border-gray-300"}`}
                    >
                      <option value="">Selecciona una categoria</option>
                      {categoriasFiltradas.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.codigo} | {item.nombre} | stock ref. {item.stockReferencial} kg
                        </option>
                      ))}
                    </select>
                    {isDuplicate ? <span className="text-xs text-red-700">No repitas la misma categoria en dos lineas.</span> : null}
                    {line.requiere_revision ? <span className="text-xs text-amber-700">Linea migrada sin reparto exacto. Requiere revision.</span> : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Kg requeridos *</span>
                    <input
                      name={`detalle_kg_solicitados_${line.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.kg_solicitados || ""}
                      onChange={(event) => updateLine(line.key, { kg_solicitados: Number(event.target.value || 0) })}
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Precio/kg *</span>
                    <input
                      name={`detalle_precio_kg_${line.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.precio_kg || ""}
                      onChange={(event) => updateLine(line.key, { precio_kg: Number(event.target.value || 0) })}
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Prioridad</span>
                    <input
                      name={`detalle_prioridad_${line.key}`}
                      type="number"
                      min="1"
                      step="1"
                      value={line.prioridad}
                      onChange={(event) => updateLine(line.key, { prioridad: Number(event.target.value || index + 1) })}
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="grid gap-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-gray-900">Notas de la linea</span>
                    <input
                      name={`detalle_observaciones_${line.key}`}
                      value={line.observaciones}
                      onChange={(event) => updateLine(line.key, { observaciones: event.target.value })}
                      placeholder="Ej: cliente acepta mezcla o corte especial"
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-2.5 text-sm text-gray-700 md:col-span-3">
                    <input
                      type="checkbox"
                      checked={line.permite_sustitucion}
                      onChange={(event) => updateLine(line.key, { permite_sustitucion: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#1A73E8] focus:ring-[#1A73E8]"
                    />
                    Permitir sustitucion con otra categoria del mismo producto si no hay stock exacto.
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div>
        <button
          type="submit"
          className="rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1765CC]"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
