#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const { Pool } = require("pg");

function loadEnv(filepath) {
  if (!fs.existsSync(filepath)) return;

  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadEnv(".env.local");
loadEnv(".env");

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ Error: SUPABASE_DB_URL es requerido");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function resetPublicData() {
  const client = await pool.connect();

  try {
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows
      .map((row) => row.tablename)
      .filter((name) => name !== "schema_migrations");

    if (tables.length === 0) {
      console.log("ℹ️ No hay tablas en public para limpiar");
      return;
    }

    console.log(`▶️ Limpiando ${tables.length} tablas del esquema public...`);
    const tableList = tables
      .map((name) => `public."${name.replace(/"/g, '""')}"`)
      .join(", ");

    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);

    const verifyResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log("✅ Limpieza completada. Verificando conteos...");

    for (const row of verifyResult.rows) {
      const tableName = row.tablename;
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total FROM public."${tableName.replace(/"/g, '""')}";`
      );
      console.log(`- ${tableName}: ${countResult.rows[0].total}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

resetPublicData().catch((error) => {
  console.error("❌ Error durante la limpieza:", error.message);
  process.exit(1);
});
