'use client';

import Link from "next/link";
import {
  Home,
  LayoutDashboard,
  Users,
  Warehouse,
  ShoppingCart,
  BookOpen,
  Receipt,
  HandCoins,
  LineChart,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface ModuleNavigationProps {
  currentModule?: string;
}

const modules = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personas", label: "Módulo 1 · Personas", icon: Users },
  { href: "/almacen", label: "Módulo 2 · Almacén", icon: Warehouse },
  { href: "/pedidos", label: "Módulo 3 · Pedidos", icon: ShoppingCart },
  { href: "/kardex", label: "Módulo 4 · Kardex", icon: BookOpen },
  { href: "/liquidaciones", label: "Módulo 5 · Liquidaciones", icon: Receipt },
  { href: "/cobranzas", label: "Módulo 6 · Cobranzas", icon: HandCoins },
  { href: "/analitica", label: "Módulo 7 · Analítica", icon: LineChart },
  { href: "/estado-cuenta-productor", label: "Módulo 8 · Estado Productor", icon: Wallet },
  { href: "/rentabilidad-lotes", label: "Módulo 9 · Rentabilidad", icon: TrendingUp },
];

export default function ModuleNavigation({ currentModule }: ModuleNavigationProps) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex-shrink-0 lg:border-b-0 lg:border-r">
      <div className="p-3 lg:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Navegación</p>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:max-h-[calc(100vh-4rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModule ? module.href.includes(currentModule) || module.href === currentModule : false;

            return (
              <Link
                key={module.href}
                href={module.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {module.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
