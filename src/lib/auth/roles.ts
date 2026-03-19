export type SystemRole = "admin" | "operario" | "visualizador";

export type LegacySystemRole = "adm" | "operario" | "visualizador";

export function normalizeRole(rawRole: unknown): SystemRole {
  if (rawRole === "admin" || rawRole === "adm") {
    return "admin";
  }

  if (rawRole === "operario") {
    return "operario";
  }

  return "visualizador";
}

export function isSystemRole(rawRole: unknown): rawRole is SystemRole {
  return rawRole === "admin" || rawRole === "operario" || rawRole === "visualizador";
}
