import Link from "next/link";
import { Wallet, TrendingUp, DollarSign, Calendar } from "lucide-react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import { Header } from "@/components/EstadoCuentaComponents";
import ModuleNavigation from "@/components/module-navigation";

type SearchParams = {
  productor?: string;
  desde?: string;
  hasta?: string;
  page_clasif?: string;
  page_comp?: string;
};

type Persona = {
  id: number;
  nombre_completo: string;
  tipo_documento: string | null;
  documento: string | null;
};

type Lote = {
  id: number;
  numero_lote: string;
  producto: string;
  fecha_ingreso: string;
  estado: "sin_clasificar" | "clasificado" | "asignado" | "liquidado" | "cancelado";
  peso_bruto_ingreso: number;
};

type LoteClasificacion = {
  lote_id: number;
  categoria_id: number;
  codigo_clasificacion: string | null;
  peso_neto: number;
  fecha_clasificacion: string;
};

type PedidoAsignacion = {
  id: number;
  lote_id: number;
  pedido_id: number;
  categoria_id: number;
  codigo_division: string | null;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
};

type Pedido = {
  id: number;
  numero_pedido: string;
};

type Liquidacion = {
  id: number;
  numero_liquidacion: string;
  lote_id: number | null;
  fecha_liquidacion: string;
  numero_comprobante: string | null;
  total_bruto: number;
  total_descuentos: number;
  total_adelantos: number;
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
  lote_id: number | null;
  numero_comprobante: string | null;
  monto: number;
  fecha: string;
  motivo: string | null;
  estado: "pendiente" | "aplicado" | "cancelado";
  liquidacion_id: number | null;
};

type KardexPago = {
  id: number;
  fecha: string;
  origen_id: number | null;
  monto: number;
  concepto: string;
  observaciones: string | null;
};

type Categoria = {
  id: number;
  nombre: string;
};

type TimelineRow = {
  fecha: string;
  tipo: "adelanto" | "liquidacion" | "pago";
  referencia: string;
  lote: string;
  monto: number;
  extra: string;
};

type ComprobanteInternoRow = {
  id: number;
  tipo: "adelanto" | "venta" | "liquidacion";
  codigo_interno: string;
  entidad_origen: string;
  entidad_origen_id: number;
  fecha_evento: string;
  hora_evento: string | null;
  monto: number;
  receptor_nombre: string | null;
  receptor_documento: string | null;
  receptor_rol: string | null;
  lugar_recepcion: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_precision_m: number | null;
  observaciones: string | null;
  persona_principal_id: number;
  productor_id: number | null;
  cliente_id: number | null;
  payload: {
    numero_liquidacion?: string;
    numero_comprobante?: string;
    numero_comprobante_adelanto?: string;
    lote_id?: number;
    lote_numero?: string;
    pedido_numero?: string;
    productores_involucrados?: number[];
  } | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function currency(value: number) {
  return `S/ ${round2(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(input: string) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeDateParam(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return normalized;
}

function normalizeDateRange(desde: string, hasta: string) {
  if (desde && hasta && desde > hasta) {
    return { desde: hasta, hasta: desde };
  }
  return { desde, hasta };
}

function inDateRange(input: string, desde: string, hasta: string) {
  if (!desde && !hasta) return true;
  const value = shortDate(input);
  if (value === "-") return false;
  if (desde && value < desde) return false;
  if (hasta && value > hasta) return false;
  return true;
}

function parsePageParam(value: string | undefined, totalPages: number) {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), Math.max(totalPages, 1));
}

function buildPageRange(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildEstadoCuentaProductorUrl(params: {
  productor: number;
  desde?: string;
  hasta?: string;
  pageClasif?: number;
  pageComp?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("productor", String(params.productor));

  const desde = sanitizeDateParam(params.desde);
  const hasta = sanitizeDateParam(params.hasta);
  const normalized = normalizeDateRange(desde, hasta);

  if (normalized.desde) searchParams.set("desde", normalized.desde);
  if (normalized.hasta) searchParams.set("hasta", normalized.hasta);
  if ((params.pageClasif ?? 1) > 1) searchParams.set("page_clasif", String(params.pageClasif));
  if ((params.pageComp ?? 1) > 1) searchParams.set("page_comp", String(params.pageComp));

  return `?${searchParams.toString()}`;
}

function adelantoEstadoLabel(estado: Adelanto["estado"]) {
  if (estado === "pendiente") return "entregado / por descontar";
  if (estado === "aplicado") return "descontado en liquidación";
  return "cancelado";
}

export default async function EstadoCuentaProductorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const supabase = getSupabaseServerClient();

  const [productoresRes, categoriasRes] = await Promise.all([
    supabase
      .from("persona_roles")
      .select("persona_id,personas!inner(id,nombre_completo,tipo_documento,documento)")
      .eq("rol", "productor"),
    supabase.from("categorias").select("id,nombre").order("orden", { ascending: true }),
  ]);

  const productores = (productoresRes.data ?? []).map((row) => {
    const persona = Array.isArray(row.personas) ? row.personas[0] : row.personas;
    return {
      id: Number(persona?.id),
      nombre_completo: String(persona?.nombre_completo ?? ""),
      tipo_documento: persona?.tipo_documento ? String(persona.tipo_documento) : null,
      documento: persona?.documento ? String(persona.documento) : null,
    };
  }) as Persona[];

  const categorias = (categoriasRes.data ?? []) as Categoria[];
  const categoriaMap = new Map<number, string>(
    categorias.map((row) => [Number(row.id), row.nombre])
  );

  const productoresValidos = productores
    .filter((row) => row.id > 0 && row.nombre_completo)
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

  const productorSeleccionadoIdRaw = Number(search.productor ?? "0");
  const productorSeleccionadoId =
    productoresValidos.find((row) => row.id === productorSeleccionadoIdRaw)?.id ??
    productoresValidos[0]?.id ??
    0;

  if (!productorSeleccionadoId) {
    return (
      <div className="min-h-screen bg-slate-50 lg:flex">
        <ModuleNavigation currentModule="estado-cuenta-productor" />
        <main className="google-2027-theme w-full flex-1 bg-white">
          <div className="max-w-3xl mx-auto px-3 py-4 md:px-6 md:py-6">
            <Header
              title="Módulo 8: Estado de Cuenta de Productor"
              subtitle="Sin productores disponibles"
              productoresValidos={[]}
              productorSeleccionadoId={0}
            />
            <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center shadow-inner">
              <p className="font-semibold text-gray-900">No hay productores</p>
              <p className="text-sm text-gray-500 mt-2">Crea personas con rol productor en el módulo de Gestión.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const initialDesde = sanitizeDateParam(search.desde);
  const initialHasta = sanitizeDateParam(search.hasta);
  const { desde: filtroDesde, hasta: filtroHasta } = normalizeDateRange(initialDesde, initialHasta);
  const hasDateFilter = Boolean(filtroDesde || filtroHasta);

  const [lotesRes, liquidacionesRes, adelantosRes, kardexPagosRes, compRelacionadosRes, compVentasRes] = await Promise.all([
    supabase
      .from("lotes")
      .select("id,numero_lote,producto,fecha_ingreso,estado,peso_bruto_ingreso")
      .eq("productor_id", productorSeleccionadoId)
      .order("id", { ascending: false }),
    supabase
      .from("liquidaciones")
      .select(
        "id,numero_liquidacion,lote_id,fecha_liquidacion,numero_comprobante,total_bruto,total_descuentos,total_adelantos,total_a_pagar,monto_pagado,estado,estado_pago"
      )
      .eq("tipo", "productor")
      .eq("persona_id", productorSeleccionadoId)
      .neq("estado", "anulada")
      .order("id", { ascending: false }),
    supabase
      .from("adelantos")
      .select("id,lote_id,numero_comprobante,monto,fecha,motivo,estado,liquidacion_id")
      .eq("productor_id", productorSeleccionadoId)
      .order("id", { ascending: false }),
    supabase
      .from("kardex")
      .select("id,fecha,origen_id,monto,concepto,observaciones")
      .eq("tipo_kardex", "dinero")
      .eq("tipo_movimiento", "egreso")
      .eq("origen", "pago_directo")
      .eq("persona_id", productorSeleccionadoId)
      .order("fecha", { ascending: false }),
    supabase
      .from("comprobantes_internos")
      .select(
        "id,tipo,codigo_interno,entidad_origen,entidad_origen_id,fecha_evento,hora_evento,monto,receptor_nombre,receptor_documento,receptor_rol,lugar_recepcion,gps_lat,gps_lng,gps_precision_m,observaciones,persona_principal_id,productor_id,cliente_id,payload"
      )
      .or(`persona_principal_id.eq.${productorSeleccionadoId},productor_id.eq.${productorSeleccionadoId}`)
      .order("id", { ascending: false }),
    supabase
      .from("comprobantes_internos")
      .select(
        "id,tipo,codigo_interno,entidad_origen,entidad_origen_id,fecha_evento,hora_evento,monto,receptor_nombre,receptor_documento,receptor_rol,lugar_recepcion,gps_lat,gps_lng,gps_precision_m,observaciones,persona_principal_id,productor_id,cliente_id,payload"
      )
      .eq("tipo", "venta")
      .order("id", { ascending: false })
      .limit(500),
  ]);

  const lotes = (lotesRes.data ?? []) as Lote[];
  const liquidaciones = (liquidacionesRes.data ?? []) as Liquidacion[];
  const adelantos = (adelantosRes.data ?? []) as Adelanto[];
  const pagosKardex = (kardexPagosRes.data ?? []) as KardexPago[];
  const comprobantesRelacionados = (compRelacionadosRes.data ?? []) as ComprobanteInternoRow[];
  const comprobantesVentas = (compVentasRes.data ?? []) as ComprobanteInternoRow[];

  const ventasPorPayload = comprobantesVentas.filter((row) => {
    if (Number(row.productor_id ?? 0) === productorSeleccionadoId) return true;
    const productoresPayload = row.payload?.productores_involucrados ?? [];
    return productoresPayload.some((value) => Number(value) === productorSeleccionadoId);
  });

  const comprobantesInternos = [...comprobantesRelacionados, ...ventasPorPayload]
    .filter((row, index, self) => self.findIndex((item) => Number(item.id) === Number(row.id)) === index)
    .sort((a, b) => Number(b.id) - Number(a.id));

  const loteIds = [...new Set(lotes.map((row) => Number(row.id)))];
  const liquidacionIds = [...new Set(liquidaciones.map((row) => Number(row.id)))];

  const [clasifRes, asignacionesRes, liquidacionDetRes] = await Promise.all([
    loteIds.length > 0
      ? supabase
        .from("vw_lote_clasificacion_vigente")
        .select("lote_id,categoria_id,codigo_clasificacion,peso_neto,fecha_clasificacion")
        .in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
    loteIds.length > 0
      ? supabase
        .from("pedido_asignaciones")
        .select(
          "id,lote_id,pedido_id,categoria_id,codigo_division,kg_asignados,precio_kg,subtotal,fecha_asignacion"
        )
        .in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
    liquidacionIds.length > 0
      ? supabase
        .from("liquidacion_detalle")
        .select("liquidacion_id,categoria_id,peso_neto,precio_kg,subtotal")
        .in("liquidacion_id", liquidacionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clasificaciones = (clasifRes.data ?? []) as LoteClasificacion[];
  const asignaciones = (asignacionesRes.data ?? []) as PedidoAsignacion[];
  const liquidacionDetalles = (liquidacionDetRes.data ?? []) as LiquidacionDetalle[];

  const pedidoIds = [...new Set(asignaciones.map((row) => Number(row.pedido_id)))];
  const pedidosRes =
    pedidoIds.length > 0
      ? await supabase.from("pedidos").select("id,numero_pedido").in("id", pedidoIds)
      : { data: [] };
  const pedidos = (pedidosRes.data ?? []) as Pedido[];

  const loteMap = new Map<number, Lote>(lotes.map((row) => [Number(row.id), row]));
  const pedidoMap = new Map<number, string>(
    pedidos.map((row) => [Number(row.id), row.numero_pedido])
  );
  const liqMap = new Map<number, Liquidacion>(
    liquidaciones.map((row) => [Number(row.id), row])
  );

  const clasifKeyMap = new Map<string, { kg: number; codigo: string | null }>();
  for (const row of clasificaciones) {
    clasifKeyMap.set(`${row.lote_id}-${row.categoria_id}`, {
      kg: Number(row.peso_neto ?? 0),
      codigo: row.codigo_clasificacion,
    });
  }

  const asignadoKeyMap = new Map<string, number>();
  for (const row of asignaciones) {
    const key = `${row.lote_id}-${row.categoria_id}`;
    asignadoKeyMap.set(key, (asignadoKeyMap.get(key) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const liquidadoKeyMap = new Map<string, number>();
  for (const row of liquidacionDetalles) {
    const liquidacion = liqMap.get(Number(row.liquidacion_id));
    if (!liquidacion?.lote_id) continue;
    const key = `${liquidacion.lote_id}-${row.categoria_id}`;
    liquidadoKeyMap.set(key, (liquidadoKeyMap.get(key) ?? 0) + Number(row.peso_neto ?? 0));
  }

  const lotesResumen = lotes.map((lote) => {
    const clasifLote = clasificaciones.filter((row) => Number(row.lote_id) === Number(lote.id));
    const asignacionesLote = asignaciones.filter((row) => Number(row.lote_id) === Number(lote.id));

    const kgClasificado = round2(clasifLote.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0));
    const kgAsignado = round2(asignacionesLote.reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0));

    let kgLiquidado = 0;
    for (const row of clasifLote) {
      const key = `${lote.id}-${row.categoria_id}`;
      kgLiquidado += Number(liquidadoKeyMap.get(key) ?? 0);
    }
    kgLiquidado = round2(kgLiquidado);

    const kgPendienteLiquidar = round2(Math.max(0, kgClasificado - kgLiquidado));
    const kgSobranteSinAsignar = round2(Math.max(0, kgClasificado - kgAsignado));

    const estadoCuenta =
      lote.estado === "liquidado" || kgPendienteLiquidar <= 0.01 ? "cerrado" : "en_proceso";

    return {
      ...lote,
      kgClasificado,
      kgAsignado,
      kgLiquidado,
      kgPendienteLiquidar,
      kgSobranteSinAsignar,
      estadoCuenta,
    };
  });

  const totalAdelantos = round2(adelantos.reduce((acc, row) => acc + Number(row.monto ?? 0), 0));
  const adelantosPendientesMonto = round2(
    adelantos.filter((row) => row.estado === "pendiente").reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );

  const totalLiquidado = round2(liquidaciones.reduce((acc, row) => acc + Number(row.total_a_pagar ?? 0), 0));
  const saldoLiquidacionesPendiente = round2(
    liquidaciones.reduce(
      (acc, row) => acc + Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)),
      0
    )
  );

  const exposicionProductor = round2(saldoLiquidacionesPendiente + adelantosPendientesMonto);

  const totalPagado = round2(pagosKardex.reduce((acc, row) => acc + Number(row.monto ?? 0), 0));

  const timelineRows: TimelineRow[] = [
    ...adelantos.map((row) => ({
      fecha: row.fecha,
      tipo: "adelanto" as const,
      referencia: row.numero_comprobante ?? `AD-${row.id}`,
      lote: row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? String(row.lote_id) : "-",
      monto: round2(Number(row.monto ?? 0)),
      extra:
        row.estado === "aplicado"
          ? `Aplicado en LIQ-${row.liquidacion_id ?? "?"}`
          : row.estado === "pendiente"
            ? "Entregado, aún no descontado"
            : "Cancelado",
    })),
    ...liquidaciones.map((row) => ({
      fecha: row.fecha_liquidacion,
      tipo: "liquidacion" as const,
      referencia: row.numero_liquidacion,
      lote: row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? String(row.lote_id) : "-",
      monto: round2(Number(row.total_a_pagar ?? 0)),
      extra: `Pagado ${currency(Number(row.monto_pagado ?? 0))} | ${row.estado_pago}`,
    })),
    ...pagosKardex.map((row) => ({
      fecha: row.fecha,
      tipo: "pago" as const,
      referencia: row.origen_id ? liqMap.get(Number(row.origen_id))?.numero_liquidacion ?? `LIQ-${row.origen_id}` : `MOV-${row.id}`,
      lote:
        row.origen_id && liqMap.get(Number(row.origen_id))?.lote_id
          ? loteMap.get(Number(liqMap.get(Number(row.origen_id))?.lote_id ?? 0))?.numero_lote ?? "-"
          : "-",
      monto: round2(Number(row.monto ?? 0)),
      extra: row.observaciones ?? row.concepto ?? "Pago parcial",
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const productorNombre =
    productoresValidos.find((row) => row.id === productorSeleccionadoId)?.nombre_completo ??
    `Productor ${productorSeleccionadoId}`;

  const clasificacionesFiltradas = clasificaciones.filter((row) => {
    const fechaBase = row.fecha_clasificacion || loteMap.get(Number(row.lote_id))?.fecha_ingreso || "";
    return inDateRange(fechaBase, filtroDesde, filtroHasta);
  });

  const comprobantesFiltrados = comprobantesInternos.filter((row) =>
    inDateRange(row.fecha_evento, filtroDesde, filtroHasta)
  );

  const PAGE_SIZE_CLASIF = 20;
  const PAGE_SIZE_COMP = 12;

  const totalClasif = clasificacionesFiltradas.length;
  const totalPagesClasif = Math.max(1, Math.ceil(totalClasif / PAGE_SIZE_CLASIF));
  const currentPageClasif = parsePageParam(search.page_clasif, totalPagesClasif);
  const startClasif = (currentPageClasif - 1) * PAGE_SIZE_CLASIF;
  const rowsClasifPage = clasificacionesFiltradas.slice(startClasif, startClasif + PAGE_SIZE_CLASIF);
  const fromClasif = totalClasif === 0 ? 0 : startClasif + 1;
  const toClasif = Math.min(startClasif + PAGE_SIZE_CLASIF, totalClasif);
  const pagesClasif = buildPageRange(currentPageClasif, totalPagesClasif);

  const totalComp = comprobantesFiltrados.length;
  const totalPagesComp = Math.max(1, Math.ceil(totalComp / PAGE_SIZE_COMP));
  const currentPageComp = parsePageParam(search.page_comp, totalPagesComp);
  const startComp = (currentPageComp - 1) * PAGE_SIZE_COMP;
  const rowsCompPage = comprobantesFiltrados.slice(startComp, startComp + PAGE_SIZE_COMP);
  const fromComp = totalComp === 0 ? 0 : startComp + 1;
  const toComp = Math.min(startComp + PAGE_SIZE_COMP, totalComp);
  const pagesComp = buildPageRange(currentPageComp, totalPagesComp);

  const clearFiltersHref = buildEstadoCuentaProductorUrl({
    productor: productorSeleccionadoId,
    pageClasif: 1,
    pageComp: 1,
  });

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="estado-cuenta-productor" />
      <main className="google-2027-theme w-full flex-1 bg-white">
        <div className="max-w-7xl mx-auto space-y-4 px-3 py-4 md:px-6 md:py-6 lg:space-y-5 lg:px-8 lg:py-6">
          <Header
            title="Módulo 8: Estado de Cuenta de Productor"
            subtitle={`${productorNombre} · Exposición: ${currency(exposicionProductor)}`}
            actions={
              <>
                <Link href="/liquidaciones" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  Ir a Liquidaciones
                </Link>
                <BackToDashboardButton className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50" />
              </>
            }
            productoresValidos={productoresValidos}
            productorSeleccionadoId={productorSeleccionadoId}
          />

          <section className="rounded-xl bg-white p-4 shadow-sm">
            <form method="get" className="grid gap-3 md:grid-cols-[auto_auto_auto] md:items-end">
              <input type="hidden" name="productor" value={String(productorSeleccionadoId)} />

              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</span>
                <input
                  type="date"
                  name="desde"
                  defaultValue={filtroDesde}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</span>
                <input
                  type="date"
                  name="hasta"
                  defaultValue={filtroHasta}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </label>

              <div className="flex gap-2">
                <button type="submit" className="sx-btn sx-btn-primary">Aplicar rango</button>
                <Link href={clearFiltersHref} className="sx-btn sx-btn-secondary">Limpiar</Link>
              </div>
            </form>

            <p className="mt-2 text-xs text-slate-500">
              El rango de fechas aplica a Trazabilidad por Categoría y Comprobantes Internos. Los KPIs se muestran en histórico total del productor.
            </p>
          </section>

          <div className="space-y-4">
            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Adelantos otorgados", value: currency(totalAdelantos), color: "text-slate-800" },
                { label: "Por descontar", value: currency(adelantosPendientesMonto), color: adelantosPendientesMonto > 0 ? "text-red-600" : "text-slate-800" },
                { label: "Total liquidado", value: currency(totalLiquidado), color: "text-blue-700" },
                { label: "Saldo pendiente", value: currency(saldoLiquidacionesPendiente), color: saldoLiquidacionesPendiente > 0 ? "text-red-600" : "text-emerald-600" },
                { label: "Pagado", value: currency(totalPagado), color: "text-emerald-600" },
                { label: "Exposición total", value: currency(exposicionProductor), color: exposicionProductor > 0 ? "text-red-600" : "text-emerald-600" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl bg-gray-50 p-3 shadow-inner">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                  <p className={`mt-1 text-base font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Alerta */}
            {adelantosPendientesMonto > 0 && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-sm font-medium text-amber-800">
                  <strong>⚠ Adelantos pendientes:</strong> {currency(adelantosPendientesMonto)} sin descontar.{" "}
                  <Link href="/liquidaciones" className="font-bold underline hover:text-amber-900">Ir a Liquidaciones</Link>.
                </p>
              </div>
            )}

            {/* ── Lotes ── */}
            <section className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <Wallet size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-gray-900">Lotes del Productor</h2>
                <span className="ml-auto text-xs text-slate-400">{lotesResumen.length} lotes</span>
              </div>
              {lotesResumen.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500 text-center">Sin lotes para este productor</p>
              ) : (
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="p-2">Lote</th>
                        <th className="p-2">Producto</th>
                        <th className="p-2">Ingreso</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2 text-right">Kg clasif.</th>
                        <th className="p-2 text-right">Kg liquidado</th>
                        <th className="p-2 text-right">Pendiente</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lotesResumen.map((lote) => (
                        <tr key={lote.id} className={lote.estadoCuenta === "en_proceso" ? "bg-blue-50/30" : ""}>
                          <td className="p-2 font-semibold text-slate-900">{lote.numero_lote}</td>
                          <td className="p-2 text-slate-500 text-xs">{lote.producto}</td>
                          <td className="p-2 text-slate-400 text-xs">{shortDate(lote.fecha_ingreso)}</td>
                          <td className="p-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${lote.estado === "liquidado" ? "bg-emerald-100 text-emerald-700" :
                                lote.estado === "clasificado" ? "bg-blue-100 text-blue-700" :
                                  lote.estado === "asignado" ? "bg-purple-100 text-purple-700" :
                                    "bg-slate-100 text-slate-600"
                              }`}>{lote.estado}</span>
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800">{lote.kgClasificado}</td>
                          <td className="p-2 text-right text-emerald-700 font-semibold">{lote.kgLiquidado}</td>
                          <td className={`p-2 text-right font-bold ${lote.kgPendienteLiquidar > 0.01 ? "text-red-600" : "text-emerald-600"}`}>{lote.kgPendienteLiquidar}</td>
                          <td className="p-2">
                            {lote.kgPendienteLiquidar > 0.01 && (
                              <Link href={`/liquidaciones?lote=${lote.id}`} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                                Liquidar
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Liquidaciones ── */}
            <section className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <DollarSign size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-gray-900">Liquidaciones</h2>
                <span className="ml-auto text-xs text-slate-400">{liquidaciones.length} registros</span>
              </div>
              {liquidaciones.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500 text-center">Sin liquidaciones</p>
              ) : (
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Liquidación</th>
                        <th className="p-2">Lote</th>
                        <th className="p-2 text-right">A pagar</th>
                        <th className="p-2 text-right">Pagado</th>
                        <th className="p-2 text-right">Saldo</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liquidaciones.map((row) => {
                        const saldo = round2(Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)));
                        return (
                          <tr key={row.id}>
                            <td className="p-2 text-xs text-slate-400">{shortDate(row.fecha_liquidacion)}</td>
                            <td className="p-2 font-semibold text-slate-800">{row.numero_liquidacion}</td>
                            <td className="p-2 text-slate-500 text-xs">{row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? "-" : "-"}</td>
                            <td className="p-2 text-right font-semibold text-slate-800">{currency(Number(row.total_a_pagar ?? 0))}</td>
                            <td className="p-2 text-right text-emerald-700">{currency(Number(row.monto_pagado ?? 0))}</td>
                            <td className={`p-2 text-right font-bold ${saldo > 0 ? "text-red-600" : "text-emerald-600"}`}>{currency(saldo)}</td>
                            <td className="p-2">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${row.estado_pago === "pagado" ? "bg-emerald-100 text-emerald-700" :
                                  row.estado_pago === "parcial" ? "bg-amber-100 text-amber-700" :
                                    "bg-red-100 text-red-700"
                                }`}>{row.estado_pago}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Adelantos ── */}
            <section className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-gray-900">Adelantos</h2>
                <span className="ml-auto text-xs text-slate-400">{adelantos.length} registros</span>
              </div>
              {adelantos.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500 text-center">Sin adelantos</p>
              ) : (
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Comprobante</th>
                        <th className="p-2">Lote</th>
                        <th className="p-2 text-right">Monto</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adelantos.map((row) => (
                        <tr key={row.id} className={row.estado === "pendiente" ? "bg-amber-50/40" : ""}>
                          <td className="p-2 text-xs text-slate-400">{shortDate(row.fecha)}</td>
                          <td className="p-2 text-slate-600 text-xs">{row.numero_comprobante ?? "-"}</td>
                          <td className="p-2 text-slate-500 text-xs">{row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? "-" : "-"}</td>
                          <td className="p-2 text-right font-bold text-slate-800">{currency(Number(row.monto ?? 0))}</td>
                          <td className="p-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${row.estado === "aplicado" ? "bg-emerald-100 text-emerald-700" :
                                row.estado === "pendiente" ? "bg-amber-100 text-amber-700" :
                                  "bg-slate-100 text-slate-600"
                              }`}>{adelantoEstadoLabel(row.estado)}</span>
                          </td>
                          <td className="p-2 text-xs text-slate-400">{row.motivo ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Trazabilidad ── */}
            <section className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-900">Trazabilidad por Categoría</h2>
                <p className="text-xs text-slate-400">
                  Clasificación, división y pedidos por lote · Mostrando {fromClasif}-{toClasif} de {totalClasif}
                </p>
              </div>
              {totalClasif === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500 text-center">
                  {hasDateFilter ? "Sin clasificaciones en el rango seleccionado" : "Sin clasificaciones"}
                </p>
              ) : (
                <>
                  <div className="sx-table-wrap">
                    <table className="sx-table">
                      <thead>
                        <tr className="text-left text-xs">
                          <th className="p-2">Lote</th>
                          <th className="p-2">Categoría</th>
                          <th className="p-2">Cód. clasif.</th>
                          <th className="p-2">División</th>
                          <th className="p-2">Pedidos</th>
                          <th className="p-2 text-right">Kg neto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rowsClasifPage.map((row, idx) => {
                          const asigRelacionadas = asignaciones.filter(
                            (item) => Number(item.lote_id) === Number(row.lote_id) && Number(item.categoria_id) === Number(row.categoria_id)
                          );
                          const codDiv = [...new Set(asigRelacionadas.map((i) => i.codigo_division).filter(Boolean))].join(", ") || "-";
                          const pedidosStr = [...new Set(asigRelacionadas.map((i) => pedidoMap.get(Number(i.pedido_id)) ?? String(i.pedido_id)))].join(", ") || "-";
                          return (
                            <tr key={`${row.lote_id}-${row.categoria_id}-${startClasif + idx}`}>
                              <td className="p-2 font-semibold text-slate-800">{loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id}</td>
                              <td className="p-2 text-slate-700">{categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id}</td>
                              <td className="p-2 text-slate-400 text-xs">{row.codigo_clasificacion ?? "-"}</td>
                              <td className="p-2 text-slate-400 text-xs">{codDiv}</td>
                              <td className="p-2 text-slate-400 text-xs">{pedidosStr}</td>
                              <td className="p-2 text-right font-semibold text-slate-800">{round2(Number(row.peso_neto ?? 0))} kg</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p className="text-xs text-slate-500">Página {currentPageClasif} de {totalPagesClasif}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={buildEstadoCuentaProductorUrl({
                          productor: productorSeleccionadoId,
                          desde: filtroDesde,
                          hasta: filtroHasta,
                          pageClasif: Math.max(1, currentPageClasif - 1),
                          pageComp: currentPageComp,
                        })}
                        className={`sx-btn sx-btn-secondary ${currentPageClasif <= 1 ? "pointer-events-none opacity-50" : ""}`}
                        aria-disabled={currentPageClasif <= 1}
                      >
                        Anterior
                      </Link>

                      {pagesClasif.map((pageNumber) => (
                        <Link
                          key={`clasif-${pageNumber}`}
                          href={buildEstadoCuentaProductorUrl({
                            productor: productorSeleccionadoId,
                            desde: filtroDesde,
                            hasta: filtroHasta,
                            pageClasif: pageNumber,
                            pageComp: currentPageComp,
                          })}
                          className={pageNumber === currentPageClasif ? "sx-btn sx-btn-primary" : "sx-btn sx-btn-secondary"}
                        >
                          {pageNumber}
                        </Link>
                      ))}

                      <Link
                        href={buildEstadoCuentaProductorUrl({
                          productor: productorSeleccionadoId,
                          desde: filtroDesde,
                          hasta: filtroHasta,
                          pageClasif: Math.min(totalPagesClasif, currentPageClasif + 1),
                          pageComp: currentPageComp,
                        })}
                        className={`sx-btn sx-btn-secondary ${currentPageClasif >= totalPagesClasif ? "pointer-events-none opacity-50" : ""}`}
                        aria-disabled={currentPageClasif >= totalPagesClasif}
                      >
                        Siguiente
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* ── Auditoría (colapsable al final) ── */}
            <section className="rounded-xl bg-white shadow-sm overflow-hidden">
              <details>
                <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 list-none hover:bg-slate-50 transition-colors select-none">
                  <Calendar size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gray-900">Línea de Tiempo &amp; Comprobantes</span>
                    <span className="ml-2 text-xs text-slate-400">{timelineRows.length} eventos, {comprobantesInternos.length} comprobantes · expandir</span>
                  </div>
                  <span className="text-slate-300 text-xs select-none">▼</span>
                </summary>
                <div className="border-t border-slate-100 p-4 space-y-5">
                  {(comprobantesInternos.length > 0 || hasDateFilter) && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprobantes internos</p>
                      {totalComp === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          {hasDateFilter ? "Sin comprobantes en el rango seleccionado" : "Sin comprobantes"}
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 text-xs text-slate-500">Mostrando {fromComp}-{toComp} de {totalComp}</div>
                          <div className="sx-table-wrap">
                            <table className="sx-table">
                              <thead>
                                <tr className="text-left text-xs">
                                  <th className="p-2">Código</th>
                                  <th className="p-2">Tipo</th>
                                  <th className="p-2">Fecha</th>
                                  <th className="p-2 text-right">Monto</th>
                                  <th className="p-2">Receptor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {rowsCompPage.map((row) => (
                                  <tr key={row.id}>
                                    <td className="p-2 font-semibold text-slate-800">{row.codigo_interno}</td>
                                    <td className="p-2 text-slate-500 text-xs">{row.tipo}</td>
                                    <td className="p-2 text-xs text-slate-400">{shortDate(row.fecha_evento)}</td>
                                    <td className="p-2 text-right font-semibold">{currency(Number(row.monto ?? 0))}</td>
                                    <td className="p-2 text-xs text-slate-400">{[row.receptor_nombre, row.receptor_documento].filter(Boolean).join(" | ") || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-slate-500">Página {currentPageComp} de {totalPagesComp}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={buildEstadoCuentaProductorUrl({
                                  productor: productorSeleccionadoId,
                                  desde: filtroDesde,
                                  hasta: filtroHasta,
                                  pageClasif: currentPageClasif,
                                  pageComp: Math.max(1, currentPageComp - 1),
                                })}
                                className={`sx-btn sx-btn-secondary ${currentPageComp <= 1 ? "pointer-events-none opacity-50" : ""}`}
                                aria-disabled={currentPageComp <= 1}
                              >
                                Anterior
                              </Link>

                              {pagesComp.map((pageNumber) => (
                                <Link
                                  key={`comp-${pageNumber}`}
                                  href={buildEstadoCuentaProductorUrl({
                                    productor: productorSeleccionadoId,
                                    desde: filtroDesde,
                                    hasta: filtroHasta,
                                    pageClasif: currentPageClasif,
                                    pageComp: pageNumber,
                                  })}
                                  className={pageNumber === currentPageComp ? "sx-btn sx-btn-primary" : "sx-btn sx-btn-secondary"}
                                >
                                  {pageNumber}
                                </Link>
                              ))}

                              <Link
                                href={buildEstadoCuentaProductorUrl({
                                  productor: productorSeleccionadoId,
                                  desde: filtroDesde,
                                  hasta: filtroHasta,
                                  pageClasif: currentPageClasif,
                                  pageComp: Math.min(totalPagesComp, currentPageComp + 1),
                                })}
                                className={`sx-btn sx-btn-secondary ${currentPageComp >= totalPagesComp ? "pointer-events-none opacity-50" : ""}`}
                                aria-disabled={currentPageComp >= totalPagesComp}
                              >
                                Siguiente
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {timelineRows.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cronología</p>
                      <div className="space-y-2">
                        {timelineRows.map((row, idx) => {
                          const colors = {
                            adelanto: "border-blue-400 bg-blue-50",
                            liquidacion: "border-emerald-400 bg-emerald-50",
                            pago: "border-amber-400 bg-amber-50",
                          };
                          const badges = {
                            adelanto: "bg-blue-100 text-blue-700",
                            liquidacion: "bg-emerald-100 text-emerald-700",
                            pago: "bg-amber-100 text-amber-700",
                          };
                          return (
                            <div key={idx} className={`border-l-4 pl-3 py-2 rounded-r-lg ${colors[row.tipo]}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {row.referencia}{row.lote !== "-" ? ` · ${row.lote}` : ""}
                                  </p>
                                  <p className="text-xs text-slate-400">{shortDate(row.fecha)} · {row.extra}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-slate-900">{currency(row.monto)}</p>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badges[row.tipo]}`}>{row.tipo}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
