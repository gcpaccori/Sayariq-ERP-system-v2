import Link from "next/link";
import { Wallet, TrendingUp, DollarSign, Calendar } from "lucide-react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  Header,
  KPICard,
  Section,
  AccordionItem,
  CompactTable,
  DataCard,
  Tabs,
} from "@/components/EstadoCuentaComponents";
import ModuleNavigation from "@/components/module-navigation";

type SearchParams = {
  productor?: string;
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
            <Header title="Estado de Cuenta" subtitle="Sin productores disponibles" productoresValidos={[]} productorSeleccionadoId={0} />
          <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center">
            <p className="font-semibold text-[#202124]">No hay productores</p>
            <p className="text-sm text-[#5F6368] mt-2">Crea personas con rol productor en el módulo de Gestión.</p>
          </div>
        </div>
        </main>
      </div>
    );
  }

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
          .from("lote_clasificacion")
          .select("lote_id,categoria_id,codigo_clasificacion,peso_neto")
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

    const kgClasificado = round2(
      clasifLote.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0)
    );

    const kgAsignado = round2(
      asignacionesLote.reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0)
    );

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
      detalleCategorias: clasifLote.map((row) => {
        const key = `${row.lote_id}-${row.categoria_id}`;
        return {
          categoria: categoriaMap.get(Number(row.categoria_id)) ?? `Cat ${row.categoria_id}`,
          codigoClasificacion: row.codigo_clasificacion ?? "-",
          kgClasificado: round2(Number(row.peso_neto ?? 0)),
          kgAsignado: round2(Number(asignadoKeyMap.get(key) ?? 0)),
          kgLiquidado: round2(Number(liquidadoKeyMap.get(key) ?? 0)),
          kgPendiente: round2(
            Math.max(0, Number(row.peso_neto ?? 0) - Number(liquidadoKeyMap.get(key) ?? 0))
          ),
        };
      }),
    };
  });

  const totalAdelantos = round2(
    adelantos.reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );
  const adelantosPendientesMonto = round2(
    adelantos
      .filter((row) => row.estado === "pendiente")
      .reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );

  const totalLiquidado = round2(
    liquidaciones.reduce((acc, row) => acc + Number(row.total_a_pagar ?? 0), 0)
  );
  const saldoLiquidacionesPendiente = round2(
    liquidaciones.reduce(
      (acc, row) =>
        acc + Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)),
      0
    )
  );

  const exposicionProductor = round2(
    saldoLiquidacionesPendiente + adelantosPendientesMonto
  );

  const totalPagado = round2(
    pagosKardex.reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );

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
          ? "Entregado y aún no descontado en liquidación"
          : "Cancelado",
    })),
    ...liquidaciones.map((row) => ({
      fecha: row.fecha_liquidacion,
      tipo: "liquidacion" as const,
      referencia: row.numero_liquidacion,
      lote: row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? String(row.lote_id) : "-",
      monto: round2(Number(row.total_a_pagar ?? 0)),
      extra: `Pagado ${currency(Number(row.monto_pagado ?? 0))} | Estado ${row.estado_pago}`,
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

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="estado-cuenta-productor" />
      <main className="google-2027-theme w-full flex-1 bg-white">
        <div className="max-w-7xl mx-auto space-y-4 px-3 py-4 md:px-6 md:py-6 lg:space-y-6 lg:px-8 lg:py-8">
          <Header
            title="Estado de Cuenta"
            subtitle={`Productor: ${productorNombre} | Exposición: ${currency(exposicionProductor)}`}
            actions={
              <>
                <Link
                  href="/liquidaciones"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 sm:w-auto"
                >
                  Ir a Liquidaciones
                </Link>
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50 sm:w-auto"
                >
                  ← Inicio
                </Link>
              </>
            }
            productoresValidos={productoresValidos}
            productorSeleccionadoId={productorSeleccionadoId}
          />
        <div className="space-y-4">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          <KPICard label="Adelantos otorgados" value={currency(totalAdelantos)} />
          <KPICard label="Por descontar" value={currency(adelantosPendientesMonto)} variant={adelantosPendientesMonto > 0 ? 'critical' : 'default'} trend={adelantosPendientesMonto > 0 ? 'down' : 'neutral'} />
          <KPICard label="Total liquidado" value={currency(totalLiquidado)} trend="up" variant="success" />
          <KPICard label="Saldo pendiente" value={currency(saldoLiquidacionesPendiente)} variant={saldoLiquidacionesPendiente > 0 ? 'critical' : 'success'} trend={saldoLiquidacionesPendiente > 0 ? 'down' : 'up'} />
          <KPICard label="Pagado" value={currency(totalPagado)} trend="up" variant="success" />
          <KPICard label="Exposición total" value={currency(exposicionProductor)} variant={exposicionProductor > 0 ? 'critical' : 'default'} trend={exposicionProductor > 0 ? 'down' : 'up'} />
        </div>

        {/* Alerta de adelantos */}
        {adelantosPendientesMonto > 0 && (
          <div className="rounded-xl border border-[#FCE5CD] bg-[#FEF7E0] p-4">
            <p className="text-sm text-[#EA8300] font-medium">
              <strong>⚠ Adelantos pendientes:</strong> S/ {round2(adelantosPendientesMonto)} en adelantos sin descontar. Accede a <Link href="/liquidaciones" className="underline font-bold hover:text-[#D67C00]">Liquidaciones</Link> para procesarlos.
            </p>
          </div>
        )}

        {/* Estado Operativo */}
        <Section title="Estado Operativo" subtitle="Lotes en proceso y cerrados" icon={<Wallet size={18} />}>
          {lotesResumen.length === 0 ? (
            <p className="text-center text-[#5F6368] text-sm py-4">Sin lotes para este productor</p>
          ) : (
            <div className="space-y-2">
              {lotesResumen.map((lote) => (
                <AccordionItem
                  key={lote.id}
                  title={`${lote.numero_lote} · ${lote.producto} · ${lote.kgClasificado}kg`}
                  defaultOpen={lote.estadoCuenta === 'en_proceso'}
                >
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <DataCard
                      fields={[
                        { label: 'Ingreso', value: shortDate(lote.fecha_ingreso) },
                      ]}
                      color="blue"
                    />
                    <DataCard
                      fields={[
                        { label: 'Estado', value: lote.estado },
                      ]}
                      color="blue"
                    />
                  </div>
                  <div className="bg-[#F8FBFF] rounded-xl p-3.5 mb-4 border border-[#E5E7EB]">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5F6368] mb-3">Resumen por Kg</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <p className="text-xs text-[#5F6368]">Clasif.</p>
                        <p className="font-bold text-[#1A73E8] mt-1">{lote.kgClasificado}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#5F6368]">Asignado</p>
                        <p className="font-bold text-[#1A73E8] mt-1">{lote.kgAsignado}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#5F6368]">Liquidado</p>
                        <p className="font-bold text-[#0D652D] mt-1">{lote.kgLiquidado}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#5F6368]">Pendiente</p>
                        <p className="font-bold text-[#D33B27] mt-1">{lote.kgPendienteLiquidar}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#5F6368]">Stock libre</p>
                        <p className="font-bold text-[#202124] mt-1">{lote.kgSobranteSinAsignar}</p>
                      </div>
                    </div>
                  </div>
                  {lote.detalleCategorias.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#5F6368] mb-2">Detalle por categoría:</p>
                      <CompactTable
                        headers={['Categoría', 'Clasif', 'Asignado', 'Liquidado', 'Pendiente']}
                        rows={lote.detalleCategorias.map((c) => [
                          c.categoria,
                          `${c.kgClasificado} kg`,
                          `${c.kgAsignado} kg`,
                          `${c.kgLiquidado} kg`,
                          `${c.kgPendiente} kg`,
                        ])}
                      />
                    </div>
                  )}
                  {lote.kgPendienteLiquidar > 0.01 && (
                    <Link
                      href={`/liquidaciones?lote=${lote.id}`}
                      className="block mt-4 text-center bg-[#1A73E8] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#1765CC] font-semibold transition-colors"
                    >
                      Liquidar este lote
                    </Link>
                  )}
                </AccordionItem>
              ))}
            </div>
          )}
        </Section>

        {/* Trazabilidad */}
        <Section title="Trazabilidad" subtitle="Clasificación, división y liquidación" icon={<TrendingUp size={18} />}>
          {clasificaciones.length === 0 ? (
            <p className="text-center text-[#5F6368] text-sm py-4">Sin clasificaciones</p>
          ) : (
            <CompactTable
              headers={['Lote', 'Categoría', 'Clasif.', 'División', 'Pedidos', 'Kg']}
              rows={clasificaciones.map((row) => {
                const key = `${row.lote_id}-${row.categoria_id}`;
                const asigRelacionadas = asignaciones.filter(
                  (item) =>
                    Number(item.lote_id) === Number(row.lote_id) &&
                    Number(item.categoria_id) === Number(row.categoria_id)
                );
                const codDiv = [...new Set(asigRelacionadas.map((i) => i.codigo_division).filter(Boolean))].join(', ') || '-';
                const pedidos = [...new Set(asigRelacionadas.map((i) => pedidoMap.get(Number(i.pedido_id)) ?? String(i.pedido_id)))].join(', ') || '-';
                return [
                  loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id,
                  categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id,
                  row.codigo_clasificacion ?? '-',
                  codDiv,
                  pedidos,
                  `${round2(Number(row.peso_neto ?? 0))} kg`,
                ];
              })}
            />
          )}
        </Section>

        {/* Sección de Finanzas */}
        <Section title="Finanzas" subtitle="Adelantos, liquidaciones y pagos" icon={<DollarSign size={18} />}>
          <AccordionItem title="Adelantos" badge={String(adelantos.length)} badgeColor={adelantosPendientesMonto > 0 ? 'red' : 'blue'} defaultOpen={adelantosRes.data ? adelantosRes.data.length > 0 : false}>
            {adelantos.length === 0 ? (
              <p className="text-center text-[#5F6368] text-sm py-4">Sin adelantos</p>
            ) : (
              <div className="space-y-2.5">
                {adelantos.map((row) => (
                  <DataCard
                    key={row.id}
                    fields={[
                      { label: 'Fecha', value: shortDate(row.fecha) },
                      { label: 'Comprobante', value: row.numero_comprobante ?? `-` },
                      { label: 'Monto', value: currency(Number(row.monto ?? 0)) },
                      { label: 'Estado', value: adelantoEstadoLabel(row.estado) },
                      { label: 'Lote', value: row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? String(row.lote_id) : '-' },
                      { label: 'Motivo', value: row.motivo ?? '-' },
                    ]}
                    highlight={row.estado === 'pendiente'}
                  />
                ))}
              </div>
            )}
          </AccordionItem>

          <AccordionItem title="Liquidaciones" badge={String(liquidaciones.length)} badgeColor="green" defaultOpen={true}>
            {liquidaciones.length === 0 ? (
              <p className="text-center text-[#5F6368] text-sm py-4">Sin liquidaciones</p>
            ) : (
              <CompactTable
                headers={['Fecha', 'Liquidación', 'Lote', 'A pagar', 'Pagado', 'Saldo']}
                rows={liquidaciones.map((row) => {
                  const saldo = round2(
                    Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0))
                  );
                  return [
                    shortDate(row.fecha_liquidacion),
                    row.numero_liquidacion,
                    row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id : '-',
                    currency(Number(row.total_a_pagar ?? 0)),
                    currency(Number(row.monto_pagado ?? 0)),
                    saldo > 0 ? `${currency(saldo)} 🔴` : currency(saldo),
                  ];
                })}
              />
            )}
          </AccordionItem>

          <AccordionItem title="Pagos registrados" badge={String(pagosKardex.length)} badgeColor="blue">
            {pagosKardex.length === 0 ? (
              <p className="text-center text-[#5F6368] text-sm py-4">Sin pagos registrados</p>
            ) : (
              <CompactTable
                headers={['Fecha', 'Liquidación', 'Monto', 'Detalle']}
                rows={pagosKardex.map((row) => [
                  shortDate(row.fecha),
                  row.origen_id ? liqMap.get(Number(row.origen_id))?.numero_liquidacion ?? `LIQ-${row.origen_id}` : '-',
                  currency(Number(row.monto ?? 0)),
                  row.observaciones ?? row.concepto ?? 'Pago parcial',
                ])}
              />
            )}
          </AccordionItem>
        </Section>

        {/* Auditoría */}
        <Section title="Auditoría" subtitle="Comprobantes internos y línea de tiempo" icon={<Calendar size={18} />}>
          <Tabs
            tabs={[
              {
                label: 'Comprobantes',
                content:
                  comprobantesInternos.length === 0 ? (
                    <p className="text-center text-[#5F6368] text-sm py-4">Sin comprobantes</p>
                  ) : (
                    <CompactTable
                      headers={['Código', 'Tipo', 'Fecha', 'Monto', 'Receptor']}
                      rows={comprobantesInternos.map((row) => {
                        const receptor = [row.receptor_nombre, row.receptor_documento]
                          .filter(Boolean)
                          .join(' | ') || '-';
                        return [
                          row.codigo_interno,
                          row.tipo,
                          shortDate(row.fecha_evento),
                          currency(Number(row.monto ?? 0)),
                          receptor,
                        ];
                      })}
                    />
                  ),
              },
              {
                label: 'Línea de tiempo',
                content:
                  timelineRows.length === 0 ? (
                    <p className="text-center text-[#5F6368] text-sm py-4">Sin movimientos</p>
                  ) : (
                    <div className="space-y-2.5">
                      {timelineRows.map((row, idx) => {
                        const tipoColor = row.tipo === 'adelanto' ? 'blue' : row.tipo === 'liquidacion' ? 'green' : 'orange';
                        const typoBgColor = tipoColor === 'blue' ? 'bg-[#E8F0FE] text-[#1A73E8]' : tipoColor === 'green' ? 'bg-[#E6F4EA] text-[#0D652D]' : 'bg-[#FEF7E0] text-[#EA8300]';
                        return (
                          <div key={idx} className="border-l-4 border-[#1A73E8] pl-3 py-3 rounded-r-lg">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="text-sm font-bold text-[#202124]">{row.referencia}</p>
                                <p className="text-xs text-[#5F6368]">{shortDate(row.fecha)}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typoBgColor}`}>
                                {row.tipo.charAt(0).toUpperCase() + row.tipo.slice(1)}
                              </span>
                            </div>
                            <p className="text-base font-bold text-[#202124]">{currency(row.monto)}</p>
                            <p className="text-xs text-[#5F6368] mt-1">{row.extra}</p>
                          </div>
                        );
                      })}
                    </div>
                  ),
              },
            ]}
          />
        </Section>
        </div>
      </div>
      </main>
    </div>
  );
}
