"use client";

import { useMemo, useState } from "react";

type Categoria = { id: number; nombre: string };

type RowInicial = {
  categoria_id: number;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  peso_neto: number;
};

type Props = {
  categorias: Categoria[];
  rowsIniciales: RowInicial[];
  pesoIngreso: number;
};

type FormRow = {
  pesoBruto: number;
  numeroJabas: number;
  pesoJabas: number;
  porcentajeHumedad: number;
  netoVigente: number;
};

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export default function ClasificacionNetaEditor({ categorias, rowsIniciales, pesoIngreso }: Props) {
  const initialState = useMemo(() => {
    const map = new Map<number, RowInicial>(rowsIniciales.map((row) => [Number(row.categoria_id), row]));
    const base: Record<number, FormRow> = {};

    categorias.forEach((cat) => {
      const row = map.get(Number(cat.id));
      base[cat.id] = {
        pesoBruto: Number(row?.peso_bruto ?? 0),
        numeroJabas: Number(row?.numero_jabas ?? 0),
        pesoJabas: Number(row?.peso_jabas ?? 0),
        porcentajeHumedad: Number(row?.porcentaje_humedad ?? 0),
        netoVigente: Number(row?.peso_neto ?? 0),
      };
    });

    return base;
  }, [categorias, rowsIniciales]);

  const [rows, setRows] = useState<Record<number, FormRow>>(initialState);

  const resumen = useMemo(() => {
    let totalBruto = 0;
    let totalJabas = 0;
    let totalPesoJabas = 0;
    let totalNetoEstimado = 0;

    categorias.forEach((cat) => {
      const row = rows[cat.id];
      if (!row) return;

      const humedad = Math.max(0, Number(row.porcentajeHumedad ?? 0));
      const bruto = Math.max(0, Number(row.pesoBruto ?? 0));
      const pesoJabas = Math.max(0, Number(row.pesoJabas ?? 0));
      const jabas = Math.max(0, Number(row.numeroJabas ?? 0));
      const descuentoHumedad = bruto * (humedad / 100);
      const netoEstimado = round3(bruto - pesoJabas - descuentoHumedad);

      totalBruto += bruto;
      totalJabas += jabas;
      totalPesoJabas += pesoJabas;
      totalNetoEstimado += netoEstimado;
    });

    const variacion = round3(totalBruto - pesoIngreso);

    return {
      totalBruto: round3(totalBruto),
      totalJabas,
      totalPesoJabas: round3(totalPesoJabas),
      totalNetoEstimado: round3(totalNetoEstimado),
      variacion,
      promedioKgPorJaba: totalJabas > 0 ? round3(totalBruto / totalJabas) : 0,
    };
  }, [categorias, rows, pesoIngreso]);

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-xl bg-gray-50 p-4 shadow-inner text-xs text-slate-700 md:grid-cols-5">
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total bruto asignado</span><span className="text-sm font-bold">{resumen.totalBruto.toFixed(3)} kg</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total jabas</span><span className="text-sm font-bold">{resumen.totalJabas}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peso jabas</span><span className="text-sm font-bold">{resumen.totalPesoJabas.toFixed(3)} kg</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Promedio kg/jaba</span><span className="text-sm font-bold">{resumen.promedioKgPorJaba.toFixed(3)}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Neto estimado</span><span className="text-sm font-bold text-blue-700">{resumen.totalNetoEstimado.toFixed(3)} kg</span></div>
      </div>

      <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium shadow-sm ${resumen.variacion > 0 ? "bg-amber-50 text-amber-800" : resumen.variacion < 0 ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-700"}`}>
        {resumen.variacion === 0 ? "✓ Sin variación" : "ℹ Información de balance"}: {resumen.variacion > 0 ? "+" : ""}{resumen.variacion.toFixed(3)} kg vs almacén.
        <span className="block mt-0.5 text-xs font-normal opacity-85">
          {resumen.variacion > 0
            ? "Se registra un incremento de carga respecto al ingreso original (ajuste por proceso/re-balanza)."
            : resumen.variacion < 0
              ? "Se registra una merma respecto al ingreso original (ajuste por humedad/limpieza)."
              : "La clasificación coincide exactamente con el peso de ingreso."}
        </span>
      </p>

      <div className="sx-table-wrap">
        <table className="sx-table">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Categoría</th>
              <th className="p-2">Peso bruto</th>
              <th className="p-2">N° jabas</th>
              <th className="p-2">Peso jabas</th>
              <th className="p-2">% humedad</th>
              <th className="p-2">Prom. kg/jaba</th>
              <th className="p-2">Neto vigente</th>
              <th className="p-2">Neto estimado</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => {
              const row = rows[categoria.id] ?? {
                pesoBruto: 0,
                numeroJabas: 0,
                pesoJabas: 0,
                porcentajeHumedad: 0,
                netoVigente: 0,
              };

              const bruto = Math.max(0, Number(row.pesoBruto ?? 0));
              const jabas = Math.max(0, Number(row.numeroJabas ?? 0));
              const pesoJabas = Math.max(0, Number(row.pesoJabas ?? 0));
              const humedad = Math.max(0, Number(row.porcentajeHumedad ?? 0));
              const descuentoHumedad = bruto * (humedad / 100);
              const netoEstimado = round3(bruto - pesoJabas - descuentoHumedad);
              const promedioCategoria = jabas > 0 ? round3(bruto / jabas) : 0;

              return (
                <tr key={categoria.id} className="border-b align-top hover:bg-gray-50 transition">
                  <td className="p-2">{categoria.nombre}</td>
                  <td className="p-2">
                    <input
                      name={`peso_bruto_${categoria.id}`}
                      type="number"
                      step="0.001"
                      value={row.pesoBruto}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], pesoBruto: value } }));
                      }}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      name={`numero_jabas_${categoria.id}`}
                      type="number"
                      min={0}
                      value={row.numeroJabas}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], numeroJabas: value } }));
                      }}
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      name={`peso_jabas_${categoria.id}`}
                      type="number"
                      step="0.001"
                      value={row.pesoJabas}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], pesoJabas: value } }));
                      }}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      name={`porcentaje_humedad_${categoria.id}`}
                      type="number"
                      step="0.01"
                      value={row.porcentajeHumedad}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], porcentajeHumedad: value } }));
                      }}
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </td>
                  <td className="p-2">{promedioCategoria.toFixed(3)}</td>
                  <td className="p-2">{Number(row.netoVigente ?? 0).toFixed(3)} kg</td>
                  <td className={`px-2 py-2 ${netoEstimado < 0 ? "text-rose-700" : "text-slate-800"}`}>
                    {netoEstimado.toFixed(3)} kg
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
