"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Banknote,
  Boxes,
  ChartColumnBig,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Sprout,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/almacen", label: "Almacén", icon: Boxes },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/kardex", label: "Kardex", icon: ReceiptText },
  { href: "/liquidaciones", label: "Liquidaciones", icon: Banknote },
  { href: "/cobranzas", label: "Cobranzas", icon: CreditCard },
  { href: "/analitica", label: "Analítica", icon: ChartColumnBig },
  { href: "/estado-cuenta-productor", label: "Estado productor", icon: Sprout },
  { href: "/rentabilidad-lotes", label: "Rentabilidad", icon: TrendingUp },
];

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showBackButton?: boolean;
};

export default function ModuleLayout({ 
  children, 
  title, 
  description,
  showBackButton = false,
}: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen bg-white text-gray-900">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#E5E7EB] bg-[#FCFDFF] p-3 transition-transform duration-300 md:static md:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-start justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">Sayariq</p>
              <p className="text-sm font-semibold text-[#202124]">ERP Workspace</p>
              <p className="text-[11px] text-[#5F6368]">Operación central</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">
            Navegación
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = 
                (pathname === item.href) || 
                (pathname.startsWith(item.href + "/"));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "border-[#D2E3FC] bg-[#E8F0FE] text-[#174EA6]"
                      : "border-[#E5E7EB] bg-white text-[#3C4043] hover:border-[#D2E3FC] hover:bg-[#F6F9FE]"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon size={16} className={isActive ? "text-[#1A73E8]" : "text-[#5F6368]"} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">Estado</p>
            <p className="mt-1 text-xs text-[#3C4043]">Interfaz base lista para escalar módulos con diseño consistente.</p>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 flex flex-col">
          {/* Header with back button and menu toggle */}
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <button
                  type="button"
                  className="rounded-full border border-gray-200 bg-white p-2 md:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} />
                </button>
                
                {showBackButton && (
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50 transition"
                    title="Volver al dashboard"
                  >
                    <ChevronLeft size={18} />
                  </Link>
                )}

                {(title || description) && (
                  <div>
                    {title && <p className="text-sm font-semibold">{title}</p>}
                    {description && <p className="text-xs text-gray-500">{description}</p>}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3 md:p-4">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
