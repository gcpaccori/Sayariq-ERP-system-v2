"use client";

import Link from "next/link";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useMemo } from "react";
import {
  ArrowRight,
  Banknote,
  Boxes,
  ChartColumnBig,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
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
  executiveChart: {
    categories: string[];
    ventas: number[];
    cobros: number[];
    pagosProductor: number[];
    balance: number[];
    pendienteCobro: number;
    pendientePago: number;
    agingLabels: string[];
    agingCobrar: number[];
    agingPagar: number[];
    conversionLabels: string[];
    conversionValues: number[];
  };
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
    image: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=80",
    description: "Gestión maestra de productores, clientes y equipo operativo con trazabilidad documental.",
    icon: Users,
  },
  {
    title: "Módulo 2 · Almacén",
    href: "/almacen",
    image: "/company-images/empresa%20faja%20de%20lavado.jpeg",
    description: "Control de lotes y clasificación para mantener continuidad y calidad en la región.",
    icon: Boxes,
  },
  {
    title: "Módulo 3 · Pedidos",
    href: "/pedidos",
    image: "/company-images/producto.png",
    description: "Pipeline comercial de pedidos y asignaciones para responder a la demanda del mercado local.",
    icon: ClipboardList,
  },
  {
    title: "Módulo 4 · Kardex",
    href: "/kardex",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    description: "Auditoría integral de movimientos físicos y financieros para decisiones con evidencia.",
    icon: ReceiptText,
  },
  {
    title: "Módulo 5 · Liquidaciones",
    href: "/liquidaciones",
    image: "/company-images/curcuma.jpg",
    description: "Liquidación de operaciones y adelantos con precisión para escenarios de alta rotación.",
    icon: Banknote,
  },
  {
    title: "Módulo 6 · Cobranzas",
    href: "/cobranzas",
    image: "/company-images/jengibre.jpg",
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
    image: "/company-images/persnal.jpg",
    description: "Visibilidad de cuenta por productor para relaciones de largo plazo y transparencia.",
    icon: Sprout,
  },
  {
    title: "Módulo 9 · Rentabilidad",
    href: "/rentabilidad-lotes",
    image: "/company-images/curcuma%20planta.jpg",
    description: "Rentabilidad por lote para priorizar inversiones y proteger márgenes en contexto competitivo.",
    icon: TrendingUp,
  },
  {
    title: "Módulo 10 · Clasificación Neta",
    href: "/clasificacion-neta",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    description: "Control de variaciones de peso y auditoría de reclasificación con impacto directo en kardex.",
    icon: ClipboardList,
  },
];

function formatCurrency(value: number) {
  return `S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`;
}

export default function DashboardPersonasUi({ people, executiveChart }: Props) {
  const chartOptions = useMemo<Highcharts.Options>(() => {
    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 300,
        spacingLeft: 0,
        spacingRight: 0,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        itemStyle: {
          color: "#334155",
          fontSize: "11px",
          fontWeight: "600",
        },
      },
      xAxis: {
        categories: executiveChart.categories,
        lineColor: "#DDE3F4",
        tickColor: "#DDE3F4",
        labels: { style: { color: "#475569", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: "#E7ECF9",
        labels: {
          style: { color: "#64748B", fontSize: "11px" },
          formatter: function () {
            const value = typeof this.value === "number" ? this.value : Number(this.value ?? 0);
            return `S/ ${Math.round(value).toLocaleString("es-PE")}`;
          },
        },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        style: { color: "#E2E8F0" },
        formatter: function () {
          const rows = (this.points ?? [])
            .map((point) => {
              const value = point.y ?? 0;
              return `<div style=\"display:flex;justify-content:space-between;gap:12px;\"><span style=\"color:${point.color};font-weight:600;\">${point.series.name}</span><span>S/ ${Number(value).toLocaleString("es-PE")}</span></div>`;
            })
            .join("");

          return `<div style=\"min-width:210px\"><div style=\"margin-bottom:6px;font-size:12px;color:#CBD5E1\">${this.x ?? ""}</div>${rows}</div>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          pointPadding: 0.1,
          groupPadding: 0.12,
        },
        series: {
          animation: false,
          marker: { enabled: false },
        },
      },
      series: [
        {
          type: "column",
          name: "Ventas",
          data: executiveChart.ventas,
          color: "#6366F1",
        },
        {
          type: "column",
          name: "Cobros",
          data: executiveChart.cobros,
          color: "#0EA5E9",
        },
        {
          type: "column",
          name: "Pagos productor",
          data: executiveChart.pagosProductor,
          color: "#F97316",
        },
        {
          type: "spline",
          name: "Balance neto",
          data: executiveChart.balance,
          color: "#059669",
          lineWidth: 2,
          zIndex: 4,
        },
      ],
    };
  }, [executiveChart]);

  const agingChartOptions = useMemo<Highcharts.Options>(() => {
    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 260,
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: executiveChart.agingLabels,
        labels: { style: { color: "#475569", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: "#E7ECF9",
        labels: {
          style: { color: "#64748B", fontSize: "11px" },
          formatter: function () {
            const value = typeof this.value === "number" ? this.value : Number(this.value ?? 0);
            return `S/ ${Math.round(value).toLocaleString("es-PE")}`;
          },
        },
      },
      legend: {
        itemStyle: {
          color: "#334155",
          fontSize: "11px",
          fontWeight: "600",
        },
      },
      tooltip: {
        shared: true,
        valuePrefix: "S/ ",
        valueDecimals: 0,
      },
      plotOptions: {
        column: {
          borderRadius: 6,
        },
        series: {
          animation: false,
        },
      },
      series: [
        {
          type: "column",
          name: "Por cobrar",
          data: executiveChart.agingCobrar,
          color: "#2563EB",
        },
        {
          type: "column",
          name: "Por pagar",
          data: executiveChart.agingPagar,
          color: "#DC2626",
        },
      ],
    };
  }, [executiveChart]);

  const conversionChartOptions = useMemo<Highcharts.Options>(() => {
    return {
      chart: {
        type: "bar",
        backgroundColor: "transparent",
        height: 260,
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: executiveChart.conversionLabels,
        labels: { style: { color: "#475569", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        allowDecimals: false,
        gridLineColor: "#E7ECF9",
        labels: {
          style: { color: "#64748B", fontSize: "11px" },
        },
      },
      legend: { enabled: false },
      tooltip: {
        pointFormatter: function () {
          return `<span style=\"color:${this.color}\">●</span> ${this.category}: <b>${Number(this.y ?? 0).toLocaleString("es-PE")}</b><br/>`;
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          dataLabels: {
            enabled: true,
            style: {
              textOutline: "none",
              color: "#0F172A",
              fontSize: "11px",
            },
          },
        },
        series: {
          animation: false,
        },
      },
      series: [
        {
          type: "bar",
          name: "Cantidad",
          data: executiveChart.conversionValues,
          colorByPoint: true,
          colors: ["#6366F1", "#0EA5E9", "#F59E0B", "#10B981"],
        },
      ],
    };
  }, [executiveChart]);

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

            <div className="hidden rounded-2xl border border-[#D8CEF6] bg-white/85 p-4 shadow-sm backdrop-blur-sm lg:block">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6A53C9]">Pulso operativo (6 meses)</p>
                <span className="rounded-full bg-[#EEF1FF] px-2 py-1 text-[11px] font-semibold text-[#4C46C8]">Solo escritorio</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[#E3DAFF] bg-white px-3 py-2">
                  <p className="text-[#66708F]">Pendiente por cobrar</p>
                  <p className="mt-1 text-sm font-semibold text-[#1E293B]">{formatCurrency(executiveChart.pendienteCobro)}</p>
                </div>
                <div className="rounded-lg border border-[#E3DAFF] bg-white px-3 py-2">
                  <p className="text-[#66708F]">Pendiente por pagar</p>
                  <p className="mt-1 text-sm font-semibold text-[#1E293B]">{formatCurrency(executiveChart.pendientePago)}</p>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-[#E3DAFF] bg-white px-2 pb-2 pt-3">
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              </div>

              {people.length === 0 ? (
                <p className="mt-2 text-xs text-[#64748B]">Aún no hay datos de personas; el gráfico se activará conforme ingresen liquidaciones.</p>
              ) : null}
            </div>

          </div>
        </section>

        <section className="mt-6 hidden gap-4 lg:grid lg:grid-cols-2">
          <article className="rounded-2xl border border-[#DBD8E8] bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-[#1F2233]">Aging de pendientes</p>
              <p className="text-xs text-[#64748B]">Rango de antigüedad de saldos por cobrar y por pagar</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E3DAFF] bg-white px-2 pb-2 pt-3">
              <HighchartsReact highcharts={Highcharts} options={agingChartOptions} />
            </div>
          </article>

          <article className="rounded-2xl border border-[#DBD8E8] bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-[#1F2233]">Conversión operativa (90 días)</p>
              <p className="text-xs text-[#64748B]">Lotes en flujo desde ingreso hasta cobro de cliente</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E3DAFF] bg-white px-2 pb-2 pt-3">
              <HighchartsReact highcharts={Highcharts} options={conversionChartOptions} />
            </div>
          </article>
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B1E]/92 via-[#1B2450]/64 to-[#111931]/20" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#F3EEFF] shadow-sm backdrop-blur-[1px]">
                    <Icon size={14} /> {module.title}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-[#F8FAFF] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">{module.description}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#DBE3FF] [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
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
