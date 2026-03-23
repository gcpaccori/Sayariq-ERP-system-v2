ALTER TABLE pedido_asignaciones
  ADD COLUMN IF NOT EXISTS numero_jabas_estimadas INT NOT NULL DEFAULT 0;

WITH base AS (
  SELECT
    pa.id,
    pa.kg_asignados,
    pa.sin_clasificacion_neta,
    l.peso_bruto_ingreso,
    l.numero_jabas AS lote_numero_jabas,
    v.peso_neto AS clasificacion_peso_neto,
    v.numero_jabas AS clasificacion_numero_jabas
  FROM pedido_asignaciones pa
  JOIN lotes l ON l.id = pa.lote_id
  LEFT JOIN vw_lote_clasificacion_vigente v
    ON v.lote_id = pa.lote_id
   AND v.categoria_id = pa.categoria_id
)
UPDATE pedido_asignaciones pa
SET numero_jabas_estimadas = CASE
  WHEN base.sin_clasificacion_neta = TRUE
    AND COALESCE(base.lote_numero_jabas, 0) > 0
    AND COALESCE(base.peso_bruto_ingreso, 0) > 0
    THEN GREATEST(1, CEIL(base.kg_asignados / NULLIF(base.peso_bruto_ingreso / base.lote_numero_jabas, 0)))::INT
  WHEN base.sin_clasificacion_neta = FALSE
    AND COALESCE(base.clasificacion_numero_jabas, 0) > 0
    AND COALESCE(base.clasificacion_peso_neto, 0) > 0
    THEN GREATEST(1, CEIL(base.kg_asignados / NULLIF(base.clasificacion_peso_neto / base.clasificacion_numero_jabas, 0)))::INT
  ELSE 0
END
FROM base
WHERE pa.id = base.id;
