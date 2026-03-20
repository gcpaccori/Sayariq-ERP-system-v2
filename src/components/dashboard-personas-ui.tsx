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
    image: "/uploads/evidencias/persona_perfil/1771047186310-6c91e73e-4e07-406d-941a-08608a7cd67d.jpg",
    description: "Gestión maestra de productores, clientes y equipo operativo con trazabilidad documental.",
    icon: Users,
  },
  {
    title: "Módulo 2 · Almacén",
    href: "/almacen",
    image: "/uploads/evidencias/lote_ingreso/1771215978894-0334bd09-7814-48c1-960a-2a463c01989d.jpg",
    description: "Control de lotes y clasificación para mantener continuidad y calidad en la región.",
    icon: Boxes,
  },
  {
    title: "Módulo 3 · Pedidos",
    href: "/pedidos",
    image: "/uploads/evidencias/lote_ingreso/1771215978894-0334bd09-7814-48c1-960a-2a463c01989d.jpg",
    description: "Pipeline comercial de pedidos y asignaciones para responder a la demanda del mercado local.",
    icon: ClipboardList,
  },
  {
    title: "Módulo 4 · Kardex",
    href: "/kardex",
    image: "/uploads/evidencias/lote_ingreso/1771215978894-0334bd09-7814-48c1-960a-2a463c01989d.jpg",
    description: "Auditoría integral de movimientos físicos y financieros para decisiones con evidencia.",
    icon: ReceiptText,
  },
  {
    title: "Módulo 5 · Liquidaciones",
    href: "/liquidaciones",
    image: "/uploads/evidencias/liquidacion/1771251602137-19608288-8652-416c-8384-88942d9cd341.jpg",
    description: "Liquidación de operaciones y adelantos con precisión para escenarios de alta rotación.",
    icon: Banknote,
  },
  {
    title: "Módulo 6 · Cobranzas",
    href: "/cobranzas",
    image: "/uploads/evidencias/adelanto/1771305312216-e09ed020-eda3-499b-8583-917e7ea12618.jpg",
    description: "Cobranza estructurada para sostener caja y competitividad frente a otros actores del rubro.",
    icon: CreditCard,
  },
  {
    title: "Módulo 7 · Analítica",
    href: "/analitica",
    image: "/uploads/evidencias/lote_ingreso/1771215978894-0334bd09-7814-48c1-960a-2a463c01989d.jpg",
    description: "KPIs de mercado, operación y finanzas para competir mejor en la misma plaza.",
    icon: ChartColumnBig,
  },
  {
    title: "Módulo 8 · Estado Productor",
    href: "/estado-cuenta-productor",
    image: "/uploads/evidencias/persona_perfil/1771047186310-6c91e73e-4e07-406d-941a-08608a7cd67d.jpg",
    description: "Visibilidad de cuenta por productor para relaciones de largo plazo y transparencia.",
    icon: Sprout,
  },
  {
    title: "Módulo 9 · Rentabilidad",
    href: "/rentabilidad-lotes",
    image: "/uploads/evidencias/lote_ingreso/1771215978894-0334bd09-7814-48c1-960a-2a463c01989d.jpg",
    description: "Rentabilidad por lote para priorizar inversiones y proteger márgenes en contexto competitivo.",
    icon: TrendingUp,
  },
  {
    title: "Módulo 10 · Clasificación Neta",
    href: "/clasificacion-neta",
    image: "/uploads/evidencias/lote_clasificacion/1771277847394-75eeb12f-db93-449c-8a9b-327909cabe99.jpg",
    description: "Control de variaciones de peso y auditoría de reclasificación con impacto directo en kardex.",
    icon: ClipboardList,
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
                Control integral
              </p>
              <h1 className="text-3xl font-bold leading-tight text-[#1F2030] md:text-5xl">
                De productores a clientes
                <span className="block bg-gradient-to-r from-[#7A47E8] via-[#6A72F5] to-[#4B8BFF] bg-clip-text text-transparent">
                  Cadena de suministro unificada
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm text-[#4C5477] md:text-base">
                Gestiona toda tu operación agrícola en un mismo lugar: desde la recepción de cosechas hasta la liquidación final. Trazabilidad completa, decisiones más rápidas, márgenes protegidos.
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
