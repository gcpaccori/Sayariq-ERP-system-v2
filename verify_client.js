/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://zujlcluekfkdiqcldnmw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1amxjbHVla2ZrZGlxY2xkbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTAxNDMsImV4cCI6MjA4NjU4NjE0M30.woikAaZxSP1pVA1jlaKoxtVN52Z92O5MAw9JlPeNu1k";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("\n=== Verificando CLIENTE hhc en cobranzas ===\n");

  // Liquidaciones cliente
  const { data: liqCliente } = await supabase
    .from("liquidaciones")
    .select("id,numero_liquidacion,pedido_id,total_bruto,total_a_pagar,monto_pagado,estado_pago")
    .eq("tipo", "cliente")
    .eq("persona_id", 6)
    .neq("estado", "anulada");
  
  console.log("Liquidaciones del CLIENTE hhc:");
  console.log(JSON.stringify(liqCliente, null, 2));

  if (liqCliente && liqCliente.length > 0) {
    console.log("\n=== Detalles de liquidaciones CLIENTE ===");
    const liqIds = liqCliente.map(l => l.id);
    const { data: detalles } = await supabase
      .from("liquidacion_detalle")
      .select("liquidacion_id,categoria_id,peso_neto,precio_kg,subtotal")
      .in("liquidacion_id", liqIds);
    
    console.log(JSON.stringify(detalles, null, 2));

    // Ver los pedidos
    const pedidoIds = liqCliente.filter(l => l.pedido_id).map(l => l.pedido_id);
    if (pedidoIds.length > 0) {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id,numero_pedido,precio_kg")
        .in("id", pedidoIds);
      
      console.log("\n=== Pedidos del cliente ===");
      console.log(JSON.stringify(pedidos, null, 2));
    }
  }

  console.log("\n=== Verificando asignaciones del LOT-2026-0013 ===");
  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("id,pedido_id,lote_id,kg_asignados,precio_kg,subtotal")
    .eq("lote_id", 13);
  
  console.log(JSON.stringify(asignaciones, null, 2));
}

verify().catch(console.error);
