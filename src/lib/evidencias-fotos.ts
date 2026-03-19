import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIDE = 1080;
const THUMB_SIDE = 320;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function importSharpModule() {
  return import("sharp");
}

type SharpFactory = Awaited<ReturnType<typeof importSharpModule>>["default"];

let sharpFactoryPromise: Promise<SharpFactory> | null = null;

async function getSharpFactory(): Promise<SharpFactory> {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = importSharpModule()
      .then((module) => module.default)
      .catch((error) => {
        sharpFactoryPromise = null;
        const detail = error instanceof Error ? error.message : "Error desconocido";
        throw new Error(
          `No se pudo cargar el módulo de imágenes (sharp) para linux-x64. Reinstala dependencias y reinicia el servidor. Detalle: ${detail}`,
        );
      });
  }

  return sharpFactoryPromise;
}

export type ContextoEvidenciaFoto =
  | "persona_perfil"
  | "lote_ingreso"
  | "lote_clasificacion"
  | "adelanto"
  | "liquidacion";

type SaveEvidenciaFotoInput = {
  file: FormDataEntryValue | null;
  contexto: ContextoEvidenciaFoto;
  entidadOrigen: "personas" | "lotes" | "adelantos" | "liquidaciones";
  entidadId: number;
  personaId?: number | null;
  loteId?: number | null;
  pedidoId?: number | null;
  adelantoId?: number | null;
  liquidacionId?: number | null;
  observaciones?: string | null;
};

type SaveEvidenciaFotoResult = {
  ok: boolean;
  guardada: boolean;
  errorMessage?: string;
  rutaImagen?: string;
  rutaThumb?: string;
};

function isAllowedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function saveEvidenciaFoto(input: SaveEvidenciaFotoInput): Promise<SaveEvidenciaFotoResult> {
  if (!(input.file instanceof File) || input.file.size <= 0) {
    return { ok: true, guardada: false };
  }

  if (!isAllowedImage(input.file)) {
    return {
      ok: false,
      guardada: false,
      errorMessage: "Formato inválido. Usa JPG, PNG o WEBP.",
    };
  }

  if (input.file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      guardada: false,
      errorMessage: "La imagen supera el límite de 12MB.",
    };
  }

  try {
    const sharp = await getSharpFactory();
    const sourceBuffer = Buffer.from(await input.file.arrayBuffer());
    const imageId = `${Date.now()}-${randomUUID()}`;

    const relativeDir = path.posix.join("uploads", "evidencias", input.contexto);
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const imageFileName = `${imageId}.jpg`;
    const thumbFileName = `${imageId}-thumb.jpg`;

    const imageAbsolutePath = path.join(absoluteDir, imageFileName);
    const thumbAbsolutePath = path.join(absoluteDir, thumbFileName);

    const processedImage = sharp(sourceBuffer)
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true });

    const [imageOutput, thumbOutput] = await Promise.all([
      processedImage.toBuffer({ resolveWithObject: true }),
      sharp(sourceBuffer)
        .rotate()
        .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 68, mozjpeg: true })
        .toBuffer({ resolveWithObject: true }),
    ]);

    await Promise.all([
      fs.writeFile(imageAbsolutePath, imageOutput.data),
      fs.writeFile(thumbAbsolutePath, thumbOutput.data),
    ]);

    const rutaImagen = `/${path.posix.join(relativeDir, imageFileName)}`;
    const rutaThumb = `/${path.posix.join(relativeDir, thumbFileName)}`;

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("evidencias_fotos").insert({
      contexto: input.contexto,
      entidad_origen: input.entidadOrigen,
      entidad_id: input.entidadId,
      persona_id: input.personaId ?? null,
      lote_id: input.loteId ?? null,
      pedido_id: input.pedidoId ?? null,
      adelanto_id: input.adelantoId ?? null,
      liquidacion_id: input.liquidacionId ?? null,
      ruta_imagen: rutaImagen,
      ruta_thumb: rutaThumb,
      mime_type: "image/jpeg",
      ancho: Number(imageOutput.info.width ?? 0),
      alto: Number(imageOutput.info.height ?? 0),
      bytes: Number(imageOutput.info.size ?? imageOutput.data.length),
      observaciones: input.observaciones ?? null,
    });

    if (error) {
      return {
        ok: false,
        guardada: false,
        errorMessage: `No se pudo guardar referencia DB: ${error.message}`,
      };
    }

    return {
      ok: true,
      guardada: true,
      rutaImagen,
      rutaThumb,
    };
  } catch (error) {
    return {
      ok: false,
      guardada: false,
      errorMessage: error instanceof Error ? error.message : "Error desconocido procesando imagen.",
    };
  }
}
