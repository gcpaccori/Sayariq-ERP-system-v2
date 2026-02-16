BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_liq_numero_comprobante
  ON liquidaciones (numero_comprobante)
  WHERE numero_comprobante IS NOT NULL;

COMMIT;
