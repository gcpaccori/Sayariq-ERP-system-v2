import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TipoComprobanteInterno = "adelanto" | "venta" | "liquidacion";

type CreateComprobanteInternoInput = {
  tipo: TipoComprobanteInterno;
  entidadOrigen: "adelantos" | "liquidaciones" | "pagos_liquidacion";
  entidadOrigenId: number;
  personaPrincipalId: number;
  productorId?: number | null;
  clienteId?: number | null;
  receptorNombre?: string | null;
  receptorDocumento?: string | null;
  receptorRol?: string | null;
  lugarRecepcion?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsPrecisionM?: number | null;
  fechaEvento: string;
  horaEvento?: string | null;
  monto: number;
  observaciones?: string | null;
  payload?: Record<string, unknown>;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function prefijoTipo(tipo: TipoComprobanteInterno) {
  if (tipo === "adelanto") return "ADI";
  if (tipo === "venta") return "VEN";
  return "LIQ";
}

async function buildUniqueCodigoInterno(tipo: TipoComprobanteInterno) {
  const supabase = getSupabaseServerClient();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const pref = prefijoTipo(tipo);

  for (let index = 0; index < 20; index += 1) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const code = `CI-${pref}-${y}${m}${d}-${random}`;

    const { data } = await supabase
      .from("comprobantes_internos")
      .select("id")
      .eq("codigo_interno", code)
      .maybeSingle();

    if (!data) {
      return code;
    }
  }

  throw new Error("No se pudo generar código interno único.");
}

export async function createComprobanteInterno(input: CreateComprobanteInternoInput) {
  const supabase = getSupabaseServerClient();

  for (let index = 0; index < 20; index += 1) {
    const codigoInterno = await buildUniqueCodigoInterno(input.tipo);

    const { error } = await supabase.from("comprobantes_internos").insert({
      tipo: input.tipo,
      codigo_interno: codigoInterno,
      entidad_origen: input.entidadOrigen,
      entidad_origen_id: input.entidadOrigenId,
      persona_principal_id: input.personaPrincipalId,
      productor_id: input.productorId ?? null,
      cliente_id: input.clienteId ?? null,
      receptor_nombre: input.receptorNombre ?? null,
      receptor_documento: input.receptorDocumento ?? null,
      receptor_rol: input.receptorRol ?? null,
      lugar_recepcion: input.lugarRecepcion ?? null,
      gps_lat: input.gpsLat ?? null,
      gps_lng: input.gpsLng ?? null,
      gps_precision_m: input.gpsPrecisionM ?? null,
      fecha_evento: input.fechaEvento,
      hora_evento: input.horaEvento ?? null,
      monto: round2(input.monto),
      observaciones: input.observaciones ?? null,
      payload: input.payload ?? {},
    });

    if (!error) {
      return { ok: true as const, codigoInterno, errorMessage: null };
    }

    if (error.code === "23505") {
      continue;
    }

    return {
      ok: false as const,
      codigoInterno: null,
      errorMessage: error.message,
    };
  }

  return {
    ok: false as const,
    codigoInterno: null,
    errorMessage: "No se pudo generar comprobante interno único.",
  };
}
