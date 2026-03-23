import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient;

type MaybePostgrestError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

type CategoriaBaseRow = {
  id: number;
  nombre: string;
  codigo?: string;
  orden?: number;
  estado?: string;
};

type CategoriaSeedRow = {
  nombre: string;
  codigo: string;
  orden: number;
  estado: "activo";
};

const DEFAULT_CATEGORIAS_SEED: CategoriaSeedRow[] = [
  { nombre: "Exportable +20 gr", codigo: "EXP20", orden: 1, estado: "activo" },
  { nombre: "Exportable", codigo: "EXP", orden: 2, estado: "activo" },
  { nombre: "Nacional", codigo: "NAC", orden: 3, estado: "activo" },
  { nombre: "Industrial", codigo: "IND", orden: 4, estado: "activo" },
  { nombre: "Al barrer", codigo: "BAR", orden: 5, estado: "activo" },
];

function buildErrorText(error: MaybePostgrestError) {
  return `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
}

function isMissingColumnError(error: MaybePostgrestError, column: string) {
  const text = buildErrorText(error);
  return text.includes(`categorias.${column}`) || text.includes(`column ${column} does not exist`) || text.includes("42703") || text.includes("pgrst204");
}

function isCategoriaEstadoColumnMissing(error: MaybePostgrestError) {
  return isMissingColumnError(error, "estado");
}

function isCategoriaOrdenColumnMissing(error: MaybePostgrestError) {
  return isMissingColumnError(error, "orden");
}

function isCategoriaCodigoColumnMissing(error: MaybePostgrestError) {
  return isMissingColumnError(error, "codigo");
}

function mapCategoriaRow<T extends Record<string, unknown>>(
  row: CategoriaBaseRow,
  index: number,
): T {
  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    codigo: String(row.codigo ?? row.nombre ?? row.id ?? ""),
    orden: Number(row.orden ?? index + 1),
    estado: String(row.estado ?? "activo"),
  } as unknown as T;
}

async function queryCategorias<T extends Record<string, unknown>>(
  supabase: DbClient,
  { selectClause, onlyActive, ordered }: { selectClause: string; onlyActive: boolean; ordered: boolean },
): Promise<{ data: T[]; error: MaybePostgrestError }> {
  let query = supabase.from("categorias").select(selectClause);

  if (onlyActive) {
    query = query.eq("estado", "activo");
  }

  if (ordered) {
    query = query.order("orden", { ascending: true });
  }

  const res = await query;
  return {
    data: ((res.data ?? []) as unknown as T[]),
    error: res.error,
  };
}

async function seedCategoriasIfPossible(supabase: DbClient) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return;
  }

  const insertAttempts = [
    DEFAULT_CATEGORIAS_SEED,
    DEFAULT_CATEGORIAS_SEED.map(({ nombre, codigo, orden }) => ({ nombre, codigo, orden })),
    DEFAULT_CATEGORIAS_SEED.map(({ nombre, codigo }) => ({ nombre, codigo })),
    DEFAULT_CATEGORIAS_SEED.map(({ nombre }) => ({ nombre })),
  ];

  for (const payload of insertAttempts) {
    const result = await supabase.from("categorias").insert(payload);
    if (!result.error) {
      return;
    }

    const canRetry =
      isCategoriaEstadoColumnMissing(result.error) ||
      isCategoriaOrdenColumnMissing(result.error) ||
      isCategoriaCodigoColumnMissing(result.error);

    if (!canRetry) {
      return;
    }
  }
}

async function loadCategoriasWithFallback<T extends Record<string, unknown>>(
  supabase: DbClient,
  selectClause: string,
): Promise<T[]> {
  const attempts = [
    { selectClause, onlyActive: true, ordered: true },
    { selectClause, onlyActive: false, ordered: true },
    { selectClause, onlyActive: false, ordered: false },
  ] as const;

  for (const attempt of attempts) {
    const res = await queryCategorias<T>(supabase, attempt);
    if (!res.error) {
      return res.data;
    }

    if (attempt.onlyActive && !isCategoriaEstadoColumnMissing(res.error)) {
      break;
    }

    if (attempt.ordered && !attempt.onlyActive && !isCategoriaOrdenColumnMissing(res.error)) {
      break;
    }
  }

  const minimalRes = await supabase
    .from("categorias")
    .select("id,nombre,codigo,orden,estado");

  if (!minimalRes.error) {
    return (minimalRes.data ?? []).map((row, index) => mapCategoriaRow<T>(row as CategoriaBaseRow, index));
  }

  if (!isCategoriaCodigoColumnMissing(minimalRes.error) && !isCategoriaOrdenColumnMissing(minimalRes.error) && !isCategoriaEstadoColumnMissing(minimalRes.error)) {
    return [];
  }

  const ultraMinimalRes = await supabase
    .from("categorias")
    .select("id,nombre");

  if (ultraMinimalRes.error) {
    return [];
  }

  return (ultraMinimalRes.data ?? []).map((row, index) => mapCategoriaRow<T>(row as CategoriaBaseRow, index));
}

export async function selectCategoriasActivasCompat<T extends Record<string, unknown>>(
  supabase: DbClient,
  selectClause: string,
): Promise<T[]> {
  const categorias = await loadCategoriasWithFallback<T>(supabase, selectClause);
  if (categorias.length > 0) {
    return categorias;
  }

  await seedCategoriasIfPossible(supabase);
  return loadCategoriasWithFallback<T>(supabase, selectClause);
}

export async function ensureCategoriaActivaCompat(
  supabase: DbClient,
  categoriaId: number,
): Promise<boolean> {
  const activeRes = await supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .eq("estado", "activo")
    .maybeSingle();

  if (!activeRes.error) {
    return !!activeRes.data;
  }

  if (!isCategoriaEstadoColumnMissing(activeRes.error)) {
    return false;
  }

  const fallbackRes = await supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .maybeSingle();

  return !fallbackRes.error && !!fallbackRes.data;
}
