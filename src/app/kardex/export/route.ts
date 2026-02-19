import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

type Tab = "stock" | "lotes" | "dinero";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const tab = (search.get("tab") as Tab) || "stock";

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("kardex")
    .select("fecha,tipo_kardex,tipo_movimiento,origen,origen_numero,lote_id,categoria_id,peso_kg,monto,persona_id,concepto")
    .order("fecha", { ascending: false })
    .limit(5000);

  const desde = search.get("desde");
  const hasta = search.get("hasta");
  const tipoK = search.get("tipo_kardex");
  const tipoM = search.get("tipo_movimiento");
  const persona = Number(search.get("persona") || "0");

  if (tipoK && tipoK !== "todos") query = query.eq("tipo_kardex", tipoK);
  if (tipoM && tipoM !== "todos") query = query.eq("tipo_movimiento", tipoM);
  if (persona > 0) query = query.eq("persona_id", persona);
  if (desde) query = query.gte("fecha", `${desde}T00:00:00`);
  if (hasta) query = query.lte("fecha", `${hasta}T23:59:59`);

  const { data } = await query;
  const rows = data ?? [];

  let headers: string[] = [];
  let body: string[][] = [];

  if (tab === "dinero") {
    headers = ["Fecha", "Persona ID", "Tipo", "Origen", "Concepto", "Monto"];
    body = rows
      .filter((r) => r.tipo_kardex === "dinero")
      .map((r) => [r.fecha, String(r.persona_id ?? ""), r.tipo_movimiento, r.origen, r.concepto, String(r.monto ?? "")]);
  } else if (tab === "lotes") {
    headers = ["Fecha", "Lote ID", "Persona ID", "Tipo", "Categoria ID", "Kg", "Concepto"];
    body = rows
      .filter((r) => r.tipo_kardex === "producto")
      .map((r) => [r.fecha, String(r.lote_id ?? ""), String(r.persona_id ?? ""), r.tipo_movimiento, String(r.categoria_id ?? ""), String(r.peso_kg ?? ""), r.concepto]);
  } else {
    headers = ["Fecha", "Tipo", "Origen", "Lote ID", "Categoria ID", "Kg", "Monto", "Concepto"];
    body = rows.map((r) => [r.fecha, r.tipo_movimiento, r.origen, String(r.lote_id ?? ""), String(r.categoria_id ?? ""), String(r.peso_kg ?? ""), String(r.monto ?? ""), r.concepto]);
  }

  const csv = [headers, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kardex-${tab}.csv"`,
    },
  });
}
