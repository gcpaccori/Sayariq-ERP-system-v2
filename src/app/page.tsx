export default function Home() {
  const modulos = [
    { href: "/personas", label: "Módulo 1: Personas" },
    { href: "/almacen", label: "Módulo 2: Almacén" },
    { href: "/pedidos", label: "Módulo 3: Pedidos" },
    { href: "/kardex", label: "Módulo 4: Kardex" },
    { href: "/liquidaciones", label: "Módulo 5: Liquidaciones" },
    { href: "/cobranzas", label: "Módulo 6: Cobranzas" },
    { href: "/analitica", label: "Módulo 7: Analítica" },
    { href: "/estado-cuenta-productor", label: "Módulo 8: Estado Productor" },
    { href: "/rentabilidad-lotes", label: "Módulo 9: Rentabilidad" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Sayariq ERP v2</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">Inicio operacional</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
            Interfaz base estilo Google para acceder rápido a cada módulo y avanzar con integración por fases, sin romper la lógica de negocio.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <a href="/dashboard" className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Abrir dashboard
            </a>
            <a href="/personas" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:bg-white">
              Ir a Personas
            </a>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Acceso rápido</h2>
            <span className="text-xs text-slate-500">9 módulos</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => (
              <a
                key={modulo.href}
                href={modulo.href}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-white"
              >
                {modulo.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
