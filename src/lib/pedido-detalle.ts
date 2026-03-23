import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient;

type MaybePostgrestError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

export type PedidoCompatRow = {
  id: number;
  categoria_id: number | null;
  kg_solicitados: number;
  precio_kg: number;
  observaciones: string | null;
};

export type PedidoDetalleLine = {
  id: number;
  pedido_id: number;
  categoria_id: number;
  categoria_nombre: string;
  categoria_codigo: string;
  kg_solicitados: number;
  precio_kg: number;
  kg_asignados: number;
  prioridad: number;
  permite_sustitucion: boolean;
  observaciones: string | null;
  requiere_revision: boolean;
};

export type PedidoDetalleInput = {
  client_key: string;
  categoria_id: number;
  kg_solicitados: number;
  precio_kg: number;
  prioridad: number;
  permite_sustitucion: boolean;
  observaciones: string | null;
};

type PedidoDetalleDbRow = {
  id: number;
  pedido_id: number;
  categoria_id: number;
  kg_solicitados: number;
  precio_kg: number;
  kg_asignados?: number | null;
  prioridad?: number | null;
  permite_sustitucion?: boolean | null;
  observaciones?: string | null;
  requiere_revision?: boolean | null;
};

type CategoriaMini = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildErrorText(error: MaybePostgrestError) {
  return `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
}

function isMissingPedidoDetalleTable(error: MaybePostgrestError) {
  const text = buildErrorText(error);
  return (
    text.includes("pedido_detalle") &&
    (text.includes("does not exist") || text.includes("not found") || text.includes("42p01") || text.includes("pgrst205"))
  );
}

function buildPedidoDetalleMissingMessage() {
  return "Falta la tabla pedido_detalle en este entorno. Ejecuta la migracion SQL del modulo 3 antes de usar el nuevo editor de pedidos.";
}

export function extractLegacyCategoriaIds(observaciones: string | null) {
  const match = (observaciones ?? "").match(/\[CATS:([^\]]+)\]/);
  if (!match) return [] as number[];

  return match[1]
    .split(",")
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function buildPedidoObservacionesLegacyFallback(observacionesInput: string, categoriaIds: number[]) {
  const clean = (observacionesInput || "").replace(/\s*\[CATS:[^\]]*\]\s*/g, "").trim();
  if (categoriaIds.length === 0) return clean || null;
  const marker = `[CATS:${categoriaIds.join(",")}]`;
  return clean ? `${clean} ${marker}` : marker;
}

export function extractPedidoDetalleForm(formData: FormData) {
  const keys = formData
    .getAll("detalle_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const lines: PedidoDetalleInput[] = [];

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);

    const categoriaId = Number(String(formData.get(`detalle_categoria_id_${key}`) ?? "0"));
    const kgSolicitados = Number(String(formData.get(`detalle_kg_solicitados_${key}`) ?? "0").replace(",", "."));
    const precioKg = Number(String(formData.get(`detalle_precio_kg_${key}`) ?? "0").replace(",", "."));
    const prioridad = Number(String(formData.get(`detalle_prioridad_${key}`) ?? lines.length + 1));
    const permiteSustitucion = String(formData.get(`detalle_permite_sustitucion_${key}`) ?? "0") === "1";
    const observaciones = String(formData.get(`detalle_observaciones_${key}`) ?? "").trim() || null;

    if (!Number.isFinite(categoriaId) || categoriaId <= 0) continue;
    if (!Number.isFinite(kgSolicitados) || kgSolicitados <= 0) continue;
    if (!Number.isFinite(precioKg) || precioKg <= 0) continue;

    lines.push({
      client_key: key,
      categoria_id: categoriaId,
      kg_solicitados: round2(kgSolicitados),
      precio_kg: round2(precioKg),
      prioridad: Number.isFinite(prioridad) && prioridad > 0 ? Math.round(prioridad) : lines.length + 1,
      permite_sustitucion: permiteSustitucion,
      observaciones,
    });
  }

  return lines;
}

async function loadCategoriasMini(supabase: DbClient, categoriaIds: number[]) {
  if (categoriaIds.length === 0) return new Map<number, CategoriaMini>();

  const { data } = await supabase.from("categorias").select("id,nombre,codigo").in("id", categoriaIds);
  return new Map<number, CategoriaMini>((data ?? []).map((row) => [Number(row.id), row as CategoriaMini]));
}

function buildLegacyLines(pedido: PedidoCompatRow | null, categoriasMap: Map<number, CategoriaMini>) {
  if (!pedido) return [] as PedidoDetalleLine[];

  const categoriaIds = pedido.categoria_id
    ? [Number(pedido.categoria_id)]
    : extractLegacyCategoriaIds(pedido.observaciones);

  if (categoriaIds.length === 0) return [] as PedidoDetalleLine[];

  if (categoriaIds.length === 1) {
    const categoriaId = Number(categoriaIds[0]);
    const categoria = categoriasMap.get(categoriaId);
    return [{
      id: -categoriaId,
      pedido_id: Number(pedido.id),
      categoria_id: categoriaId,
      categoria_nombre: categoria?.nombre ?? `Categoria ${categoriaId}`,
      categoria_codigo: categoria?.codigo ? String(categoria.codigo) : String(categoriaId),
      kg_solicitados: round2(Number(pedido.kg_solicitados ?? 0)),
      precio_kg: round2(Number(pedido.precio_kg ?? 0)),
      kg_asignados: 0,
      prioridad: 1,
      permite_sustitucion: false,
      observaciones: null,
      requiere_revision: false,
    }];
  }

  return categoriaIds.map((categoriaId, index) => {
    const categoria = categoriasMap.get(Number(categoriaId));
    return {
      id: -(index + 1),
      pedido_id: Number(pedido.id),
      categoria_id: Number(categoriaId),
      categoria_nombre: categoria?.nombre ?? `Categoria ${categoriaId}`,
      categoria_codigo: categoria?.codigo ? String(categoria.codigo) : String(categoriaId),
      kg_solicitados: 0,
      precio_kg: round2(Number(pedido.precio_kg ?? 0)),
      kg_asignados: 0,
      prioridad: index + 1,
      permite_sustitucion: false,
      observaciones: "Migrado desde [CATS] sin reparto exacto. Revisar pedido.",
      requiere_revision: true,
    };
  });
}

export async function loadPedidoDetalleCompat(supabase: DbClient, pedido: PedidoCompatRow | null) {
  if (!pedido) return [] as PedidoDetalleLine[];

  const { data, error } = await supabase
    .from("pedido_detalle")
    .select("id,pedido_id,categoria_id,kg_solicitados,precio_kg,kg_asignados,prioridad,permite_sustitucion,observaciones,requiere_revision")
    .eq("pedido_id", Number(pedido.id))
    .order("prioridad", { ascending: true })
    .order("id", { ascending: true });

  if (error && !isMissingPedidoDetalleTable(error)) {
    throw new Error(error.message);
  }

  if (!error && (data ?? []).length > 0) {
    const rows = (data ?? []) as PedidoDetalleDbRow[];
    const categoriasMap = await loadCategoriasMini(supabase, rows.map((row) => Number(row.categoria_id)));
    return rows.map((row, index) => {
      const categoria = categoriasMap.get(Number(row.categoria_id));
      return {
        id: Number(row.id),
        pedido_id: Number(row.pedido_id),
        categoria_id: Number(row.categoria_id),
        categoria_nombre: categoria?.nombre ?? `Categoria ${row.categoria_id}`,
        categoria_codigo: categoria?.codigo ? String(categoria.codigo) : String(row.categoria_id),
        kg_solicitados: round2(Number(row.kg_solicitados ?? 0)),
        precio_kg: round2(Number(row.precio_kg ?? 0)),
        kg_asignados: round2(Number(row.kg_asignados ?? 0)),
        prioridad: Number(row.prioridad ?? index + 1),
        permite_sustitucion: Boolean(row.permite_sustitucion),
        observaciones: row.observaciones ? String(row.observaciones) : null,
        requiere_revision: Boolean(row.requiere_revision),
      };
    });
  }

  const categoriaIds = pedido.categoria_id ? [Number(pedido.categoria_id)] : extractLegacyCategoriaIds(pedido.observaciones);
  const categoriasMap = await loadCategoriasMini(supabase, categoriaIds);
  return buildLegacyLines(pedido, categoriasMap);
}

export async function loadPedidoDetalleByPedidosCompat(supabase: DbClient, pedidos: PedidoCompatRow[]) {
  const result = new Map<number, PedidoDetalleLine[]>();
  if (pedidos.length === 0) return result;

  const pedidoIds = pedidos.map((pedido) => Number(pedido.id));
  const { data, error } = await supabase
    .from("pedido_detalle")
    .select("id,pedido_id,categoria_id,kg_solicitados,precio_kg,kg_asignados,prioridad,permite_sustitucion,observaciones,requiere_revision")
    .in("pedido_id", pedidoIds)
    .order("prioridad", { ascending: true })
    .order("id", { ascending: true });

  if (error && !isMissingPedidoDetalleTable(error)) {
    throw new Error(error.message);
  }

  if (!error) {
    const rows = (data ?? []) as PedidoDetalleDbRow[];
    const categoriasMap = await loadCategoriasMini(supabase, rows.map((row) => Number(row.categoria_id)));

    for (const pedido of pedidos) {
      result.set(Number(pedido.id), []);
    }

    for (const row of rows) {
      const pedidoId = Number(row.pedido_id);
      const categoria = categoriasMap.get(Number(row.categoria_id));
      const current = result.get(pedidoId) ?? [];
      current.push({
        id: Number(row.id),
        pedido_id: pedidoId,
        categoria_id: Number(row.categoria_id),
        categoria_nombre: categoria?.nombre ?? `Categoria ${row.categoria_id}`,
        categoria_codigo: categoria?.codigo ? String(categoria.codigo) : String(row.categoria_id),
        kg_solicitados: round2(Number(row.kg_solicitados ?? 0)),
        precio_kg: round2(Number(row.precio_kg ?? 0)),
        kg_asignados: round2(Number(row.kg_asignados ?? 0)),
        prioridad: Number(row.prioridad ?? current.length + 1),
        permite_sustitucion: Boolean(row.permite_sustitucion),
        observaciones: row.observaciones ? String(row.observaciones) : null,
        requiere_revision: Boolean(row.requiere_revision),
      });
      result.set(pedidoId, current);
    }
  }

  for (const pedido of pedidos) {
    const pedidoId = Number(pedido.id);
    if ((result.get(pedidoId) ?? []).length === 0) {
      result.set(pedidoId, await loadPedidoDetalleCompat(supabase, pedido));
    }
  }

  return result;
}

export async function replacePedidoDetalle(supabase: DbClient, pedidoId: number, lines: PedidoDetalleInput[]) {
  const { error: deleteError } = await supabase.from("pedido_detalle").delete().eq("pedido_id", pedidoId);
  if (deleteError) {
    if (isMissingPedidoDetalleTable(deleteError)) {
      throw new Error(buildPedidoDetalleMissingMessage());
    }
    throw new Error(deleteError.message);
  }

  if (lines.length === 0) return;

  const payload = lines.map((line, index) => ({
    pedido_id: pedidoId,
    categoria_id: line.categoria_id,
    kg_solicitados: round2(line.kg_solicitados),
    precio_kg: round2(line.precio_kg),
    kg_asignados: 0,
    prioridad: Number.isFinite(line.prioridad) && line.prioridad > 0 ? line.prioridad : index + 1,
    permite_sustitucion: line.permite_sustitucion,
    observaciones: line.observaciones,
    requiere_revision: false,
  }));

  const { error: insertError } = await supabase.from("pedido_detalle").insert(payload);
  if (insertError) {
    if (isMissingPedidoDetalleTable(insertError)) {
      throw new Error(buildPedidoDetalleMissingMessage());
    }
    throw new Error(insertError.message);
  }
}

export async function syncPedidoDetalleAsignado(supabase: DbClient, pedidoId: number) {
  const { data: detailData, error: detailError } = await supabase.from("pedido_detalle").select("id,categoria_id").eq("pedido_id", pedidoId);
  if (detailError) {
    if (isMissingPedidoDetalleTable(detailError)) return;
    throw new Error(detailError.message);
  }

  const detailRows = (detailData ?? []) as Array<{ id: number; categoria_id: number }>;
  if (detailRows.length === 0) return;

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("pedido_asignaciones")
    .select("pedido_detalle_id,categoria_id,kg_asignados")
    .eq("pedido_id", pedidoId);

  if (asignacionesError) {
    throw new Error(asignacionesError.message);
  }

  const byDetalleId = new Map<number, number>();
  const firstDetalleByCategoria = new Map<number, number>();
  for (const detail of detailRows) {
    if (!firstDetalleByCategoria.has(Number(detail.categoria_id))) {
      firstDetalleByCategoria.set(Number(detail.categoria_id), Number(detail.id));
    }
  }

  for (const row of asignaciones ?? []) {
    const explicitId = Number(row.pedido_detalle_id ?? 0);
    const targetDetalleId = explicitId > 0 ? explicitId : firstDetalleByCategoria.get(Number(row.categoria_id)) ?? 0;
    if (!targetDetalleId) continue;
    byDetalleId.set(targetDetalleId, round2((byDetalleId.get(targetDetalleId) ?? 0) + Number(row.kg_asignados ?? 0)));
  }

  for (const detail of detailRows) {
    const kgAsignados = byDetalleId.get(Number(detail.id)) ?? 0;
    const { error: updateError } = await supabase.from("pedido_detalle").update({ kg_asignados: kgAsignados }).eq("id", Number(detail.id));
    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function resolvePedidoEstadoFromDetalle(supabase: DbClient, pedidoId: number) {
  const { data, error } = await supabase.from("pedido_detalle").select("kg_solicitados,kg_asignados").eq("pedido_id", pedidoId);
  if (error) {
    if (isMissingPedidoDetalleTable(error)) return null;
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  let hasAssigned = false;
  let allComplete = true;
  let totalSolicitado = 0;

  for (const row of rows) {
    const solicitado = round2(Number(row.kg_solicitados ?? 0));
    const asignado = round2(Number(row.kg_asignados ?? 0));
    totalSolicitado += solicitado;
    if (asignado > 0.01) {
      hasAssigned = true;
    }
    if (asignado < solicitado - 0.01) {
      allComplete = false;
    }
  }

  if (totalSolicitado <= 0.01) return null;
  if (allComplete) return "completado" as const;
  if (hasAssigned) return "en_proceso" as const;
  return "pendiente" as const;
}

export function summarizePedidoDetalle(lines: PedidoDetalleLine[]) {
  const kgSolicitados = round2(lines.reduce((acc, line) => acc + Number(line.kg_solicitados ?? 0), 0));
  const kgAsignados = round2(lines.reduce((acc, line) => acc + Number(line.kg_asignados ?? 0), 0));
  const totalEstimado = round2(lines.reduce((acc, line) => acc + Number(line.kg_solicitados ?? 0) * Number(line.precio_kg ?? 0), 0));

  return {
    kgSolicitados,
    kgAsignados,
    totalEstimado,
  };
}

export function buildPedidoDetalleLabel(lines: PedidoDetalleLine[]) {
  if (lines.length === 0) return "Sin detalle";
  if (lines.length === 1) return lines[0].categoria_nombre;

  const names = lines.slice(0, 3).map((line) => line.categoria_nombre);
  const suffix = lines.length > 3 ? ` +${lines.length - 3}` : "";
  return `${names.join(", ")}${suffix}`;
}
