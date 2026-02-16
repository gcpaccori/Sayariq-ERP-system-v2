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
    <div className="mb-6">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b py-3 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Módulo 5: Liquidaciones y Adelantos</h1>
          <nav className="flex gap-2">
            <button className={`px-3 py-1 rounded ${active === "resumen" ? "bg-slate-800 text-white" : "border"}`} onClick={() => setActive("resumen")}>Resumen</button>
            <button className={`px-3 py-1 rounded ${active === "operaciones" ? "bg-slate-800 text-white" : "border"}`} onClick={() => setActive("operaciones")}>Operaciones</button>
            <button className={`px-3 py-1 rounded ${active === "liquidar" ? "bg-slate-800 text-white" : "border"}`} onClick={() => setActive("liquidar")}>Liquidar</button>
            <button className={`px-3 py-1 rounded ${active === "control" ? "bg-slate-800 text-white" : "border"}`} onClick={() => setActive("control")}>Control</button>
          </nav>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {/* KPI chips */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full border bg-white text-sm">Total Lq: <strong>{kpis.totalLiquidaciones ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-white text-sm">Prod. pendientes: <strong>{kpis.productoresPendientes ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-white text-sm">Total por pagar: <strong>{kpis.totalPorPagar ?? "-"}</strong></div>
            <div className="px-3 py-1 rounded-full border bg-white text-sm">Pagos reg.: <strong>{kpis.totalPagos ?? "-"}</strong></div>
          </div>
        </div>
      </header>
    </div>
  );
}
