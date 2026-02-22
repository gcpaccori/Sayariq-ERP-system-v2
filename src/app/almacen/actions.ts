"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveEvidenciaFoto } from "@/lib/evidencias-fotos";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Categoria = {
  id: number;
  nombre: string;
  codigo: string;
};

type Producto = "Jengibre" | "Curcuma";

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  peso_bruto_ingreso: number;
  estado: string;
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value ? String(value).trim() : "";
}

function toDecimal(value: string) {
  if (!value) return 0;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function redirectWithMessage(type: "ok" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/almacen?${params.toString()}`);
}

async function ensureProductor(personaId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("persona_id", personaId)
    .eq("rol", "productor")
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function ensureCategoriaActiva(categoriaId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .eq("estado", "activo")
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function buildNumeroLote() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("lotes")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = Number(data?.id ?? 0) + 1;
  return `LOT-${year}-${String(next).padStart(4, "0")}`;
}

export async function createLoteAction(formData: FormData) {
  const productorId = Number(getField(formData, "productor_id"));
  const producto = getField(formData, "producto") as Producto;
  const categoriaIdRaw = Number(getField(formData, "categoria_id") || "0");
  const categoriaId = categoriaIdRaw > 0 ? categoriaIdRaw : null;
  const fechaIngreso = getField(formData, "fecha_ingreso");
  const pesoBrutoIngreso = toDecimal(getField(formData, "peso_bruto_ingreso"));

  if (!productorId || Number.isNaN(productorId)) {
    redirectWithMessage("error", "Selecciona un productor válido.");
  }

  const productosValidos: Producto[] = ["Jengibre", "Curcuma"];
  if (!productosValidos.includes(producto)) {
    redirectWithMessage("error", "Producto inválido. Solo se permite Jengibre o Curcuma.");
  }

  if (!fechaIngreso || Number.isNaN(pesoBrutoIngreso) || pesoBrutoIngreso <= 0) {
    redirectWithMessage("error", "Producto, fecha y peso bruto son obligatorios y válidos.");
  }

  const isProductor = await ensureProductor(productorId);
  if (!isProductor) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol productor.");
  }

  if (categoriaId) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaId);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "La categoría seleccionada no existe o está inactiva.");
    }
  }

  const supabase = getSupabaseServerClient();
  const numeroLote = getField(formData, "numero_lote") || (await buildNumeroLote());

  const payload = {
    numero_lote: numeroLote,
    productor_id: productorId,
    producto,
    categoria_id: categoriaId,
    fecha_ingreso: fechaIngreso,
    guia_ingreso: getField(formData, "guia_ingreso") || null,
    peso_bruto_ingreso: round2(pesoBrutoIngreso),
    numero_jabas: Number(getField(formData, "numero_jabas") || "0") || 0,
    chofer: getField(formData, "chofer") || null,
    placa_vehiculo: getField(formData, "placa_vehiculo") || null,
    observaciones: getField(formData, "observaciones") || null,
    estado: "sin_clasificar",
  };

  const { data: loteCreado, error: loteError } = await supabase
    .from("lotes")
    .insert(payload)
    .select("id,numero_lote,productor_id,peso_bruto_ingreso")
    .single();

  if (loteError || !loteCreado) {
    redirectWithMessage("error", loteError?.message ?? "No se pudo crear el lote.");
  }

  const loteInsertado = loteCreado;

  const { data: productor } = await supabase
    .from("personas")
    .select("nombre_completo")
    .eq("id", productorId)
    .maybeSingle();

  const concepto = `Ingreso de lote ${loteInsertado.numero_lote} -- Productor: ${
    productor?.nombre_completo ?? "N/D"
  }`;

  const { error: kardexError } = await supabase.from("kardex").insert({
    tipo_kardex: "producto",
    tipo_movimiento: "entrada",
    origen: "lote_ingreso",
    origen_id: loteInsertado.id,
    origen_numero: loteInsertado.numero_lote,
    lote_id: loteInsertado.id,
    peso_kg: loteInsertado.peso_bruto_ingreso,
    persona_id: productorId,
    concepto,
    observaciones: payload.observaciones,
  });

  if (kardexError) {
    redirectWithMessage("error", `Lote creado pero falló kardex: ${kardexError.message}`);
  }

  const fotoIngreso = await saveEvidenciaFoto({
    file: formData.get("foto_lote_ingreso"),
    contexto: "lote_ingreso",
    entidadOrigen: "lotes",
    entidadId: Number(loteInsertado.id),
    loteId: Number(loteInsertado.id),
    personaId: productorId,
    observaciones: "Foto ingreso de lote",
  });

  revalidatePath("/almacen");
  const fotoDetalle = fotoIngreso.guardada
    ? " | Foto de ingreso guardada"
    : fotoIngreso.errorMessage
      ? ` | Foto no guardada (${fotoIngreso.errorMessage})`
      : "";
  redirectWithMessage("ok", `Lote ${loteInsertado.numero_lote} creado correctamente.${fotoDetalle}`);
}

export async function updateLoteAction(formData: FormData) {
  const loteId = Number(getField(formData, "lote_id"));
  const productorId = Number(getField(formData, "productor_id"));
  const producto = getField(formData, "producto") as Producto;
  const categoriaIdRaw = Number(getField(formData, "categoria_id") || "0");
  const categoriaId = categoriaIdRaw > 0 ? categoriaIdRaw : null;
  const fechaIngreso = getField(formData, "fecha_ingreso");
  const pesoBrutoIngreso = toDecimal(getField(formData, "peso_bruto_ingreso"));

  if (!loteId || Number.isNaN(loteId)) {
    redirectWithMessage("error", "Lote inválido para editar.");
  }

  if (!productorId || Number.isNaN(productorId)) {
    redirectWithMessage("error", "Selecciona un productor válido.");
  }

  const productosValidos: Producto[] = ["Jengibre", "Curcuma"];
  if (!productosValidos.includes(producto)) {
    redirectWithMessage("error", "Producto inválido. Solo se permite Jengibre o Curcuma.");
  }

  if (!fechaIngreso || Number.isNaN(pesoBrutoIngreso) || pesoBrutoIngreso <= 0) {
    redirectWithMessage("error", "Fecha y peso bruto son obligatorios y válidos.");
  }

  const isProductor = await ensureProductor(productorId);
  if (!isProductor) {
    redirectWithMessage("error", "La persona seleccionada no tiene rol productor.");
  }

  if (categoriaId) {
    const isCategoriaValida = await ensureCategoriaActiva(categoriaId);
    if (!isCategoriaValida) {
      redirectWithMessage("error", "La categoría seleccionada no existe o está inactiva.");
    }
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("lotes")
    .update({
      productor_id: productorId,
      producto,
      categoria_id: categoriaId,
      fecha_ingreso: fechaIngreso,
      guia_ingreso: getField(formData, "guia_ingreso") || null,
      peso_bruto_ingreso: round2(pesoBrutoIngreso),
      numero_jabas: Number(getField(formData, "numero_jabas") || "0") || 0,
      chofer: getField(formData, "chofer") || null,
      placa_vehiculo: getField(formData, "placa_vehiculo") || null,
      observaciones: getField(formData, "observaciones") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", loteId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/almacen");
  redirectWithMessage("ok", `Lote ${loteId} actualizado correctamente.`);
}

async function getLoteSinClasificar(loteId: number): Promise<Lote | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,peso_bruto_ingreso,estado")
    .eq("id", loteId)
    .maybeSingle();

  if (!data) return null;
  return data as Lote;
}

async function getCategoriasActivas(): Promise<Categoria[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categorias")
    .select("id,nombre,codigo")
    .eq("estado", "activo")
    .order("orden", { ascending: true });

  return (data ?? []) as Categoria[];
}

export async function clasificarLoteAction(formData: FormData) {
  const loteId = Number(getField(formData, "lote_id"));
  const fechaClasificacion = getField(formData, "fecha_clasificacion");

  if (!loteId || Number.isNaN(loteId)) {
    redirectWithMessage("error", "Lote inválido para clasificar.");
  }

  if (!fechaClasificacion) {
    redirectWithMessage("error", "La fecha de clasificación es obligatoria.");
  }

  const lote = await getLoteSinClasificar(loteId);
  if (!lote) {
    redirectWithMessage("error", "No existe el lote.");
  }

  const loteActual = lote;

  if (loteActual.estado !== "sin_clasificar") {
    redirectWithMessage("error", "Solo se pueden clasificar lotes en estado sin_clasificar.");
  }

  const categorias = await getCategoriasActivas();
  if (categorias.length === 0) {
    redirectWithMessage("error", "No hay categorías activas para clasificar.");
  }

  const rows: Array<{
    lote_id: number;
    categoria_id: number;
    codigo_clasificacion: string;
    peso_bruto: number;
    numero_jabas: number;
    peso_jabas: number;
    porcentaje_humedad: number;
    peso_descuento_humedad: number;
    peso_neto: number;
    fecha_clasificacion: string;
    observaciones: string | null;
  }> = [];

  let totalPesoBruto = 0;

  for (const categoria of categorias) {
    const pesoBruto = toDecimal(getField(formData, `peso_bruto_${categoria.id}`));
    if (!pesoBruto || Number.isNaN(pesoBruto) || pesoBruto <= 0) {
      continue;
    }

    const numeroJabas = Number(getField(formData, `numero_jabas_${categoria.id}`) || "0") || 0;
    const pesoJabas = toDecimal(getField(formData, `peso_jabas_${categoria.id}`));
    const porcentajeHumedad = toDecimal(getField(formData, `porcentaje_humedad_${categoria.id}`));

    const safePesoJabas = Number.isNaN(pesoJabas) || pesoJabas < 0 ? 0 : round2(pesoJabas);
    const safeHumedad =
      Number.isNaN(porcentajeHumedad) || porcentajeHumedad < 0 ? 0 : round2(porcentajeHumedad);

    const pesoDescuentoHumedad = round2(pesoBruto * (safeHumedad / 100));
    const pesoNeto = round2(pesoBruto - safePesoJabas - pesoDescuentoHumedad);

    if (pesoNeto < 0) {
      redirectWithMessage(
        "error",
        `El peso neto no puede ser negativo en categoría ${categoria.nombre}.`
      );
    }

    totalPesoBruto += pesoBruto;

    rows.push({
      lote_id: loteActual.id,
      categoria_id: categoria.id,
      codigo_clasificacion: `CLS-${loteActual.numero_lote}-${String(categoria.codigo).toUpperCase()}`,
      peso_bruto: round2(pesoBruto),
      numero_jabas: numeroJabas,
      peso_jabas: safePesoJabas,
      porcentaje_humedad: safeHumedad,
      peso_descuento_humedad: pesoDescuentoHumedad,
      peso_neto: pesoNeto,
      fecha_clasificacion: fechaClasificacion,
      observaciones: getField(formData, `observaciones_${categoria.id}`) || null,
    });
  }

  if (rows.length === 0) {
    redirectWithMessage("error", "Debes registrar al menos una categoría con peso bruto mayor a 0.");
  }

  totalPesoBruto = round2(totalPesoBruto);
  if (totalPesoBruto > loteActual.peso_bruto_ingreso) {
    redirectWithMessage(
      "error",
      `El total bruto clasificado (${totalPesoBruto} kg) no puede superar el ingreso (${loteActual.peso_bruto_ingreso} kg).`
    );
  }

  const diferencia = round2(loteActual.peso_bruto_ingreso - totalPesoBruto);
  const mermaPct =
    loteActual.peso_bruto_ingreso > 0
      ? round2((diferencia / loteActual.peso_bruto_ingreso) * 100)
      : 0;

  const supabase = getSupabaseServerClient();

  const { error: insertClasifError } = await supabase.from("lote_clasificacion").insert(rows);
  if (insertClasifError) {
    redirectWithMessage("error", insertClasifError.message);
  }

  const { error: updateLoteError } = await supabase
    .from("lotes")
    .update({ estado: "clasificado" })
    .eq("id", loteActual.id);

  if (updateLoteError) {
    redirectWithMessage("error", updateLoteError.message);
  }

  const categoriaMap = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));
  const kardexPayload = rows.map((row) => ({
    tipo_kardex: "producto",
    tipo_movimiento: "clasificacion",
    origen: "clasificacion",
    origen_id: loteActual.id,
    origen_numero: loteActual.numero_lote,
    lote_id: loteActual.id,
    categoria_id: row.categoria_id,
    peso_kg: row.peso_neto,
    persona_id: loteActual.productor_id,
    concepto: `Clasificacion lote ${loteActual.numero_lote} -- ${categoriaMap.get(row.categoria_id) ?? "Categoria"}: ${row.peso_neto} kg`,
    observaciones: row.observaciones,
  }));

  const { error: kardexError } = await supabase.from("kardex").insert(kardexPayload);
  if (kardexError) {
    redirectWithMessage("error", `Clasificación guardada, pero falló kardex: ${kardexError.message}`);
  }

  const fotoClasificacion = await saveEvidenciaFoto({
    file: formData.get("foto_lote_clasificacion"),
    contexto: "lote_clasificacion",
    entidadOrigen: "lotes",
    entidadId: Number(loteActual.id),
    loteId: Number(loteActual.id),
    personaId: Number(loteActual.productor_id),
    observaciones: "Foto evidencia de clasificación",
  });

  revalidatePath("/almacen");

  let warning = "";
  if (mermaPct > 10) {
    warning = ` Advertencia crítica: merma ${mermaPct}%.`;
  } else if (mermaPct > 5) {
    warning = ` Advertencia: merma ${mermaPct}%.`;
  }

  const fotoDetalle = fotoClasificacion.guardada
    ? " Foto de clasificación guardada."
    : fotoClasificacion.errorMessage
      ? ` Foto no guardada (${fotoClasificacion.errorMessage}).`
      : "";
  redirectWithMessage("ok", `Lote ${loteActual.numero_lote} clasificado correctamente.${warning}${fotoDetalle}`);
}
