"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

type Categoria = { id: number; codigo: string; nombre: string };

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

function redirectWithMessage(type: "ok" | "error", message: string, loteId?: number): never {
  const params = new URLSearchParams({ [type]: message });
  if (loteId) params.set("lote", String(loteId));
  redirect(`/clasificacion-neta?${params.toString()}`);
}

async function getCategoriasActivas(): Promise<Categoria[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categorias")
    .select("id,codigo,nombre")
    .eq("estado", "activo")
    .order("orden", { ascending: true });

  return (data ?? []) as Categoria[];
}

async function resolveActorPersonaId(actorPersonaIdRaw: number | null, actorEmail: string) {
  if (actorPersonaIdRaw && actorPersonaIdRaw > 0) return actorPersonaIdRaw;
  if (!actorEmail) return null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("personas")
    .select("id")
    .ilike("email", actorEmail)
    .maybeSingle();

  return data ? Number(data.id) : null;
}

function buildCodigoClasificacion({
  numeroLote,
  categoriaCodigo,
  procesoId,
  version,
}: {
  numeroLote: string;
  categoriaCodigo: string;
  procesoId: number;
  version: number;
}) {
  return `CLS-${numeroLote}-${categoriaCodigo.toUpperCase()}-P${procesoId}-V${version}`;
}

export async function editarClasificacionNetaAction(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const loteId = Number(getField(formData, "lote_id"));
  const actorPersonaIdRaw = Number(getField(formData, "actor_persona_id") || "0") || null;
  const actorEmail = getField(formData, "actor_email");
  const actorNombre = getField(formData, "actor_nombre");
  const actorPersonaId = await resolveActorPersonaId(actorPersonaIdRaw, actorEmail);
  const motivo = getField(formData, "motivo");
  const fechaClasificacion = getField(formData, "fecha_clasificacion") || new Date().toISOString().slice(0, 10);
  const causaVariacion = getField(formData, "causa_variacion") || "proceso";
  const detalleCausa = getField(formData, "detalle_causa") || null;
  const observaciones = getField(formData, "observaciones") || null;

  if (!loteId) {
    redirectWithMessage("error", "Falta lote a reclasificar.");
  }
  if (!motivo) {
    redirectWithMessage("error", "El motivo es obligatorio.", loteId);
  }
  const { data: lote, error: loteError } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,peso_bruto_ingreso,numero_jabas")
    .eq("id", loteId)
    .single();

  if (loteError || !lote) {
    redirectWithMessage("error", loteError?.message ?? "No existe el lote.", loteId);
  }

  const { data: asignacionesVendidas } = await supabase
    .from("pedido_asignaciones")
    .select("id")
    .eq("lote_id", loteId)
    .limit(1);

  if ((asignacionesVendidas ?? []).length > 0) {
    redirectWithMessage(
      "error",
      "Este lote ya tiene salidas/asignaciones. Desde ese punto ya no se permite modificar la clasificación.",
      loteId,
    );
  }

  const categorias = await getCategoriasActivas();
  if (categorias.length === 0) {
    redirectWithMessage("error", "No hay categorías activas.", loteId);
  }

  const { data: vigentesActuales } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("id,categoria_id,peso_neto,version_no")
    .eq("lote_id", loteId);

  const actualMap = new Map<
    number,
    {
      id: number;
      peso_neto: number;
      version_no: number;
    }
  >();

  for (const row of vigentesActuales ?? []) {
    actualMap.set(Number(row.categoria_id), {
      id: Number(row.id),
      peso_neto: Number(row.peso_neto ?? 0),
      version_no: Number(row.version_no ?? 1),
    });
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
      redirectWithMessage("error", procesoError?.message ?? "No se pudo crear proceso neto.", loteId);
    }

    procesoId = Number(creado.id);
    versionBase = Number(creado.version_actual ?? 1);
    totalModBase = Number(creado.total_modificaciones ?? 0);
  }

  const versionNueva = versionBase + 1;

  const nuevasFilas: Array<Record<string, unknown>> = [];
  const nuevoNetoMap = new Map<number, number>();

  for (const categoria of categorias) {
    const pesoBruto = toDecimal(getField(formData, `peso_bruto_${categoria.id}`));
    const numeroJabas = Number(getField(formData, `numero_jabas_${categoria.id}`) || "0") || 0;
    const pesoJabas = toDecimal(getField(formData, `peso_jabas_${categoria.id}`));
    const porcentajeHumedad = toDecimal(getField(formData, `porcentaje_humedad_${categoria.id}`));

    if ([pesoBruto, pesoJabas, porcentajeHumedad].some(Number.isNaN) || pesoBruto < 0) {
      redirectWithMessage("error", `Datos inválidos en categoría ${categoria.nombre}.`, loteId);
    }

    if (pesoBruto <= 0) {
      continue;
    }

    const safePesoJabas = pesoJabas < 0 ? 0 : round3(pesoJabas);
    const safeHumedad = porcentajeHumedad < 0 ? 0 : round3(porcentajeHumedad);
    const descuentoHumedad = round3(pesoBruto * (safeHumedad / 100));
    const pesoNeto = round3(pesoBruto - safePesoJabas - descuentoHumedad);

    if (pesoNeto < 0) {
      redirectWithMessage("error", `Peso neto negativo en categoría ${categoria.nombre}.`, loteId);
    }

    const codigoClasificacion = buildCodigoClasificacion({
      numeroLote: String(lote.numero_lote),
      categoriaCodigo: String(categoria.codigo),
      procesoId,
      version: versionNueva,
    });

    nuevoNetoMap.set(categoria.id, pesoNeto);

    nuevasFilas.push({
      lote_id: loteId,
      categoria_id: categoria.id,
      codigo_clasificacion: codigoClasificacion,
      peso_bruto: round3(pesoBruto),
      numero_jabas: numeroJabas,
      peso_jabas: safePesoJabas,
      porcentaje_humedad: safeHumedad,
      peso_descuento_humedad: descuentoHumedad,
      peso_neto: pesoNeto,
      fecha_clasificacion: fechaClasificacion,
      observaciones,
      clasificacion_proceso_id: procesoId,
      version_no: versionNueva,
      es_vigente: true,
      created_by_persona_id: actorPersonaId,
      updated_by_persona_id: actorPersonaId,
    });
  }

  if (nuevasFilas.length === 0) {
    redirectWithMessage("error", "Debes ingresar peso bruto en al menos una categoría.", loteId);
  }

  const totalBrutoClasificado = round3(nuevasFilas.reduce((acc, row) => acc + Number(row.peso_bruto ?? 0), 0));
  if (totalBrutoClasificado > Number(lote.peso_bruto_ingreso ?? 0)) {
    redirectWithMessage(
      "error",
      `El bruto clasificado (${totalBrutoClasificado} kg) supera el ingreso (${Number(lote.peso_bruto_ingreso ?? 0)} kg).`,
      loteId,
    );
  }

  const { error: caducarError } = await supabase
    .from("lote_clasificacion")
    .update({ es_vigente: false, updated_by_persona_id: actorPersonaId })
    .eq("lote_id", loteId)
    .eq("es_vigente", true);

  if (caducarError) {
    redirectWithMessage("error", caducarError.message, loteId);
  }

  const { error: insertError } = await supabase.from("lote_clasificacion").insert(nuevasFilas);
  if (insertError) {
    redirectWithMessage("error", insertError.message, loteId);
  }

  const pesoNetoClasificado = round3(nuevasFilas.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0));
  const jabasClasificadas = nuevasFilas.reduce((acc, row) => acc + Number(row.numero_jabas ?? 0), 0);
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
      peso_bruto_clasificado: totalBrutoClasificado,
      peso_neto_clasificado: pesoNetoClasificado,
      numero_jabas_ingreso: Number(lote.numero_jabas ?? 0),
      numero_jabas_clasificacion: jabasClasificadas,
      variacion_kg: variacionKg,
      variacion_pct: variacionPct,
      updated_by_persona_id: actorPersonaId,
    })
    .eq("id", procesoId);

  if (updProcesoError) {
    redirectWithMessage("error", updProcesoError.message, loteId);
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
    detalle_causa: detalleCausa,
    actor_persona_id: actorPersonaId,
  });

  if (varError) {
    redirectWithMessage("error", varError.message, loteId);
  }

  const kardexRows: Array<Record<string, unknown>> = [];
  const auditRows: Array<Record<string, unknown>> = [];

  for (const categoria of categorias) {
    const oldNeto = round3(actualMap.get(categoria.id)?.peso_neto ?? 0);
    const newNeto = round3(nuevoNetoMap.get(categoria.id) ?? 0);
    const delta = round3(newNeto - oldNeto);

    if (Math.abs(delta) <= 0.0001) {
      continue;
    }

    auditRows.push({
      lote_id: loteId,
      clasificacion_proceso_id: procesoId,
      lote_clasificacion_id: actualMap.get(categoria.id)?.id ?? null,
      accion: "editar",
      version_anterior: actualMap.get(categoria.id)?.version_no ?? versionBase,
      version_nueva: versionNueva,
      peso_neto_anterior: oldNeto,
      peso_neto_nuevo: newNeto,
      diferencia_kg: delta,
      motivo,
      actor_persona_id: actorPersonaId,
    });

    kardexRows.push({
      tipo_kardex: "producto",
      tipo_movimiento: "clasificacion",
      origen: "ajuste",
      origen_id: procesoId,
      origen_numero: String(lote.numero_lote),
      lote_id: loteId,
      categoria_id: categoria.id,
      peso_kg: delta,
      persona_id: Number(lote.productor_id),
      concepto: `Ajuste clasificación neta lote ${lote.numero_lote} ${categoria.nombre} (v${versionNueva})`,
      observaciones: `Motivo: ${motivo}${actorNombre ? ` | Actor: ${actorNombre}` : ""}${actorEmail ? ` <${actorEmail}>` : ""}`,
    });
  }

  if (auditRows.length > 0) {
    const { error: auditError } = await supabase.from("lote_clasificacion_auditoria").insert(auditRows);
    if (auditError) {
      redirectWithMessage("error", auditError.message, loteId);
    }
  }

  if (kardexRows.length > 0) {
    const { error: kardexError } = await supabase.from("kardex").insert(kardexRows);
    if (kardexError) {
      redirectWithMessage("error", `Reclasificación guardada, pero falló kardex: ${kardexError.message}`, loteId);
    }
  }

  revalidatePath("/clasificacion-neta");
  revalidatePath("/almacen");
  revalidatePath("/pedidos");
  revalidatePath("/liquidaciones");
  revalidatePath("/kardex");
  redirectWithMessage(
    "ok",
    `Lote ${lote.numero_lote} reclasificado. Variación total: ${variacionKg} kg. Actor: ${actorNombre || actorEmail || "no identificado"}.`,
    loteId,
  );
}
