#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

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

async function checkPagos() {
  const client = await pool.connect();

  try {
    console.log("▶️  Verificando pagos_liquidacion...\n");
    
    const result = await client.query(`
      SELECT 
        p.id,
        p.liquidacion_id,
        p.lote_id,
        p.monto,
        p.fecha,
        l.numero_liquidacion,
        l.lote_id as liq_lote_id,
        l.tipo
      FROM pagos_liquidacion p
      JOIN liquidaciones l ON l.id = p.liquidacion_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log("  ❌ No hay pagos registrados");
    } else {
      console.log(`  ✅ Últimos ${result.rows.length} pagos:\n`);
      result.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ID: ${row.id}`);
        console.log(`     Liquidación: ${row.numero_liquidacion} (${row.tipo})`);
        console.log(`     Persona ID: ${row.persona_id}`);
        console.log(`     Lote en pagos_liquidacion: ${row.lote_id || 'NULL ❌'}`);
        console.log(`     Lote en liquidaciones: ${row.liq_lote_id || 'NULL'}`);
        console.log(`     Monto: S/ ${row.monto}`);
        console.log();
      });
    }

    // Ver adelantos
    console.log("\n▶️  Verificando adelantos por productor...\n");
    
    const adelantos = await client.query(`
      SELECT DISTINCT
        a.productor_id,
        COUNT(*) FILTER (WHERE a.estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE a.estado != 'pendiente') as otros
      FROM adelantos a
      GROUP BY a.productor_id
      ORDER BY a.productor_id DESC
      LIMIT 5
    `);

    if (adelantos.rows.length === 0) {
      console.log("  No hay adelantos");
    } else {
      adelantos.rows.forEach(row => {
        console.log(`  Productor ID ${row.productor_id}: ${row.pendientes} pendientes, ${row.otros} otros`);
      });
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPagos();
