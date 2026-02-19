"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChartColumnBig,
  ClipboardList,
  CreditCard,
  Banknote,
  ReceiptText,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";

const moduleCards = [
  {
    title: "Personas",
    href: "/personas",
    description: "Directorio maestro de productores, clientes y operadores.",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
    accent: "border-blue-100",
  },
  {
    title: "Almacen",
    href: "/almacen",
    description: "Control de lotes, clasificacion e inventario.",
    icon: Boxes,
    color: "bg-amber-50 text-amber-600",
    accent: "border-amber-100",
  },
  {
    title: "Pedidos",
    href: "/pedidos",
    description: "Gestion comercial de demanda y asignaciones.",
    icon: ClipboardList,
    color: "bg-emerald-50 text-emerald-600",
    accent: "border-emerald-100",
  },
  {
    title: "Kardex",
    href: "/kardex",
    description: "Historial unificado de producto y dinero.",
    icon: ReceiptText,
    color: "bg-violet-50 text-violet-600",
    accent: "border-violet-100",
  },
  {
    title: "Liquidaciones",
    href: "/liquidaciones",
    description: "Adelantos, liquidaciones y pagos parciales.",
    icon: Banknote,
    color: "bg-teal-50 text-teal-600",
    accent: "border-teal-100",
  },
  {
    title: "Cobranzas",
    href: "/cobranzas",
    description: "Cuentas por cobrar y seguimiento de pagos.",
    icon: CreditCard,
    color: "bg-rose-50 text-rose-600",
    accent: "border-rose-100",
  },
  {
    title: "Analitica",
    href: "/analitica",
    description: "KPIs de performance comercial y financiera.",
    icon: ChartColumnBig,
    color: "bg-indigo-50 text-indigo-600",
    accent: "border-indigo-100",
  },
  {
    title: "Estado Productor",
    href: "/estado-cuenta-productor",
    description: "Cuenta por productor con adelantos y saldos.",
    icon: Sprout,
    color: "bg-lime-50 text-lime-600",
    accent: "border-lime-100",
  },
  {
    title: "Rentabilidad",
    href: "/rentabilidad-lotes",
    description: "Rentabilidad por lote y producto.",
    icon: TrendingUp,
    color: "bg-sky-50 text-sky-600",
    accent: "border-sky-100",
  },
];

export default function DashboardUI() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight text-balance">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Acceso rapido a todos los modulos del sistema
        </p>
      </div>

      {/* Module cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {moduleCards.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={`group relative flex flex-col gap-3 rounded-2xl border ${mod.accent} bg-surface p-5 transition-all duration-200 hover:shadow-md hover:border-accent/30`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-text-muted group-hover:text-accent transition-colors">
                Abrir modulo
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
