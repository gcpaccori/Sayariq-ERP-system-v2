import Link from "next/link";

export default function Home() {
  const modulos = [
    { href: "/personas", label: "Módulo 1: Personas", icon: "👥" },
    { href: "/almacen", label: "Módulo 2: Almacén", icon: "📦" },
    { href: "/pedidos", label: "Módulo 3: Pedidos", icon: "📋" },
    { href: "/kardex", label: "Módulo 4: Kardex", icon: "📈" },
    { href: "/liquidaciones", label: "Módulo 5: Liquidaciones", icon: "💰" },
    { href: "/cobranzas", label: "Módulo 6: Cobranzas", icon: "💳" },
    { href: "/analitica", label: "Módulo 7: Analítica", icon: "📉" },
    { href: "/estado-cuenta-productor", label: "Módulo 8: Estado Productor", icon: "🌾" },
    { href: "/rentabilidad-lotes", label: "Módulo 9: Rentabilidad", icon: "📍" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-lg font-bold">
              S
            </div>
            <div>
              <h1 className="text-3xl font-bold">SAYARIQ ERP v2</h1>
              <p className="text-gray-400 text-sm mt-1">Sistema integral de gestión operacional agroindustrial</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm max-w-2xl">
            Interfaz moderna y unificada para gestionar cada aspecto de tu operación. Accede a los módulos desde aquí o usa el dashboard como hub principal.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        {/* CTA Section */}
        <div className="mb-12 flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            → Ir al Dashboard
          </Link>
          <Link
            href="/personas"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Empezar con Personas
          </Link>
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Acceso a Módulos</h2>
          <p className="text-gray-400 mb-6">Selecciona un módulo para comenzar a trabajar</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{modulo.icon}</span>
                  <span className="text-gray-500 group-hover:text-blue-400 transition-colors">→</span>
                </div>
                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{modulo.label}</h3>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            💡 <strong>Tip:</strong> Una vez dentro de cualquier módulo, utiliza la barra lateral (en mobile, haz clic en el menú) para navegar rápidamente entre módulos o retornar al dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
