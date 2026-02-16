# Sayariq ERP System v2

Proyecto base con Next.js + TypeScript preparado para conectarse con Supabase.

## Stack inicial

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase JS (`@supabase/supabase-js`)

## Configuración rápida

1. Copia variables de entorno:

	```bash
	cp .env.example .env.local
	```

2. Completa en `.env.local`:

	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY` (solo backend/migraciones)
	- `SUPABASE_DB_URL` (opcional, solo si vas a correr SQL por terminal)

3. Inicia el proyecto:

	```bash
	npm run dev
	```

## Qué sacar de Supabase (sin confusión)

Para conectar esta app con `@supabase/supabase-js`, **no** uses la cadena `postgresql://...` de "Connection String".

Debes copiar:

1. En Supabase Dashboard → **Project Settings** → **API**:

	- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
	- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (solo backend, nunca frontend)

2. Solo si vas a ejecutar SQL desde terminal (psql/scripts):

	- En **Connect** → **Connection String** usa URI para `SUPABASE_DB_URL`
	- Si te aparece "Not IPv4 compatible", usa **Session pooler** (IPv4 compatible)

## Importar SQL

- Si tu archivo es SQL de PostgreSQL, se puede correr directo en Supabase SQL Editor o por `psql`.
- Si tu archivo es SQL de MySQL, primero hay que convertir tipos/sintaxis a PostgreSQL antes de importar.

## Utilidades de Supabase

- Cliente browser: `src/lib/supabase/browser.ts`
- Cliente server: `src/lib/supabase/server.ts`

## Flujo siguiente: MySQL → Supabase

Cuando me pases tu MySQL, armamos este flujo por módulo:

1. Mapear tablas MySQL a esquema objetivo en Supabase.
2. Crear scripts de carga inicial (batch por tabla).
3. Validar conteos, llaves foráneas y consistencia.
4. Encender módulo funcional en la app (UI + queries + reglas).
5. Repetir módulo por módulo hasta cubrir todo el ERP.
