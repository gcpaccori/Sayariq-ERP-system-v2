"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Boxes,
  ChartColumnBig,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";

type DashboardPerson = {
  id: number;
  nombreCompleto: string;
  tipoDocumento: string;
  documento: string;
  direccion: string | null;
  estado: "activo" | "inactivo";
  roles: string[];
  saldo: number;
};

type Props = {
  people: DashboardPerson[];
};

const moduleCards: Array<{
  title: string;
  href: string;
  image: string;
  description: string;
  icon: typeof LayoutDashboard;
  video?: boolean;
}> = [
  {
    title: "Módulo 1 · Personas",
    href: "/personas",
    image: "https://blog.ttisi.com/hs-fs/hubfs/070121_blog.gif?width=1200&name=070121_blog.gif",
    video: false,
    description:
      "Directorio maestro para productores, clientes y operación interna, con búsqueda rápida y datos limpios.",
    icon: Users,
  },
  {
    title: "Módulo 2 · Almacén",
    href: "/almacen",
    image: "https://picsum.photos/seed/sayariq-almacen-google/1600/900",
    description:
      "Control de lotes y clasificación con trazabilidad operativa para sostener la calidad del inventario.",
    icon: Boxes,
  },
  {
    title: "Módulo 3 · Pedidos",
    href: "/pedidos",
    image: "https://picsum.photos/seed/sayariq-pedidos-google/1600/900",
    description:
      "Orquestación comercial de demanda y asignaciones, priorizando cumplimiento y disponibilidad real.",
    icon: ClipboardList,
  },
  {
    title: "Módulo 4 · Kardex",
    href: "/kardex",
    image: "https://picsum.photos/seed/sayariq-kardex-google/1600/900",
    description:
      "Historial unificado de producto y dinero para auditoría, conciliación y decisiones de control.",
    icon: ReceiptText,
  },
  {
    title: "Módulo 5 · Liquidaciones",
    href: "/liquidaciones",
    image: "https://picsum.photos/seed/sayariq-liquidaciones-google/1600/900",
    description:
      "Ejecución financiera de adelantos y liquidaciones con enfoque en precisión, evidencia y seguimiento.",
    icon: Banknote,
  },
  {
    title: "Módulo 6 · Cobranzas",
    href: "/cobranzas",
    image: "https://picsum.photos/seed/sayariq-cobranzas-google/1600/900",
    description:
      "Gestión de cuentas por cobrar con visibilidad compacta del riesgo y ritmo de recuperación.",
    icon: CreditCard,
  },
  {
    title: "Módulo 7 · Analítica",
    href: "/analitica",
    image: "https://picsum.photos/seed/sayariq-analitica-google/1600/900",
    description:
      "KPIs accionables para entender performance comercial, operativa y financiera en un solo panel.",
    icon: ChartColumnBig,
  },
  {
    title: "Módulo 8 · Estado Productor",
    href: "/estado-cuenta-productor",
    image: "https://picsum.photos/seed/sayariq-estado-google/1600/900",
    description:
      "Vista de cuenta por productor para ordenar adelantos, pagos y saldos con contexto de campo.",
    icon: Sprout,
  },
  {
    title: "Módulo 9 · Rentabilidad",
    href: "/rentabilidad-lotes",
    image: "https://picsum.photos/seed/sayariq-rentabilidad-google/1600/900",
    description:
      "Rentabilidad por lote y producto para priorizar dónde el sistema genera mayor valor.",
    icon: TrendingUp,
  },
];

export default function DashboardPersonasUi({ people }: Props) {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="min-h-screen p-3 md:p-4">
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Centro de módulos</p>
              <p className="text-xs text-gray-500">Diseño compacto para operación diaria y equipos de alto volumen.</p>
              <p className="text-[11px] text-gray-400">Registros sincronizados: {people.length}</p>
            </div>
            <PackageSearch size={16} className="text-gray-500" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
            {moduleCards.map((module) => {
              const Icon = module.icon;
              const layoutClass =
                module.href === "/personas"
                  ? "sm:col-span-2 xl:col-span-8"
                  : module.href === "/almacen" || module.href === "/pedidos"
                    ? "xl:col-span-4"
                    : "xl:col-span-3";
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className={`group relative block overflow-hidden rounded-xl border border-gray-200 bg-[#F8F9FA] ${layoutClass}`}
                >
                  {module.video ? (
                    <video
                      src={module.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${
                        module.href === "/personas" ? "h-48 xl:h-56" : "h-36"
                      }`}
                      poster="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80"
                    />
                  ) : (
                    <img
                      src={module.image}
                      alt={module.title}
                      className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${
                        module.href === "/personas" ? "h-48 xl:h-56" : "h-36"
                      }`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <Icon size={14} />
                      {module.title}
                    </p>
                    <p className="mt-1 text-[12px] text-white/90">{module.description}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
                      Abrir módulo <ArrowRight size={12} />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
