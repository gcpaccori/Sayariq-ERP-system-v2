"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

function fmtMoney(value: unknown) {
  const n = Number(value ?? 0);
  return `S/ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function fmtDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function readJsonParam(params: URLSearchParams, key: string) {
  const raw = params.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function ComprobantePage() {
  const search = useSearchParams();
  const tipo = (search.get("tipo") ?? "").toLowerCase();
  const data = useMemo(() => readJsonParam(search, "data"), [search]);

  if (!data || !["liquidacion", "adelanto", "pago"].includes(tipo)) {
    return <main className="mx-auto max-w-3xl p-6">No se pudo generar el comprobante.</main>;
  }

  const title = tipo === "liquidacion" ? "Comprobante de Liquidación" : tipo === "adelanto" ? "Comprobante de Adelanto" : "Comprobante de Pago";
  const codigo = String(data.codigo ?? data.numero_comprobante ?? data.numero ?? "-");

  const pairs = Object.entries(data)
    .filter(([k]) => k !== "codigo")
    .map(([k, v]) => {
      if (typeof v === "number" && (k.includes("monto") || k.includes("total") || k.includes("precio"))) {
        return [k, fmtMoney(v)] as const;
      }
      if (k.includes("fecha")) return [k, fmtDate(v)] as const;
      return [k, String(v ?? "-")] as const;
    });

  return (
    <main className="mx-auto max-w-4xl p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/liquidaciones" className="rounded border px-3 py-2 text-sm">← Volver</Link>
        <button onClick={() => window.print()} className="rounded bg-[#1A73E8] px-3 py-2 text-sm font-semibold text-white">Imprimir</button>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 border-b pb-4">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Sayariq ERP</p>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600">Código interno / referencia: <strong>{codigo}</strong></p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {pairs.map(([label, value]) => (
            <div key={label} className="rounded border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label.replaceAll("_", " ")}</p>
              <p className="mt-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 pt-8">
          <div className="border-t pt-2 text-center text-xs text-gray-600">Firma responsable</div>
          <div className="border-t pt-2 text-center text-xs text-gray-600">Sello empresa</div>
        </div>
      </section>
    </main>
  );
}
