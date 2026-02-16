#!/usr/bin/env node

const fs = require("fs");
const { Pool } = require("pg");

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
  console.log("⚠️  No se encontró .env.local");
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ Error: SUPABASE_DB_URL es requerido");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function checkKardexConstraint() {
  const client = await pool.connect();

  try {
    console.log("▶️  Revisando kardex_origen_check...\n");
    
    // Obtener la definición de la restricción CHECK usando pg_constraint
    const result = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.conname = 'kardex_origen_check' AND rel.relname = 'kardex'
    `);

    if (result.rows.length === 0) {
      console.log("⚠️  Restricción 'kardex_origen_check' no encontrada");
      
      // Intentar buscar todas las restricciones CHECK en kardex
      const result2 = await client.query(`
        SELECT con.conname, pg_get_constraintdef(con.oid) as definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'kardex' AND con.contype = 'c'
      `);
      
      if (result2.rows.length > 0) {
        console.log("✅ Restricciones CHECK encontradas en kardex:");
        result2.rows.forEach(row => {
          console.log(`\n  ${row.conname}:\n  ${row.definition}`);
        });
      }
    } else {
      result.rows.forEach(row => {
        console.log(`✅ Restricción encontrada:\n  ${row.conname}\n  Definición: ${row.definition}`);
      });
    }
    
    // Ver algunos registros de kardex para ver qué origen usan
    console.log("▶️  Últimos registros en kardex:\n");
    const kardex = await client.query(`
      SELECT id, origen, tipo_movimiento, descripcion, created_at
      FROM kardex
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (kardex.rows.length === 0) {
      console.log("  No hay registros en kardex");
    } else {
      kardex.rows.forEach(row => {
        console.log(`  origen: "${row.origen}" | tipo: "${row.tipo_movimiento}" | descripción: ${row.descripcion.substring(0, 50)}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkKardexConstraint();
