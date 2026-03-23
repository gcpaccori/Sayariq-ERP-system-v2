import "server-only";

type MaybePostgrestError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

function buildErrorText(error: MaybePostgrestError) {
  return `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
}

function isMissingViewError(error: MaybePostgrestError) {
  const text = buildErrorText(error);
  return (
    text.includes("vw_lote_clasificacion_vigente") &&
    (text.includes("does not exist") ||
      text.includes("not found") ||
      text.includes("42p01") ||
      text.includes("pgrst205"))
  );
}

function isPermissionError(error: MaybePostgrestError) {
  const text = buildErrorText(error);
  return (
    text.includes("42501") ||
    text.includes("permission denied") ||
    text.includes("not authorized") ||
    text.includes("forbidden")
  );
}

export function getClasificacionVigenteErrorMessage(error: MaybePostgrestError) {
  if (isMissingViewError(error)) {
    return "Falta la vista vw_lote_clasificacion_vigente en este entorno. Ejecuta la migracion de clasificacion neta antes de asignar lotes.";
  }

  if (isPermissionError(error)) {
    return "El entorno no tiene permisos para leer vw_lote_clasificacion_vigente. Revisa la configuracion de Supabase o las politicas RLS.";
  }

  if (error?.message?.trim()) {
    return `No se pudo consultar la clasificacion vigente de lotes: ${error.message}`;
  }

  return "No se pudo consultar la clasificacion vigente de lotes.";
}
