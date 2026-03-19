import Link from "next/link";

import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ tab?: "stock" | "lotes" | "dinero"; desde?: string; hasta?: string }>;

export default async function KardexPrintPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;
  const tab = search.tab ?? "stock";
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("kardex")
    .select("fecha,tipo_kardex,tipo_movimiento,origen,lote_id,categoria_id,peso_kg,monto,persona_id,concepto")
    .order("fecha", { ascending: false })
    .limit(2000);

  if (search.desde) query = query.gte("fecha", `${search.desde}T00:00:00`);
  if (search.hasta) query = query.lte("fecha", `${search.hasta}T23:59:59`);

  const { data } = await query;
  const rows = data ?? [];

  return (
    <main className="p-6">
      <div className="mb-4 flex gap-2 print:hidden">
        <span className="sx-btn sx-btn-secondary">Usa Ctrl/Cmd + P para imprimir o guardar PDF</span>
        <Link href="/kardex" className="sx-btn sx-btn-secondary">Volver</Link>
      </div>
      <h1 className="mb-3 text-xl font-semibold">Kardex ({tab})</h1>
      <p className="mb-3 text-sm">Filtros fecha: {search.desde ?? "-"} a {search.hasta ?? "-"}</p>
      <table className="sx-table">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Fecha</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Origen</th>
            <th className="p-2">Persona</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Categoria</th>
            <th className="p-2">Kg</th>
            <th className="p-2">Monto</th>
            <th className="p-2">Concepto</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((row) => (tab === "dinero" ? row.tipo_kardex === "dinero" : tab === "lotes" ? row.tipo_kardex === "producto" : true))
            .map((row, idx) => (
              <tr key={`${row.fecha}-${idx}`} className="border-b">
                <td className="p-2">{new Date(row.fecha).toLocaleString()}</td>
                <td className="p-2">{row.tipo_movimiento}</td>
                <td className="p-2">{row.origen}</td>
                <td className="p-2">{row.persona_id ?? "-"}</td>
                <td className="p-2">{row.lote_id ?? "-"}</td>
                <td className="p-2">{row.categoria_id ?? "-"}</td>
                <td className="p-2">{row.peso_kg ?? "-"}</td>
                <td className="p-2">{row.monto ?? "-"}</td>
                <td className="p-2">{row.concepto}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </main>
  );
}
