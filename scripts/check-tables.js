#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
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
  console.log("⚠️  No se encontró .env.local");
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ Error: SUPABASE_DB_URL es requerido");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function checkTables() {
  const client = await pool.connect();

  try {
    console.log("▶️  Verificando tablas en la base de datos...\n");
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (result.rows.length === 0) {
      console.log("❌ No hay tablas en el esquema public");
      return;
    }

    console.log("📊 Tablas encontradas:");
    result.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    // Verificar específicamente por pagos_liquidacion
    console.log("\n▶️  Buscando tabla 'pagos_liquidacion'...");
    const pagoResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pagos_liquidacion'
      );
    `);

    if (pagoResult.rows[0].exists) {
      console.log("✅ Tabla 'pagos_liquidacion' EXISTE");
      
      // Mostrar columnas
      const colResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pagos_liquidacion'
        ORDER BY ordinal_position;
      `);
      
      console.log("\n  Columnas:");
      colResult.rows.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
      });
    } else {
      console.log("❌ Tabla 'pagos_liquidacion' NO EXISTE");
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
