"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Boxes,
  ChartColumnBig,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  MapPin,
  PackageSearch,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  Sprout,
  TrendingUp,
  UserRound,
  Users,
  X,
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/almacen", label: "Almacén", icon: Boxes },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/kardex", label: "Kardex", icon: ReceiptText },
  { href: "/liquidaciones", label: "Liquidaciones", icon: Banknote },
  { href: "/cobranzas", label: "Cobranzas", icon: CreditCard },
  { href: "/analitica", label: "Analítica", icon: ChartColumnBig },
  { href: "/estado-cuenta-productor", label: "Estado productor", icon: Sprout },
  { href: "/rentabilidad-lotes", label: "Rentabilidad", icon: TrendingUp },
];

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

function formatCurrency(value: number) {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardPersonasUi({ people }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<DashboardPerson | null>(null);

  const filteredPeople = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;

    return people.filter((person) => {
      const haystack = [
        person.nombreCompleto,
        person.documento,
        person.direccion ?? "",
        person.roles.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [people, query]);

  const openCreatePanel = () => {
    setSelectedPerson(null);
    setIsModalOpen(true);
  };

  const openEditPanel = (person: DashboardPerson) => {
    setSelectedPerson(person);
    setIsModalOpen(true);
  };

  return (
    <main className="relative min-h-screen bg-white text-gray-900">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#E5E7EB] bg-[#FCFDFF] p-3 transition-transform duration-300 md:static md:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-start justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">Sayariq</p>
              <p className="text-sm font-semibold text-[#202124]">ERP Workspace</p>
              <p className="text-[11px] text-[#5F6368]">Operación central</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">Navegación</p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    active
                      ? "border-[#D2E3FC] bg-[#E8F0FE] text-[#174EA6]"
                      : "border-[#E5E7EB] bg-white text-[#3C4043] hover:border-[#D2E3FC] hover:bg-[#F6F9FE]"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon size={16} className={active ? "text-[#1A73E8]" : "text-[#5F6368]"} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F6368]">Estado</p>
            <p className="mt-1 text-xs text-[#3C4043]">Interfaz base lista para escalar módulos con diseño consistente.</p>
          </div>
        </aside>

        <section className="flex-1 p-3 md:p-4">
          <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Centro de módulos</p>
                <p className="text-xs text-gray-500">Diseño compacto para operación diaria y equipos de alto volumen.</p>
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

          <header className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-gray-200 bg-white p-2 md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <div className="relative min-w-56 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar personas por nombre, documento, rol..."
                className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1A73E8]"
              />
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-3 py-2 text-sm font-medium text-white"
              onClick={openCreatePanel}
            >
              <Plus size={16} />
              Nueva persona
            </button>
          </header>

          <section className="space-y-2">
            {filteredPeople.map((person) => (
              <article
                key={person.id}
                className="group relative overflow-hidden rounded-lg border border-gray-200 bg-[#F8F9FA] px-3 py-2.5 transition duration-200 hover:bg-white"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#4285F4] via-[#EA4335] via-60% to-[#34A853] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="grid items-center gap-2 md:grid-cols-[2.3fr_1.3fr_1.6fr_1fr_auto]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F0FE] text-xs font-semibold text-[#1A73E8]">
                      {initials(person.nombreCompleto) || <UserRound size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{person.nombreCompleto}</p>
                      <p className="truncate text-[11px] text-gray-500">{person.roles.join(", ") || "sin rol"}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="inline-block rounded bg-white px-2 py-1 font-mono text-[11px] text-gray-700">
                      {person.tipoDocumento} {person.documento}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center gap-1 text-[12px] text-gray-600">
                    <MapPin size={14} />
                    <span className="truncate">{person.direccion || "Sin ubicación"}</span>
                  </div>

                  <div className={`text-sm font-semibold ${person.saldo < 0 ? "text-red-600" : "text-green-600"}`}>
                    S/ {formatCurrency(person.saldo)}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs hover:border-[#1A73E8] hover:text-[#1A73E8]"
                      onClick={() => openEditPanel(person)}
                    >
                      <span className="inline-flex items-center gap-1">
                        <PencilLine size={13} /> Editar
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filteredPeople.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500">
                No hay registros para el filtro actual.
              </div>
            ) : null}
          </section>
        </section>

        <aside
          className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-gray-200 bg-white p-4 shadow-xl transition-transform duration-300 ${
            isModalOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {selectedPerson ? `Editar: ${selectedPerson.nombreCompleto}` : "Crear nueva persona"}
              </p>
              <p className="text-xs text-gray-500">Vista rápida lateral (estilo Google).</p>
            </div>
            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-gray-100"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded border border-gray-200 p-2.5">
              <p className="text-xs text-gray-500">Nombre</p>
              <p>{selectedPerson?.nombreCompleto ?? "-"}</p>
            </div>
            <div className="rounded border border-gray-200 p-2.5">
              <p className="text-xs text-gray-500">Documento</p>
              <p>{selectedPerson ? `${selectedPerson.tipoDocumento} ${selectedPerson.documento}` : "-"}</p>
            </div>
            <div className="rounded border border-gray-200 p-2.5">
              <p className="text-xs text-gray-500">Roles</p>
              <p>{selectedPerson?.roles.join(", ") ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={selectedPerson ? `/personas?edit=${selectedPerson.id}` : "/personas"}
              className="rounded-full bg-[#1A73E8] px-3 py-2 text-sm text-white"
              onClick={() => setIsModalOpen(false)}
            >
              Abrir formulario completo
            </Link>
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-2 text-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
