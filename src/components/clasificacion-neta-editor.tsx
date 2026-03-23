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
  numeroJabasIngreso: number;
};

type FormRow = {
  pesoBruto: number;
  numeroJabas: number;
  pesoJabaUnitaria: number;
  porcentajeHumedad: number;
  netoVigente: number;
};

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export default function ClasificacionNetaEditor({
  categorias,
  rowsIniciales,
  pesoIngreso,
  numeroJabasIngreso,
}: Props) {
  const initialState = useMemo(() => {
    const map = new Map<number, RowInicial>(rowsIniciales.map((row) => [Number(row.categoria_id), row]));
    const base: Record<number, FormRow> = {};

    categorias.forEach((cat) => {
      const row = map.get(Number(cat.id));
      const numeroJabas = Number(row?.numero_jabas ?? 0);
      const pesoJabas = Number(row?.peso_jabas ?? 0);

      base[cat.id] = {
        pesoBruto: Number(row?.peso_bruto ?? 0),
        numeroJabas,
        pesoJabaUnitaria: numeroJabas > 0 ? round3(pesoJabas / numeroJabas) : 0,
        porcentajeHumedad: Number(row?.porcentaje_humedad ?? 0),
        netoVigente: Number(row?.peso_neto ?? 0),
      };
    });

    return base;
  }, [categorias, rowsIniciales]);

  const [rows, setRows] = useState<Record<number, FormRow>>(initialState);
  const [jabasIngreso, setJabasIngreso] = useState<number>(Math.max(0, Number(numeroJabasIngreso ?? 0)));

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
      const jabas = Math.max(0, Number(row.numeroJabas ?? 0));
      const pesoJabaUnitaria = Math.max(0, Number(row.pesoJabaUnitaria ?? 0));
      const pesoJabas = round3(jabas * pesoJabaUnitaria);
      const descuentoHumedad = bruto * (humedad / 100);
      const netoEstimado = round3(bruto - pesoJabas - descuentoHumedad);

      totalBruto += bruto;
      totalJabas += jabas;
      totalPesoJabas += pesoJabas;
      totalNetoEstimado += netoEstimado;
    });

    const variacion = round3(totalNetoEstimado - pesoIngreso);
    const saldoJabas = Math.round((jabasIngreso - totalJabas) * 1000) / 1000;

    return {
      totalBruto: round3(totalBruto),
      totalJabas,
      totalPesoJabas: round3(totalPesoJabas),
      totalNetoEstimado: round3(totalNetoEstimado),
      variacion,
      saldoJabas,
      promedioBrutoPorJaba: totalJabas > 0 ? round3(totalBruto / totalJabas) : 0,
      promedioTaraPorJaba: totalJabas > 0 ? round3(totalPesoJabas / totalJabas) : 0,
    };
  }, [categorias, jabasIngreso, rows, pesoIngreso]);

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[220px_1fr]">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jabas registradas en almacen</span>
          <input
            name="numero_jabas_ingreso"
            type="number"
            min={0}
            value={jabasIngreso}
            onChange={(event) => setJabasIngreso(Number(event.target.value || 0))}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
          />
        </label>
        <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Jabas ingreso</p>
            <p className="mt-1 text-base font-bold text-slate-900">{jabasIngreso}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Jabas clasificadas</p>
            <p className="mt-1 text-base font-bold text-slate-900">{resumen.totalJabas}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Saldo jabas</p>
            <p className={`mt-1 text-base font-bold ${resumen.saldoJabas < 0 ? "text-rose-700" : "text-slate-900"}`}>{resumen.saldoJabas}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl bg-gray-50 p-4 shadow-inner text-xs text-slate-700 md:grid-cols-5">
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total bruto asignado</span><span className="text-sm font-bold">{resumen.totalBruto.toFixed(3)} kg</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total jabas</span><span className="text-sm font-bold">{resumen.totalJabas}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peso jabas total</span><span className="text-sm font-bold">{resumen.totalPesoJabas.toFixed(3)} kg</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prom. bruto/jaba</span><span className="text-sm font-bold">{resumen.promedioBrutoPorJaba.toFixed(3)} kg</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Neto estimado</span><span className="text-sm font-bold text-blue-700">{resumen.totalNetoEstimado.toFixed(3)} kg</span></div>
      </div>

      <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium shadow-sm ${resumen.variacion > 0 ? "bg-amber-50 text-amber-800" : resumen.variacion < 0 ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-700"}`}>
        {resumen.variacion === 0 ? "Sin variacion" : "Informacion de balance"}: {resumen.variacion > 0 ? "+" : ""}{resumen.variacion.toFixed(3)} kg vs almacen.
        <span className="mt-0.5 block text-xs font-normal opacity-85">
          Tara promedio por jaba: {resumen.promedioTaraPorJaba.toFixed(3)} kg.
          {" "}
          {resumen.variacion > 0
            ? "Se registra un incremento de carga respecto al ingreso original (ajuste por proceso/re-balanza)."
            : resumen.variacion < 0
              ? "Se registra una merma respecto al ingreso original (ajuste por jabas, humedad o limpieza)."
              : "La clasificacion neta coincide exactamente con el peso de ingreso."}
        </span>
      </p>

      <div className="sx-table-wrap">
        <table className="sx-table">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Categoria</th>
              <th className="p-2">Peso bruto</th>
              <th className="p-2">Nro jabas</th>
              <th className="p-2">Peso/jaba</th>
              <th className="p-2">Peso jabas total</th>
              <th className="p-2">% humedad</th>
              <th className="p-2">Prom. bruto/jaba</th>
              <th className="p-2">Neto vigente</th>
              <th className="p-2">Neto estimado</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => {
              const row = rows[categoria.id] ?? {
                pesoBruto: 0,
                numeroJabas: 0,
                pesoJabaUnitaria: 0,
                porcentajeHumedad: 0,
                netoVigente: 0,
              };

              const bruto = Math.max(0, Number(row.pesoBruto ?? 0));
              const jabas = Math.max(0, Number(row.numeroJabas ?? 0));
              const pesoJabaUnitaria = Math.max(0, Number(row.pesoJabaUnitaria ?? 0));
              const pesoJabas = round3(jabas * pesoJabaUnitaria);
              const humedad = Math.max(0, Number(row.porcentajeHumedad ?? 0));
              const descuentoHumedad = bruto * (humedad / 100);
              const netoEstimado = round3(bruto - pesoJabas - descuentoHumedad);
              const promedioCategoria = jabas > 0 ? round3(bruto / jabas) : 0;

              return (
                <tr key={categoria.id} className="border-b align-top transition hover:bg-gray-50">
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
                      name={`peso_jaba_unitaria_${categoria.id}`}
                      type="number"
                      step="0.001"
                      min={0}
                      value={row.pesoJabaUnitaria}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setRows((prev) => ({ ...prev, [categoria.id]: { ...prev[categoria.id], pesoJabaUnitaria: value } }));
                      }}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none transition-all focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                    <input type="hidden" name={`peso_jabas_${categoria.id}`} value={pesoJabas} readOnly />
                  </td>
                  <td className="p-2">{pesoJabas.toFixed(3)} kg</td>
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
