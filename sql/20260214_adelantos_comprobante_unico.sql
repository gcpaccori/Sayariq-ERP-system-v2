BEGIN;

ALTER TABLE adelantos
ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(30);

UPDATE adelantos
SET numero_comprobante = NULL
WHERE numero_comprobante IS NOT NULL
  AND btrim(numero_comprobante) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_adelantos_numero_comprobante
  ON adelantos (numero_comprobante)
  WHERE numero_comprobante IS NOT NULL;

COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS public.evidencias_fotos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contexto TEXT NOT NULL,
  entidad_origen TEXT NOT NULL,
  entidad_id BIGINT NOT NULL,

  persona_id BIGINT NULL,
  lote_id BIGINT NULL,
  pedido_id BIGINT NULL,
  adelanto_id BIGINT NULL,
  liquidacion_id BIGINT NULL,

  ruta_imagen TEXT NOT NULL,
  ruta_thumb TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  ancho INTEGER NOT NULL,
  alto INTEGER NOT NULL,
  bytes BIGINT NOT NULL,
  observaciones TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checks de dominio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evidencias_fotos_contexto_chk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_contexto_chk
      CHECK (contexto IN (
        'persona_perfil',
        'lote_ingreso',
        'lote_clasificacion',
        'adelanto',
        'liquidacion'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evidencias_fotos_entidad_origen_chk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_entidad_origen_chk
      CHECK (entidad_origen IN (
        'personas',
        'lotes',
        'adelantos',
        'liquidaciones'
      ));
  END IF;
END $$;

-- Índices para consulta rápida en vistas/tablas
CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_contexto_origen_entidad
  ON public.evidencias_fotos (contexto, entidad_origen, entidad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_persona
  ON public.evidencias_fotos (persona_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_lote
  ON public.evidencias_fotos (lote_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_pedido
  ON public.evidencias_fotos (pedido_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_adelanto
  ON public.evidencias_fotos (adelanto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidencias_fotos_liquidacion
  ON public.evidencias_fotos (liquidacion_id, created_at DESC);

-- FKs opcionales (NULL permitidos) para integridad referencial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidencias_fotos_persona_fk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_persona_fk
      FOREIGN KEY (persona_id) REFERENCES public.personas(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidencias_fotos_lote_fk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_lote_fk
      FOREIGN KEY (lote_id) REFERENCES public.lotes(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidencias_fotos_pedido_fk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_pedido_fk
      FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidencias_fotos_adelanto_fk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_adelanto_fk
      FOREIGN KEY (adelanto_id) REFERENCES public.adelantos(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidencias_fotos_liquidacion_fk'
  ) THEN
    ALTER TABLE public.evidencias_fotos
      ADD CONSTRAINT evidencias_fotos_liquidacion_fk
      FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;