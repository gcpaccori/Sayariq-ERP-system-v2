BEGIN;

-- =============================================================
-- Codigos trazables para particiones de lote
-- - codigo_clasificacion: al clasificar por categoria
-- - codigo_division: al dividir/asignar a pedidos
-- =============================================================

ALTER TABLE lote_clasificacion
ADD COLUMN IF NOT EXISTS codigo_clasificacion VARCHAR(80);

ALTER TABLE pedido_asignaciones
ADD COLUMN IF NOT EXISTS codigo_division VARCHAR(80);

-- Backfill de clasificaciones existentes
UPDATE lote_clasificacion lc
SET codigo_clasificacion = CONCAT('CLS-', l.numero_lote, '-', UPPER(c.codigo))
FROM lotes l
JOIN categorias c ON TRUE
WHERE lc.lote_id = l.id
  AND c.id = lc.categoria_id
  AND (lc.codigo_clasificacion IS NULL OR btrim(lc.codigo_clasificacion) = '');

-- Backfill de divisiones existentes
UPDATE pedido_asignaciones pa
SET codigo_division = CONCAT('DIV-', TO_CHAR(COALESCE(pa.created_at, NOW()), 'YYYY'), '-', LPAD(pa.id::text, 8, '0'))
WHERE pa.codigo_division IS NULL OR btrim(pa.codigo_division) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lote_clasif_codigo
  ON lote_clasificacion (codigo_clasificacion)
  WHERE codigo_clasificacion IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ped_asig_codigo_division
  ON pedido_asignaciones (codigo_division)
  WHERE codigo_division IS NOT NULL;

COMMIT;
