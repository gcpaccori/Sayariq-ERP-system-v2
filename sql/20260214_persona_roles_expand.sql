BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.persona_roles') IS NULL THEN
    RAISE EXCEPTION 'La tabla public.persona_roles no existe';
  END IF;

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c'
      AND n.nspname = 'public'
      AND t.relname = 'persona_roles'
      AND pg_get_constraintdef(c.oid) ILIKE '%rol%'
  LOOP
    EXECUTE format('ALTER TABLE public.persona_roles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c'
      AND n.nspname = 'public'
      AND t.relname = 'persona_roles'
      AND c.conname = 'chk_persona_roles_rol'
  ) THEN
    ALTER TABLE public.persona_roles
      ADD CONSTRAINT chk_persona_roles_rol
      CHECK (rol IN (
        'productor',
        'cliente',
        'estibador',
        'transportista',
        'operador_planta',
        'personal',
        'supervisor',
        'comprador',
        'administrativo',
        'calidad'
      ));
  END IF;
END $$;

COMMIT;

SELECT conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'persona_roles'
  AND c.contype = 'c';
