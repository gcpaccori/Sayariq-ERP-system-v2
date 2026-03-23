"use client";

import { useMemo, useState } from "react";

type CategoriaOption = {
  id: number;
  codigo: string;
  nombre: string;
};

type Props = {
  pedidoId: number;
  pedidoDetalleId: number;
  loteId: number;
  sinClasificacionNeta: boolean;
  categoriaId: number;
  pedidoCategoriaId: number;
  pedidoCategoriaNombre: string;
  categorias: CategoriaOption[];
  defaultPrecioKg: number;
  maxKg: number;
  defaultFecha: string;
  observacionesPlaceholder: string;
  pesoPromedioJaba: number;
  jabasDisponiblesEstimadas: number;
  asignarAction: (formData: FormData) => void | Promise<void>;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default function PedidoAsignacionForm({
  pedidoId,
  pedidoDetalleId,
  loteId,
  sinClasificacionNeta,
  categoriaId,
  pedidoCategoriaId,
  pedidoCategoriaNombre,
  categorias,
  defaultPrecioKg,
  maxKg,
  defaultFecha,
  observacionesPlaceholder,
  pesoPromedioJaba,
  jabasDisponiblesEstimadas,
  asignarAction,
}: Props) {
  const [kgAsignados, setKgAsignados] = useState("");
  const [ajustarKgExacto, setAjustarKgExacto] = useState(false);

  const resumenJabas = useMemo(() => {
    const kg = Number(kgAsignados || 0);
    if (!Number.isFinite(kg) || kg <= 0 || pesoPromedioJaba <= 0) {
      return {
        jabasEstimadas: 0,
        pesoCubierto: 0,
      };
    }

    const jabasEstimadas = Math.max(1, Math.ceil((kg - 0.000001) / pesoPromedioJaba));
    return {
      jabasEstimadas,
      pesoCubierto: round2(jabasEstimadas * pesoPromedioJaba),
    };
  }, [kgAsignados, pesoPromedioJaba]);

  return (
    <form action={asignarAction} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
      <input type="hidden" name="pedido_id" value={String(pedidoId)} />
      <input type="hidden" name="pedido_detalle_id" value={String(pedidoDetalleId)} />
      <input type="hidden" name="lote_id" value={String(loteId)} />
      <input type="hidden" name="sin_clasificacion_neta" value={sinClasificacionNeta ? "1" : "0"} />
      <input type="hidden" name="categoria_id" value={String(categoriaId || 0)} />
      <input type="hidden" name="numero_jabas_estimadas" value={String(resumenJabas.jabasEstimadas)} />
      <input type="hidden" name="ajustar_kg_exacto" value={ajustarKgExacto ? "1" : "0"} />

      {sinClasificacionNeta && pedidoCategoriaId <= 0 ? (
        <label className="grid gap-1 md:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Categoria destino</span>
          <select
            name="categoria_destino_id"
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1A73E8]"
            required
          >
            <option value="">Selecciona destino</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={String(categoria.id)}>
                {categoria.codigo} | {categoria.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <input
            type="hidden"
            name="categoria_destino_id"
            value={String(pedidoCategoriaId || categoriaId || "")}
          />
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Categoria destino</p>
            <p className="mt-1 text-xs font-medium text-slate-900">{pedidoCategoriaNombre}</p>
          </div>
        </>
      )}

      <label className="grid gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {ajustarKgExacto ? "Kg exactos a asignar" : "Kg minimo a cubrir"}
        </span>
        <input
          name="kg_asignados"
          type="number"
          min="0"
          step="0.01"
          max={String(maxKg)}
          placeholder="Kg"
          value={kgAsignados}
          onChange={(event) => setKgAsignados(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1A73E8]"
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Precio/kg</span>
        <input
          name="precio_kg"
          type="number"
          min="0"
          step="0.01"
          defaultValue={String(defaultPrecioKg)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1A73E8]"
          required
        />
      </label>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 md:col-span-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Jabas estimadas a retirar</p>
        {pesoPromedioJaba > 0 ? (
          <div className="mt-1 grid gap-2 md:grid-cols-2">
            <p className="text-xs text-slate-700">
              {ajustarKgExacto ? (
                <>
                  Se usara el <strong className="text-slate-900">kg exacto</strong> solicitado, pero como referencia el retiro seria de
                  {" "}<strong className="text-slate-900">~{resumenJabas.jabasEstimadas} jabas</strong>.
                </>
              ) : (
                <>
                  Con jabas completas, para cubrir ese kiloaje se retiraran
                  {" "}<strong className="text-slate-900">~{resumenJabas.jabasEstimadas} jabas</strong>
                  {" "}y el sistema registrara
                  {" "}<strong className="text-slate-900">~{resumenJabas.pesoCubierto} kg</strong>.
                </>
              )}
            </p>
            <p className="text-xs text-slate-700">
              Disponibles estimadas: <strong className="text-slate-900">~{round2(jabasDisponiblesEstimadas)} jabas</strong>.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-700">
            No hay promedio kg/jaba suficiente para estimar retiro de jabas en este origen.
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-slate-700 md:col-span-2">
        <input
          type="checkbox"
          checked={ajustarKgExacto}
          onChange={(event) => setAjustarKgExacto(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1A73E8] focus:ring-[#1A73E8]"
        />
        <span>
          <span className="block font-semibold text-slate-900">Ignorar encuadre de jabas y ajustar kg exacto</span>
          <span className="block text-xs text-slate-600">
            Si lo dejas apagado, la asignacion se redondea por jabas completas para asegurar el kiloaje minimo.
          </span>
        </span>
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fecha asignacion</span>
        <input
          name="fecha_asignacion"
          type="date"
          defaultValue={defaultFecha}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1A73E8]"
          required
        />
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Observaciones</span>
        <input
          name="observaciones"
          placeholder={observacionesPlaceholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1A73E8]"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-[#1A73E8] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1765CC] md:col-span-2"
      >
        Asignar lote
      </button>
    </form>
  );
}
