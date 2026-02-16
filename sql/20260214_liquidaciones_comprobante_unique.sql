BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uk_liquidaciones_numero_comprobante
ON liquidaciones (numero_comprobante)
WHERE numero_comprobante IS NOT NULL;

COMMIT;
