"use client";
// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5

import Link from "next/link";
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
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Módulo 5: Liquidaciones y Adelantos</h1>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50"
            >
              ← Inicio
            </Link>
          </div>
          <nav className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-2 sm:flex sm:flex-wrap">
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
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition duration-200 border focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 sm:w-auto ${
                  active === tab.key
                    ? "border-[#1A73E8] bg-blue-100 text-blue-900 shadow-sm hover:bg-blue-200"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-3">
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
