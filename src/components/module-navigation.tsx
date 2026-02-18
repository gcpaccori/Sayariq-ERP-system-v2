'use client';

import Link from "next/link";
import { Home, Warehouse, ShoppingCart, DollarSign, Users, BarChart3, TrendingUp } from "lucide-react";

interface ModuleNavigationProps {
  currentModule?: string;
}

export default function ModuleNavigation({ currentModule }: ModuleNavigationProps) {
  const modules = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/almacen", label: "Almacén", icon: Warehouse },
    { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
    { href: "/cobranzas", label: "Cobranzas", icon: DollarSign },
    { href: "/personas", label: "Personas", icon: Users },
    { href: "/analitica", label: "Analítica", icon: TrendingUp },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-3 md:px-6">
        <div className="flex overflow-x-auto gap-1 py-2">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModule === module.href || currentModule === module.label.toLowerCase();
            
            return (
              <Link
                key={module.href}
                href={module.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                {module.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
