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
      <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-5">
        <p><strong>Total bruto asignado:</strong> {resumen.totalBruto.toFixed(3)} kg</p>
        <p><strong>Total jabas:</strong> {resumen.totalJabas}</p>
        <p><strong>Peso jabas:</strong> {resumen.totalPesoJabas.toFixed(3)} kg</p>
        <p><strong>Promedio kg/jaba:</strong> {resumen.promedioKgPorJaba.toFixed(3)}</p>
        <p><strong>Neto estimado:</strong> {resumen.totalNetoEstimado.toFixed(3)} kg</p>
      </div>

      <p className={`mb-3 rounded-lg p-2 text-xs ${resumen.variacion > 0 ? "bg-amber-50 text-amber-800" : resumen.variacion < 0 ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-700"}`}>
        Diferencia vs ingreso de almacén: {resumen.variacion.toFixed(3)} kg
        {resumen.variacion > 0
          ? " (hay mayor carga por reclasificación/humedad/tierra, se permite continuar)."
          : resumen.variacion < 0
            ? " (hay merma respecto al ingreso, se permite continuar)."
            : " (sin variación)."}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">Categoría</th>
              <th className="px-2 py-2 text-left">Peso bruto</th>
              <th className="px-2 py-2 text-left">N° jabas</th>
              <th className="px-2 py-2 text-left">Peso jabas</th>
              <th className="px-2 py-2 text-left">% humedad</th>
              <th className="px-2 py-2 text-left">Prom. kg/jaba</th>
              <th className="px-2 py-2 text-left">Neto vigente</th>
              <th className="px-2 py-2 text-left">Neto estimado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
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
                <tr key={categoria.id}>
                  <td className="px-2 py-2">{categoria.nombre}</td>
                  <td className="px-2 py-2">
                    <input
                      name={`peso_bruto_${categoria.id}`}
                      type="number"
                      step="0.001"
                      value={row.pesoBruto}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], pesoBruto: value } }));
                      }}
                      className="w-24 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name={`numero_jabas_${categoria.id}`}
                      type="number"
                      min={0}
                      value={row.numeroJabas}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], numeroJabas: value } }));
                      }}
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name={`peso_jabas_${categoria.id}`}
                      type="number"
                      step="0.001"
                      value={row.pesoJabas}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], pesoJabas: value } }));
                      }}
                      className="w-24 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name={`porcentaje_humedad_${categoria.id}`}
                      type="number"
                      step="0.01"
                      value={row.porcentajeHumedad}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], porcentajeHumedad: value } }));
                      }}
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">{promedioCategoria.toFixed(3)}</td>
                  <td className="px-2 py-2">{Number(row.netoVigente ?? 0).toFixed(3)} kg</td>
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
