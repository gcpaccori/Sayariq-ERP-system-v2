// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveEvidenciaFoto } from "@/lib/evidencias-fotos";
import { createComprobanteInterno } from "@/lib/comprobantes-internos";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type TipoLiquidacion = "productor" | "cliente";

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  estado: "sin_clasificar" | "clasificado" | "asignado" | "liquidado" | "cancelado";
};

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
  redirect(`/liquidaciones?${params.toString()}`);
}

async function ensureProductor(personaId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("persona_id", personaId)
    .eq("rol", "productor")
    .maybeSingle();

  return !error && !!data;
}

async function buildNumeroLiquidacion(tipo: TipoLiquidacion) {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();
  const prefijo = tipo === "productor" ? "LIQ-P" : "LIQ-C";

  const { data } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", tipo)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = Number(data?.id ?? 0) + 1;
  return `${prefijo}-${year}-${String(next).padStart(4, "0")}`;
}

async function buildUniqueComprobante() {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  for (let index = 0; index < 10; index += 1) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const code = `CP-${y}${m}${d}-${random}`;

    const { data } = await supabase
      .from("liquidaciones")
      .select("id")
      .eq("numero_comprobante", code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }

  throw new Error("No se pudo generar comprobante único. Intenta de nuevo.");
}

async function buildUniqueAdelantoComprobante() {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  for (let index = 0; index < 10; index += 1) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const code = `AD-${y}${m}${d}-${random}`;

    const { data } = await supabase
      .from("adelantos")
      .select("id")
      .eq("numero_comprobante", code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }

  throw new Error("No se pudo generar comprobante único para adelanto. Intenta de nuevo.");
}

async function insertAdelantoConComprobanteUnico(payloadBase: Omit<Record<string, unknown>, "numero_comprobante">) {
  const supabase = getSupabaseServerClient();

  for (let index = 0; index < 10; index += 1) {
    const numeroComprobante = await buildUniqueAdelantoComprobante();

    const { data, error } = await supabase
      .from("adelantos")
      .insert({
        ...payloadBase,
        numero_comprobante: numeroComprobante,
      })
      .select("id,monto,numero_comprobante")
      .single();

    if (!error && data) {
      return {
        adelanto: data,
        numeroComprobante,
      };
    }

    if (error?.code === "23505") {
      continue;
    }

    return {
      adelanto: null,
      numeroComprobante: null,
      errorMessage: error?.message ?? "No se pudo crear el adelanto.",
    };
  }

  return {
    adelanto: null,
    numeroComprobante: null,
    errorMessage: "No se pudo generar comprobante único para adelanto.",
  };
}

async function insertLiquidacionConComprobanteUnico(
  payloadBase: Omit<
    Record<string, unknown>,
    "numero_comprobante"
  >
) {
  const supabase = getSupabaseServerClient();

  for (let index = 0; index < 10; index += 1) {
    const numeroComprobante = await buildUniqueComprobante();

    const { data, error } = await supabase
      .from("liquidaciones")
      .insert({
        ...payloadBase,
        numero_comprobante: numeroComprobante,
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
      errorMessage: error?.message ?? "No se pudo crear la liquidación.",
    };
  }

  return {
    liquidacion: null,
    numeroComprobante: null,
    errorMessage: "No se pudo generar comprobante único para la liquidación.",
  };
}

async function getLoteById(loteId: number): Promise<Lote | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,estado")
    .eq("id", loteId)
    .maybeSingle();

  return (data ?? null) as Lote | null;
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

async function getLiquidadoProductorPorCategoria(loteId: number) {
  const supabase = getSupabaseServerClient();

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "productor")
    .eq("lote_id", loteId)
    .neq("estado", "anulada");

  const liquidacionIds = (liquidaciones ?? []).map((row) => Number(row.id));
  if (liquidacionIds.length === 0) {
    return new Map<number, number>();
  }

  const { data: detalles } = await supabase
    .from("liquidacion_detalle")
    .select("categoria_id,peso_neto")
    .in("liquidacion_id", liquidacionIds);

  const map = new Map<number, number>();
  for (const row of detalles ?? []) {
    const categoriaId = Number(row.categoria_id);
    map.set(categoriaId, (map.get(categoriaId) ?? 0) + Number(row.peso_neto ?? 0));
  }

  return map;
}

async function getLiquidadoClientePorCategoria(pedidoId: number) {
  const supabase = getSupabaseServerClient();

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "cliente")
    .eq("pedido_id", pedidoId)
    .neq("estado", "anulada");

  const liquidacionIds = (liquidaciones ?? []).map((row) => Number(row.id));
  if (liquidacionIds.length === 0) {
    return new Map<number, number>();
  }

  const { data: detalles } = await supabase
    .from("liquidacion_detalle")
    .select("categoria_id,peso_neto")
    .in("liquidacion_id", liquidacionIds);

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

export async function createAdelantoAction(formData: FormData) {
  const productorId = Number(getField(formData, "productor_id"));
  const loteIdRaw = Number(getField(formData, "lote_id") || "0");
  const loteId = loteIdRaw > 0 ? loteIdRaw : null;
  const monto = toDecimal(getField(formData, "monto"));
  const fecha = getField(formData, "fecha");
  const motivo = getField(formData, "motivo");
  const receptorNombre = getField(formData, "receptor_nombre");
  const receptorDocumento = getField(formData, "receptor_documento");
  const receptorRol = getField(formData, "receptor_rol");
  const lugarRecepcion = getField(formData, "lugar_recepcion");
  const gpsLat = toNullableDecimal(getField(formData, "gps_lat"));
  const gpsLng = toNullableDecimal(getField(formData, "gps_lng"));
  const gpsPrecisionM = toNullableDecimal(getField(formData, "gps_precision_m"));
  const horaEvento = getField(formData, "hora_evento");

  if (!productorId || Number.isNaN(productorId)) {
    redirectWithMessage("error", "Selecciona un productor válido.");
  }

  if (Number.isNaN(monto) || monto <= 0 || !fecha) {
    redirectWithMessage("error", "Monto y fecha del adelanto son obligatorios y válidos.");
  }

  const isProductor = await ensureProductor(productorId);
  if (!isProductor) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol productor.");
  }

  const supabase = getSupabaseServerClient();

  const adelantoInsert = await insertAdelantoConComprobanteUnico({
    productor_id: productorId,
    lote_id: loteId,
    monto: round2(monto),
    fecha,
    motivo: motivo || null,
    estado: "pendiente",
  });

  if (!adelantoInsert.adelanto || !adelantoInsert.numeroComprobante) {
    redirectWithMessage(
      "error",
      adelantoInsert.errorMessage ?? "No se pudo crear el adelanto."
    );
  }

  const adelanto = adelantoInsert.adelanto;
  const numeroComprobante = adelantoInsert.numeroComprobante;

  const { data: productor } = await supabase
    .from("personas")
    .select("nombre_completo")
    .eq("id", productorId)
    .maybeSingle();

  const concepto = `Adelanto a ${productor?.nombre_completo ?? "Productor"} -- S/ ${adelanto.monto}`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: "egreso",
    origen: "adelanto",
    origen_id: adelanto.id,
    persona_id: productorId,
    monto: adelanto.monto,
    concepto,
    observaciones: motivo || null,
  });

  if (kardexError) {
    redirectWithMessage("error", `Adelanto creado, pero falló kardex: ${kardexError.message}`);
  }

  const comprobanteInterno = await createComprobanteInterno({
    tipo: "adelanto",
    entidadOrigen: "adelantos",
    entidadOrigenId: Number(adelanto.id),
    personaPrincipalId: productorId,
    productorId,
    fechaEvento: fecha,
    horaEvento: horaEvento || null,
    monto: Number(adelanto.monto ?? 0),
    receptorNombre: receptorNombre || null,
    receptorDocumento: receptorDocumento || null,
    receptorRol: receptorRol || null,
    lugarRecepcion: lugarRecepcion || null,
    gpsLat,
    gpsLng,
    gpsPrecisionM,
    observaciones: motivo || null,
    payload: {
      numero_comprobante_adelanto: numeroComprobante,
      lote_id: loteId,
    },
  });

  const fotoAdelanto = await saveEvidenciaFoto({
    file: formData.get("foto_evidencia"),
    contexto: "adelanto",
    entidadOrigen: "adelantos",
    entidadId: Number(adelanto.id),
    adelantoId: Number(adelanto.id),
    personaId: productorId,
    loteId,
    observaciones: motivo || "Evidencia de entrega de adelanto",
  });

  revalidatePath("/liquidaciones");
  revalidatePath("/estado-cuenta-productor");
  revalidatePath("/kardex");

  const detalleInterno = comprobanteInterno.ok
    ? ` | Comp. interno ${comprobanteInterno.codigoInterno}`
    : ` | Comp. interno no generado (${comprobanteInterno.errorMessage ?? "sin detalle"})`;
  const detalleFoto = fotoAdelanto.guardada
    ? " | Foto guardada"
    : fotoAdelanto.errorMessage
      ? ` | Foto no guardada (${fotoAdelanto.errorMessage})`
      : "";

  redirectWithMessage("ok", `Adelanto registrado. Comprobante ${numeroComprobante}${detalleInterno}${detalleFoto}.`);
}

export async function createLiquidacionProductorAction(formData: FormData) {
  const loteId = Number(getField(formData, "lote_id"));
  const fechaLiquidacion = getField(formData, "fecha_liquidacion");
  const montoDirecto = toDecimal(getField(formData, "monto_directo"));
  const tipoComprobante = getField(formData, "tipo_comprobante") || "ninguno";
  const formaPago = getField(formData, "forma_pago") || null;

  const costoFlete = round2(toDecimal(getField(formData, "costo_flete")) || 0);
  const costoCosecha = round2(toDecimal(getField(formData, "costo_cosecha")) || 0);
  const costoMaquila = round2(toDecimal(getField(formData, "costo_maquila")) || 0);
  const descuentoJabas = round2(toDecimal(getField(formData, "descuento_jabas")) || 0);
  const otrosDescuentos = round2(toDecimal(getField(formData, "otros_descuentos")) || 0);
  const observaciones = getField(formData, "observaciones");
  const aplicarAdelantosAuto = getField(formData, "aplicar_adelantos_auto") === "1";
  const receptorNombre = getField(formData, "receptor_nombre");
  const receptorDocumento = getField(formData, "receptor_documento");
  const receptorRol = getField(formData, "receptor_rol");
  const lugarRecepcion = getField(formData, "lugar_recepcion");
  const gpsLat = toNullableDecimal(getField(formData, "gps_lat"));
  const gpsLng = toNullableDecimal(getField(formData, "gps_lng"));
  const gpsPrecisionM = toNullableDecimal(getField(formData, "gps_precision_m"));
  const horaEvento = getField(formData, "hora_evento");

  if (!loteId || Number.isNaN(loteId) || !fechaLiquidacion) {
    redirectWithMessage("error", "Lote y fecha de liquidación son obligatorios.");
  }

  const lote = await getLoteById(loteId);
  if (!lote) {
    redirectWithMessage("error", "El lote no existe.");
  }

  if (lote.estado !== "clasificado" && lote.estado !== "asignado" && lote.estado !== "sin_clasificar") {
    redirectWithMessage("error", "El lote debe estar sin clasificar, clasificado o asignado para liquidar.");
  }

  const supabase = getSupabaseServerClient();

  const { data: clasificaciones } = await supabase
    .from("lote_clasificacion")
    .select(
      "categoria_id,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,peso_descuento_humedad,peso_neto"
    )
    .eq("lote_id", lote.id);

  const clasificacionesRows = clasificaciones ?? [];
  const liquidacionSinClasificacion = lote.estado === "sin_clasificar" && clasificacionesRows.length === 0;

  if (!liquidacionSinClasificacion && clasificacionesRows.length === 0) {
    redirectWithMessage("error", "El lote no tiene clasificación para liquidar.");
  }

  const liquidadoPorCategoria = await getLiquidadoProductorPorCategoria(lote.id);

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

  if (!liquidacionSinClasificacion) {
    for (const row of clasificacionesRows) {
      const categoriaId = Number(row.categoria_id);
      const kgLiquidado = round2(liquidadoPorCategoria.get(categoriaId) ?? 0);
      const pesoNetoClasif = round2(Number(row.peso_neto ?? 0));
      const pesoNetoLiquidable = round2(Math.max(0, pesoNetoClasif - kgLiquidado));

      if (pesoNetoLiquidable <= 0.01) {
        continue;
      }

      const precio = toDecimal(getField(formData, `precio_kg_${categoriaId}`));

      if (Number.isNaN(precio) || precio <= 0) {
        redirectWithMessage("error", `Precio inválido para categoría ${categoriaId}.`);
      }

      const subtotal = round2(pesoNetoLiquidable * precio);

      detalleRows.push({
        categoria_id: categoriaId,
        peso_bruto: round2(Number(row.peso_bruto ?? 0)),
        numero_jabas: Number(row.numero_jabas ?? 0),
        peso_jabas: round2(Number(row.peso_jabas ?? 0)),
        porcentaje_humedad: round2(Number(row.porcentaje_humedad ?? 0)),
        peso_descuento_humedad: round2(Number(row.peso_descuento_humedad ?? 0)),
        peso_neto: round2(pesoNetoLiquidable),
        precio_kg: round2(precio),
        subtotal,
      });
    }

    if (detalleRows.length === 0) {
      redirectWithMessage(
        "error",
        "No hay kg pendientes por liquidar para este lote."
      );
    }
  }

  const totalBruto = liquidacionSinClasificacion
    ? round2(montoDirecto)
    : round2(detalleRows.reduce((acc, row) => acc + row.subtotal, 0));

  if (liquidacionSinClasificacion && (Number.isNaN(totalBruto) || totalBruto <= 0)) {
    redirectWithMessage("error", "Para lote sin clasificar debes ingresar un monto directo válido.");
  }
  const totalDescuentos = round2(
    costoFlete + costoCosecha + costoMaquila + descuentoJabas + otrosDescuentos
  );

  const adelantoIdsManual = formData
    .getAll("adelantos")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value) && value > 0);

  let adelantosSeleccionados: Array<{
    id: number;
    monto: number;
    productor_id: number;
    lote_id: number | null;
    fecha: string;
    motivo: string | null;
    estado: string;
  }> = [];

  if (adelantoIdsManual.length > 0) {
    const { data: adelantosData } = await supabase
      .from("adelantos")
      .select("id,monto,productor_id,lote_id,fecha,motivo,estado")
      .in("id", adelantoIdsManual)
      .order("fecha", { ascending: true })
      .order("id", { ascending: true });

    adelantosSeleccionados = (adelantosData ?? []) as Array<{
      id: number;
      monto: number;
      productor_id: number;
      lote_id: number | null;
      fecha: string;
      motivo: string | null;
      estado: string;
    }>;
  } else if (aplicarAdelantosAuto) {
    const { data: adelantosData } = await supabase
      .from("adelantos")
      .select("id,monto,productor_id,lote_id,fecha,motivo,estado")
      .eq("productor_id", lote.productor_id)
      .eq("estado", "pendiente")
      .or(`lote_id.is.null,lote_id.eq.${lote.id}`)
      .order("fecha", { ascending: true })
      .order("id", { ascending: true });

    adelantosSeleccionados = (adelantosData ?? []) as Array<{
      id: number;
      monto: number;
      productor_id: number;
      lote_id: number | null;
      fecha: string;
      motivo: string | null;
      estado: string;
    }>;
  }

  for (const adelanto of adelantosSeleccionados) {
    if (Number(adelanto.productor_id) !== lote.productor_id) {
      redirectWithMessage("error", "Hay adelantos de otro productor en la selección.");
    }

    if (adelanto.estado !== "pendiente") {
      redirectWithMessage("error", "Solo se pueden aplicar adelantos en estado pendiente.");
    }

    if (adelanto.lote_id && Number(adelanto.lote_id) !== lote.id) {
      redirectWithMessage("error", "Hay adelantos ligados a otro lote.");
    }
  }

  const netoAntesAdelantos = round2(totalBruto - totalDescuentos);
  if (netoAntesAdelantos < 0) {
    redirectWithMessage("error", "Los descuentos no pueden exceder el total bruto.");
  }

  const adelantosAplicados: Array<{ id: number; aplicado: number; remanente: number; motivo: string | null; fecha: string; lote_id: number | null }> = [];
  let pendientePorCubrir = netoAntesAdelantos;
  let totalAdelantosAplicados = 0;

  for (const adelanto of adelantosSeleccionados) {
    if (pendientePorCubrir <= 0.01) {
      break;
    }

    const monto = round2(Number(adelanto.monto ?? 0));
    if (monto <= 0.01) {
      continue;
    }

    const aplicado = round2(Math.min(monto, pendientePorCubrir));
    const remanente = round2(Math.max(0, monto - aplicado));

    if (aplicado > 0.01) {
      adelantosAplicados.push({
        id: Number(adelanto.id),
        aplicado,
        remanente,
        motivo: adelanto.motivo ?? null,
        fecha: adelanto.fecha,
        lote_id: adelanto.lote_id,
      });
      totalAdelantosAplicados = round2(totalAdelantosAplicados + aplicado);
      pendientePorCubrir = round2(Math.max(0, pendientePorCubrir - aplicado));
    }
  }

  const totalAPagar = round2(Math.max(0, netoAntesAdelantos - totalAdelantosAplicados));

  const numeroLiquidacion = await buildNumeroLiquidacion("productor");
  const liquidacionInsert = await insertLiquidacionConComprobanteUnico({
    numero_liquidacion: numeroLiquidacion,
    tipo: "productor",
    persona_id: lote.productor_id,
    lote_id: lote.id,
    fecha_liquidacion: fechaLiquidacion,
    serie_comprobante: "CP",
    tipo_comprobante: tipoComprobante,
    total_bruto: totalBruto,
    costo_flete: costoFlete,
    costo_cosecha: costoCosecha,
    costo_maquila: costoMaquila,
    descuento_jabas: descuentoJabas,
    otros_descuentos: otrosDescuentos,
    total_descuentos: totalDescuentos,
    total_adelantos: totalAdelantosAplicados,
    total_a_pagar: totalAPagar,
    estado: "confirmada",
    estado_pago: "pendiente",
    forma_pago: formaPago,
    observaciones: observaciones || null,
  });

  if (!liquidacionInsert.liquidacion || !liquidacionInsert.numeroComprobante) {
    redirectWithMessage(
      "error",
      liquidacionInsert.errorMessage ?? "No se pudo crear la liquidación."
    );
  }

  const liquidacion = liquidacionInsert.liquidacion;
  const numeroComprobante = liquidacionInsert.numeroComprobante;

  if (detalleRows.length > 0) {
    const detallesInsert = detalleRows.map((row) => ({
      liquidacion_id: liquidacion.id,
      ...row,
    }));

    const { error: detalleError } = await supabase.from("liquidacion_detalle").insert(detallesInsert);
    if (detalleError) {
      redirectWithMessage("error", detalleError.message);
    }
  }

  if (adelantosAplicados.length > 0) {
    for (const adelanto of adelantosAplicados) {
      if (adelanto.remanente <= 0.01) {
        const { error: adelantoError } = await supabase
          .from("adelantos")
          .update({ estado: "aplicado", liquidacion_id: liquidacion.id })
          .eq("id", adelanto.id);

        if (adelantoError) {
          redirectWithMessage("error", adelantoError.message);
        }
      } else {
        const { error: adelantoParcialError } = await supabase
          .from("adelantos")
          .update({ monto: adelanto.aplicado, estado: "aplicado", liquidacion_id: liquidacion.id })
          .eq("id", adelanto.id);

        if (adelantoParcialError) {
          redirectWithMessage("error", adelantoParcialError.message);
        }

        const numeroComprobanteRemanente = await buildUniqueAdelantoComprobante();
        const { error: adelantoSaldoError } = await supabase
          .from("adelantos")
          .insert({
            productor_id: lote.productor_id,
            lote_id: adelanto.lote_id,
            numero_comprobante: numeroComprobanteRemanente,
            monto: adelanto.remanente,
            fecha: fechaLiquidacion,
            motivo: adelanto.motivo
              ? `${adelanto.motivo} (saldo pendiente tras ${numeroLiquidacion})`
              : `Saldo pendiente tras ${numeroLiquidacion}`,
            estado: "pendiente",
            liquidacion_id: null,
          });

        if (adelantoSaldoError) {
          redirectWithMessage("error", adelantoSaldoError.message);
        }
      }
    }
  }

  let nuevoEstadoLote: Lote["estado"] = "liquidado";

  if (!liquidacionSinClasificacion) {
    const liquidadoPost = await getLiquidadoProductorPorCategoria(lote.id);
    let hayPendiente = false;
    for (const row of clasificacionesRows) {
      const categoriaId = Number(row.categoria_id);
      const clasif = round2(Number(row.peso_neto ?? 0));
      const liquidado = round2(liquidadoPost.get(categoriaId) ?? 0);
      if (clasif - liquidado > 0.01) {
        hayPendiente = true;
        break;
      }
    }

    nuevoEstadoLote = hayPendiente
      ? lote.estado === "asignado"
        ? "asignado"
        : "clasificado"
      : "liquidado";
  }

  const { error: loteError } = await supabase
    .from("lotes")
    .update({ estado: nuevoEstadoLote })
    .eq("id", lote.id);

  if (loteError) {
    redirectWithMessage("error", loteError.message);
  }

  const { data: productor } = await supabase
    .from("personas")
    .select("nombre_completo")
    .eq("id", lote.productor_id)
    .maybeSingle();

  const concepto = `Liquidacion productor ${numeroLiquidacion} -- ${
    productor?.nombre_completo ?? "Productor"
  } -- Lote ${lote.numero_lote}`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: "egreso",
    origen: "liquidacion_productor",
    origen_id: liquidacion.id,
    origen_numero: numeroLiquidacion,
    lote_id: lote.id,
    persona_id: lote.productor_id,
    monto: totalAPagar,
    concepto,
    observaciones: observaciones || null,
  });

  if (kardexError) {
    redirectWithMessage("error", `Liquidación creada, pero falló kardex: ${kardexError.message}`);
  }

  const compInterno = await createComprobanteInterno({
    tipo: "liquidacion",
    entidadOrigen: "liquidaciones",
    entidadOrigenId: Number(liquidacion.id),
    personaPrincipalId: lote.productor_id,
    productorId: lote.productor_id,
    fechaEvento: fechaLiquidacion,
    horaEvento: horaEvento || null,
    monto: totalAPagar,
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
      lote_id: lote.id,
      lote_numero: lote.numero_lote,
      tipo_liquidacion: "productor",
      modalidad: liquidacionSinClasificacion ? "monto_directo_sin_clasificacion" : "por_categoria",
      monto_directo: liquidacionSinClasificacion ? totalBruto : null,
      adelantos_aplicados_total: totalAdelantosAplicados,
      adelantos_aplicados_cantidad: adelantosAplicados.length,
    },
  });

  const fotoLiquidacion = await saveEvidenciaFoto({
    file: formData.get("foto_evidencia"),
    contexto: "liquidacion",
    entidadOrigen: "liquidaciones",
    entidadId: Number(liquidacion.id),
    liquidacionId: Number(liquidacion.id),
    personaId: Number(lote.productor_id),
    loteId: Number(lote.id),
    observaciones: observaciones || "Evidencia de liquidación productor",
  });

  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");
  revalidatePath("/almacen");
  revalidatePath("/estado-cuenta-productor");

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
    `Liquidación ${numeroLiquidacion} creada. Comprobante ${numeroComprobante}. Adelantos descontados S/ ${totalAdelantosAplicados}${detalleInterno}${detalleFoto}.`
  );
}

export async function createLiquidacionClienteAction(formData: FormData) {
  const pedidoId = Number(getField(formData, "pedido_id"));
  const fechaLiquidacion = getField(formData, "fecha_liquidacion");
  const tipoComprobante = getField(formData, "tipo_comprobante") || "ninguno";
  const formaPago = getField(formData, "forma_pago") || null;
  const observaciones = getField(formData, "observaciones");
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
    redirectWithMessage("error", "El pedido debe tener asignaciones para poder liquidar.");
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

  const agg = new Map<number, { kgPendiente: number; precioDefault: number }>();
  for (const row of asignaciones) {
    const categoriaId = Number(row.categoria_id);
    const current = agg.get(categoriaId) ?? { kgPendiente: 0, precioDefault: Number(row.precio_kg ?? 0) };
    current.kgPendiente += Number(row.kg_asignados ?? 0);
    if (!current.precioDefault || current.precioDefault <= 0) {
      current.precioDefault = Number(row.precio_kg ?? 0);
    }
    agg.set(categoriaId, current);
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

  for (const [categoriaId, data] of agg.entries()) {
    const kgPendiente = round2(Math.max(0, data.kgPendiente - (liquidadoPorCategoria.get(categoriaId) ?? 0)));
    if (kgPendiente <= 0.01) {
      continue;
    }

    const precio = toDecimal(getField(formData, `precio_kg_categoria_${categoriaId}`));
    const precioFinal = Number.isNaN(precio) || precio <= 0 ? data.precioDefault : precio;

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
  const numeroLiquidacion = await buildNumeroLiquidacion("cliente");
  const liquidacionInsert = await insertLiquidacionConComprobanteUnico({
    numero_liquidacion: numeroLiquidacion,
    tipo: "cliente",
    persona_id: pedido.cliente_id,
    pedido_id: pedido.id,
    fecha_liquidacion: fechaLiquidacion,
    serie_comprobante: "CP",
    tipo_comprobante: tipoComprobante,
    total_bruto: totalBruto,
    total_descuentos: 0,
    total_adelantos: 0,
    total_a_pagar: totalBruto,
    estado: "confirmada",
    estado_pago: "pendiente",
    forma_pago: formaPago,
    observaciones: observaciones || null,
  });

  if (!liquidacionInsert.liquidacion || !liquidacionInsert.numeroComprobante) {
    redirectWithMessage(
      "error",
      liquidacionInsert.errorMessage ?? "No se pudo crear la liquidación cliente."
    );
  }

  const liquidacion = liquidacionInsert.liquidacion;
  const numeroComprobante = liquidacionInsert.numeroComprobante;

  const detallesInsert = detalleRows.map((row) => ({ liquidacion_id: liquidacion.id, ...row }));
  const { error: detalleError } = await supabase.from("liquidacion_detalle").insert(detallesInsert);
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
    observaciones: observaciones || null,
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
      tipo_liquidacion: "cliente",
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
    observaciones: observaciones || "Evidencia de liquidación cliente",
  });

  revalidatePath("/liquidaciones");
  revalidatePath("/cobranzas");
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
    `Liquidación ${numeroLiquidacion} creada. Comprobante ${numeroComprobante}${detalleInterno}${detalleFoto}.`
  );
}

export async function registrarPagoParcialAction(formData: FormData) {
  const liquidacionId = Number(getField(formData, "liquidacion_id"));
  const monto = toDecimal(getField(formData, "monto_pagado"));
  const fechaPago = getField(formData, "fecha_pago");
  const formaPago = getField(formData, "forma_pago");
  const observaciones = getField(formData, "observaciones");

  if (!liquidacionId || Number.isNaN(liquidacionId)) {
    redirectWithMessage("error", "Selecciona una liquidación válida.");
  }

  if (Number.isNaN(monto) || monto <= 0 || !fechaPago) {
    redirectWithMessage("error", "Monto y fecha de pago/cobro son obligatorios y válidos.");
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

  if (liquidacion.estado !== "confirmada") {
    redirectWithMessage("error", "Solo se permiten pagos/cobros en liquidaciones confirmadas.");
  }

  if (liquidacion.estado_pago === "pagado" || liquidacion.estado_pago === "cobrado") {
    redirectWithMessage("error", "La liquidación ya fue cerrada completamente.");
  }

  const montoActual = Number(liquidacion.monto_pagado ?? 0);
  const total = Number(liquidacion.total_a_pagar ?? 0);
  const montoNuevo = round2(montoActual + monto);

  if (montoNuevo > total + 0.01) {
    redirectWithMessage("error", "El pago/cobro excede el total pendiente.");
  }

  let nuevoEstadoPago: "pendiente" | "parcial" | "pagado" | "cobrado" = "parcial";
  if (montoNuevo <= 0) {
    nuevoEstadoPago = "pendiente";
  } else if (montoNuevo >= total - 0.01) {
    nuevoEstadoPago = liquidacion.tipo === "productor" ? "pagado" : "cobrado";
  }

  const { error: updateError } = await supabase
    .from("liquidaciones")
    .update({
      monto_pagado: montoNuevo,
      fecha_pago: fechaPago,
      forma_pago: formaPago || null,
      estado_pago: nuevoEstadoPago,
    })
    .eq("id", liquidacionId);

  if (updateError) {
    redirectWithMessage("error", updateError.message);
  }

  const tipoMovimiento = liquidacion.tipo === "productor" ? "egreso" : "ingreso";
  const concepto =
    liquidacion.tipo === "productor"
      ? `Pago parcial liquidación ${liquidacion.numero_liquidacion}`
      : `Cobro parcial liquidación ${liquidacion.numero_liquidacion}`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: tipoMovimiento,
    origen: "pago_directo",
    origen_id: liquidacion.id,
    origen_numero: liquidacion.numero_liquidacion,
    persona_id: liquidacion.persona_id,
    monto: round2(monto),
    concepto,
    observaciones: observaciones || null,
  });

  if (kardexError) {
    redirectWithMessage("error", `Pago/cobro aplicado, pero falló kardex: ${kardexError.message}`);
  }

  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");

  redirectWithMessage("ok", `Pago/cobro parcial registrado. Estado: ${nuevoEstadoPago}.`);
}

export async function createPagoLiquidacionAction(formData: FormData) {
  const liquidacionId = Number(getField(formData, "liquidacion_id"));
  const loteId = Number(getField(formData, "lote_id") || "0");
  const monto = toDecimal(getField(formData, "monto_pago"));
  const fechaPago = getField(formData, "fecha_pago");
  const formaPago = getField(formData, "forma_pago");
  const numeroComprobante = getField(formData, "numero_comprobante");
  const observaciones = getField(formData, "observaciones");
  const receptorNombre = getField(formData, "receptor_nombre");
  const receptorDocumento = getField(formData, "receptor_documento");
  const receptorRol = getField(formData, "receptor_rol");
  const lugarRecepcion = getField(formData, "lugar_recepcion");
  const gpsLat = toNullableDecimal(getField(formData, "gps_lat"));
  const gpsLng = toNullableDecimal(getField(formData, "gps_lng"));
  const gpsPrecisionM = toNullableDecimal(getField(formData, "gps_precision_m"));
  const horaEvento = getField(formData, "hora_evento");

  if (!liquidacionId || Number.isNaN(liquidacionId)) {
    redirectWithMessage("error", "Selecciona una liquidación válida.");
  }

  if (Number.isNaN(monto) || monto <= 0 || !fechaPago) {
    redirectWithMessage("error", "Monto y fecha de pago son obligatorios y válidos.");
  }

  const supabase = getSupabaseServerClient();
  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("id,numero_liquidacion,tipo,persona_id,lote_id,pedido_id,estado,estado_pago,total_a_pagar,monto_pagado")
    .eq("id", liquidacionId)
    .maybeSingle();

  if (!liquidacion) {
    redirectWithMessage("error", "La liquidación no existe.");
  }

  if (liquidacion.estado !== "confirmada") {
    redirectWithMessage("error", "Solo se permiten pagos en liquidaciones confirmadas.");
  }

  if (liquidacion.estado_pago === "pagado" || liquidacion.estado_pago === "cobrado") {
    redirectWithMessage("error", "La liquidación ya fue cerrada completamente.");
  }

  const montoActual = Number(liquidacion.monto_pagado ?? 0);
  const total = Number(liquidacion.total_a_pagar ?? 0);
  const montoNuevo = round2(montoActual + monto);

  if (montoNuevo > total + 0.01) {
    redirectWithMessage("error", "El pago excede el total pendiente.");
  }

  // 1. Insertar en pagos_liquidacion (tabla nueva de historial)
  const { data: pagoPend, error: pagoError } = await supabase
    .from("pagos_liquidacion")
    .insert({
      liquidacion_id: liquidacionId,
      lote_id: liquidacion.lote_id || (loteId > 0 ? loteId : null),
      monto: round2(monto),
      fecha: fechaPago,
      forma_pago: formaPago || null,
      numero_comprobante: numeroComprobante || null,
      observaciones: observaciones || null,
    })
    .select("id")
    .maybeSingle();

  if (pagoError || !pagoPend) {
    redirectWithMessage("error", `No se pudo registrar el pago: ${pagoError?.message}`);
  }

  // 2. Actualizar estado_pago en liquidaciones (como antes)
  let nuevoEstadoPago: "pendiente" | "parcial" | "pagado" | "cobrado" = "parcial";
  if (montoNuevo <= 0) {
    nuevoEstadoPago = "pendiente";
  } else if (montoNuevo >= total - 0.01) {
    nuevoEstadoPago = liquidacion.tipo === "productor" ? "pagado" : "cobrado";
  }

  const { error: updateError } = await supabase
    .from("liquidaciones")
    .update({
      monto_pagado: montoNuevo,
      estado_pago: nuevoEstadoPago,
    })
    .eq("id", liquidacionId);

  if (updateError) {
    redirectWithMessage("error", updateError.message);
  }

  // 3. Registrar en kardex
  const tipoMovimiento = liquidacion.tipo === "productor" ? "egreso" : "ingreso";
  const concepto =
    liquidacion.tipo === "productor"
      ? `Pago parcial liquidación ${liquidacion.numero_liquidacion} -- Lote ${liquidacion.lote_id ?? "N/A"}`
      : `Cobro parcial liquidación ${liquidacion.numero_liquidacion}`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "dinero",
    tipo_movimiento: tipoMovimiento,
    origen: "pago_directo",
    origen_id: pagoPend.id,
    origen_numero: `PAG-${pagoPend.id}`,
    lote_id: liquidacion.lote_id || (loteId > 0 ? loteId : null),
    persona_id: liquidacion.persona_id,
    monto: round2(monto),
    concepto,
    observaciones: observaciones || null,
  });

  if (kardexError) {
    redirectWithMessage("error", `Pago registrado pero falló kardex: ${kardexError.message}`);
  }

  // 4. Crear comprobante interno (opcional, si se proporciona datos)
  if (receptorNombre || receptorDocumento) {
    const compInterno = await createComprobanteInterno({
      tipo: liquidacion.tipo === "productor" ? "liquidacion" : "venta",
      entidadOrigen: "pagos_liquidacion",
      entidadOrigenId: Number(pagoPend.id),
      personaPrincipalId: liquidacion.persona_id,
      productorId: liquidacion.tipo === "productor" ? liquidacion.persona_id : undefined,
      clienteId: liquidacion.tipo === "cliente" ? liquidacion.persona_id : undefined,
      fechaEvento: fechaPago,
      horaEvento: horaEvento || null,
      monto: round2(monto),
      receptorNombre: receptorNombre || null,
      receptorDocumento: receptorDocumento || null,
      receptorRol: receptorRol || null,
      lugarRecepcion: lugarRecepcion || null,
      gpsLat,
      gpsLng,
      gpsPrecisionM,
      observaciones: observaciones || null,
      payload: {
        numero_liquidacion: liquidacion.numero_liquidacion,
        tipo_movimiento: tipoMovimiento,
        monto_pagado: round2(monto),
      },
    });
  }

  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");
  revalidatePath("/estado-cuenta-productor");
  revalidatePath("/cobranzas");

  redirectWithMessage(
    "ok",
    `Pago registrado por S/ ${round2(monto)}. Estado: ${nuevoEstadoPago}. Saldo pendiente: S/ ${round2(Math.max(0, total - montoNuevo))}.`
  );
}
