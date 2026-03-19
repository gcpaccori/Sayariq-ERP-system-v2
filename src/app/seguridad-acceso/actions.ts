"use server";

import { redirect } from "next/navigation";

import { ensureWriteAccess } from "@/lib/auth/server";
import { normalizeRole, type SystemRole } from "@/lib/auth/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value ? String(value).trim() : "";
}

function redirectWithMessage(type: "ok" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/seguridad-acceso?${params.toString()}`);
}

function parseRole(raw: string): SystemRole {
  const role = normalizeRole(raw);
  return role;
}

export async function updateUserRoleAction(formData: FormData) {
  await ensureWriteAccess("seguridad-acceso");

  const userId = getField(formData, "user_id");
  const role = parseRole(getField(formData, "role"));

  if (!userId) {
    redirectWithMessage("error", "Usuario inválido.");
  }

  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "No se pudo inicializar el cliente administrativo."
    );
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !userData.user) {
    redirectWithMessage("error", userError?.message ?? "No se encontró el usuario.");
  }

  const metadata = {
    ...(userData.user.user_metadata ?? {}),
    role,
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (updateError) {
    redirectWithMessage("error", updateError.message);
  }

  redirectWithMessage("ok", "Rol actualizado correctamente.");
}
