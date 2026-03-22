"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureWriteAccess } from "@/lib/auth/server";
import { ensureCategoriaActivaCompat } from "@/lib/categorias";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Producto = "Jengibre" | "Curcuma";

type Pedido = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  producto: string;
  categoria_id: number | null;
  kg_solicitados: number;
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado";
};

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  estado: "sin_clasificar" | "clasificado" | "asignado" | "liquidado" | "cancelado";
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function extractCategoriaIds(formData: FormData) {
  const values = formData
    .getAll("categoria_ids")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value) && value > 0);

  return [...new Set(values)];
}

function buildObservacionesConCategorias(observacionesInput: string, categoriaIds: number[]) {
  const clean = (observacionesInput || "").replace(/\s*\[CATS:[^\]]*\]\s*/g, "").trim();
  if (categoriaIds.length === 0) return clean || null;
  const marker = `[CATS:${categoriaIds.join(",")}]`;
  return clean ? `${clean} ${marker}` : marker;
}

function redirectWithMessage(type: "ok" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/pedidos?${params.toString()}`);
}

async function ensureCliente(personaId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("persona_id", personaId)
    .eq("rol", "cliente")
    .maybeSingle();

  return !error && !!data;
}

async function ensureCategoriaActiva(categoriaId: number) {
  const supabase = getSupabaseServerClient();
  return ensureCategoriaActivaCompat(supabase, categoriaId);
}

async function buildNumeroPedido() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("pedidos")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = Number(data?.id ?? 0) + 1;
  return `PED-${year}-${String(next).padStart(4, "0")}`;
}

async function getPedidoById(pedidoId: number): Promise<Pedido | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedidos")
    .select("id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,estado")
    .eq("id", pedidoId)
    .maybeSingle();

  return (data ?? null) as Pedido | null;
}

async function getLoteById(loteId: number): Promise<Lote | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,producto,estado")
    .eq("id", loteId)
    .maybeSingle();

  return (data ?? null) as Lote | null;
}

async function getPedidoKgAsignados(pedidoId: number) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedido_asignaciones")
    .select("kg_asignados")
    .eq("pedido_id", pedidoId);

  const total = (data ?? []).reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0);
  return round2(total);
}

async function getStockDisponibleLoteCategoria(loteId: number, categoriaId: number) {
  const supabase = getSupabaseServerClient();

  const { data: clasif } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("peso_neto")
    .eq("lote_id", loteId)
    .eq("categoria_id", categoriaId)
    .maybeSingle();

  if (!clasif) return 0;

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("kg_asignados")
    .eq("lote_id", loteId)
    .eq("categoria_id", categoriaId);

  const asignado = (asignaciones ?? []).reduce(
    (acc, row) => acc + Number(row.kg_asignados ?? 0),
    0
  );

  return round2(Number(clasif.peso_neto) - asignado);
}

async function recalculateAndUpdateLoteEstado(loteId: number) {
  const supabase = getSupabaseServerClient();

  const { data: clasificaciones } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("categoria_id,peso_neto")
    .eq("lote_id", loteId);

  if (!clasificaciones || clasificaciones.length === 0) {
    return;
  }

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("categoria_id,kg_asignados")
    .eq("lote_id", loteId);

  const asignadoMap = new Map<number, number>();
  for (const row of asignaciones ?? []) {
    const categoriaId = Number(row.categoria_id);
    const current = asignadoMap.get(categoriaId) ?? 0;
    asignadoMap.set(categoriaId, current + Number(row.kg_asignados ?? 0));
  }

  let hayStock = false;
  for (const row of clasificaciones) {
    const categoriaId = Number(row.categoria_id);
    const neto = Number(row.peso_neto ?? 0);
    const asignado = asignadoMap.get(categoriaId) ?? 0;
    const disponible = round2(neto - asignado);
    if (disponible > 0.01) {
      hayStock = true;
      break;
    }
  }

  const estadoNuevo = hayStock ? "clasificado" : "asignado";
  await supabase.from("lotes").update({ estado: estadoNuevo }).eq("id", loteId);
}

async function recalculateAndUpdatePedidoEstado(pedidoId: number) {
  const supabase = getSupabaseServerClient();
  const pedido = await getPedidoById(pedidoId);
  if (!pedido || pedido.estado === "cancelado") return;

  const asignado = await getPedidoKgAsignados(pedidoId);
  const solicitado = Number(pedido.kg_solicitados ?? 0);

  let estadoNuevo: Pedido["estado"] = "pendiente";
  if (asignado > 0.01 && asignado < solicitado - 0.01) {
    estadoNuevo = "en_proceso";
  } else if (asignado >= solicitado - 0.01) {
    estadoNuevo = "completado";
  }

  await supabase.from("pedidos").update({ estado: estadoNuevo }).eq("id", pedidoId);
}

export async function createPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const clienteId = Number(getField(formData, "cliente_id"));
  const producto = getField(formData, "producto") as Producto;
  const categoriaIds = extractCategoriaIds(formData);
  const categoriaId = categoriaIds.length === 1 ? categoriaIds[0] : null;
  const kgSolicitados = toDecimal(getField(formData, "kg_solicitados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaPedido = getField(formData, "fecha_pedido");

  if (!clienteId || Number.isNaN(clienteId)) {
    redirectWithMessage("error", "Selecciona un cliente válido.");
  }

  const productosValidos: Producto[] = ["Jengibre", "Curcuma"];
  if (!productosValidos.includes(producto)) {
    redirectWithMessage("error", "Producto inválido. Solo se permite Jengibre o Curcuma.");
  }

  if (
    Number.isNaN(kgSolicitados) ||
    Number.isNaN(precioKg) ||
    kgSolicitados <= 0 ||
    precioKg <= 0 ||
    !fechaPedido
  ) {
    redirectWithMessage("error", "Kg solicitados, precio y fecha son obligatorios y válidos.");
  }

  const isCliente = await ensureCliente(clienteId);
  if (!isCliente) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol cliente.");
  }

  for (const categoriaIdIter of categoriaIds) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaIdIter);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "Una categoría seleccionada no existe o está inactiva.");
    }
  }

  const numeroPedido = getField(formData, "numero_pedido") || (await buildNumeroPedido());
  const totalEstimado = round2(kgSolicitados * precioKg);

  const payload = {
    numero_pedido: numeroPedido,
    cliente_id: clienteId,
    producto,
    categoria_id: categoriaId,
    kg_solicitados: round2(kgSolicitados),
    precio_kg: round2(precioKg),
    total_estimado: totalEstimado,
    fecha_pedido: fechaPedido,
    fecha_entrega: getField(formData, "fecha_entrega") || null,
    observaciones: buildObservacionesConCategorias(getField(formData, "observaciones"), categoriaIds),
    estado: "pendiente",
  };

  const supabase = getSupabaseServerClient();
  const { data: pedidoCreado, error } = await supabase
    .from("pedidos")
    .insert(payload)
    .select("numero_pedido")
    .single();

  if (error || !pedidoCreado) {
    redirectWithMessage("error", error?.message ?? "No se pudo crear el pedido.");
  }

  revalidatePath("/pedidos");
  redirectWithMessage("ok", `Pedido ${pedidoCreado.numero_pedido} creado correctamente.`);
}

export async function updatePedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const pedidoId = Number(getField(formData, "pedido_id"));
  const clienteId = Number(getField(formData, "cliente_id"));
  const producto = getField(formData, "producto") as Producto;
  const categoriaIds = extractCategoriaIds(formData);
  const categoriaId = categoriaIds.length === 1 ? categoriaIds[0] : null;
  const kgSolicitados = toDecimal(getField(formData, "kg_solicitados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaPedido = getField(formData, "fecha_pedido");

  if (!pedidoId || Number.isNaN(pedidoId)) {
    redirectWithMessage("error", "Pedido inválido para editar.");
  }

  if (!clienteId || Number.isNaN(clienteId)) {
    redirectWithMessage("error", "Selecciona un cliente válido.");
  }

  const productosValidos: Producto[] = ["Jengibre", "Curcuma"];
  if (!productosValidos.includes(producto)) {
    redirectWithMessage("error", "Producto inválido. Solo se permite Jengibre o Curcuma.");
  }

  if (
    Number.isNaN(kgSolicitados) ||
    Number.isNaN(precioKg) ||
    kgSolicitados <= 0 ||
    precioKg <= 0 ||
    !fechaPedido
  ) {
    redirectWithMessage("error", "Kg solicitados, precio y fecha son obligatorios y válidos.");
  }

  const isCliente = await ensureCliente(clienteId);
  if (!isCliente) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol cliente.");
  }

  for (const categoriaIdIter of categoriaIds) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaIdIter);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "Una categoría seleccionada no existe o está inactiva.");
    }
  }

  const totalEstimado = round2(kgSolicitados * precioKg);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("pedidos")
    .update({
      cliente_id: clienteId,
      producto,
      categoria_id: categoriaId,
      kg_solicitados: round2(kgSolicitados),
      precio_kg: round2(precioKg),
      total_estimado: totalEstimado,
      fecha_pedido: fechaPedido,
      fecha_entrega: getField(formData, "fecha_entrega") || null,
      observaciones: buildObservacionesConCategorias(getField(formData, "observaciones"), categoriaIds),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .neq("estado", "cancelado");

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/pedidos");
  redirectWithMessage("ok", `Pedido ${pedidoId} actualizado correctamente.`);
}

export async function asignarLotePedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const pedidoId = Number(getField(formData, "pedido_id"));
  const loteId = Number(getField(formData, "lote_id"));
  const categoriaId = Number(getField(formData, "categoria_id"));
  const kgAsignados = toDecimal(getField(formData, "kg_asignados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaAsignacion = getField(formData, "fecha_asignacion");

  if (
    !pedidoId ||
    !loteId ||
    !categoriaId ||
    Number.isNaN(pedidoId) ||
    Number.isNaN(loteId) ||
    Number.isNaN(categoriaId)
  ) {
    redirectWithMessage("error", "Datos inválidos para la asignación.");
  }

  if (
    Number.isNaN(kgAsignados) ||
    Number.isNaN(precioKg) ||
    kgAsignados <= 0 ||
    precioKg <= 0 ||
    !fechaAsignacion
  ) {
    redirectWithMessage(
      "error",
      "Kg asignados, precio y fecha de asignación son obligatorios y válidos."
    );
  }

  const pedido = await getPedidoById(pedidoId);
  if (!pedido) {
    redirectWithMessage("error", "El pedido no existe.");
  }

  if (pedido.estado === "cancelado") {
    redirectWithMessage("error", "No se puede asignar un pedido cancelado.");
  }

  if (pedido.estado === "completado") {
    redirectWithMessage("error", "El pedido ya está completado.");
  }

  const lote = await getLoteById(loteId);
  if (!lote) {
    redirectWithMessage("error", "El lote no existe.");
  }

  if (lote.estado !== "clasificado" && lote.estado !== "asignado") {
    redirectWithMessage("error", "El lote debe estar en estado clasificado o asignado.");
  }

  if (lote.producto !== pedido.producto) {
    redirectWithMessage(
      "error",
      `El lote (${lote.producto}) no coincide con el producto del pedido (${pedido.producto}).`
    );
  }

  // Regla actualizada: el pedido conserva categoría referencial, pero la asignación
  // puede realizarse con cualquier categoría del mismo producto.

  const stockDisponible = await getStockDisponibleLoteCategoria(loteId, categoriaId);
  if (stockDisponible <= 0.01) {
    redirectWithMessage("error", "Ese lote/categoría no tiene stock disponible.");
  }

  const pedidoKgAsignados = await getPedidoKgAsignados(pedidoId);
  const pedidoFaltante = round2(Number(pedido.kg_solicitados) - pedidoKgAsignados);

  if (pedidoFaltante <= 0.01) {
    redirectWithMessage("error", "El pedido ya no tiene kg pendientes.");
  }

  if (kgAsignados > stockDisponible) {
    redirectWithMessage(
      "error",
      `Kg asignados exceden stock disponible (${stockDisponible} kg).`
    );
  }

  if (kgAsignados > pedidoFaltante) {
    redirectWithMessage("error", `Kg asignados exceden faltante del pedido (${pedidoFaltante} kg).`);
  }

  const subtotal = round2(kgAsignados * precioKg);
  const supabase = getSupabaseServerClient();

  const { data: asignacionCreada, error: insertError } = await supabase
    .from("pedido_asignaciones")
    .insert({
      pedido_id: pedidoId,
      lote_id: loteId,
      categoria_id: categoriaId,
      codigo_division: null,
      kg_asignados: round2(kgAsignados),
      precio_kg: round2(precioKg),
      subtotal,
      fecha_asignacion: fechaAsignacion,
      observaciones: getField(formData, "observaciones") || null,
    })
    .select("id")
    .single();

  if (insertError || !asignacionCreada) {
    redirectWithMessage("error", insertError?.message ?? "No se pudo registrar la asignación.");
  }

  const codeYear = new Date().getFullYear();
  const codigoDivision = `DIV-${codeYear}-${String(asignacionCreada.id).padStart(8, "0")}`;

  const { error: codeError } = await supabase
    .from("pedido_asignaciones")
    .update({ codigo_division: codigoDivision })
    .eq("id", asignacionCreada.id);

  if (codeError) {
    redirectWithMessage("error", `Asignación creada, pero falló código de división: ${codeError.message}`);
  }

  const nuevoAsignadoPedido = round2(pedidoKgAsignados + kgAsignados);
  const nuevoEstadoPedido =
    nuevoAsignadoPedido >= Number(pedido.kg_solicitados) - 0.01 ? "completado" : "en_proceso";

  const { error: updatePedidoError } = await supabase
    .from("pedidos")
    .update({ estado: nuevoEstadoPedido })
    .eq("id", pedidoId);

  if (updatePedidoError) {
    redirectWithMessage("error", updatePedidoError.message);
  }

  const { data: categoriaData } = await supabase
    .from("categorias")
    .select("nombre")
    .eq("id", categoriaId)
    .maybeSingle();

  const concepto = `Salida lote ${lote.numero_lote} -> Pedido ${pedido.numero_pedido} -- ${
    categoriaData?.nombre ?? "Categoria"
  }: ${round2(kgAsignados)} kg`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "producto",
    tipo_movimiento: "salida",
    origen: "asignacion_pedido",
    origen_id: asignacionCreada.id,
    origen_numero: pedido.numero_pedido,
    lote_id: loteId,
    categoria_id: categoriaId,
    peso_kg: round2(kgAsignados),
    persona_id: pedido.cliente_id,
    concepto,
    observaciones: getField(formData, "observaciones") || null,
  });

  if (kardexError) {
    redirectWithMessage("error", `Asignación creada, pero falló kardex: ${kardexError.message}`);
  }

  await recalculateAndUpdateLoteEstado(loteId);

  revalidatePath("/pedidos");
  revalidatePath("/almacen");

  redirectWithMessage(
    "ok",
    `Asignación registrada (${round2(kgAsignados)} kg). Estado pedido: ${nuevoEstadoPedido}.`
  );
}

export async function updateAsignacionPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const asignacionId = Number(getField(formData, "asignacion_id"));
  const kgAsignados = toDecimal(getField(formData, "kg_asignados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaAsignacion = getField(formData, "fecha_asignacion");

  if (!asignacionId || Number.isNaN(asignacionId)) {
    redirectWithMessage("error", "Asignación inválida para editar.");
  }

  if (Number.isNaN(kgAsignados) || Number.isNaN(precioKg) || kgAsignados <= 0 || precioKg <= 0 || !fechaAsignacion) {
    redirectWithMessage("error", "Kg, precio y fecha son obligatorios y válidos.");
  }

  const supabase = getSupabaseServerClient();
  const { data: asignacionActual } = await supabase
    .from("pedido_asignaciones")
    .select("id,pedido_id,lote_id,categoria_id,kg_asignados,precio_kg")
    .eq("id", asignacionId)
    .maybeSingle();

  if (!asignacionActual) {
    redirectWithMessage("error", "No se encontró la asignación.");
  }

  const pedido = await getPedidoById(Number(asignacionActual.pedido_id));
  const lote = await getLoteById(Number(asignacionActual.lote_id));
  if (!pedido || !lote) {
    redirectWithMessage("error", "Pedido o lote no disponibles para actualizar asignación.");
  }

  const stockSinEstaFila = await getStockDisponibleLoteCategoria(
    Number(asignacionActual.lote_id),
    Number(asignacionActual.categoria_id)
  );
  const stockMaximo = round2(stockSinEstaFila + Number(asignacionActual.kg_asignados ?? 0));
  if (kgAsignados > stockMaximo + 0.01) {
    redirectWithMessage("error", `Kg asignados exceden el máximo disponible (${stockMaximo} kg).`);
  }

  const totalAsignadoPedido = await getPedidoKgAsignados(Number(asignacionActual.pedido_id));
  const maxPedido = round2(totalAsignadoPedido - Number(asignacionActual.kg_asignados ?? 0) + kgAsignados);
  if (maxPedido > Number(pedido.kg_solicitados) + 0.01) {
    redirectWithMessage("error", "Con ese cambio excede los kg solicitados del pedido.");
  }

  const subtotal = round2(kgAsignados * precioKg);
  const { error } = await supabase
    .from("pedido_asignaciones")
    .update({
      kg_asignados: round2(kgAsignados),
      precio_kg: round2(precioKg),
      subtotal,
      fecha_asignacion: fechaAsignacion,
      observaciones: getField(formData, "observaciones") || null,
    })
    .eq("id", asignacionId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  const deltaKg = round2(kgAsignados - Number(asignacionActual.kg_asignados ?? 0));
  if (Math.abs(deltaKg) > 0.0001) {
    const { error: kardexError } = await supabase.from("kardex").insert({
      tipo_kardex: "producto",
      tipo_movimiento: "salida",
      origen: "ajuste",
      origen_id: asignacionId,
      origen_numero: pedido.numero_pedido,
      lote_id: Number(asignacionActual.lote_id),
      categoria_id: Number(asignacionActual.categoria_id),
      peso_kg: deltaKg,
      persona_id: pedido.cliente_id,
      concepto: `Ajuste asignación pedido ${pedido.numero_pedido}`,
      observaciones: "Edición de asignación",
    });
    if (kardexError) {
      redirectWithMessage("error", `Asignación editada, pero falló kardex: ${kardexError.message}`);
    }
  }

  await recalculateAndUpdatePedidoEstado(Number(asignacionActual.pedido_id));
  await recalculateAndUpdateLoteEstado(Number(asignacionActual.lote_id));

  revalidatePath("/pedidos");
  revalidatePath("/almacen");
  redirectWithMessage("ok", "Asignación actualizada correctamente.");
}

export async function deleteAsignacionPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const asignacionId = Number(getField(formData, "asignacion_id"));
  if (!asignacionId || Number.isNaN(asignacionId)) {
    redirectWithMessage("error", "Asignación inválida para quitar.");
  }

  const supabase = getSupabaseServerClient();
  const { data: asignacionActual } = await supabase
    .from("pedido_asignaciones")
    .select("id,pedido_id,lote_id,categoria_id,kg_asignados")
    .eq("id", asignacionId)
    .maybeSingle();

  if (!asignacionActual) {
    redirectWithMessage("error", "No se encontró la asignación.");
  }

  const pedido = await getPedidoById(Number(asignacionActual.pedido_id));

  const { error } = await supabase.from("pedido_asignaciones").delete().eq("id", asignacionId);
  if (error) {
    redirectWithMessage("error", error.message);
  }

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "producto",
    tipo_movimiento: "salida",
    origen: "ajuste",
    origen_id: asignacionId,
    origen_numero: pedido?.numero_pedido ?? String(asignacionId),
    lote_id: Number(asignacionActual.lote_id),
    categoria_id: Number(asignacionActual.categoria_id),
    peso_kg: round2(-Number(asignacionActual.kg_asignados ?? 0)),
    persona_id: pedido?.cliente_id ?? null,
    concepto: `Anulación asignación pedido ${pedido?.numero_pedido ?? asignacionId}`,
    observaciones: "Se quitó asignación",
  });

  if (kardexError) {
    redirectWithMessage("error", `Asignación eliminada, pero falló kardex: ${kardexError.message}`);
  }

  await recalculateAndUpdatePedidoEstado(Number(asignacionActual.pedido_id));
  await recalculateAndUpdateLoteEstado(Number(asignacionActual.lote_id));

  revalidatePath("/pedidos");
  revalidatePath("/almacen");
  redirectWithMessage("ok", "Asignación eliminada correctamente.");
}
