"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureWriteAccess } from "@/lib/auth/server";
import { ensureCategoriaActivaCompat } from "@/lib/categorias";
import { getClasificacionVigenteErrorMessage } from "@/lib/lote-clasificacion-vigente";
import {
  extractPedidoDetalleForm,
  replacePedidoDetalle,
  resolvePedidoEstadoFromDetalle,
  summarizePedidoDetalle,
  syncPedidoDetalleAsignado,
  type PedidoCompatRow,
} from "@/lib/pedido-detalle";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Producto = "Jengibre" | "Curcuma";

type Pedido = PedidoCompatRow & {
  numero_pedido: string;
  cliente_id: number;
  producto: string;
  precio_kg: number;
  total_estimado: number;
  fecha_pedido: string;
  fecha_entrega: string | null;
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado";
};

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  categoria_id: number | null;
  peso_bruto_ingreso: number;
  estado: "sin_clasificar" | "clasificado" | "asignado" | "liquidado" | "cancelado";
};

type PedidoAsignacion = {
  id: number;
  pedido_id: number;
  pedido_detalle_id: number | null;
  lote_id: number;
  categoria_id: number;
  sin_clasificacion_neta: boolean;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
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
    .select(
      "id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,precio_kg,total_estimado,fecha_pedido,fecha_entrega,estado,observaciones",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  return (data ?? null) as Pedido | null;
}

async function getLoteById(loteId: number): Promise<Lote | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,producto,categoria_id,peso_bruto_ingreso,estado")
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

async function getPedidoAsignacionById(asignacionId: number): Promise<PedidoAsignacion | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedido_asignaciones")
    .select("id,pedido_id,pedido_detalle_id,lote_id,categoria_id,sin_clasificacion_neta,kg_asignados,precio_kg,subtotal,fecha_asignacion")
    .eq("id", asignacionId)
    .maybeSingle();

  return (data ?? null) as PedidoAsignacion | null;
}

async function getPedidoDetalleMap(pedidoId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedido_detalle")
    .select("id,categoria_id,kg_solicitados,kg_asignados,permite_sustitucion")
    .eq("pedido_id", pedidoId)
    .order("prioridad", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map<
    number,
    {
      id: number;
      categoria_id: number;
      kg_solicitados: number;
      kg_asignados: number;
      permite_sustitucion: boolean;
    }
  >();

  for (const row of data ?? []) {
    byId.set(Number(row.id), {
      id: Number(row.id),
      categoria_id: Number(row.categoria_id),
      kg_solicitados: round2(Number(row.kg_solicitados ?? 0)),
      kg_asignados: round2(Number(row.kg_asignados ?? 0)),
      permite_sustitucion: Boolean(row.permite_sustitucion),
    });
  }

  return byId;
}

async function getRawAssignedKgForLote(loteId: number, excludingAsignacionId?: number) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("pedido_asignaciones")
    .select("id,kg_asignados")
    .eq("lote_id", loteId)
    .eq("sin_clasificacion_neta", true);

  if (excludingAsignacionId && excludingAsignacionId > 0) {
    query = query.neq("id", excludingAsignacionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return round2((data ?? []).reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0));
}

async function getClassifiedAssignedMapForLote(loteId: number, excludingAsignacionId?: number) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("pedido_asignaciones")
    .select("id,categoria_id,kg_asignados")
    .eq("lote_id", loteId)
    .eq("sin_clasificacion_neta", false);

  if (excludingAsignacionId && excludingAsignacionId > 0) {
    query = query.neq("id", excludingAsignacionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`No se pudieron cargar las asignaciones actuales: ${error.message}`);
  }

  const byCategoria = new Map<number, number>();
  let total = 0;
  for (const row of data ?? []) {
    const categoriaId = Number(row.categoria_id);
    const kg = Number(row.kg_asignados ?? 0);
    total += kg;
    byCategoria.set(categoriaId, round2((byCategoria.get(categoriaId) ?? 0) + kg));
  }

  return { byCategoria, total: round2(total) };
}

async function getClasificacionVigenteByLote(loteId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("lote_id,categoria_id,peso_neto")
    .eq("lote_id", loteId);

  if (error) {
    throw new Error(getClasificacionVigenteErrorMessage(error));
  }

  return (data ?? []).map((row) => ({
    lote_id: Number(row.lote_id),
    categoria_id: Number(row.categoria_id),
    peso_neto: round2(Number(row.peso_neto ?? 0)),
  }));
}
async function getStockDisponibleLoteCategoria(loteId: number, categoriaId: number, excludingAsignacionId?: number) {
  const clasificaciones = await getClasificacionVigenteByLote(loteId);
  if (clasificaciones.length === 0) {
    return { stock: 0, errorMessage: "" };
  }

  const categoriaRow = clasificaciones.find((row) => Number(row.categoria_id) === categoriaId);
  if (!categoriaRow) {
    return { stock: 0, errorMessage: "" };
  }

  const rawAsignado = await getRawAssignedKgForLote(loteId, excludingAsignacionId);
  const asignadoClasificado = await getClassifiedAssignedMapForLote(loteId, excludingAsignacionId);
  const totalNeto = round2(clasificaciones.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0));
  const disponibleGlobal = round2(totalNeto - asignadoClasificado.total - rawAsignado);
  const disponibleCategoria = round2(
    Number(categoriaRow.peso_neto ?? 0) - (asignadoClasificado.byCategoria.get(categoriaId) ?? 0),
  );

  return {
    stock: round2(Math.max(0, Math.min(disponibleCategoria, disponibleGlobal))),
    errorMessage: "",
  };
}

async function getStockDisponibleLoteSinClasificacion(loteId: number, excludingAsignacionId?: number) {
  const lote = await getLoteById(loteId);
  if (!lote) {
    throw new Error("El lote no existe.");
  }

  const rawAsignado = await getRawAssignedKgForLote(loteId, excludingAsignacionId);
  return round2(Math.max(0, Number(lote.peso_bruto_ingreso ?? 0) - rawAsignado));
}

async function recalculateAndUpdateLoteEstado(loteId: number) {
  const supabase = getSupabaseServerClient();
  const lote = await getLoteById(loteId);
  if (!lote) {
    return "No se encontro el lote para recalcular estado.";
  }

  let clasificaciones: Array<{ categoria_id: number; peso_neto: number }> = [];
  try {
    clasificaciones = await getClasificacionVigenteByLote(loteId);
  } catch (error) {
    return error instanceof Error ? error.message : "No se pudo consultar la clasificacion vigente.";
  }

  if (clasificaciones.length === 0) {
    try {
      const rawAsignado = await getRawAssignedKgForLote(loteId);
      const restanteBruto = round2(Number(lote.peso_bruto_ingreso ?? 0) - rawAsignado);
      const estadoNuevo = restanteBruto <= 0.01 ? "asignado" : "sin_clasificar";
      const { error: updateError } = await supabase.from("lotes").update({ estado: estadoNuevo }).eq("id", loteId);
      return updateError?.message ?? "";
    } catch (error) {
      return error instanceof Error ? error.message : "No se pudo consultar el stock bruto asignado.";
    }
  }

  try {
    const rawAsignado = await getRawAssignedKgForLote(loteId);
    const asignadoClasificado = await getClassifiedAssignedMapForLote(loteId);
    const totalNeto = round2(clasificaciones.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0));
    const disponibleGlobal = round2(totalNeto - asignadoClasificado.total - rawAsignado);
    const estadoNuevo = disponibleGlobal > 0.01 ? "clasificado" : "asignado";
    const { error: updateError } = await supabase.from("lotes").update({ estado: estadoNuevo }).eq("id", loteId);
    return updateError?.message ?? "";
  } catch (error) {
    return error instanceof Error ? error.message : "No se pudo recalcular el estado del lote.";
  }
}

async function recalculateAndUpdatePedidoEstado(pedidoId: number) {
  const supabase = getSupabaseServerClient();
  const pedido = await getPedidoById(pedidoId);
  if (!pedido || pedido.estado === "cancelado") return;

  const estadoPorDetalle = await resolvePedidoEstadoFromDetalle(supabase, pedidoId);
  if (estadoPorDetalle) {
    await supabase.from("pedidos").update({ estado: estadoPorDetalle }).eq("id", pedidoId);
    return;
  }

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

async function validatePedidoHeaderAndDetalle(formData: FormData) {
  const clienteId = Number(getField(formData, "cliente_id"));
  const producto = getField(formData, "producto") as Producto;
  const fechaPedido = getField(formData, "fecha_pedido");
  const fechaEntrega = getField(formData, "fecha_entrega") || null;
  const observaciones = getField(formData, "observaciones") || null;
  const detalle = extractPedidoDetalleForm(formData);

  if (!clienteId || Number.isNaN(clienteId)) {
    redirectWithMessage("error", "Selecciona un cliente valido.");
  }

  const productosValidos: Producto[] = ["Jengibre", "Curcuma"];
  if (!productosValidos.includes(producto)) {
    redirectWithMessage("error", "Producto invalido. Solo se permite Jengibre o Curcuma.");
  }

  if (!fechaPedido) {
    redirectWithMessage("error", "La fecha del pedido es obligatoria.");
  }

  if (detalle.length === 0) {
    redirectWithMessage("error", "Debes registrar al menos una linea valida con categoria, kg y precio.");
  }

  const categoriaIds = detalle.map((line) => Number(line.categoria_id));
  if (new Set(categoriaIds).size !== categoriaIds.length) {
    redirectWithMessage("error", "No repitas la misma categoria en dos lineas del pedido.");
  }

  const isCliente = await ensureCliente(clienteId);
  if (!isCliente) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol cliente.");
  }

  for (const categoriaId of categoriaIds) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaId);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "Una categoria seleccionada no existe o esta inactiva.");
    }
  }

  const resumen = summarizePedidoDetalle(
    detalle.map((line, index) => ({
      id: index + 1,
      pedido_id: 0,
      categoria_id: line.categoria_id,
      categoria_nombre: "",
      categoria_codigo: "",
      kg_solicitados: line.kg_solicitados,
      precio_kg: line.precio_kg,
      kg_asignados: 0,
      prioridad: line.prioridad,
      permite_sustitucion: line.permite_sustitucion,
      observaciones: line.observaciones,
      requiere_revision: false,
    })),
  );

  const precioPromedio = resumen.kgSolicitados > 0 ? round2(resumen.totalEstimado / resumen.kgSolicitados) : 0;

  return {
    clienteId,
    producto,
    fechaPedido,
    fechaEntrega,
    observaciones,
    detalle,
    resumen,
    precioPromedio,
  };
}

async function rebindAsignacionesDetalle(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  pedidoId: number,
  targetCategoriaByAsignacionId?: Map<number, number>,
) {
  const { data: detailRows, error: detailError } = await supabase
    .from("pedido_detalle")
    .select("id,categoria_id")
    .eq("pedido_id", pedidoId);

  if (detailError) {
    throw new Error(detailError.message);
  }

  const detailByCategoria = new Map<number, number>();
  for (const row of detailRows ?? []) {
    detailByCategoria.set(Number(row.categoria_id), Number(row.id));
  }

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("pedido_asignaciones")
    .select("id,categoria_id,pedido_detalle_id")
    .eq("pedido_id", pedidoId);

  if (asignacionesError) {
    throw new Error(asignacionesError.message);
  }

  for (const row of asignaciones ?? []) {
    const categoriaId = targetCategoriaByAsignacionId?.get(Number(row.id)) ?? Number(row.categoria_id);
    const detalleId = detailByCategoria.get(categoriaId) ?? null;
    if (!detalleId) continue;
    if (Number(row.pedido_detalle_id ?? 0) === detalleId) continue;

    const { error: updateError } = await supabase
      .from("pedido_asignaciones")
      .update({ pedido_detalle_id: detalleId })
      .eq("id", Number(row.id));

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}
export async function createPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const { clienteId, producto, fechaPedido, fechaEntrega, observaciones, detalle, resumen, precioPromedio } =
    await validatePedidoHeaderAndDetalle(formData);

  const numeroPedido = getField(formData, "numero_pedido") || (await buildNumeroPedido());
  const categoriaId = detalle.length === 1 ? detalle[0].categoria_id : null;

  const payload = {
    numero_pedido: numeroPedido,
    cliente_id: clienteId,
    producto,
    categoria_id: categoriaId,
    kg_solicitados: resumen.kgSolicitados,
    precio_kg: precioPromedio,
    total_estimado: resumen.totalEstimado,
    fecha_pedido: fechaPedido,
    fecha_entrega: fechaEntrega,
    observaciones,
    estado: "pendiente",
  };

  const supabase = getSupabaseServerClient();
  const { data: pedidoCreado, error } = await supabase
    .from("pedidos")
    .insert(payload)
    .select("id,numero_pedido")
    .single();

  if (error || !pedidoCreado) {
    redirectWithMessage("error", error?.message ?? "No se pudo crear el pedido.");
  }

  try {
    await replacePedidoDetalle(supabase, Number(pedidoCreado.id), detalle);
  } catch (detailError) {
    const message = detailError instanceof Error ? detailError.message : "No se pudo guardar el detalle del pedido.";
    redirectWithMessage("error", message);
  }

  revalidatePath("/pedidos");
  redirectWithMessage("ok", `Pedido ${pedidoCreado.numero_pedido} creado correctamente.`);
}

export async function updatePedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const pedidoId = Number(getField(formData, "pedido_id"));
  if (!pedidoId || Number.isNaN(pedidoId)) {
    redirectWithMessage("error", "Pedido invalido para editar.");
  }

  const { clienteId, producto, fechaPedido, fechaEntrega, observaciones, detalle, resumen, precioPromedio } =
    await validatePedidoHeaderAndDetalle(formData);

  const supabase = getSupabaseServerClient();
  const pedido = await getPedidoById(pedidoId);
  if (!pedido) {
    redirectWithMessage("error", "El pedido no existe.");
  }

  if (pedido.estado === "cancelado") {
    redirectWithMessage("error", "No se puede editar un pedido cancelado.");
  }

  const { data: asignacionesExistentes, error: asignacionesError } = await supabase
    .from("pedido_asignaciones")
    .select("id,categoria_id,pedido_detalle_id")
    .eq("pedido_id", pedidoId);

  if (asignacionesError) {
    redirectWithMessage("error", asignacionesError.message);
  }

  const categoriasNuevas = new Set(detalle.map((line) => Number(line.categoria_id)));
  const detalleActualMap = await getPedidoDetalleMap(pedidoId);
  const targetCategoriaByAsignacionId = new Map<number, number>();
  for (const row of asignacionesExistentes ?? []) {
    const detalleId = Number(row.pedido_detalle_id ?? 0);
    const categoriaId = Number(row.categoria_id);
    if (detalleId > 0) {
      const detalleActual = detalleActualMap.get(detalleId);
      if (detalleActual) {
        targetCategoriaByAsignacionId.set(Number(row.id), Number(detalleActual.categoria_id));
      }
    }
    if (detalleId <= 0 && !categoriasNuevas.has(categoriaId)) {
      redirectWithMessage(
        "error",
        "Hay asignaciones antiguas ligadas a categorias que ya no estan en el pedido. Ajustalas primero o conserva esa linea.",
      );
    }
  }

  const categoriaId = detalle.length === 1 ? detalle[0].categoria_id : null;
  const { error } = await supabase
    .from("pedidos")
    .update({
      cliente_id: clienteId,
      producto,
      categoria_id: categoriaId,
      kg_solicitados: resumen.kgSolicitados,
      precio_kg: precioPromedio,
      total_estimado: resumen.totalEstimado,
      fecha_pedido: fechaPedido,
      fecha_entrega: fechaEntrega,
      observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .neq("estado", "cancelado");

  if (error) {
    redirectWithMessage("error", error.message);
  }

  try {
    await replacePedidoDetalle(supabase, pedidoId, detalle);
    await rebindAsignacionesDetalle(supabase, pedidoId, targetCategoriaByAsignacionId);
    await syncPedidoDetalleAsignado(supabase, pedidoId);
    await recalculateAndUpdatePedidoEstado(pedidoId);
  } catch (detailError) {
    const message = detailError instanceof Error ? detailError.message : "No se pudo actualizar el detalle del pedido.";
    redirectWithMessage("error", message);
  }

  revalidatePath("/pedidos");
  redirectWithMessage("ok", `Pedido ${pedido.numero_pedido} actualizado correctamente.`);
}
export async function asignarLotePedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const pedidoId = Number(getField(formData, "pedido_id"));
  const pedidoDetalleId = Number(getField(formData, "pedido_detalle_id"));
  const loteId = Number(getField(formData, "lote_id"));
  const categoriaOrigenId = Number(getField(formData, "categoria_id"));
  const categoriaDestinoId = Number(getField(formData, "categoria_destino_id") || getField(formData, "categoria_id"));
  const sinClasificacionNeta = getField(formData, "sin_clasificacion_neta") === "1";
  const kgAsignados = toDecimal(getField(formData, "kg_asignados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaAsignacion = getField(formData, "fecha_asignacion");
  const categoriaRegistroId = categoriaOrigenId > 0 ? categoriaOrigenId : categoriaDestinoId;

  if (!pedidoId || !loteId || !categoriaDestinoId) {
    redirectWithMessage("error", "Datos invalidos para la asignacion.");
  }

  if (Number.isNaN(kgAsignados) || Number.isNaN(precioKg) || kgAsignados <= 0 || precioKg <= 0 || !fechaAsignacion) {
    redirectWithMessage("error", "Kg asignados, precio y fecha de asignacion son obligatorios y validos.");
  }

  const pedido = await getPedidoById(pedidoId);
  if (!pedido) {
    redirectWithMessage("error", "El pedido no existe.");
  }

  if (pedido.estado === "cancelado") {
    redirectWithMessage("error", "No se puede asignar un pedido cancelado.");
  }

  if (pedido.estado === "completado") {
    redirectWithMessage("error", "El pedido ya esta completado.");
  }

  const categoriaDestinoValida = await ensureCategoriaActiva(categoriaDestinoId);
  if (!categoriaDestinoValida) {
    redirectWithMessage("error", "La categoria destino no existe o esta inactiva.");
  }

  const lote = await getLoteById(loteId);
  if (!lote) {
    redirectWithMessage("error", "El lote no existe.");
  }

  if (lote.producto !== pedido.producto) {
    redirectWithMessage("error", `El lote (${lote.producto}) no coincide con el producto del pedido (${pedido.producto}).`);
  }

  if (sinClasificacionNeta) {
    if (lote.estado !== "sin_clasificar") {
      redirectWithMessage("error", "Solo puedes asignar sin clasificacion neta desde lotes que siguen en almacen sin_clasificar.");
    }
  } else if (lote.estado !== "clasificado" && lote.estado !== "asignado") {
    redirectWithMessage("error", "El lote clasificado debe estar en estado clasificado o asignado.");
  }

  let detailMap: Awaited<ReturnType<typeof getPedidoDetalleMap>>;
  try {
    detailMap = await getPedidoDetalleMap(pedidoId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle del pedido.";
    redirectWithMessage("error", message);
  }

  const detalle = pedidoDetalleId > 0 ? detailMap.get(pedidoDetalleId) : null;
  if (pedidoDetalleId > 0 && !detalle) {
    redirectWithMessage("error", "La linea del pedido ya no existe o requiere migracion.");
  }

  const pedidoKgAsignados = await getPedidoKgAsignados(pedidoId);
  const pedidoFaltante = round2(Number(pedido.kg_solicitados ?? 0) - pedidoKgAsignados);
  const pendienteLinea = detalle
    ? round2(Number(detalle.kg_solicitados ?? 0) - Number(detalle.kg_asignados ?? 0))
    : pedidoFaltante;
  if (pendienteLinea <= 0.01) {
    redirectWithMessage("error", detalle ? "Esa linea del pedido ya no tiene kg pendientes." : "El pedido ya no tiene kg pendientes.");
  }

  let stockDisponible = 0;
  try {
    if (sinClasificacionNeta) {
      stockDisponible = await getStockDisponibleLoteSinClasificacion(loteId);
    } else {
      const stockDisponibleResult = await getStockDisponibleLoteCategoria(loteId, categoriaRegistroId);
      if (stockDisponibleResult.errorMessage) {
        redirectWithMessage("error", stockDisponibleResult.errorMessage);
      }
      stockDisponible = stockDisponibleResult.stock;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular el stock disponible.";
    redirectWithMessage("error", message);
  }

  if (stockDisponible <= 0.01) {
    redirectWithMessage(
      "error",
      sinClasificacionNeta
        ? "Ese lote de almacen ya no tiene peso bruto disponible para asignar sin clasificacion neta."
        : "Ese lote/categoria no tiene stock disponible.",
    );
  }

  if (kgAsignados > stockDisponible + 0.01) {
    redirectWithMessage("error", `Kg asignados exceden stock disponible (${stockDisponible} kg).`);
  }

  if (kgAsignados > pendienteLinea + 0.01) {
    redirectWithMessage("error", `Kg asignados exceden faltante de la linea (${pendienteLinea} kg).`);
  }

  const subtotal = round2(kgAsignados * precioKg);
  const supabase = getSupabaseServerClient();
  const { data: asignacionCreada, error: insertError } = await supabase
    .from("pedido_asignaciones")
    .insert({
      pedido_id: pedidoId,
      pedido_detalle_id: pedidoDetalleId > 0 ? pedidoDetalleId : null,
      lote_id: loteId,
      categoria_id: categoriaRegistroId,
      codigo_division: null,
      sin_clasificacion_neta: sinClasificacionNeta,
      kg_asignados: round2(kgAsignados),
      precio_kg: round2(precioKg),
      subtotal,
      fecha_asignacion: fechaAsignacion,
      observaciones: getField(formData, "observaciones") || null,
    })
    .select("id")
    .single();

  if (insertError || !asignacionCreada) {
    redirectWithMessage("error", insertError?.message ?? "No se pudo registrar la asignacion.");
  }

  const codeYear = new Date().getFullYear();
  const codigoDivision = `DIV-${codeYear}-${String(asignacionCreada.id).padStart(8, "0")}`;
  const { error: codeError } = await supabase
    .from("pedido_asignaciones")
    .update({ codigo_division: codigoDivision })
    .eq("id", asignacionCreada.id);

  if (codeError) {
    redirectWithMessage("error", `Asignacion creada, pero fallo codigo de division: ${codeError.message}`);
  }

  const { data: categoriaData } = await supabase
    .from("categorias")
    .select("nombre")
    .eq("id", categoriaRegistroId)
    .maybeSingle();

  const concepto = sinClasificacionNeta
    ? `Salida lote ${lote.numero_lote} -> Pedido ${pedido.numero_pedido} sin clasificacion neta (${round2(kgAsignados)} kg)`
    : `Salida lote ${lote.numero_lote} -> Pedido ${pedido.numero_pedido} -- ${categoriaData?.nombre ?? "Categoria"}: ${round2(kgAsignados)} kg`;

  const observacionKardex =
    [getField(formData, "observaciones") || null, sinClasificacionNeta ? "Asignacion desde almacen sin clasificacion neta." : null]
      .filter(Boolean)
      .join(" | ") || null;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "producto",
    tipo_movimiento: "salida",
    origen: "asignacion_pedido",
    origen_id: asignacionCreada.id,
    origen_numero: pedido.numero_pedido,
    lote_id: loteId,
    categoria_id: categoriaRegistroId,
    peso_kg: round2(kgAsignados),
    persona_id: pedido.cliente_id,
    concepto,
    observaciones: observacionKardex,
  });

  if (kardexError) {
    redirectWithMessage("error", `Asignacion creada, pero fallo kardex: ${kardexError.message}`);
  }

  try {
    await syncPedidoDetalleAsignado(supabase, pedidoId);
    await recalculateAndUpdatePedidoEstado(pedidoId);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "No se pudo recalcular el pedido.";
    redirectWithMessage("error", message);
  }

  const loteEstadoError = await recalculateAndUpdateLoteEstado(loteId);
  if (loteEstadoError) {
    redirectWithMessage("error", `Asignacion creada, pero no se pudo recalcular el estado del lote: ${loteEstadoError}`);
  }

  revalidatePath("/pedidos");
  revalidatePath("/almacen");
  revalidatePath("/clasificacion-neta");

  redirectWithMessage(
    "ok",
    sinClasificacionNeta
      ? `Asignacion registrada desde almacen sin clasificacion neta (${round2(kgAsignados)} kg).`
      : `Asignacion registrada (${round2(kgAsignados)} kg).`,
  );
}
export async function updateAsignacionPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const asignacionId = Number(getField(formData, "asignacion_id"));
  const kgAsignados = toDecimal(getField(formData, "kg_asignados"));
  const precioKg = toDecimal(getField(formData, "precio_kg"));
  const fechaAsignacion = getField(formData, "fecha_asignacion");

  if (!asignacionId || Number.isNaN(asignacionId)) {
    redirectWithMessage("error", "Asignacion invalida para editar.");
  }

  if (Number.isNaN(kgAsignados) || Number.isNaN(precioKg) || kgAsignados <= 0 || precioKg <= 0 || !fechaAsignacion) {
    redirectWithMessage("error", "Kg, precio y fecha son obligatorios y validos.");
  }

  const asignacionActual = await getPedidoAsignacionById(asignacionId);
  if (!asignacionActual) {
    redirectWithMessage("error", "No se encontro la asignacion.");
  }

  const pedido = await getPedidoById(Number(asignacionActual.pedido_id));
  const lote = await getLoteById(Number(asignacionActual.lote_id));
  if (!pedido || !lote) {
    redirectWithMessage("error", "Pedido o lote no disponibles para actualizar asignacion.");
  }

  let detailMap: Awaited<ReturnType<typeof getPedidoDetalleMap>>;
  try {
    detailMap = await getPedidoDetalleMap(Number(asignacionActual.pedido_id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el detalle del pedido.";
    redirectWithMessage("error", message);
  }

  const detalle = detailMap.get(Number(asignacionActual.pedido_detalle_id ?? 0)) ?? null;
  const totalAsignadoPedido = await getPedidoKgAsignados(Number(asignacionActual.pedido_id));
  const pendienteMaximoLinea = detalle
    ? round2(
        Number(detalle.kg_solicitados ?? 0) - Number(detalle.kg_asignados ?? 0) + Number(asignacionActual.kg_asignados ?? 0),
      )
    : round2(Number(pedido.kg_solicitados ?? 0) - (totalAsignadoPedido - Number(asignacionActual.kg_asignados ?? 0)));
  if (kgAsignados > pendienteMaximoLinea + 0.01) {
    redirectWithMessage(
      "error",
      detalle
        ? `Con ese cambio excedes el faltante de la linea (${pendienteMaximoLinea} kg).`
        : `Con ese cambio excedes el faltante total del pedido (${pendienteMaximoLinea} kg).`,
    );
  }

  let stockMaximo = 0;
  try {
    if (asignacionActual.sin_clasificacion_neta) {
      stockMaximo = await getStockDisponibleLoteSinClasificacion(Number(asignacionActual.lote_id), asignacionId);
    } else {
      const stockSinEstaFilaResult = await getStockDisponibleLoteCategoria(
        Number(asignacionActual.lote_id),
        Number(asignacionActual.categoria_id),
        asignacionId,
      );
      if (stockSinEstaFilaResult.errorMessage) {
        redirectWithMessage("error", stockSinEstaFilaResult.errorMessage);
      }
      stockMaximo = stockSinEstaFilaResult.stock;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular el stock disponible.";
    redirectWithMessage("error", message);
  }

  stockMaximo = round2(stockMaximo + Number(asignacionActual.kg_asignados ?? 0));
  if (kgAsignados > stockMaximo + 0.01) {
    redirectWithMessage("error", `Kg asignados exceden el maximo disponible (${stockMaximo} kg).`);
  }

  const subtotal = round2(kgAsignados * precioKg);
  const supabase = getSupabaseServerClient();
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
      concepto: asignacionActual.sin_clasificacion_neta
        ? `Ajuste asignacion sin clasificacion neta pedido ${pedido.numero_pedido}`
        : `Ajuste asignacion pedido ${pedido.numero_pedido}`,
      observaciones: asignacionActual.sin_clasificacion_neta ? "Ajuste de salida desde almacen sin clasificacion neta." : "Edicion de asignacion",
    });
    if (kardexError) {
      redirectWithMessage("error", `Asignacion editada, pero fallo kardex: ${kardexError.message}`);
    }
  }

  try {
    await syncPedidoDetalleAsignado(supabase, Number(asignacionActual.pedido_id));
    await recalculateAndUpdatePedidoEstado(Number(asignacionActual.pedido_id));
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "No se pudo recalcular el pedido.";
    redirectWithMessage("error", message);
  }

  const loteEstadoError = await recalculateAndUpdateLoteEstado(Number(asignacionActual.lote_id));
  if (loteEstadoError) {
    redirectWithMessage("error", `Asignacion actualizada, pero no se pudo recalcular el estado del lote: ${loteEstadoError}`);
  }

  revalidatePath("/pedidos");
  revalidatePath("/almacen");
  revalidatePath("/clasificacion-neta");
  redirectWithMessage("ok", "Asignacion actualizada correctamente.");
}

export async function deleteAsignacionPedidoAction(formData: FormData) {
  await ensureWriteAccess("pedidos");

  const asignacionId = Number(getField(formData, "asignacion_id"));
  if (!asignacionId || Number.isNaN(asignacionId)) {
    redirectWithMessage("error", "Asignacion invalida para quitar.");
  }

  const asignacionActual = await getPedidoAsignacionById(asignacionId);
  if (!asignacionActual) {
    redirectWithMessage("error", "No se encontro la asignacion.");
  }

  const pedido = await getPedidoById(Number(asignacionActual.pedido_id));
  const supabase = getSupabaseServerClient();
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
    concepto: asignacionActual.sin_clasificacion_neta
      ? `Anulacion asignacion sin clasificacion neta ${pedido?.numero_pedido ?? asignacionId}`
      : `Anulacion asignacion pedido ${pedido?.numero_pedido ?? asignacionId}`,
    observaciones: asignacionActual.sin_clasificacion_neta ? "Se quito una asignacion desde almacen sin clasificacion neta." : "Se quito asignacion",
  });

  if (kardexError) {
    redirectWithMessage("error", `Asignacion eliminada, pero fallo kardex: ${kardexError.message}`);
  }

  try {
    await syncPedidoDetalleAsignado(supabase, Number(asignacionActual.pedido_id));
    await recalculateAndUpdatePedidoEstado(Number(asignacionActual.pedido_id));
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "No se pudo recalcular el pedido.";
    redirectWithMessage("error", message);
  }

  const loteEstadoError = await recalculateAndUpdateLoteEstado(Number(asignacionActual.lote_id));
  if (loteEstadoError) {
    redirectWithMessage("error", `Asignacion eliminada, pero no se pudo recalcular el estado del lote: ${loteEstadoError}`);
  }

  revalidatePath("/pedidos");
  revalidatePath("/almacen");
  revalidatePath("/clasificacion-neta");
  redirectWithMessage("ok", "Asignacion eliminada correctamente.");
}
