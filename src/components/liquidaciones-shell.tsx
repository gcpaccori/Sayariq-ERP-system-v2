"use client";

import { useEffect, useState } from "react";

export default function LiquidacionesShell({
  initialTab = "resumen",
  kpis = {},
}: {
  initialTab?: string;
  kpis?: Record<string, string | number>;
}) {
  const [active, setActive] = useState(initialTab);

  useEffect(() => {
    const tabs = ["resumen", "operaciones", "liquidar", "control"];
    for (const t of tabs) {
      const el = document.getElementById(`tab-${t}`);
      if (!el) continue;
      el.style.display = t === active ? "block" : "none";
    }
  }, [active]);

  return (
    <div className="mb-8">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b py-4 px-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Módulo 5: Liquidaciones y Adelantos</h1>
          <nav className="flex gap-2">
            {[
              { key: "resumen", label: "Resumen" },
              { key: "operaciones", label: "Operaciones" },
              { key: "liquidar", label: "Liquidar" },
              { key: "control", label: "Control" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
                  active === tab.key
                    ? "bg-[#1A73E8] text-white shadow-md hover:bg-[#1765CC]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-slate-50"
                }`}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          {/* KPI chips */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full border bg-blue-50 text-sm text-[#1A73E8] font-semibold">Total Lq: <strong>{kpis.totalLiquidaciones ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-green-50 text-sm text-green-700 font-semibold">Prod. pendientes: <strong>{kpis.productoresPendientes ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-yellow-50 text-sm text-yellow-700 font-semibold">Total por pagar: <strong>{kpis.totalPorPagar ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-purple-50 text-sm text-purple-700 font-semibold">Pagos reg.: <strong>{kpis.totalPagos ?? "-"}</strong></div>
          </div>
        </div>
      </header>
    </div>
  );
}
