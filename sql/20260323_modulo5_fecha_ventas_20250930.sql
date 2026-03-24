BEGIN;

-- Normaliza la fecha de creación de usuarios del sistema en el módulo 11
-- (Seguridad de Acceso), sin tocar la tabla personas.
UPDATE auth.users
SET created_at = TIMESTAMPTZ '2025-09-30 00:00:00-05'
WHERE COALESCE(raw_user_meta_data ->> 'role', '') IN ('admin', 'operario', 'visualizador');

-- Normaliza también los pedidos existentes del módulo 3 para que el número
-- visible use el año 2025 (ej.: PED-2026-0001 -> PED-2025-0001).
WITH ped_map AS (
  SELECT
    id,
    numero_pedido AS numero_anterior,
    REGEXP_REPLACE(numero_pedido, '^PED-[0-9]{4}-', 'PED-2025-') AS numero_nuevo
  FROM pedidos
  WHERE numero_pedido ~ '^PED-[0-9]{4}-'
    AND numero_pedido NOT LIKE 'PED-2025-%'
)
UPDATE pedidos p
SET numero_pedido = m.numero_nuevo
FROM ped_map m
WHERE p.id = m.id
  AND m.numero_nuevo <> m.numero_anterior;

-- Refleja el nuevo número de pedido en kardex donde se use como referencia.
UPDATE kardex
SET
  origen_numero = REGEXP_REPLACE(origen_numero, '^PED-[0-9]{4}-', 'PED-2025-'),
  concepto = REGEXP_REPLACE(COALESCE(concepto, ''), 'PED-[0-9]{4}-([0-9]+)', 'PED-2025-\1', 'g')
WHERE (
    COALESCE(origen_numero, '') ~ '^PED-[0-9]{4}-'
    OR COALESCE(concepto, '') ~ 'PED-[0-9]{4}-[0-9]+'
  );

-- Normaliza las liquidaciones de cliente ya existentes para que en el módulo 5
-- se muestren con la fecha solicitada por gerencia: 2025-09-30.
-- Esto no altera el comportamiento de las nuevas liquidaciones que se registren después.
UPDATE liquidaciones
SET
  fecha_liquidacion = DATE '2025-09-30',
  updated_at = NOW()
WHERE tipo = 'cliente'
  AND fecha_liquidacion IS DISTINCT FROM DATE '2025-09-30';

-- Ajusta también el código visible de liquidación para que use el año 2025
-- en las ventas ya existentes (ej.: LIQ-C-2026-0001 -> LIQ-C-2025-0001).
WITH liq_map AS (
  SELECT
    id,
    numero_liquidacion AS numero_anterior,
    REGEXP_REPLACE(numero_liquidacion, '^LIQ-C-[0-9]{4}-', 'LIQ-C-2025-') AS numero_nuevo
  FROM liquidaciones
  WHERE tipo = 'cliente'
    AND numero_liquidacion ~ '^LIQ-C-[0-9]{4}-'
    AND numero_liquidacion NOT LIKE 'LIQ-C-2025-%'
)
UPDATE liquidaciones l
SET
  numero_liquidacion = m.numero_nuevo,
  updated_at = NOW()
FROM liq_map m
WHERE l.id = m.id
  AND m.numero_nuevo <> m.numero_anterior;

-- Refleja el nuevo número en los movimientos contables relacionados.
WITH liq_map AS (
  SELECT
    id,
    numero_liquidacion
  FROM liquidaciones
  WHERE tipo = 'cliente'
    AND numero_liquidacion LIKE 'LIQ-C-2025-%'
)
UPDATE kardex k
SET
  origen_numero = m.numero_liquidacion,
  concepto = REGEXP_REPLACE(
    COALESCE(k.concepto, ''),
    'LIQ-C-[0-9]{4}-([0-9]+)',
    'LIQ-C-2025-\1',
    'g'
  )
FROM liq_map m
WHERE k.origen_id = m.id
  AND k.origen IN ('liquidacion_cliente', 'pago_directo')
  AND (
    k.origen_numero IS DISTINCT FROM m.numero_liquidacion
    OR COALESCE(k.concepto, '') ~ 'LIQ-C-[0-9]{4}-[0-9]+'
  );

-- Mantiene consistente la fecha del comprobante interno ligado a esas ventas.
UPDATE comprobantes_internos ci
SET fecha_evento = DATE '2025-09-30'
FROM liquidaciones l
WHERE ci.entidad_origen = 'liquidaciones'
  AND ci.entidad_origen_id = l.id
  AND l.tipo = 'cliente'
  AND ci.fecha_evento IS DISTINCT FROM DATE '2025-09-30';

-- Ajusta también la fecha del historial de pagos/cobros mostrado en
-- "Resumen de pagos" para las ventas ya existentes.
UPDATE pagos_liquidacion p
SET fecha = DATE '2025-09-30'
FROM liquidaciones l
WHERE p.liquidacion_id = l.id
  AND l.tipo = 'cliente'
  AND p.fecha IS DISTINCT FROM DATE '2025-09-30';

-- Si esos pagos/cobros tienen comprobante interno propio, se alinea la fecha.
UPDATE comprobantes_internos ci
SET fecha_evento = DATE '2025-09-30'
FROM pagos_liquidacion p
JOIN liquidaciones l ON l.id = p.liquidacion_id
WHERE ci.entidad_origen = 'pagos_liquidacion'
  AND ci.entidad_origen_id = p.id
  AND l.tipo = 'cliente'
  AND ci.fecha_evento IS DISTINCT FROM DATE '2025-09-30';

-- Ajusta el comprobante externo visible en la columna "Comprobante"
-- para que use la fecha 20250930 en estas ventas existentes.
UPDATE liquidaciones
SET
  numero_comprobante = REGEXP_REPLACE(
    numero_comprobante,
    '^CP-[0-9]{8}-',
    'CP-20250930-'
  ),
  updated_at = NOW()
WHERE tipo = 'cliente'
  AND numero_comprobante ~ '^CP-[0-9]{8}-'
  AND numero_comprobante NOT LIKE 'CP-20250930-%';

-- Ajusta el código del comprobante interno para que use 20250930
-- si fue generado con fecha 2026 para estas mismas ventas.
UPDATE comprobantes_internos ci
SET codigo_interno = REGEXP_REPLACE(
  ci.codigo_interno,
  '^CI-(VEN|LIQ)-[0-9]{8}-',
  'CI-\1-20250930-'
)
FROM liquidaciones l
WHERE ci.entidad_origen = 'liquidaciones'
  AND ci.entidad_origen_id = l.id
  AND l.tipo = 'cliente'
  AND ci.codigo_interno ~ '^CI-(VEN|LIQ)-[0-9]{8}-'
  AND ci.codigo_interno NOT LIKE 'CI-%-20250930-%';

-- Sincroniza el payload JSON del comprobante interno con el nuevo número.
WITH liq_map AS (
  SELECT
    id,
    numero_liquidacion
  FROM liquidaciones
  WHERE tipo = 'cliente'
    AND numero_liquidacion LIKE 'LIQ-C-2025-%'
)
UPDATE comprobantes_internos ci
SET payload = jsonb_set(
  COALESCE(ci.payload, '{}'::jsonb),
  '{numero_liquidacion}',
  to_jsonb(m.numero_liquidacion),
  true
)
FROM liq_map m
WHERE ci.entidad_origen = 'liquidaciones'
  AND ci.entidad_origen_id = m.id
  AND (
    NOT (COALESCE(ci.payload, '{}'::jsonb) ? 'numero_liquidacion')
    OR COALESCE(ci.payload ->> 'numero_liquidacion', '') IS DISTINCT FROM m.numero_liquidacion
  );

COMMIT;
