"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureWriteAccess } from "@/lib/auth/server";
import { saveEvidenciaFoto } from "@/lib/evidencias-fotos";
import { createComprobanteInterno } from "@/lib/comprobantes-internos";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Pedido = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado";
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value ? String(value).trim() : "";
}

function toDecimal(value: string) {
  if (!value) return 0;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toNullableDecimal(value: string) {
  if (!value) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function redirectWithMessage(type: "ok" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/cobranzas?${params.toString()}`);
}

async function buildNumeroLiquidacionCliente() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "cliente")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = Number(data?.id ?? 0) + 1;
  return `LIQ-C-${year}-${String(next).padStart(4, "0")}`;
}

async function buildUniqueComprobante() {
  const supabase = getSupabaseServerClient();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  for (let index = 0; index < 20; index += 1) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const comprobante = `COB-${y}${m}${d}-${random}`;

    const { data } = await supabase
      .from("liquidaciones")
      .select("id")
      .eq("numero_comprobante", comprobante)
      .maybeSingle();

    if (!data) {
      return comprobante;
    }
  }

  throw new Error("No se pudo generar comprobante único.");
}

async function insertLiquidacionClienteConComprobanteUnico(payload: {
  numero_liquidacion: string;
  persona_id: number;
  pedido_id: number;
  fecha_liquidacion: string;
  tipo_comprobante: string;
  total_bruto: number;
  total_a_pagar: number;
  forma_pago: string | null;
  observaciones: string | null;
}) {
  const supabase = getSupabaseServerClient();

  for (let index = 0; index < 20; index += 1) {
    const numeroComprobante = await buildUniqueComprobante();

    const { data, error } = await supabase
      .from("liquidaciones")
      .insert({
        numero_liquidacion: payload.numero_liquidacion,
        tipo: "cliente",
        persona_id: payload.persona_id,
        pedido_id: payload.pedido_id,
        fecha_liquidacion: payload.fecha_liquidacion,
        serie_comprobante: "COB",
        numero_comprobante: numeroComprobante,
        tipo_comprobante: payload.tipo_comprobante,
        total_bruto: payload.total_bruto,
        total_descuentos: 0,
        total_adelantos: 0,
        total_a_pagar: payload.total_a_pagar,
        estado: "confirmada",
        estado_pago: "pendiente",
        forma_pago: payload.forma_pago,
        observaciones: payload.observaciones,
      })
      .select("id")
      .single();

    if (!error && data) {
      return {
        liquidacion: data,
        numeroComprobante,
      };
    }

    if (error?.code === "23505") {
      continue;
    }

    return {
      liquidacion: null,
      numeroComprobante: null,
      errorMessage: error?.message ?? "No se pudo crear la liquidación cliente.",
    };
  }

  return {
    liquidacion: null,
    numeroComprobante: null,
    errorMessage: "No se pudo generar comprobante único para liquidación cliente.",
  };
}

async function getPedidoById(pedidoId: number): Promise<Pedido | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedidos")
    .select("id,numero_pedido,cliente_id,estado")
    .eq("id", pedidoId)
    .maybeSingle();

  return (data ?? null) as Pedido | null;
}

async function getLiquidadoClientePorCategoria(pedidoId: number) {
  const supabase = getSupabaseServerClient();

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "cliente")
    .eq("pedido_id", pedidoId)
    .neq("estado", "anulada");

  const ids = (liquidaciones ?? []).map((row) => Number(row.id));
  if (ids.length === 0) {
    return new Map<number, number>();
  }

  const { data: detalles } = await supabase
    .from("liquidacion_detalle")
    .select("categoria_id,peso_neto")
    .in("liquidacion_id", ids);

  const map = new Map<number, number>();
  for (const row of detalles ?? []) {
    const categoriaId = Number(row.categoria_id);
    map.set(categoriaId, (map.get(categoriaId) ?? 0) + Number(row.peso_neto ?? 0));
  }

  return map;
}

async function getProductoresInvolucradosPorPedido(pedidoId: number) {
  const supabase = getSupabaseServerClient();

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("lote_id")
    .eq("pedido_id", pedidoId);

  const loteIds = [...new Set((asignaciones ?? []).map((row) => Number(row.lote_id)).filter((value) => value > 0))];
  if (loteIds.length === 0) {
    return [] as number[];
  }

  const { data: lotes } = await supabase
    .from("lotes")
    .select("id,productor_id")
    .in("id", loteIds);

  return [...new Set((lotes ?? []).map((row) => Number(row.productor_id)).filter((value) => value > 0))];
}

export async function createLiquidacionClienteModulo6Action(formData: FormData) {
  await ensureWriteAccess("cobranzas");

  const pedidoId = Number(getField(formData, "pedido_id"));
  const fechaLiquidacion = getField(formData, "fecha_liquidacion");
  const tipoComprobante = getField(formData, "tipo_comprobante") || "ninguno";
  const formaPago = getField(formData, "forma_pago") || null;
  const observaciones = getField(formData, "observaciones") || null;
  const receptorNombre = getField(formData, "receptor_nombre");
  const receptorDocumento = getField(formData, "receptor_documento");
  const receptorRol = getField(formData, "receptor_rol");
  const lugarRecepcion = getField(formData, "lugar_recepcion");
  const gpsLat = toNullableDecimal(getField(formData, "gps_lat"));
  const gpsLng = toNullableDecimal(getField(formData, "gps_lng"));
  const gpsPrecisionM = toNullableDecimal(getField(formData, "gps_precision_m"));
  const horaEvento = getField(formData, "hora_evento");

  if (!pedidoId || Number.isNaN(pedidoId) || !fechaLiquidacion) {
    redirectWithMessage("error", "Pedido y fecha de liquidación son obligatorios.");
  }

  const pedido = await getPedidoById(pedidoId);
  if (!pedido) {
    redirectWithMessage("error", "El pedido no existe.");
  }

  if (pedido.estado === "cancelado" || pedido.estado === "pendiente") {
    redirectWithMessage("error", "El pedido debe estar en proceso o completado.");
  }

  const supabase = getSupabaseServerClient();

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("categoria_id,kg_asignados,precio_kg")
    .eq("pedido_id", pedido.id);

  if (!asignaciones || asignaciones.length === 0) {
    redirectWithMessage("error", "El pedido no tiene asignaciones para liquidar.");
  }

  const liquidadoPorCategoria = await getLiquidadoClientePorCategoria(pedido.id);

  const resumen = new Map<number, { kg: number; precioDefault: number }>();
  for (const row of asignaciones) {
    const categoriaId = Number(row.categoria_id);
    const actual = resumen.get(categoriaId) ?? { kg: 0, precioDefault: Number(row.precio_kg ?? 0) };
    actual.kg += Number(row.kg_asignados ?? 0);
    if (!actual.precioDefault || actual.precioDefault <= 0) {
      actual.precioDefault = Number(row.precio_kg ?? 0);
    }
    resumen.set(categoriaId, actual);
  }

  const detalleRows: Array<{
    categoria_id: number;
    peso_bruto: number;
    numero_jabas: number;
    peso_jabas: number;
    porcentaje_humedad: number;
    peso_descuento_humedad: number;
    peso_neto: number;
    precio_kg: number;
    subtotal: number;
  }> = [];

  for (const [categoriaId, data] of resumen.entries()) {
    const kgPendiente = round2(Math.max(0, data.kg - (liquidadoPorCategoria.get(categoriaId) ?? 0)));
    if (kgPendiente <= 0.01) {
      continue;
    }

    const precioIngresado = toDecimal(getField(formData, `precio_kg_categoria_${categoriaId}`));
    const precioFinal =
      Number.isNaN(precioIngresado) || precioIngresado <= 0 ? data.precioDefault : precioIngresado;

    if (!precioFinal || precioFinal <= 0) {
      redirectWithMessage("error", `Precio inválido para categoría ${categoriaId}.`);
    }

    const kg = round2(kgPendiente);
    const subtotal = round2(kg * precioFinal);

    detalleRows.push({
      categoria_id: categoriaId,
      peso_bruto: kg,
      numero_jabas: 0,
      peso_jabas: 0,
      porcentaje_humedad: 0,
      peso_descuento_humedad: 0,
      peso_neto: kg,
      precio_kg: round2(precioFinal),
      subtotal,
    });
  }

  if (detalleRows.length === 0) {
    redirectWithMessage("error", "No hay kg pendientes por liquidar para este pedido.");
  }

  const totalBruto = round2(detalleRows.reduce((acc, row) => acc + row.subtotal, 0));

  const numeroLiquidacion = await buildNumeroLiquidacionCliente();
  const liquidacionInsert = await insertLiquidacionClienteConComprobanteUnico({
    numero_liquidacion: numeroLiquidacion,
    persona_id: pedido.cliente_id,
    pedido_id: pedido.id,
    fecha_liquidacion: fechaLiquidacion,
    tipo_comprobante: tipoComprobante,
    total_bruto: totalBruto,
    total_a_pagar: totalBruto,
    forma_pago: formaPago,
    observaciones,
  });

  if (!liquidacionInsert.liquidacion || !liquidacionInsert.numeroComprobante) {
    redirectWithMessage(
      "error",
      liquidacionInsert.errorMessage ?? "No se pudo crear la liquidación cliente."
    );
  }

  const liquidacion = liquidacionInsert.liquidacion;
  const numeroComprobante = liquidacionInsert.numeroComprobante;

  const { error: detalleError } = await supabase.from("liquidacion_detalle").insert(
    detalleRows.map((row) => ({
      liquidacion_id: liquidacion.id,
      ...row,
    }))
  );

  if (detalleError) {
    redirectWithMessage("error", detalleError.message);
  }

  const { data: cliente } = await supabase
    .from("personas")
    .select("nombre_completo")
    .eq("id", pedido.cliente_id)
    .maybeSingle();

  const concepto = `Liquidacion cliente ${numeroLiquidacion} -- ${
    cliente?.nombre_completo ?? "Cliente"
  } -- Pedido ${pedido.numero_pedido}`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: "ingreso",
    origen: "liquidacion_cliente",
    origen_id: liquidacion.id,
    origen_numero: numeroLiquidacion,
    persona_id: pedido.cliente_id,
    monto: totalBruto,
    concepto,
    observaciones,
  });

  if (kardexError) {
    redirectWithMessage("error", `Liquidación creada, pero falló kardex: ${kardexError.message}`);
  }

  const productoresInvolucrados = await getProductoresInvolucradosPorPedido(pedido.id);
  const productorUnico = productoresInvolucrados.length === 1 ? productoresInvolucrados[0] : null;

  const compInterno = await createComprobanteInterno({
    tipo: "venta",
    entidadOrigen: "liquidaciones",
    entidadOrigenId: Number(liquidacion.id),
    personaPrincipalId: pedido.cliente_id,
    productorId: productorUnico,
    clienteId: pedido.cliente_id,
    fechaEvento: fechaLiquidacion,
    horaEvento: horaEvento || null,
    monto: totalBruto,
    receptorNombre: receptorNombre || null,
    receptorDocumento: receptorDocumento || null,
    receptorRol: receptorRol || null,
    lugarRecepcion: lugarRecepcion || null,
    gpsLat,
    gpsLng,
    gpsPrecisionM,
    observaciones: observaciones || null,
    payload: {
      numero_liquidacion: numeroLiquidacion,
      numero_comprobante: numeroComprobante,
      pedido_id: pedido.id,
      pedido_numero: pedido.numero_pedido,
      productores_involucrados: productoresInvolucrados,
      origen_modulo: "cobranzas",
    },
  });

  const fotoLiquidacion = await saveEvidenciaFoto({
    file: formData.get("foto_evidencia"),
    contexto: "liquidacion",
    entidadOrigen: "liquidaciones",
    entidadId: Number(liquidacion.id),
    liquidacionId: Number(liquidacion.id),
    personaId: Number(pedido.cliente_id),
    pedidoId: Number(pedido.id),
    observaciones: observaciones || "Evidencia de liquidación cliente (módulo cobranzas)",
  });

  revalidatePath("/cobranzas");
  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");

  const detalleInterno = compInterno.ok
    ? ` | Comp. interno ${compInterno.codigoInterno}`
    : ` | Comp. interno no generado (${compInterno.errorMessage ?? "sin detalle"})`;
  const detalleFoto = fotoLiquidacion.guardada
    ? " | Foto guardada"
    : fotoLiquidacion.errorMessage
      ? ` | Foto no guardada (${fotoLiquidacion.errorMessage})`
      : "";

  redirectWithMessage(
    "ok",
    `Liquidación cliente ${numeroLiquidacion} creada. Comprobante ${numeroComprobante}${detalleInterno}${detalleFoto}.`
  );
}

export async function registrarCobroClienteAction(formData: FormData) {
  await ensureWriteAccess("cobranzas");

  const liquidacionId = Number(getField(formData, "liquidacion_id"));
  const montoCobrado = toDecimal(getField(formData, "monto_cobrado"));
  const fechaCobro = getField(formData, "fecha_cobro");
  const formaPago = getField(formData, "forma_pago") || null;
  const observaciones = getField(formData, "observaciones") || null;

  if (!liquidacionId || Number.isNaN(liquidacionId)) {
    redirectWithMessage("error", "Selecciona una liquidación válida.");
  }

  if (Number.isNaN(montoCobrado) || montoCobrado <= 0 || !fechaCobro) {
    redirectWithMessage("error", "Monto y fecha de cobro son obligatorios y válidos.");
  }

  const supabase = getSupabaseServerClient();
  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("id,numero_liquidacion,tipo,persona_id,estado,estado_pago,total_a_pagar,monto_pagado")
    .eq("id", liquidacionId)
    .maybeSingle();

  if (!liquidacion) {
    redirectWithMessage("error", "La liquidación no existe.");
  }

  if (liquidacion.tipo !== "cliente") {
    redirectWithMessage("error", "Este módulo solo permite cobros de liquidaciones cliente.");
  }

  if (liquidacion.estado !== "confirmada") {
    redirectWithMessage("error", "Solo se puede cobrar una liquidación confirmada.");
  }

  if (liquidacion.estado_pago === "cobrado") {
    redirectWithMessage("error", "La liquidación ya está cobrada completamente.");
  }

  const montoActual = Number(liquidacion.monto_pagado ?? 0);
  const totalAPagar = Number(liquidacion.total_a_pagar ?? 0);
  const montoNuevo = round2(montoActual + montoCobrado);

  if (montoNuevo > totalAPagar + 0.01) {
    redirectWithMessage("error", "El cobro excede el total pendiente de la liquidación.");
  }

  const nuevoEstadoPago = montoNuevo >= totalAPagar - 0.01 ? "cobrado" : "parcial";

  const { error: updateError } = await supabase
    .from("liquidaciones")
    .update({
      monto_pagado: montoNuevo,
      fecha_pago: fechaCobro,
      forma_pago: formaPago,
      estado_pago: nuevoEstadoPago,
    })
    .eq("id", liquidacion.id);

  if (updateError) {
    redirectWithMessage("error", updateError.message);
  }

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: "ingreso",
    origen: "pago_directo",
    origen_id: liquidacion.id,
    origen_numero: liquidacion.numero_liquidacion,
    persona_id: liquidacion.persona_id,
    monto: round2(montoCobrado),
    concepto: `Cobro parcial liquidación ${liquidacion.numero_liquidacion}`,
    observaciones,
  });

  if (kardexError) {
    redirectWithMessage("error", `Cobro aplicado, pero falló kardex: ${kardexError.message}`);
  }

  revalidatePath("/cobranzas");
  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");

  redirectWithMessage("ok", `Cobro registrado. Estado de pago: ${nuevoEstadoPago}.`);
}
