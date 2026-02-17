"use client";
// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5

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
          <nav className="flex flex-wrap gap-2">
            {[
              { key: "resumen", label: "Resumen" },
              { key: "operaciones", label: "Operaciones" },
              { key: "liquidar", label: "Liquidar" },
              { key: "control", label: "Control" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active === tab.key}
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
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {[
              { label: "Total liquidaciones", value: kpis.totalLiquidaciones ?? "-", color: "from-blue-50 to-blue-50", textColor: "text-[#1A73E8]", icon: "📋" },
              { label: "Prod. pendientes", value: kpis.productoresPendientes ?? "-", color: "from-yellow-50 to-yellow-50", textColor: "text-yellow-700", icon: "🟡" },
              { label: "Total por pagar", value: kpis.totalPorPagar ?? "-", color: "from-green-50 to-green-50", textColor: "text-green-700", icon: "✅" },
              { label: "Pagos registrados", value: kpis.totalPagos ?? "-", color: "from-purple-50 to-purple-50", textColor: "text-purple-700", icon: "🏦" },
            ].map((card) => (
              <div key={card.label} className={`inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gradient-to-br ${card.color} px-3 py-2 shadow-sm`}>
                <span className="text-lg">{card.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</span>
                <span className={`text-sm font-bold ${card.textColor}`}>{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
