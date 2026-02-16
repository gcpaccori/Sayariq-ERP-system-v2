"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveEvidenciaFoto } from "@/lib/evidencias-fotos";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Rol =
  | "productor"
  | "cliente"
  | "estibador"
  | "transportista"
  | "operador_planta"
  | "personal"
  | "supervisor"
  | "comprador"
  | "administrativo"
  | "calidad";

const ROLES_PERMITIDOS: Rol[] = [
  "productor",
  "cliente",
  "estibador",
  "transportista",
  "operador_planta",
  "personal",
  "supervisor",
  "comprador",
  "administrativo",
  "calidad",
];

function getRoles(formData: FormData): Rol[] {
  const roles = formData
    .getAll("roles")
    .map((value) => String(value))
    .filter((value): value is Rol => ROLES_PERMITIDOS.includes(value as Rol));

  return [...new Set(roles)];
}

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value ? String(value).trim() : "";
}

function buildPersonaPayload(formData: FormData) {
  return {
    nombre_completo: getField(formData, "nombre_completo"),
    tipo_documento: getField(formData, "tipo_documento") || "DNI",
    documento: getField(formData, "documento"),
    telefono: getField(formData, "telefono") || null,
    email: getField(formData, "email") || null,
    direccion: getField(formData, "direccion") || null,
    banco: getField(formData, "banco") || null,
    cuenta_bancaria: getField(formData, "cuenta_bancaria") || null,
    cci: getField(formData, "cci") || null,
    estado: getField(formData, "estado") || "activo",
  };
}

function redirectWithMessage(type: "ok" | "error", message: string) {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/personas?${params.toString()}`);
}

function getRolesConstraintMessage(errorMessage: string) {
  if (
    errorMessage.includes("persona_roles_rol_check") ||
    errorMessage.includes("chk_persona_roles_rol")
  ) {
    return "La base de datos aún no acepta el nuevo catálogo de roles. Ejecuta la migración de roles y vuelve a intentar.";
  }

  return errorMessage;
}

export async function createPersonaAction(formData: FormData) {
  const roles = getRoles(formData);
  if (roles.length === 0) {
    redirectWithMessage("error", "Debes seleccionar al menos un rol.");
  }

  const payload = buildPersonaPayload(formData);
  if (!payload.nombre_completo || !payload.documento) {
    redirectWithMessage("error", "Nombre y documento son obligatorios.");
  }

  const supabase = getSupabaseServerClient();
  const { data: created, error } = await supabase
    .from("personas")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) {
    redirectWithMessage("error", error?.message ?? "No se pudo crear la persona.");
  }

  const rolesPayload = roles.map((rol) => ({ persona_id: created.id, rol }));
  const { error: rolesError } = await supabase.from("persona_roles").insert(rolesPayload);

  if (rolesError) {
    await supabase.from("personas").delete().eq("id", created.id);
    redirectWithMessage("error", getRolesConstraintMessage(rolesError.message));
  }

  const { data: rolesGuardadosData } = await supabase
    .from("persona_roles")
    .select("rol")
    .eq("persona_id", created.id)
    .order("rol", { ascending: true });
  const rolesGuardados = (rolesGuardadosData ?? []).map((row) => String(row.rol));

  const fotoResult = await saveEvidenciaFoto({
    file: formData.get("foto_persona"),
    contexto: "persona_perfil",
    entidadOrigen: "personas",
    entidadId: Number(created.id),
    personaId: Number(created.id),
    observaciones: "Foto de perfil persona",
  });

  revalidatePath("/personas");
  const fotoDetalle = fotoResult.guardada
    ? " | Foto guardada"
    : fotoResult.errorMessage
      ? ` | Foto no guardada (${fotoResult.errorMessage})`
      : "";
  redirectWithMessage(
    "ok",
    `Persona creada correctamente. Roles: ${rolesGuardados.join(", ") || "(sin roles)"}.${fotoDetalle}`
  );
}

export async function updatePersonaAction(formData: FormData) {
  const id = Number(getField(formData, "id"));
  const roles = getRoles(formData);

  if (!id || Number.isNaN(id)) {
    redirectWithMessage("error", "ID de persona inválido.");
  }

  if (roles.length === 0) {
    redirectWithMessage("error", "Debes seleccionar al menos un rol.");
  }

  const payload = buildPersonaPayload(formData);
  if (!payload.nombre_completo || !payload.documento) {
    redirectWithMessage("error", "Nombre y documento son obligatorios.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("personas").update(payload).eq("id", id);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  const { data: rolesActualesData, error: rolesActualesError } = await supabase
    .from("persona_roles")
    .select("rol")
    .eq("persona_id", id);

  if (rolesActualesError) {
    redirectWithMessage("error", rolesActualesError.message);
  }

  const rolesActualesSet = new Set((rolesActualesData ?? []).map((row) => String(row.rol)));
  const rolesNuevos = roles.filter((rol) => !rolesActualesSet.has(rol));

  if (rolesNuevos.length > 0) {
    const rolesPayload = rolesNuevos.map((rol) => ({ persona_id: id, rol }));
    const { error: insertRolesError } = await supabase.from("persona_roles").insert(rolesPayload);

    if (insertRolesError) {
      redirectWithMessage("error", getRolesConstraintMessage(insertRolesError.message));
    }
  }

  const { data: rolesFinalesData } = await supabase
    .from("persona_roles")
    .select("rol")
    .eq("persona_id", id)
    .order("rol", { ascending: true });
  const rolesFinales = (rolesFinalesData ?? []).map((row) => String(row.rol));

  const fotoResult = await saveEvidenciaFoto({
    file: formData.get("foto_persona"),
    contexto: "persona_perfil",
    entidadOrigen: "personas",
    entidadId: id,
    personaId: id,
    observaciones: "Actualización foto perfil",
  });

  revalidatePath("/personas");
  const fotoDetalle = fotoResult.guardada
    ? " | Foto actualizada"
    : fotoResult.errorMessage
      ? ` | Foto no guardada (${fotoResult.errorMessage})`
      : "";
  redirectWithMessage(
    "ok",
    `Persona actualizada correctamente. Roles: ${rolesFinales.join(", ") || "(sin roles)"}.${fotoDetalle}`
  );
}

export async function togglePersonaEstadoAction(formData: FormData) {
  const id = Number(getField(formData, "id"));
  const estadoActual = getField(formData, "estado_actual");

  if (!id || Number.isNaN(id)) {
    redirectWithMessage("error", "ID inválido para cambiar estado.");
  }

  const nuevoEstado = estadoActual === "activo" ? "inactivo" : "activo";

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("personas")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/personas");
  redirectWithMessage("ok", `Estado actualizado a ${nuevoEstado}.`);
}
