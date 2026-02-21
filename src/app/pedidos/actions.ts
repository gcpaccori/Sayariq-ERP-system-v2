"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const { data, error } = await supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .eq("estado", "activo")
    .maybeSingle();

  return !error && !!data;
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

export async function createPedidoAction(formData: FormData) {
  const clienteId = Number(getField(formData, "cliente_id"));
  const producto = getField(formData, "producto") as Producto;
  const categoriaIdRaw = Number(getField(formData, "categoria_id") || "0");
  const categoriaId = categoriaIdRaw > 0 ? categoriaIdRaw : null;
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

  if (categoriaId) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaId);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "La categoría seleccionada no existe o está inactiva.");
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
    observaciones: getField(formData, "observaciones") || null,
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

export async function asignarLotePedidoAction(formData: FormData) {
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

  if (pedido.categoria_id && Number(pedido.categoria_id) !== categoriaId) {
    redirectWithMessage("error", "La categoría asignada no coincide con la categoría del pedido.");
  }

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
