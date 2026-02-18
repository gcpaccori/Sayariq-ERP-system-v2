import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = {
  mode?: "mensual" | "anual";
  ym?: string;
  year?: string;
};

type Liquidacion = {
  id: number;
  tipo: "productor" | "cliente";
  persona_id: number;
  lote_id: number | null;
  pedido_id: number | null;
  fecha_liquidacion: string;
  numero_liquidacion: string;
  total_a_pagar: number;
  monto_pagado: number;
  estado: string;
  estado_pago: string;
};

type LiquidacionDetalle = {
  liquidacion_id: number;
  categoria_id: number;
  peso_neto: number;
  precio_kg: number;
  subtotal: number;
};

type Adelanto = {
  id: number;
  productor_id: number;
  lote_id: number | null;
  monto: number;
  fecha: string;
  estado: string;
};

type KardexDinero = {
  id: number;
  fecha: string;
  tipo_movimiento: "ingreso" | "egreso";
  origen: string;
  monto: number;
};

type Categoria = {
  id: number;
  nombre: string;
  codigo: string;
  orden: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function currency(value: number) {
  return `S/ ${round2(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function parseYm(input?: string) {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!input) return fallback;
  if (!/^\d{4}-\d{2}$/.test(input)) return fallback;
  const [year, month] = input.split("-").map(Number);
  if (month < 1 || month > 12) return fallback;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMode(input?: string) {
  return input === "anual" ? "anual" : "mensual";
}

function parseYear(input?: string) {
  const now = new Date();
  const fallback = now.getFullYear();
  if (!input) return fallback;
  const year = Number(input);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  return year;
}

function monthRange(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  const start = `${ym}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const end = `${ym}-${String(daysInMonth).padStart(2, "0")}`;
  return { start, end, year, month, daysInMonth };
}

function annualRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export default async function AnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const mode = parseMode(search.mode);
  const ym = parseYm(search.ym);
  const selectedYear = parseYear(search.year);
  const { start: mStart, end: mEnd, daysInMonth } = monthRange(ym);
  const { start: yStart, end: yEnd } = annualRange(selectedYear);
  const start = mode === "anual" ? yStart : mStart;
  const end = mode === "anual" ? yEnd : mEnd;
  const periodLabel = mode === "anual" ? `Año ${selectedYear}` : `Mes ${ym}`;
  const periodShort = mode === "anual" ? "año" : "mes";

  const supabase = getSupabaseServerClient();

  const [
    categoriasRes,
    liqClienteRes,
    liqProductorRes,
    adelantosMesRes,
    kardexDineroMesRes,
    pendientesLiqRes,
    adelantosPendRes,
  ] = await Promise.all([
    supabase.from("categorias").select("id,nombre,codigo,orden").order("orden", { ascending: true }),
    supabase
      .from("liquidaciones")
      .select(
        "id,tipo,persona_id,lote_id,pedido_id,fecha_liquidacion,numero_liquidacion,total_a_pagar,monto_pagado,estado,estado_pago"
      )
      .eq("tipo", "cliente")
      .neq("estado", "anulada")
      .gte("fecha_liquidacion", start)
      .lte("fecha_liquidacion", end),
    supabase
      .from("liquidaciones")
      .select(
        "id,tipo,persona_id,lote_id,pedido_id,fecha_liquidacion,numero_liquidacion,total_a_pagar,monto_pagado,estado,estado_pago"
      )
      .eq("tipo", "productor")
      .neq("estado", "anulada")
      .gte("fecha_liquidacion", start)
      .lte("fecha_liquidacion", end),
    supabase
      .from("adelantos")
      .select("id,productor_id,lote_id,monto,fecha,estado")
      .gte("fecha", start)
      .lte("fecha", end),
    supabase
      .from("kardex")
      .select("id,fecha,tipo_movimiento,origen,monto")
      .eq("tipo_kardex", "dinero")
      .gte("fecha", `${start}T00:00:00`)
      .lte("fecha", `${end}T23:59:59`),
    supabase
      .from("liquidaciones")
      .select("id,tipo,total_a_pagar,monto_pagado,estado,estado_pago")
      .neq("estado", "anulada"),
    supabase.from("adelantos").select("id,monto,estado").eq("estado", "pendiente"),
  ]);

  const categorias = (categoriasRes.data ?? []) as Categoria[];
  const liqClientes = (liqClienteRes.data ?? []) as Liquidacion[];
  const liqProductores = (liqProductorRes.data ?? []) as Liquidacion[];
  const adelantosMes = (adelantosMesRes.data ?? []) as Adelanto[];
  const kardexDineroMes = (kardexDineroMesRes.data ?? []) as KardexDinero[];
  const pendientesLiq = (pendientesLiqRes.data ?? []) as Array<{
    id: number;
    tipo: "productor" | "cliente";
    total_a_pagar: number;
    monto_pagado: number;
    estado: string;
    estado_pago: string;
  }>;
  const adelantosPend = (adelantosPendRes.data ?? []) as Array<{ id: number; monto: number; estado: string }>;

  const liqClienteIds = liqClientes.map((row) => Number(row.id));
  const liqProductorIds = liqProductores.map((row) => Number(row.id));

  const [detClienteRes, detProductorRes] = await Promise.all([
    liqClienteIds.length > 0
      ? supabase
          .from("liquidacion_detalle")
          .select("liquidacion_id,categoria_id,peso_neto,precio_kg,subtotal")
          .in("liquidacion_id", liqClienteIds)
      : Promise.resolve({ data: [] }),
    liqProductorIds.length > 0
      ? supabase
          .from("liquidacion_detalle")
          .select("liquidacion_id,categoria_id,peso_neto,precio_kg,subtotal")
          .in("liquidacion_id", liqProductorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const detCliente = (detClienteRes.data ?? []) as LiquidacionDetalle[];
  const detProductor = (detProductorRes.data ?? []) as LiquidacionDetalle[];

  const categoriaMap = new Map<number, Categoria>(categorias.map((row) => [Number(row.id), row]));

  const ventasPeriodo = round2(liqClientes.reduce((acc, row) => acc + Number(row.total_a_pagar ?? 0), 0));
  const costoComprasPeriodo = round2(liqProductores.reduce((acc, row) => acc + Number(row.total_a_pagar ?? 0), 0));
  const adelantosPeriodoMonto = round2(adelantosMes.reduce((acc, row) => acc + Number(row.monto ?? 0), 0));
  const margenBrutoPeriodo = round2(ventasPeriodo - costoComprasPeriodo);

  const ingresosCajaPeriodo = round2(
    kardexDineroMes
      .filter((row) => row.tipo_movimiento === "ingreso")
      .reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );
  const egresosCajaPeriodo = round2(
    kardexDineroMes
      .filter((row) => row.tipo_movimiento === "egreso")
      .reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );
  const flujoNetoCajaPeriodo = round2(ingresosCajaPeriodo - egresosCajaPeriodo);

  const cuentasPorCobrar = round2(
    pendientesLiq
      .filter((row) => row.tipo === "cliente")
      .reduce((acc, row) => acc + Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)), 0)
  );

  const cuentasPorPagar = round2(
    pendientesLiq
      .filter((row) => row.tipo === "productor")
      .reduce((acc, row) => acc + Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)), 0)
  );

  const adelantosPendientesMonto = round2(
    adelantosPend.reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );

  const catAgg = new Map<number, { ventas: number; costos: number; kgVenta: number; kgCosto: number }>();

  for (const row of detCliente) {
    const id = Number(row.categoria_id);
    const current = catAgg.get(id) ?? { ventas: 0, costos: 0, kgVenta: 0, kgCosto: 0 };
    current.ventas += Number(row.subtotal ?? 0);
    current.kgVenta += Number(row.peso_neto ?? 0);
    catAgg.set(id, current);
  }

  for (const row of detProductor) {
    const id = Number(row.categoria_id);
    const current = catAgg.get(id) ?? { ventas: 0, costos: 0, kgVenta: 0, kgCosto: 0 };
    current.costos += Number(row.subtotal ?? 0);
    current.kgCosto += Number(row.peso_neto ?? 0);
    catAgg.set(id, current);
  }

  const categoriasStrategic = [...catAgg.entries()]
    .map(([categoriaId, value]) => {
      const categoria = categoriaMap.get(categoriaId);
      const margen = round2(value.ventas - value.costos);
      return {
        categoriaId,
        categoria: categoria?.nombre ?? `Categoria ${categoriaId}`,
        ventas: round2(value.ventas),
        costos: round2(value.costos),
        margen,
        kgVenta: round2(value.kgVenta),
        kgCosto: round2(value.kgCosto),
      };
    })
    .sort((a, b) => b.margen - a.margen);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const temporalSeries =
    mode === "anual"
      ? Array.from({ length: 12 }, (_, index) => ({
          key: String(index + 1),
          label: monthNames[index],
          ventas: 0,
          costos: 0,
          adelantos: 0,
        }))
      : Array.from({ length: daysInMonth }, (_, index) => ({
          key: String(index + 1),
          label: `Día ${index + 1}`,
          ventas: 0,
          costos: 0,
          adelantos: 0,
        }));

  for (const row of liqClientes) {
    const date = new Date(row.fecha_liquidacion);
    const bucket = mode === "anual" ? date.getMonth() + 1 : date.getDate();
    if (bucket >= 1 && bucket <= temporalSeries.length) {
      temporalSeries[bucket - 1].ventas += Number(row.total_a_pagar ?? 0);
    }
  }

  for (const row of liqProductores) {
    const date = new Date(row.fecha_liquidacion);
    const bucket = mode === "anual" ? date.getMonth() + 1 : date.getDate();
    if (bucket >= 1 && bucket <= temporalSeries.length) {
      temporalSeries[bucket - 1].costos += Number(row.total_a_pagar ?? 0);
    }
  }

  for (const row of adelantosMes) {
    const date = new Date(row.fecha);
    const bucket = mode === "anual" ? date.getMonth() + 1 : date.getDate();
    if (bucket >= 1 && bucket <= temporalSeries.length) {
      temporalSeries[bucket - 1].adelantos += Number(row.monto ?? 0);
    }
  }

  const temporalSeriesRounded = temporalSeries.map((row) => ({
    ...row,
    ventas: round2(row.ventas),
    costos: round2(row.costos),
    adelantos: round2(row.adelantos),
  }));

  const maxTemporal = Math.max(
    1,
    ...temporalSeriesRounded.map((row) => Math.max(row.ventas, row.costos, row.adelantos))
  );

  const temporalChartPoints =
    mode === "mensual"
      ? Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
          const from = index * 7;
          const segment = temporalSeriesRounded.slice(from, from + 7);
          return {
            key: `w-${index + 1}`,
            label: `Semana ${index + 1}`,
            ventas: round2(segment.reduce((acc, row) => acc + row.ventas, 0)),
            costos: round2(segment.reduce((acc, row) => acc + row.costos, 0)),
            adelantos: round2(segment.reduce((acc, row) => acc + row.adelantos, 0)),
          };
        })
      : temporalSeriesRounded;

  const maxTemporalChart = Math.max(
    1,
    ...temporalChartPoints.map((row) => Math.max(row.ventas, row.costos, row.adelantos))
  );

  const temporalChartData = temporalChartPoints.map((row, index) => ({ ...row, index }));

  const temporalSvg = {
    width: 920,
    height: 320,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 60,
    marginLeft: 54,
  };
  const temporalPlotWidth = temporalSvg.width - temporalSvg.marginLeft - temporalSvg.marginRight;
  const temporalPlotHeight = temporalSvg.height - temporalSvg.marginTop - temporalSvg.marginBottom;
  const temporalCount = Math.max(1, temporalChartData.length - 1);
  const temporalX = (index: number) => temporalSvg.marginLeft + (index / temporalCount) * temporalPlotWidth;
  const temporalY = (value: number) => temporalSvg.marginTop + (1 - value / maxTemporalChart) * temporalPlotHeight;
  const buildLinePath = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? "M" : "L"}${temporalX(index)},${temporalY(value)}`).join(" ");

  const yTicks = 4;
  const temporalTicks = Array.from({ length: yTicks + 1 }, (_, idx) => {
    const value = round2((maxTemporalChart / yTicks) * idx);
    return { value, y: temporalY(value) };
  });

  const categoriasTop = categoriasStrategic.slice(0, 8);

  const maxCategoria = Math.max(
    1,
    ...categoriasTop.map((row) => Math.max(Math.abs(row.ventas), Math.abs(row.costos), Math.abs(row.margen)))
  );

  const categoriaSvg = {
    width: 920,
    height: 340,
    marginTop: 24,
    marginRight: 20,
    marginBottom: 84,
    marginLeft: 54,
  };
  const categoriaPlotWidth = categoriaSvg.width - categoriaSvg.marginLeft - categoriaSvg.marginRight;
  const categoriaPlotHeight = categoriaSvg.height - categoriaSvg.marginTop - categoriaSvg.marginBottom;
  const categoriaGroupWidth = categoriasTop.length > 0 ? categoriaPlotWidth / categoriasTop.length : categoriaPlotWidth;
  const categoriaBarWidth = Math.max(12, categoriaGroupWidth / 4);
  const categoriaX = (index: number) => categoriaSvg.marginLeft + index * categoriaGroupWidth;
  const categoriaY = (value: number) => categoriaSvg.marginTop + (1 - Math.abs(value) / maxCategoria) * categoriaPlotHeight;

  return (
    <AppLayout
      title="Analítica"
      description="Reportes y análisis estratégicos de operaciones"
    >
    <main className="google-2027-theme mx-auto w-full max-w-7xl p-6">

      <section className="mb-4 rounded border p-4">
        <p className="mb-3 text-sm">
          Este panel resume rentabilidad, caja, riesgo financiero y trazabilidad comercial del periodo seleccionado.
        </p>
        <p className="mb-3 text-xs">
          Las cards iniciales muestran indicadores clave del periodo y el saldo histórico pendiente; los bloques
          siguientes explican tendencia temporal, categorías y trazabilidad por lote.
        </p>
        <form className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Modo</span>
            <select name="mode" defaultValue={mode} className="rounded border px-2 py-1">
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Mes de análisis</span>
            <input type="month" name="ym" defaultValue={ym} className="rounded border px-2 py-1" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Año de análisis</span>
            <input type="number" name="year" min="2000" max="2100" defaultValue={String(selectedYear)} className="w-28 rounded border px-2 py-1" />
          </label>
          <button className="rounded border px-3 py-1">Aplicar</button>
        </form>
        <p className="mt-2 text-xs">Periodo activo: <strong>{periodLabel}</strong></p>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded border p-3"><p className="text-xs">Ventas ({periodShort})</p><p className="text-lg font-bold">{currency(ventasPeriodo)}</p><p className="text-[11px]">Total facturado a clientes en el periodo.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Costo productor ({periodShort})</p><p className="text-lg font-bold">{currency(costoComprasPeriodo)}</p><p className="text-[11px]">Compromisos por compra/liquidación a productor.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Margen bruto ({periodShort})</p><p className="text-lg font-bold">{currency(margenBrutoPeriodo)}</p><p className="text-[11px]">Ventas menos costo de productor.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Adelantos ({periodShort})</p><p className="text-lg font-bold">{currency(adelantosPeriodoMonto)}</p><p className="text-[11px]">Dinero adelantado a productores en el periodo.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Ingresos caja ({periodShort})</p><p className="text-lg font-bold">{currency(ingresosCajaPeriodo)}</p><p className="text-[11px]">Entradas de dinero registradas en kardex.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Egresos caja ({periodShort})</p><p className="text-lg font-bold">{currency(egresosCajaPeriodo)}</p><p className="text-[11px]">Salidas de dinero registradas en kardex.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Flujo neto caja</p><p className="text-lg font-bold">{currency(flujoNetoCajaPeriodo)}</p><p className="text-[11px]">Ingresos menos egresos del periodo.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Adelantos por descontar</p><p className="text-lg font-bold">{currency(adelantosPendientesMonto)}</p><p className="text-[11px]">Saldo histórico de adelantos aún no aplicados.</p></div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Gráfico temporal del periodo</h2>
          <p className="mb-3 text-sm">
            Gráfico cartesiano real (eje X: {mode === "anual" ? "meses" : "semanas"}, eje Y: monto S/) para ventas, costos y adelantos.
          </p>
          {temporalChartData.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-slate-500">Sin datos del periodo.</div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" />Ventas</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" />Costos</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />Adelantos</span>
              </div>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${temporalSvg.width} ${temporalSvg.height}`} className="min-w-[760px] w-full rounded border bg-white">
                  {temporalTicks.map((tick) => (
                    <g key={`tick-${tick.value}`}>
                      <line x1={temporalSvg.marginLeft} x2={temporalSvg.width - temporalSvg.marginRight} y1={tick.y} y2={tick.y} stroke="#e5e7eb" strokeDasharray="3 3" />
                      <text x={temporalSvg.marginLeft - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                        {compactCurrency(tick.value)}
                      </text>
                    </g>
                  ))}

                  <line x1={temporalSvg.marginLeft} x2={temporalSvg.marginLeft} y1={temporalSvg.marginTop} y2={temporalSvg.height - temporalSvg.marginBottom} stroke="#94a3b8" />
                  <line x1={temporalSvg.marginLeft} x2={temporalSvg.width - temporalSvg.marginRight} y1={temporalSvg.height - temporalSvg.marginBottom} y2={temporalSvg.height - temporalSvg.marginBottom} stroke="#94a3b8" />

                  <path d={buildLinePath(temporalChartData.map((row) => row.ventas))} fill="none" stroke="#16a34a" strokeWidth="2.5" />
                  <path d={buildLinePath(temporalChartData.map((row) => row.costos))} fill="none" stroke="#dc2626" strokeWidth="2.5" />
                  <path d={buildLinePath(temporalChartData.map((row) => row.adelantos))} fill="none" stroke="#f97316" strokeWidth="2.5" />

                  {temporalChartData.map((row, idx) => (
                    <g key={row.key}>
                      <circle cx={temporalX(idx)} cy={temporalY(row.ventas)} r="3.2" fill="#16a34a" />
                      <circle cx={temporalX(idx)} cy={temporalY(row.costos)} r="3.2" fill="#dc2626" />
                      <circle cx={temporalX(idx)} cy={temporalY(row.adelantos)} r="3.2" fill="#f97316" />
                      <text x={temporalX(idx)} y={temporalSvg.height - temporalSvg.marginBottom + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                        {row.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Gráfico por categoría</h2>
          <p className="mb-3 text-sm">Gráfico cartesiano de barras (X: categorías, Y: monto S/) con top categorías por aporte económico.</p>
          {categoriasTop.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-slate-500">
              Sin liquidaciones detalladas para el periodo seleccionado.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" />Ventas</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" />Costos</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" />Margen</span>
              </div>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${categoriaSvg.width} ${categoriaSvg.height}`} className="min-w-[760px] w-full rounded border bg-white">
                  {Array.from({ length: 5 }, (_, idx) => {
                    const value = round2((maxCategoria / 4) * idx);
                    const y = categoriaY(value);
                    return (
                      <g key={`ctick-${value}`}>
                        <line x1={categoriaSvg.marginLeft} x2={categoriaSvg.width - categoriaSvg.marginRight} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
                        <text x={categoriaSvg.marginLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                          {compactCurrency(value)}
                        </text>
                      </g>
                    );
                  })}

                  <line x1={categoriaSvg.marginLeft} x2={categoriaSvg.marginLeft} y1={categoriaSvg.marginTop} y2={categoriaSvg.height - categoriaSvg.marginBottom} stroke="#94a3b8" />
                  <line x1={categoriaSvg.marginLeft} x2={categoriaSvg.width - categoriaSvg.marginRight} y1={categoriaSvg.height - categoriaSvg.marginBottom} y2={categoriaSvg.height - categoriaSvg.marginBottom} stroke="#94a3b8" />

                  {categoriasTop.map((row, idx) => {
                    const groupX = categoriaX(idx);
                    const baseY = categoriaSvg.height - categoriaSvg.marginBottom;
                    const ventasHeight = Math.max(2, (Math.abs(row.ventas) / maxCategoria) * categoriaPlotHeight);
                    const costosHeight = Math.max(2, (Math.abs(row.costos) / maxCategoria) * categoriaPlotHeight);
                    const margenHeight = Math.max(2, (Math.abs(row.margen) / maxCategoria) * categoriaPlotHeight);
                    return (
                      <g key={row.categoriaId}>
                        <rect x={groupX + categoriaBarWidth * 0.3} y={baseY - ventasHeight} width={categoriaBarWidth} height={ventasHeight} fill="#2563eb" rx="2" />
                        <rect x={groupX + categoriaBarWidth * 1.5} y={baseY - costosHeight} width={categoriaBarWidth} height={costosHeight} fill="#dc2626" rx="2" />
                        <rect x={groupX + categoriaBarWidth * 2.7} y={baseY - margenHeight} width={categoriaBarWidth} height={margenHeight} fill="#059669" rx="2" />
                        <text x={groupX + categoriaGroupWidth / 2} y={baseY + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                          {row.categoria.length > 12 ? `${row.categoria.slice(0, 12)}…` : row.categoria}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Riesgo financiero actual</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border p-3">
            <p className="text-sm">Nos deben (CxC clientes)</p>
            <p className="text-2xl font-bold">{currency(cuentasPorCobrar)}</p>
            <p className="text-[11px]">Suma de saldos pendientes por cobrar en liquidaciones cliente.</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm">Debemos pagar (CxP productores)</p>
            <p className="text-2xl font-bold">{currency(cuentasPorPagar)}</p>
            <p className="text-[11px]">Suma de saldos pendientes por pagar en liquidaciones productor.</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm">Adelantos por descontar</p>
            <p className="text-2xl font-bold">{currency(adelantosPendientesMonto)}</p>
            <p className="text-[11px]">Adelantos entregados que aún no se aplican en una liquidación.</p>
          </div>
        </div>
      </section>
    </main>
    </AppLayout>
  );
}
