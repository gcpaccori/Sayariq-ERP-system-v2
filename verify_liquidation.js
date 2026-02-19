/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://zujlcluekfkdiqcldnmw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1amxjbHVla2ZrZGlxY2xkbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTAxNDMsImV4cCI6MjA4NjU4NjE0M30.woikAaZxSP1pVA1jlaKoxtVN52Z92O5MAw9JlPeNu1k";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("\n=== 1. Buscando persona hhc ===");
  const { data: personas } = await supabase
    .from("personas")
    .select("id,nombre_completo")
    .ilike("nombre_completo", "%hhc%");
  console.log(personas);
  
  if (!personas || personas.length === 0) {
    console.log("No encontré persona hhc");
    return;
  }

  const hhcId = personas[0].id;
  console.log(`\nID de hhc: ${hhcId}\n`);

  console.log("=== 2. Liquidaciones del productor hhc ===");
  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id,numero_liquidacion,lote_id,total_bruto,total_descuentos,total_adelantos,total_a_pagar,monto_pagado")
    .eq("tipo", "productor")
    .eq("persona_id", hhcId)
    .neq("estado", "anulada");
  
  console.log(JSON.stringify(liquidaciones, null, 2));

  if (!liquidaciones || liquidaciones.length === 0) {
    console.log("No hay liquidaciones");
    return;
  }

  console.log("\n=== 3. Detalles de liquidaciones ===");
  const liqIds = liquidaciones.map(l => l.id);
  const { data: detalles } = await supabase
    .from("liquidacion_detalle")
    .select("liquidacion_id,categoria_id,peso_neto,precio_kg,subtotal")
    .in("liquidacion_id", liqIds);
  
  console.log(JSON.stringify(detalles, null, 2));

  console.log("\n=== 4. Lote LOT-2026-0013 ===");
  const { data: lotes } = await supabase
    .from("lotes")
    .select("id,numero_lote,peso_bruto_ingreso,estado")
    .eq("numero_lote", "LOT-2026-0013");
  
  console.log(JSON.stringify(lotes, null, 2));

  if (lotes && lotes.length > 0) {
    console.log("\n=== 5. Clasificación del lote ===");
    const { data: clasif } = await supabase
      .from("lote_clasificacion")
      .select("id,categoria_id,peso_bruto,peso_neto")
      .eq("lote_id", lotes[0].id);
    
    console.log(JSON.stringify(clasif, null, 2));
  }
}

verify().catch(console.error);
