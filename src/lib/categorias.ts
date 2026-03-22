import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient<any, "public", any>;

type MaybePostgrestError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

function isCategoriaEstadoColumnMissing(error: MaybePostgrestError) {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return text.includes("categorias.estado") || text.includes("column estado does not exist") || text.includes("42703") || text.includes("pgrst204");
}

export async function selectCategoriasActivasCompat<T extends Record<string, unknown>>(
  supabase: DbClient,
  selectClause: string,
): Promise<T[]> {
  const activeRes = await supabase
    .from("categorias")
    .select(selectClause)
    .eq("estado", "activo")
    .order("orden", { ascending: true });

  if (!activeRes.error) {
    return (activeRes.data ?? []) as unknown as T[];
  }

  if (!isCategoriaEstadoColumnMissing(activeRes.error)) {
    return [];
  }

  const fallbackRes = await supabase
    .from("categorias")
    .select(selectClause)
    .order("orden", { ascending: true });

  if (fallbackRes.error) {
    return [];
  }

  return (fallbackRes.data ?? []) as unknown as T[];
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
