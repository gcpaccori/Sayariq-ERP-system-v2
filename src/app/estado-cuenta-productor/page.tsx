import Link from "next/link";

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

type SearchParams = {
  productor?: string;
};

type Persona = {
  id: number;
  nombre_completo: string;
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
      .select("persona_id,personas!inner(id,nombre_completo)")
      .eq("rol", "productor"),
    supabase.from("categorias").select("id,nombre").order("orden", { ascending: true }),
  ]);

  const productores = (productoresRes.data ?? []).map((row) => {
    const persona = Array.isArray(row.personas) ? row.personas[0] : row.personas;
    return {
      id: Number(persona?.id),
      nombre_completo: String(persona?.nombre_completo ?? ""),
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
      <main className="google-2027-theme mx-auto w-full bg-gray-50 pb-6">
        <Header productorNombre="" exposicionTotal="S/ 0.00" productoresValidos={[]} productorSeleccionadoId={0} />
        <div className="max-w-md mx-auto p-4 mt-6">
          <div className="rounded border bg-white p-4 text-center">
            <p className="font-semibold text-gray-900">No hay productores</p>
            <p className="text-xs text-gray-600 mt-2">Crea personas con rol productor en el módulo 1.</p>
          </div>
        </div>
      </main>
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
    <main className="google-2027-theme w-full bg-gray-50">
      <Header
        productorNombre={productorNombre}
        exposicionTotal={currency(exposicionProductor)}
        productoresValidos={productoresValidos}
        productorSeleccionadoId={productorSeleccionadoId}
      />

      <div className="max-w-2xl mx-auto px-3 py-4 md:px-4 md:py-6 pb-6">
        {/* KPIs Grid */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          <KPICard label="Productor" value={productorNombre} />
          <KPICard label="Adelantos otorgados" value={currency(totalAdelantos)} />
          <KPICard label="Por descontar" value={currency(adelantosPendientesMonto)} variant={adelantosPendientesMonto > 0 ? 'critical' : 'default'} />
          <KPICard label="Total liquidado" value={currency(totalLiquidado)} />
          <KPICard label="Saldo pendiente" value={currency(saldoLiquidacionesPendiente)} variant={saldoLiquidacionesPendiente > 0 ? 'critical' : 'success'} />
          <KPICard label="Exposición total" value={currency(exposicionProductor)} variant={exposicionProductor > 0 ? 'critical' : 'success'} />
        </div>

        {/* Alerta de adelantos */}
        {adelantosPendientesMonto > 0 && (
          <div className="mb-4 rounded border border-orange-300 bg-orange-50 p-2.5 md:p-3">
            <p className="text-xs md:text-sm text-orange-900">
              <strong>⚠ Adelantos por descontar:</strong> Usa el botón "Liquidar" para aplicar el descuento en un lote.
            </p>
          </div>
        )}

        {/* Estado Operativo */}
        <Section title="Estado Operativo" subtitle="Lotes en proceso y cerrados">
          {lotesResumen.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">Sin lotes para este productor</p>
          ) : (
            <div className="space-y-2">
              {lotesResumen.map((lote) => (
                <AccordionItem
                  key={lote.id}
                  title={`${lote.numero_lote} · ${lote.producto} · ${lote.kgClasificado}kg`}
                  defaultOpen={lote.estadoCuenta === 'en_proceso'}
                >
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <DataCard
                      fields={[
                        { label: 'Ingreso', value: shortDate(lote.fecha_ingreso) },
                        { label: 'Estado lote', value: lote.estado },
                      ]}
                    />
                    <DataCard
                      fields={[
                        { label: 'Estado cuenta', value: lote.estadoCuenta },
                        { label: 'Bruto ingreso', value: `${lote.peso_bruto_ingreso} kg` },
                      ]}
                    />
                  </div>
                  <div className="bg-gray-50 rounded p-2 mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Resumen de Kg:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-xs">
                        <p className="text-gray-600">Clasificado</p>
                        <p className="font-bold text-blue-600">{lote.kgClasificado}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-600">Asignado</p>
                        <p className="font-bold text-blue-600">{lote.kgAsignado}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-600">Liquidado</p>
                        <p className="font-bold text-green-600">{lote.kgLiquidado}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-600">Pendiente</p>
                        <p className="font-bold text-red-600">{lote.kgPendienteLiquidar}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-600">Stock libre</p>
                        <p className="font-bold text-gray-900">{lote.kgSobranteSinAsignar}</p>
                      </div>
                    </div>
                  </div>
                  {lote.detalleCategorias.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Detalle por categoría:</p>
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
                      className="block mt-3 text-center bg-blue-500 text-white text-xs py-1.5 rounded hover:bg-blue-600 font-semibold"
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
        <Section title="Trazabilidad" subtitle="Clasificación, división y liquidación">
          {clasificaciones.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">Sin clasificaciones</p>
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
        <Section title="Finanzas" subtitle="Adelantos, liquidaciones y pagos">
          <AccordionItem title={`Adelantos (${adelantos.length})`} defaultOpen={adelantosRes.data ? adelantosRes.data.length > 0 : false}>
            {adelantos.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Sin adelantos</p>
            ) : (
              <div className="space-y-2">
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

          <AccordionItem title={`Liquidaciones (${liquidaciones.length})`} defaultOpen={true}>
            {liquidaciones.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Sin liquidaciones</p>
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

          <AccordionItem title={`Pagos registrados (${pagosKardex.length})`}>
            {pagosKardex.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Sin pagos registrados</p>
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
        <Section title="Auditoría" subtitle="Comprobantes internos y línea de tiempo">
          <Tabs
            tabs={[
              {
                label: 'Comprobantes',
                content:
                  comprobantesInternos.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">Sin comprobantes</p>
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
                    <p className="text-center text-gray-500 text-sm py-4">Sin movimientos</p>
                  ) : (
                    <div className="space-y-2">
                      {timelineRows.map((row, idx) => (
                        <div key={idx} className="border-l-4 border-blue-300 pl-3 py-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-900">{row.referencia}</p>
                              <p className="text-xs text-gray-600">{shortDate(row.fecha)}</p>
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {row.tipo.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{currency(row.monto)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{row.extra}</p>
                        </div>
                      ))}
                    </div>
                  ),
              },
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
