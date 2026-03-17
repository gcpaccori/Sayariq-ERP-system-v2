import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const EMPRESA = {
  razonSocial: "SAYARIQ AGROEXPORT S.A.C.",
  ruc: "20612345678",
  direccion: "Av. Industrial 742, La Esperanza, Trujillo, La Libertad",
  telefono: "+51 44 456789",
  email: "comprobantes@sayariq.com",
};

function fmtMoney(v: number | null | undefined) {
  return `S/ ${Number(v ?? 0).toFixed(2)}`;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 10);
}

type Props = { params: Promise<{ id: string }> };

export default async function ComprobanteLiquidacionPage({ params }: Props) {
  const { id } = await params;
  const liquidacionId = Number(id);
  if (!liquidacionId) notFound();

  const supabase = getSupabaseServerClient();

  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("id,numero_liquidacion,tipo,persona_id,lote_id,pedido_id,fecha_liquidacion,numero_comprobante,total_bruto,total_descuentos,total_adelantos,total_a_pagar,estado,estado_pago")
    .eq("id", liquidacionId)
    .maybeSingle();

  if (!liquidacion) notFound();

  const [{ data: persona }, { data: detalle }, { data: categorias }, { data: comp }] = await Promise.all([
    supabase.from("personas").select("id,nombre_completo,tipo_documento,documento,direccion,telefono").eq("id", Number(liquidacion.persona_id)).maybeSingle(),
    supabase.from("liquidacion_detalle").select("categoria_id,peso_neto,precio_kg,subtotal").eq("liquidacion_id", liquidacionId),
    supabase.from("categorias").select("id,nombre,codigo"),
    supabase
      .from("comprobantes_internos")
      .select("codigo_interno,fecha_evento,hora_evento")
      .eq("entidad_origen", "liquidaciones")
      .eq("entidad_origen_id", liquidacionId)
      .maybeSingle(),
  ]);

  const categoriaMap = new Map((categorias ?? []).map((c) => [Number(c.id), c]));
  const detalleRows = (detalle ?? []).map((row) => {
    const cat = categoriaMap.get(Number(row.categoria_id));
    return {
      categoria: cat?.nombre ?? `Categoría ${row.categoria_id}`,
      codigo: cat?.codigo ?? "-",
      kg: Number(row.peso_neto ?? 0),
      precio: Number(row.precio_kg ?? 0),
      subtotal: Number(row.subtotal ?? 0),
    };
  });

  return (
    <main className="mx-auto max-w-5xl p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/liquidaciones" className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← Volver a Liquidaciones
        </Link>
        <span className="rounded bg-[#1A73E8] px-3 py-2 text-sm font-semibold text-white">
          Imprimir / Guardar PDF (Ctrl/Cmd + P)
        </span>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-gray-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Comprobante oficial para productor</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">COMPROBANTE DE LIQUIDACIÓN</h1>
          <div className="mt-3 grid gap-1 text-sm text-gray-700 sm:grid-cols-2">
            <p><strong>Empresa:</strong> {EMPRESA.razonSocial}</p>
            <p><strong>RUC:</strong> {EMPRESA.ruc}</p>
            <p><strong>Dirección:</strong> {EMPRESA.direccion}</p>
            <p><strong>Tel:</strong> {EMPRESA.telefono} · <strong>Email:</strong> {EMPRESA.email}</p>
          </div>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded border p-3 text-sm">
            <p><strong>N° Liquidación:</strong> {liquidacion.numero_liquidacion}</p>
            <p><strong>Código interno:</strong> {comp?.codigo_interno ?? "-"}</p>
            <p><strong>Comprobante externo:</strong> {liquidacion.numero_comprobante ?? "-"}</p>
            <p><strong>Fecha liquidación:</strong> {fmtDate(liquidacion.fecha_liquidacion)}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p><strong>Productor:</strong> {persona?.nombre_completo ?? `ID ${liquidacion.persona_id}`}</p>
            <p><strong>Documento:</strong> {persona?.tipo_documento ?? "Doc"} {persona?.documento ?? "-"}</p>
            <p><strong>Dirección:</strong> {persona?.direccion ?? "-"}</p>
            <p><strong>Teléfono:</strong> {persona?.telefono ?? "-"}</p>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-base font-semibold text-gray-900">Detalle por categoría pagada</h2>
          <div className="sx-table-wrap">
            <table className="sx-table">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">Código</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Kg netos</th>
                  <th className="p-2">Precio/kg</th>
                  <th className="p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-gray-500">Sin detalle por categorías.</td>
                  </tr>
                ) : null}
                {detalleRows.map((row, idx) => (
                  <tr key={`${row.codigo}-${idx}`} className="border-b">
                    <td className="p-2">{row.codigo}</td>
                    <td className="p-2">{row.categoria}</td>
                    <td className="p-2">{row.kg.toFixed(2)}</td>
                    <td className="p-2">{fmtMoney(row.precio)}</td>
                    <td className="p-2">{fmtMoney(row.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded border p-3 text-sm">
            <p><strong>Total bruto:</strong> {fmtMoney(Number(liquidacion.total_bruto))}</p>
            <p><strong>Total descuentos:</strong> {fmtMoney(Number(liquidacion.total_descuentos))}</p>
            <p><strong>Total adelantos:</strong> {fmtMoney(Number(liquidacion.total_adelantos))}</p>
            <p className="mt-1 text-base font-bold"><strong>Total neto a pagar:</strong> {fmtMoney(Number(liquidacion.total_a_pagar))}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p><strong>Estado:</strong> {liquidacion.estado}</p>
            <p><strong>Estado de pago:</strong> {liquidacion.estado_pago}</p>
            <p><strong>Fecha emisión interna:</strong> {fmtDate(comp?.fecha_evento ?? liquidacion.fecha_liquidacion)}</p>
            <p><strong>Hora emisión interna:</strong> {comp?.hora_evento ?? "-"}</p>
          </div>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 pt-8">
          <div className="border-t pt-2 text-center text-xs text-gray-600">Firma del productor</div>
          <div className="border-t pt-2 text-center text-xs text-gray-600">Firma y sello de empresa</div>
        </footer>
      </section>
    </main>
  );
}
