'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Home, BarChart3 } from 'lucide-react';

const MODULOS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/personas', label: 'Personas', icon: '👥' },
  { href: '/almacen', label: 'Almacén', icon: '📦' },
  { href: '/pedidos', label: 'Pedidos', icon: '📋' },
  { href: '/kardex', label: 'Kardex', icon: '📈' },
  { href: '/liquidaciones', label: 'Liquidaciones', icon: '💰' },
  { href: '/cobranzas', label: 'Cobranzas', icon: '💳' },
  { href: '/analitica', label: 'Analítica', icon: '📉' },
  { href: '/estado-cuenta-productor', label: 'Estado Productor', icon: '🌾' },
  { href: '/rentabilidad-lotes', label: 'Rentabilidad', icon: '📍' },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export function AppLayout({ children, title, description, showBackButton = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header Sidebar */}
          <div className="border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                  S
                </div>
                <span className="font-bold text-sm">SAYARIQ ERP</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Menú Principal
            </h3>
            {MODULOS.map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <span className="text-lg">{modulo.icon}</span>
                <span>{modulo.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer Sidebar */}
          <div className="border-t border-gray-800 p-4">
            <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <Home size={16} />
              <span>Volver a inicio</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Menu size={24} />
              </button>
              <div>
                {title && <h1 className="text-lg font-bold text-gray-900">{title}</h1>}
                {description && <p className="text-xs text-gray-600 mt-0.5">{description}</p>}
              </div>
            </div>

            {showBackButton && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Atrás
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
