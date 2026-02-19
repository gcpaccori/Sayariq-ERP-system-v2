#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Script para ejecutar migraciones SQL en Supabase usando pg
 * Uso: node scripts/run-migration.js [nombre-archivo.sql]
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Cargar variables desde .env.local manualmente
function loadEnv(filepath) {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key) {
        process.env[key] = value;
      }
    }
  }
}

try {
  loadEnv(".env.local");
} catch (e) {
  console.log("⚠️  No se encontró .env.local, usando variables de ambiente");
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ Error: SUPABASE_DB_URL es requerido. Configura .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function runMigration(filename) {
  const filepath = path.join(__dirname, "..", "sql", filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Archivo no encontrado: ${filepath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(filepath, "utf-8");
  const client = await pool.connect();

  try {
    console.log(`▶️  Ejecutando: ${filename}`);
    
    // Intentar ejecutar TODO como un único statement primero
    try {
      await client.query(sqlContent);
      console.log(`✅ Migración completada: ${filename}`);
      return;
    } catch (fullError) {
      console.log(`⚠️  Error al ejecutar como un statement, intentando por separado...`);
    }
    
    // Si falla, ejecutar statement por statement
    const statements = sqlContent
      .split(";")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("--"));

    let completed = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        completed++;
      } catch (err) {
        console.error(`   ❌ Error en: ${statement.substring(0, 60)}...`);
        console.error(`      Motivo: ${err.message}`);
      }
    }
    
    console.log(`\n✅ ${completed} de ${statements.length} statements ejecutados exitosamente`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

const filename = process.argv[2] || "20260216_pagos_liquidacion_clean.sql";
runMigration(filename);

