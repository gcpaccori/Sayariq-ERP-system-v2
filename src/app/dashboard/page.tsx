import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MODULOS = [
  { href: '/personas', label: 'Personas', icon: '👥', description: 'Gestión de productores y clientes' },
  { href: '/almacen', label: 'Almacén', icon: '📦', description: 'Ingreso y clasificación de lotes' },
  { href: '/pedidos', label: 'Pedidos', icon: '📋', description: 'Gestión y asignación de pedidos' },
  { href: '/kardex', label: 'Kardex', icon: '📈', description: 'Movimiento de inventario' },
  { href: '/liquidaciones', label: 'Liquidaciones', icon: '💰', description: 'Liquidación de productores' },
  { href: '/cobranzas', label: 'Cobranzas', icon: '💳', description: 'Gestión de cobranzas' },
  { href: '/analitica', label: 'Analítica', icon: '📉', description: 'Reportes y análisis' },
  { href: '/estado-cuenta-productor', label: 'Estado Productor', icon: '🌾', description: 'Estado de cuenta por productor' },
  { href: '/rentabilidad-lotes', label: 'Rentabilidad', icon: '📍', description: 'Análisis de rentabilidad por lotes' },
];

async function getStats() {
  const supabase = getSupabaseServerClient();

  const [personasRes, pedidosRes, lotesRes] = await Promise.all([
    supabase.from("personas").select("id").eq("estado", "activo"),
    supabase.from("pedidos").select("id").neq("estado", "cancelado"),
    supabase.from("lotes").select("id").in("estado", ["clasificado", "asignado"]),
  ]);

  return {
    personas: personasRes.data?.length ?? 0,
    pedidos: pedidosRes.data?.length ?? 0,
    lotes: lotesRes.data?.length ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <AppLayout
      title="Dashboard"
      description="Centro de control y navegación de operaciones"
      showBackButton={false}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[
            { label: 'Personas Activas', value: stats.personas, color: 'bg-blue-50', textColor: 'text-blue-600' },
            { label: 'Pedidos Activos', value: stats.pedidos, color: 'bg-green-50', textColor: 'text-green-600' },
            { label: 'Lotes en Almacén', value: stats.lotes, color: 'bg-purple-50', textColor: 'text-purple-600' },
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.color} rounded-xl border border-gray-200 p-6`}>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Modules Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Módulos Disponibles</h2>
            <p className="text-gray-600 mt-1">Accede a cada módulo del sistema para gestionar operaciones</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-xl border border-gray-200 bg-white p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{modulo.icon}</span>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">→</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">{modulo.label}</h3>
                <p className="text-sm text-gray-600 mt-2">{modulo.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/personas?edit=0"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Nueva Persona
            </Link>
            <Link
              href="/almacen?clasificar=0"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              + Nuevo Lote
            </Link>
            <Link
              href="/pedidos"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              + Nuevo Pedido
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
