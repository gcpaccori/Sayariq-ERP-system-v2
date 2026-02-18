import Link from "next/link";

import { getSupabaseServerClient } from "@/lib/supabase/server";

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
      <main className="google-2027-theme mx-auto w-full max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Módulo 8: Estado de Cuenta Productor</h1>
          <Link href="/" className="text-sm underline">
            Volver al inicio
          </Link>
        </div>
        <section className="rounded border p-4">
          <p>No hay productores registrados para mostrar estado de cuenta.</p>
          <p className="mt-2 text-sm">Primero crea personas con rol productor en el módulo 1.</p>
        </section>
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
    <main className="google-2027-theme mx-auto w-full max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Módulo 8: Estado de Cuenta Productor</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/liquidaciones" className="underline">
            Ir a Liquidaciones
          </Link>
          <Link href="/" className="underline">
            Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mb-4 rounded border p-4">
        <p className="text-sm">
          Aquí ves la situación financiera completa del productor seleccionado. Las cards resumen adelantos,
          liquidaciones y exposición total; las tablas separan estado del lote, deuda comprometida y movimientos
          de pago para facilitar conciliación.
        </p>
      </section>

      <section className="mb-4 rounded border p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Productor</span>
            <select
              name="productor"
              defaultValue={String(productorSeleccionadoId)}
              className="min-w-[280px] rounded border px-2 py-1"
            >
              {productoresValidos.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.nombre_completo}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded border px-3 py-1">Ver estado</button>
        </form>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded border p-3">
          <p className="text-xs">Productor</p>
          <p className="text-base font-semibold">{productorNombre}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs">Adelantos otorgados</p>
          <p className="text-lg font-bold">{currency(totalAdelantos)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs">Adelantos por descontar</p>
          <p className="text-lg font-bold">{currency(adelantosPendientesMonto)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs">Total liquidado</p>
          <p className="text-lg font-bold">{currency(totalLiquidado)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs">Saldo liquidaciones pendiente</p>
          <p className="text-lg font-bold">{currency(saldoLiquidacionesPendiente)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs">Exposición total</p>
          <p className="text-lg font-bold">{currency(exposicionProductor)}</p>
        </div>
      </section>

      {adelantosPendientesMonto > 0 ? (
        <section className="mb-4 rounded border p-3 text-sm">
          Tienes adelantos por descontar. Si el lote ya tiene kg pendientes para liquidación, usa el botón
          <strong> Liquidar lote</strong> en la tabla siguiente para aplicar el descuento.
        </section>
      ) : null}

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Lotes en proceso y cerrados</h2>
        <p className="mb-2 text-xs">Qué muestra esta tabla: estado operativo y financiero de cada lote del productor.</p>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Lote</th>
                <th className="p-2">Producto</th>
                <th className="p-2">Ingreso</th>
                <th className="p-2">Estado lote</th>
                <th className="p-2">Estado cuenta</th>
                <th className="p-2">Kg clasif.</th>
                <th className="p-2">Kg asignado</th>
                <th className="p-2">Kg liquidado</th>
                <th className="p-2">Kg pendiente liq.</th>
                <th className="p-2">Kg stock libre</th>
                <th className="p-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lotesResumen.length === 0 ? (
                <tr>
                  <td className="p-3 text-center" colSpan={11}>
                    Sin lotes para este productor.
                  </td>
                </tr>
              ) : null}
              {lotesResumen.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="p-2">{row.numero_lote}</td>
                  <td className="p-2">{row.producto}</td>
                  <td className="p-2">{shortDate(row.fecha_ingreso)}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">{row.estadoCuenta}</td>
                  <td className="p-2">{row.kgClasificado}</td>
                  <td className="p-2">{row.kgAsignado}</td>
                  <td className="p-2">{row.kgLiquidado}</td>
                  <td className="p-2">{row.kgPendienteLiquidar}</td>
                  <td className="p-2">{row.kgSobranteSinAsignar}</td>
                  <td className="p-2">
                    {row.kgPendienteLiquidar > 0.01 || row.estado === "sin_clasificar" ? (
                      <Link href={`/liquidaciones?lote=${row.id}`} className="rounded border px-2 py-1 text-xs">
                        Liquidar lote
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Trazabilidad por categoría (clasificación/división/liquidación)</h2>
        <p className="mb-2 text-xs">Qué muestra esta tabla: relación entre clasificación, división comercial y avance de liquidación.</p>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Lote</th>
                <th className="p-2">Categoría</th>
                <th className="p-2">Código clasificación</th>
                <th className="p-2">Códigos división</th>
                <th className="p-2">Pedidos destino</th>
                <th className="p-2">Kg clasif.</th>
                <th className="p-2">Kg asignado</th>
                <th className="p-2">Kg liquidado</th>
                <th className="p-2">Kg pendiente liq.</th>
              </tr>
            </thead>
            <tbody>
              {clasificaciones.length === 0 ? (
                <tr>
                  <td className="p-3 text-center" colSpan={9}>
                    Sin clasificaciones para este productor.
                  </td>
                </tr>
              ) : null}
              {clasificaciones.map((row, index) => {
                const key = `${row.lote_id}-${row.categoria_id}`;
                const asignacionesRelacionadas = asignaciones.filter(
                  (item) =>
                    Number(item.lote_id) === Number(row.lote_id) &&
                    Number(item.categoria_id) === Number(row.categoria_id)
                );

                const codigosDivision = [
                  ...new Set(
                    asignacionesRelacionadas
                      .map((item) => item.codigo_division)
                      .filter((item): item is string => !!item)
                  ),
                ];

                const pedidosDestino = [
                  ...new Set(
                    asignacionesRelacionadas.map(
                      (item) => pedidoMap.get(Number(item.pedido_id)) ?? String(item.pedido_id)
                    )
                  ),
                ];

                return (
                  <tr key={`${key}-${index}`} className="border-b align-top">
                    <td className="p-2">{loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id}</td>
                    <td className="p-2">{categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id}</td>
                    <td className="p-2">{row.codigo_clasificacion ?? "-"}</td>
                    <td className="p-2">{codigosDivision.join(", ") || "-"}</td>
                    <td className="p-2">{pedidosDestino.join(", ") || "-"}</td>
                    <td className="p-2">{round2(Number(row.peso_neto ?? 0))}</td>
                    <td className="p-2">{round2(Number(asignadoKeyMap.get(key) ?? 0))}</td>
                    <td className="p-2">{round2(Number(liquidadoKeyMap.get(key) ?? 0))}</td>
                    <td className="p-2">
                      {round2(
                        Math.max(
                          0,
                          Number(row.peso_neto ?? 0) - Number(liquidadoKeyMap.get(key) ?? 0)
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Historial de adelantos</h2>
          <p className="mb-2 text-xs">
            Nota: estado <strong>pendiente</strong> = adelanto ya entregado, todavía no descontado en una liquidación.
          </p>
          <p className="mb-2 text-xs">Qué muestra esta tabla: adelantos entregados, su estado y su aplicación en liquidaciones.</p>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Comprobante</th>
                  <th className="p-2">ID</th>
                  <th className="p-2">Lote</th>
                  <th className="p-2">Monto</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2">Aplicado en</th>
                </tr>
              </thead>
              <tbody>
                {adelantos.length === 0 ? (
                  <tr>
                    <td className="p-3 text-center" colSpan={8}>
                      Sin adelantos registrados.
                    </td>
                  </tr>
                ) : null}
                {adelantos.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{shortDate(row.fecha)}</td>
                    <td className="p-2">{row.numero_comprobante ?? "-"}</td>
                    <td className="p-2">{row.id}</td>
                    <td className="p-2">
                      {row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id : "-"}
                    </td>
                    <td className="p-2">{currency(Number(row.monto ?? 0))}</td>
                    <td className="p-2">{adelantoEstadoLabel(row.estado)}</td>
                    <td className="p-2">{row.motivo ?? "-"}</td>
                    <td className="p-2">
                      {row.liquidacion_id
                        ? liqMap.get(Number(row.liquidacion_id))?.numero_liquidacion ?? `LIQ-${row.liquidacion_id}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Liquidaciones y pagos</h2>
          <p className="mb-2 text-xs">
            No son lo mismo: <strong>Liquidación</strong> = lo que se debe pagar en total por un lote; <strong>Pago</strong> = cada abono/movimiento que va cancelando esa liquidación.
          </p>
          <p className="mb-2 text-xs font-medium">Cuadro 1: Resumen por liquidación (total, pagado y saldo).</p>
          <p className="mb-2 text-xs">Qué muestra esta tabla: deuda total por liquidación y su saldo pendiente.</p>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Liquidación</th>
                  <th className="p-2">Lote</th>
                  <th className="p-2">Total a pagar</th>
                  <th className="p-2">Pagado</th>
                  <th className="p-2">Saldo</th>
                  <th className="p-2">Estado pago</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.length === 0 ? (
                  <tr>
                    <td className="p-3 text-center" colSpan={7}>
                      Sin liquidaciones para este productor.
                    </td>
                  </tr>
                ) : null}
                {liquidaciones.map((row) => {
                  const saldo = round2(
                    Math.max(0, Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0))
                  );
                  return (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{shortDate(row.fecha_liquidacion)}</td>
                      <td className="p-2">{row.numero_liquidacion}</td>
                      <td className="p-2">
                        {row.lote_id ? loteMap.get(Number(row.lote_id))?.numero_lote ?? row.lote_id : "-"}
                      </td>
                      <td className="p-2">{currency(Number(row.total_a_pagar ?? 0))}</td>
                      <td className="p-2">{currency(Number(row.monto_pagado ?? 0))}</td>
                      <td className="p-2">{currency(saldo)}</td>
                      <td className="p-2">{row.estado_pago}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mb-2 mt-3 text-xs font-medium">Cuadro 2: Detalle de pagos/abonos registrados en kardex.</p>
          <p className="mb-2 text-xs">Qué muestra esta tabla: movimientos de pago que cancelan parcial o totalmente liquidaciones.</p>
          <div className="mt-4 overflow-x-auto rounded border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Liquidación</th>
                  <th className="p-2">Monto pago</th>
                  <th className="p-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {pagosKardex.length === 0 ? (
                  <tr>
                    <td className="p-3 text-center" colSpan={4}>
                      Sin pagos parciales registrados en kardex.
                    </td>
                  </tr>
                ) : null}
                {pagosKardex.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{shortDate(row.fecha)}</td>
                    <td className="p-2">
                      {row.origen_id
                        ? liqMap.get(Number(row.origen_id))?.numero_liquidacion ?? `LIQ-${row.origen_id}`
                        : "-"}
                    </td>
                    <td className="p-2">{currency(Number(row.monto ?? 0))}</td>
                    <td className="p-2">{row.observaciones ?? row.concepto ?? "Pago parcial"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Comprobantes internos (adelanto / venta / liquidación)</h2>
        <p className="mb-3 text-sm">
          Registro interno con receptor, ubicación y GPS para respaldo operativo y auditoría.
        </p>
        <p className="mb-2 text-xs">Qué muestra esta tabla: evidencia interna por evento financiero con datos de recepción y georreferencia.</p>
        <div className="mb-4 overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Código interno</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Monto</th>
                <th className="p-2">Referencia</th>
                <th className="p-2">Receptor</th>
                <th className="p-2">Lugar</th>
                <th className="p-2">GPS</th>
                <th className="p-2">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {comprobantesInternos.length === 0 ? (
                <tr>
                  <td className="p-3 text-center" colSpan={9}>
                    Sin comprobantes internos para este productor.
                  </td>
                </tr>
              ) : null}
              {comprobantesInternos.map((row) => {
                const refNumero =
                  row.payload?.numero_comprobante_adelanto ??
                  row.payload?.numero_liquidacion ??
                  row.payload?.pedido_numero ??
                  `${row.entidad_origen}-${row.entidad_origen_id}`;

                const gps = row.gps_lat && row.gps_lng
                  ? `${row.gps_lat}, ${row.gps_lng} (${row.gps_precision_m ?? "?"}m)`
                  : "-";

                const receptor = [row.receptor_nombre, row.receptor_documento, row.receptor_rol]
                  .filter((value) => !!value)
                  .join(" | ");

                return (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{row.codigo_interno}</td>
                    <td className="p-2">{row.tipo}</td>
                    <td className="p-2">{shortDate(row.fecha_evento)} {row.hora_evento ?? ""}</td>
                    <td className="p-2">{currency(Number(row.monto ?? 0))}</td>
                    <td className="p-2">{refNumero}</td>
                    <td className="p-2">{receptor || "-"}</td>
                    <td className="p-2">{row.lugar_recepcion ?? "-"}</td>
                    <td className="p-2">{gps}</td>
                    <td className="p-2">{row.observaciones ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Línea de tiempo crediticia</h2>
        <p className="mb-3 text-sm">
          Vista unificada para auditoría: adelantos entregados, liquidaciones emitidas y pagos parciales.
        </p>
        <p className="mb-2 text-xs">Qué muestra esta tabla: secuencia cronológica de obligaciones y pagos del productor.</p>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Fecha</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Referencia</th>
                <th className="p-2">Lote</th>
                <th className="p-2">Monto</th>
                <th className="p-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {timelineRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-center" colSpan={6}>
                    Sin movimientos financieros para este productor.
                  </td>
                </tr>
              ) : null}
              {timelineRows.map((row, index) => (
                <tr key={`${row.tipo}-${row.referencia}-${index}`} className="border-b">
                  <td className="p-2">{shortDate(row.fecha)}</td>
                  <td className="p-2">{row.tipo}</td>
                  <td className="p-2">{row.referencia}</td>
                  <td className="p-2">{row.lote}</td>
                  <td className="p-2">{currency(row.monto)}</td>
                  <td className="p-2">{row.extra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
