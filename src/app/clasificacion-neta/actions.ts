"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value ? String(value).trim() : "";
}

function toDecimal(value: string) {
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function redirectWithMessage(type: "ok" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/clasificacion-neta?${params.toString()}`);
}

export async function editarClasificacionNetaAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const loteId = Number(getField(formData, "lote_id"));
  const clasificacionId = Number(getField(formData, "clasificacion_id"));
  const actorPersonaId = Number(getField(formData, "actor_persona_id") || "0") || null;
  const motivo = getField(formData, "motivo");
  const fechaClasificacion = getField(formData, "fecha_clasificacion");
  const causaVariacion = getField(formData, "causa_variacion") || "proceso";

  const pesoBruto = toDecimal(getField(formData, "peso_bruto"));
  const numeroJabas = Number(getField(formData, "numero_jabas") || "0") || 0;
  const pesoJabas = toDecimal(getField(formData, "peso_jabas"));
  const porcentajeHumedad = toDecimal(getField(formData, "porcentaje_humedad"));

  if (!loteId || !clasificacionId) {
    redirectWithMessage("error", "Faltan datos del lote/clasificación.");
  }

  if (!motivo) {
    redirectWithMessage("error", "El motivo de modificación es obligatorio.");
  }

  if (!fechaClasificacion) {
    redirectWithMessage("error", "La fecha de clasificación es obligatoria.");
  }

  if ([pesoBruto, pesoJabas, porcentajeHumedad].some(Number.isNaN) || pesoBruto <= 0) {
    redirectWithMessage("error", "Valores de peso/humedad inválidos.");
  }

  const safePesoJabas = pesoJabas < 0 ? 0 : round3(pesoJabas);
  const safeHumedad = porcentajeHumedad < 0 ? 0 : round3(porcentajeHumedad);
  const descuentoHumedad = round3(pesoBruto * (safeHumedad / 100));
  const pesoNetoNuevo = round3(pesoBruto - safePesoJabas - descuentoHumedad);

  if (pesoNetoNuevo < 0) {
    redirectWithMessage("error", "El peso neto no puede ser negativo.");
  }

  const { data: lote, error: loteError } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,peso_bruto_ingreso,numero_jabas")
    .eq("id", loteId)
    .single();

  if (loteError || !lote) {
    redirectWithMessage("error", loteError?.message ?? "No se encontró el lote.");
  }

  const { data: actual, error: actualError } = await supabase
    .from("lote_clasificacion")
    .select("*")
    .eq("id", clasificacionId)
    .eq("lote_id", loteId)
    .eq("es_vigente", true)
    .single();

  if (actualError || !actual) {
    redirectWithMessage("error", "La clasificación vigente no existe o ya fue reemplazada.");
  }

  const { data: procesoExiste } = await supabase
    .from("clasificacion_neta_proceso")
    .select("id,version_actual,total_modificaciones")
    .eq("lote_id", loteId)
    .maybeSingle();

  let procesoId = Number(procesoExiste?.id ?? 0);
  let versionBase = Number(procesoExiste?.version_actual ?? 1);
  let totalModBase = Number(procesoExiste?.total_modificaciones ?? 0);

  if (!procesoId) {
    const { data: creado, error: procesoError } = await supabase
      .from("clasificacion_neta_proceso")
      .insert({
        lote_id: loteId,
        version_actual: 1,
        total_modificaciones: 0,
        estado: "abierto",
        peso_bruto_ingreso: Number(lote.peso_bruto_ingreso ?? 0),
        numero_jabas_ingreso: Number(lote.numero_jabas ?? 0),
        created_by_persona_id: actorPersonaId,
        updated_by_persona_id: actorPersonaId,
      })
      .select("id,version_actual,total_modificaciones")
      .single();

    if (procesoError || !creado) {
      redirectWithMessage("error", procesoError?.message ?? "No se pudo crear proceso neto.");
    }

    procesoId = Number(creado.id);
    versionBase = Number(creado.version_actual ?? 1);
    totalModBase = Number(creado.total_modificaciones ?? 0);
  }

  const versionNueva = versionBase + 1;

  const { error: caducarError } = await supabase
    .from("lote_clasificacion")
    .update({
      es_vigente: false,
      updated_by_persona_id: actorPersonaId,
    })
    .eq("id", clasificacionId)
    .eq("es_vigente", true);

  if (caducarError) {
    redirectWithMessage("error", caducarError.message);
  }

  const { data: nueva, error: nuevaError } = await supabase
    .from("lote_clasificacion")
    .insert({
      lote_id: loteId,
      categoria_id: Number(actual.categoria_id),
      codigo_clasificacion: actual.codigo_clasificacion,
      peso_bruto: round3(pesoBruto),
      numero_jabas: numeroJabas,
      peso_jabas: safePesoJabas,
      porcentaje_humedad: safeHumedad,
      peso_descuento_humedad: descuentoHumedad,
      peso_neto: pesoNetoNuevo,
      fecha_clasificacion: fechaClasificacion,
      observaciones: getField(formData, "observaciones") || null,
      clasificacion_proceso_id: procesoId,
      version_no: versionNueva,
      es_vigente: true,
      created_by_persona_id: actorPersonaId,
      updated_by_persona_id: actorPersonaId,
    })
    .select("id,peso_neto")
    .single();

  if (nuevaError || !nueva) {
    redirectWithMessage("error", nuevaError?.message ?? "No se pudo insertar la nueva versión.");
  }

  const pesoNetoAnterior = Number(actual.peso_neto ?? 0);
  const deltaKg = round3(pesoNetoNuevo - pesoNetoAnterior);

  const { data: vigentes } = await supabase
    .from("lote_clasificacion")
    .select("peso_bruto,peso_neto,numero_jabas")
    .eq("lote_id", loteId)
    .eq("es_vigente", true);

  const pesoBrutoClasificado = round3((vigentes ?? []).reduce((acc, row) => acc + Number(row.peso_bruto ?? 0), 0));
  const pesoNetoClasificado = round3((vigentes ?? []).reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0));
  const jabasClasificadas = (vigentes ?? []).reduce((acc, row) => acc + Number(row.numero_jabas ?? 0), 0);

  const ingresoKg = Number(lote.peso_bruto_ingreso ?? 0);
  const variacionKg = round3(pesoNetoClasificado - ingresoKg);
  const variacionPct = ingresoKg > 0 ? round3((variacionKg / ingresoKg) * 100) : 0;

  const { error: updProcesoError } = await supabase
    .from("clasificacion_neta_proceso")
    .update({
      version_actual: versionNueva,
      total_modificaciones: totalModBase + 1,
      estado: "abierto",
      peso_bruto_ingreso: ingresoKg,
      peso_bruto_clasificado: pesoBrutoClasificado,
      peso_neto_clasificado: pesoNetoClasificado,
      numero_jabas_ingreso: Number(lote.numero_jabas ?? 0),
      numero_jabas_clasificacion: jabasClasificadas,
      variacion_kg: variacionKg,
      variacion_pct: variacionPct,
      updated_by_persona_id: actorPersonaId,
    })
    .eq("id", procesoId);

  if (updProcesoError) {
    redirectWithMessage("error", updProcesoError.message);
  }

  const tipoVariacion = variacionKg > 0 ? "ganancia" : variacionKg < 0 ? "merma" : "sin_cambio";

  const { error: varError } = await supabase.from("lote_variacion_peso").insert({
    lote_id: loteId,
    clasificacion_proceso_id: procesoId,
    peso_ingreso: ingresoKg,
    peso_neto_clasificado: pesoNetoClasificado,
    variacion_kg: variacionKg,
    variacion_pct: variacionPct,
    tipo_variacion: tipoVariacion,
    causa_variacion: causaVariacion,
    detalle_causa: getField(formData, "detalle_causa") || null,
    actor_persona_id: actorPersonaId,
  });

  if (varError) {
    redirectWithMessage("error", varError.message);
  }

  const { error: auditError } = await supabase.from("lote_clasificacion_auditoria").insert({
    lote_id: loteId,
    clasificacion_proceso_id: procesoId,
    lote_clasificacion_id: Number(nueva.id),
    accion: "editar",
    version_anterior: Number(actual.version_no ?? 1),
    version_nueva: versionNueva,
    peso_neto_anterior: pesoNetoAnterior,
    peso_neto_nuevo: pesoNetoNuevo,
    diferencia_kg: deltaKg,
    motivo,
    actor_persona_id: actorPersonaId,
  });

  if (auditError) {
    redirectWithMessage("error", auditError.message);
  }

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "producto",
    tipo_movimiento: "clasificacion",
    origen: "ajuste",
    origen_id: procesoId,
    origen_numero: String(lote.numero_lote),
    lote_id: loteId,
    categoria_id: Number(actual.categoria_id),
    peso_kg: deltaKg,
    persona_id: Number(lote.productor_id),
    concepto: `Ajuste clasificación neta lote ${lote.numero_lote} (v${versionNueva})`,
    observaciones: `Motivo: ${motivo}`,
  });

  if (kardexError) {
    redirectWithMessage("error", `Edición guardada, pero falló kardex: ${kardexError.message}`);
  }

  revalidatePath("/clasificacion-neta");
  revalidatePath("/almacen");
  revalidatePath("/kardex");
  redirectWithMessage("ok", `Clasificación actualizada. Delta: ${deltaKg} kg.`);
}
