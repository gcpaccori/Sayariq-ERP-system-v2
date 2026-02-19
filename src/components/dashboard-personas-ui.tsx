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
  MapPin,
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
}> = [
  {
    title: "Módulo 1 · Personas",
    href: "/personas",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80",
    description: "Gestión maestra de productores, clientes y equipo operativo con trazabilidad documental.",
    icon: Users,
  },
  {
    title: "Módulo 2 · Almacén",
    href: "/almacen",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    description: "Control de lotes y clasificación para mantener continuidad y calidad en la región.",
    icon: Boxes,
  },
  {
    title: "Módulo 3 · Pedidos",
    href: "/pedidos",
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80",
    description: "Pipeline comercial de pedidos y asignaciones para responder a la demanda del mercado local.",
    icon: ClipboardList,
  },
  {
    title: "Módulo 4 · Kardex",
    href: "/kardex",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
    description: "Auditoría integral de movimientos físicos y financieros para decisiones con evidencia.",
    icon: ReceiptText,
  },
  {
    title: "Módulo 5 · Liquidaciones",
    href: "/liquidaciones",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    description: "Liquidación de operaciones y adelantos con precisión para escenarios de alta rotación.",
    icon: Banknote,
  },
  {
    title: "Módulo 6 · Cobranzas",
    href: "/cobranzas",
    image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=1400&q=80",
    description: "Cobranza estructurada para sostener caja y competitividad frente a otros actores del rubro.",
    icon: CreditCard,
  },
  {
    title: "Módulo 7 · Analítica",
    href: "/analitica",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    description: "KPIs de mercado, operación y finanzas para competir mejor en la misma plaza.",
    icon: ChartColumnBig,
  },
  {
    title: "Módulo 8 · Estado Productor",
    href: "/estado-cuenta-productor",
    image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=1400&q=80",
    description: "Visibilidad de cuenta por productor para relaciones de largo plazo y transparencia.",
    icon: Sprout,
  },
  {
    title: "Módulo 9 · Rentabilidad",
    href: "/rentabilidad-lotes",
    image: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1400&q=80",
    description: "Rentabilidad por lote para priorizar inversiones y proteger márgenes en contexto competitivo.",
    icon: TrendingUp,
  },
];

export default function DashboardPersonasUi({ people }: Props) {
  return (
    <main className="min-h-screen bg-[#F3F2F8] text-[#1F2233]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6 md:px-8 md:pt-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#DDD9EF] bg-gradient-to-br from-[#EEE9FF] via-[#E4DAFF] to-[#D6E2FF] p-6 shadow-[0_20px_70px_rgba(122,96,224,0.18)] md:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B79DFF]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-[#9AC2FF]/35 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="mb-3 inline-flex items-center rounded-full border border-[#CDBDFF] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5A3EC8]">
                Dashboard estratégico
              </p>
              <h1 className="text-3xl font-bold leading-tight text-[#1F2030] md:text-5xl">
                Centro de módulos
                <span className="block bg-gradient-to-r from-[#7A47E8] via-[#6A72F5] to-[#4B8BFF] bg-clip-text text-transparent">
                  Operación regional competitiva
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm text-[#4C5477] md:text-base">
                Plataforma orientada al mismo mercado y la misma región, con foco en ejecución comercial, trazabilidad y
                velocidad operativa para competir frente a otras empresas del sector.
              </p>
            </div>

            <div className="rounded-2xl border border-[#D8CEF6] bg-white/70 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6A53C9]">Estado de entorno</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-[#E3DAFF] bg-white px-3 py-2">
                  <span className="text-[#4C5477]">Registros sincronizados</span>
                  <strong className="text-[#2C2F44]">{people.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#E3DAFF] bg-white px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[#4C5477]"><MapPin size={14} /> Región foco</span>
                  <strong className="text-[#2C2F44]">Sur andino</strong>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#E3DAFF] bg-white px-3 py-2">
                  <span className="text-[#4C5477]">Modo</span>
                  <strong className="text-[#5A3EC8]">Competitivo activo</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
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
                className={`group relative block overflow-hidden rounded-2xl border border-[#DBD8E8] bg-white ${layoutClass}`}
              >
                <img
                  src={module.image}
                  alt={module.title}
                  className={`w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100 ${
                    module.href === "/personas" ? "h-52 xl:h-64" : "h-40"
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1230]/85 via-[#3A2E70]/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#E7DDFF]">
                    <Icon size={14} /> {module.title}
                  </p>
                  <p className="mt-2 text-sm text-[#EEF0FF]">{module.description}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C2C8FF]">
                    Abrir módulo <ArrowRight size={12} />
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
