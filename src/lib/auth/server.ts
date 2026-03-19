import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canReadModule, canWriteModule, type ModuleKey } from "@/lib/auth/permissions";
import { normalizeRole, type SystemRole } from "@/lib/auth/roles";

export async function getServerRole(): Promise<SystemRole> {
  const cookieStore = await cookies();
  return normalizeRole(cookieStore.get("sayariq-role")?.value);
}

function denyAccess(reason: "read" | "write") {
  const message =
    reason === "read"
      ? "No tienes acceso a este modulo"
      : "No tienes permisos para ejecutar esta accion";

  redirect(`/dashboard?error=${encodeURIComponent(message)}`);
}

export async function ensureReadAccess(module: ModuleKey): Promise<SystemRole> {
  const role = await getServerRole();

  if (!canReadModule(role, module)) {
    denyAccess("read");
  }

  return role;
}

export async function ensureWriteAccess(module: ModuleKey): Promise<SystemRole> {
  const role = await getServerRole();

  if (!canWriteModule(role, module)) {
    denyAccess("write");
  }

  return role;
}
