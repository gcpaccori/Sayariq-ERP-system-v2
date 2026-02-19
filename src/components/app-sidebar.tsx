"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Boxes,
  ClipboardList,
  ReceiptText,
  Banknote,
  CreditCard,
  ChartColumnBig,
  Sprout,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/almacen", label: "Almacen", icon: Boxes },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/kardex", label: "Kardex", icon: ReceiptText },
  { href: "/liquidaciones", label: "Liquidaciones", icon: Banknote },
  { href: "/cobranzas", label: "Cobranzas", icon: CreditCard },
  { href: "/analitica", label: "Analitica", icon: ChartColumnBig },
  { href: "/estado-cuenta-productor", label: "Estado Productor", icon: Sprout },
  { href: "/rentabilidad-lotes", label: "Rentabilidad", icon: TrendingUp },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-3 z-40 flex items-center justify-center rounded-xl border border-border bg-surface p-2.5 shadow-sm md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} className="text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay fixed inset-0 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <h1 className="text-base font-semibold text-text-primary tracking-tight">
              Sayariq
            </h1>
            <p className="text-xs text-text-muted mt-0.5">ERP System v2</p>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover md:hidden"
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-border-light" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Modulos
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-accent-light text-accent"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-accent"
                          : "text-text-muted group-hover:text-text-secondary"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <ChevronRight
                        size={14}
                        className="ml-auto flex-shrink-0 text-accent"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mx-3 mb-3 rounded-xl border border-border-light bg-background px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Sistema
          </p>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            Operacion central de gestion cooperativa
          </p>
        </div>
      </aside>
    </>
  );
}
