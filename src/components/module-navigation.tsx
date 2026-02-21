'use client';

import Link from "next/link";
import { useState } from "react";
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
  ClipboardCheck,
  PanelLeft,
  PanelLeftClose,
  X,
} from "lucide-react";
import AuthUserPanel from "@/components/auth-user-panel";

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
  { href: "/clasificacion-neta", label: "Módulo 10 · Clasificación Neta", icon: ClipboardCheck },
];

export default function ModuleNavigation({ currentModule }: ModuleNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <>
      {!mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-50 inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
          aria-label="Abrir menú"
        >
          <PanelLeft size={18} />
        </button>
      ) : null}

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sayariq</p>
                  <p className="text-sm font-semibold text-slate-800">ERP Workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex rounded-lg p-2 text-slate-700 hover:bg-white"
                  aria-label="Cerrar menú"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <AuthUserPanel />
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Navegación</p>
              <nav className="space-y-1.5">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const isActive = currentModule
                    ? module.href.includes(currentModule) || module.href === currentModule
                    : false;

                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      onClick={() => setMobileOpen(false)}
                      className={`inline-flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                        isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="truncate">{module.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </>
      ) : null}

      <aside
        className={`hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-shrink-0 ${
          desktopCollapsed ? "lg:w-20" : "lg:w-72"
        }`}
      >
        <div className="w-full p-3 lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className={`${desktopCollapsed ? "lg:hidden" : ""}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sayariq</p>
              <p className="text-sm font-semibold text-slate-800">ERP Workspace</p>
            </div>
            <button
              type="button"
              onClick={() => setDesktopCollapsed((value) => !value)}
              className="hidden rounded-lg p-1.5 text-slate-700 hover:bg-white lg:inline-flex"
              aria-label="Colapsar menú"
            >
              {desktopCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 ${desktopCollapsed ? "lg:hidden" : ""}`}>
            Navegación
          </p>
          {!desktopCollapsed ? <AuthUserPanel /> : null}
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:max-h-[calc(100vh-4rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = currentModule ? module.href.includes(currentModule) || module.href === currentModule : false;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className={`inline-flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${desktopCollapsed ? "lg:justify-center" : "lg:justify-start"} ${
                    isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className={`truncate ${desktopCollapsed ? "lg:hidden" : ""}`}>{module.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
