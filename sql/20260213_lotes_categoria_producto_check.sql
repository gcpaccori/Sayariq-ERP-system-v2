BEGIN;

ALTER TABLE lotes
ADD COLUMN IF NOT EXISTS categoria_id BIGINT;

UPDATE lotes
SET producto = CASE
  WHEN lower(trim(producto)) IN ('curcuma', 'cúrcuma') THEN 'Curcuma'
  ELSE 'Jengibre'
END
WHERE producto IS NULL
   OR lower(trim(producto)) NOT IN ('jengibre', 'curcuma', 'cúrcuma');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_lotes_producto_permitido'
  ) THEN
    ALTER TABLE lotes
    ADD CONSTRAINT ck_lotes_producto_permitido
    CHECK (producto IN ('Jengibre','Curcuma'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_lotes_categoria'
  ) THEN
    ALTER TABLE lotes
    ADD CONSTRAINT fk_lotes_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES categorias(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_lotes_categoria ON lotes (categoria_id);

COMMIT;
