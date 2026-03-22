import Image from "next/image";
import Link from "next/link";

import { createLoteAction, updateLoteAction } from "./actions";
import { selectCategoriasActivasCompat } from "@/lib/categorias";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import ModuleNavigation from "@/components/module-navigation";
import ModuleFormModal from "@/components/module-form-modal";

import PersonSearchField from "@/components/person-search-field";

type SearchParams = {
  q?: string;
  estado?:
  | "todos"
  | "sin_clasificar"
  | "clasificado"
  | "asignado"
  | "liquidado"
  | "cancelado";
  productor?: string;
  desde?: string;
  hasta?: string;
  page?: string;
  editar?: string;
  ver?: string;
  ok?: string;
  error?: string;
};

type Productor = {
  id: number;
  nombre_completo: string;
  tipo_documento?: string | null;
  documento?: string | null;
};

type Categoria = {
  id: number;
  codigo: string;
  nombre: string;
  precio_kg: number;
  orden: number;
};

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  categoria_id: number | null;
  fecha_ingreso: string;
  guia_ingreso: string | null;
  peso_bruto_ingreso: number;
  numero_jabas: number | null;
  chofer: string | null;
  placa_vehiculo: string | null;
  estado:
  | "sin_clasificar"
  | "clasificado"
  | "asignado"
  | "liquidado"
  | "cancelado";
  observaciones: string | null;
};

type ClasificacionRow = {
  id: number;
  lote_id: number;
  categoria_id: number;
  codigo_clasificacion: string | null;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  peso_descuento_humedad: number;
  peso_neto: number;
  fecha_clasificacion: string;
  observaciones: string | null;
};

type AsignacionLoteRow = {
  id: number;
  pedido_id: number;
  categoria_id: number;
  codigo_division: string | null;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
};

type PedidoRow = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  precio_kg: number;
  estado: string;
};

type PersonaRow = {
  id: number;
  nombre_completo: string;
};

function escapeLike(input: string) {
  return input.replaceAll("%", "").replaceAll(",", " ").trim();
}

async function getProductoresActivos() {
  const supabase = getSupabaseServerClient();
  const { data: rolesData } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("rol", "productor");

  const ids = [
    ...new Set((rolesData ?? []).map((row) => Number(row.persona_id))),
  ];
  if (ids.length === 0) return [] as Productor[];

  const { data: personasData } = await supabase
    .from("personas")
    .select("id,nombre_completo,tipo_documento,documento,estado")
    .in("id", ids)
    .eq("estado", "activo")
    .order("nombre_completo", { ascending: true });

  return (personasData ?? []).map((row) => ({
    id: Number(row.id),
    nombre_completo: String(row.nombre_completo),
    tipo_documento: row.tipo_documento ? String(row.tipo_documento) : null,
    documento: row.documento ? String(row.documento) : null,
  }));
}

async function getCategoriasActivas() {
  const supabase = getSupabaseServerClient();
  return selectCategoriasActivasCompat<Categoria>(
    supabase,
    "id,codigo,nombre,precio_kg,orden",
  );
}

async function getLotes(search: SearchParams) {
  const supabase = getSupabaseServerClient();

  const estado = search.estado ?? "todos";
  const productor = Number(search.productor ?? "0");
  const q = (search.q ?? "").trim();

  let lotesQuery = supabase
    .from("lotes")
    .select(
      "id,numero_lote,productor_id,producto,categoria_id,fecha_ingreso,guia_ingreso,peso_bruto_ingreso,numero_jabas,chofer,placa_vehiculo,estado,observaciones",
    )
    .order("id", { ascending: false });

  if (estado !== "todos") {
    lotesQuery = lotesQuery.eq("estado", estado);
  }

  if (productor > 0) {
    lotesQuery = lotesQuery.eq("productor_id", productor);
  }

  if (search.desde) {
    lotesQuery = lotesQuery.gte("fecha_ingreso", search.desde);
  }

  if (search.hasta) {
    lotesQuery = lotesQuery.lte("fecha_ingreso", search.hasta);
  }

  if (q) {
    const term = escapeLike(q);
    lotesQuery = lotesQuery.or(`numero_lote.ilike.%${term}%`);
  }

  const { data, error } = await lotesQuery;

  if (error) {
    return {
      lotes: [] as Lote[],
      productorMap: new Map<number, string>(),
      fotoIngresoThumbMap: new Map<number, string>(),
      fotoIngresoOriginalMap: new Map<number, string>(),
      errorMessage: error.message,
    };
  }

  const lotes = (data ?? []) as Lote[];
  const productorIds = [
    ...new Set(lotes.map((lote) => Number(lote.productor_id))),
  ];
  const productorMap = new Map<number, string>();

  if (productorIds.length > 0) {
    const { data: personasData } = await supabase
      .from("personas")
      .select("id,nombre_completo")
      .in("id", productorIds);

    for (const row of personasData ?? []) {
      productorMap.set(Number(row.id), String(row.nombre_completo));
    }
  }

  const loteIds = lotes.map((row) => Number(row.id));
  const fotoIngresoThumbMap = new Map<number, string>();
  const fotoIngresoOriginalMap = new Map<number, string>();
  if (loteIds.length > 0) {
    const { data: fotosData } = await supabase
      .from("evidencias_fotos")
      .select("entidad_id,ruta_thumb,ruta_imagen,created_at")
      .eq("contexto", "lote_ingreso")
      .eq("entidad_origen", "lotes")
      .in("entidad_id", loteIds)
      .order("created_at", { ascending: false });

    for (const row of fotosData ?? []) {
      const loteId = Number(row.entidad_id);
      if (!fotoIngresoThumbMap.has(loteId) && row.ruta_thumb) {
        fotoIngresoThumbMap.set(loteId, String(row.ruta_thumb));
      }
      if (!fotoIngresoOriginalMap.has(loteId) && row.ruta_imagen) {
        fotoIngresoOriginalMap.set(loteId, String(row.ruta_imagen));
      }
    }
  }

  return {
    lotes,
    productorMap,
    fotoIngresoThumbMap,
    fotoIngresoOriginalMap,
    errorMessage: "",
  };
}

async function getResumenLotes() {
  const supabase = getSupabaseServerClient();

  const { data: lotes } = await supabase
    .from("lotes")
    .select("estado,peso_bruto_ingreso")
    .neq("estado", "cancelado");

  const totalLotes = (lotes ?? []).length;
  const sinClasificar = (lotes ?? []).filter(
    (row) => row.estado === "sin_clasificar",
  ).length;
  const clasificados = (lotes ?? []).filter(
    (row) => row.estado === "clasificado",
  ).length;
  const kgAlmacen = (lotes ?? []).reduce(
    (acc, row) => acc + Number(row.peso_bruto_ingreso ?? 0),
    0,
  );

  return {
    totalLotes,
    sinClasificar,
    clasificados,
    kgAlmacen: Math.round(kgAlmacen * 100) / 100,
  };
}

async function getClasificacionByLote(loteId: number) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lote_clasificacion")
    .select(
      "id,lote_id,categoria_id,codigo_clasificacion,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,peso_descuento_humedad,peso_neto,fecha_clasificacion,observaciones",
    )
    .eq("lote_id", loteId)
    .order("id", { ascending: true });

  return (data ?? []) as ClasificacionRow[];
}

async function getAsignacionesByLote(loteId: number) {
  const supabase = getSupabaseServerClient();

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select(
      "id,pedido_id,categoria_id,codigo_division,kg_asignados,precio_kg,subtotal,fecha_asignacion",
    )
    .eq("lote_id", loteId)
    .order("id", { ascending: true });

  const rows = (asignaciones ?? []) as AsignacionLoteRow[];
  const pedidoIds = [...new Set(rows.map((row) => Number(row.pedido_id)))];

  const { data: pedidos } =
    pedidoIds.length > 0
      ? await supabase
        .from("pedidos")
        .select("id,numero_pedido,cliente_id,precio_kg,estado")
        .in("id", pedidoIds)
      : { data: [] as PedidoRow[] };

  const clienteIds = [
    ...new Set((pedidos ?? []).map((row) => Number(row.cliente_id))),
  ];
  const { data: clientes } =
    clienteIds.length > 0
      ? await supabase
        .from("personas")
        .select("id,nombre_completo")
        .in("id", clienteIds)
      : { data: [] as PersonaRow[] };

  const pedidoMap = new Map<number, PedidoRow>();
  for (const row of pedidos ?? []) {
    pedidoMap.set(Number(row.id), row as PedidoRow);
  }

  const clienteMap = new Map<number, string>();
  for (const row of clientes ?? []) {
    clienteMap.set(Number(row.id), String(row.nombre_completo));
  }

  return {
    asignaciones: rows,
    pedidoMap,
    clienteMap,
  };
}

function getEstadoLabel(estado: Lote["estado"]) {
  return estado;
}

function buildAlmacenUrl(params: {
  q?: string;
  estado?: string;
  productor?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  editar?: number | null;
  ver?: number | null;
}) {
  const searchParams = new URLSearchParams();

  const q = (params.q ?? "").trim();
  if (q) searchParams.set("q", q);

  const estado = (params.estado ?? "todos").trim();
  if (estado && estado !== "todos") searchParams.set("estado", estado);

  const productor = (params.productor ?? "").trim();
  if (productor && productor !== "0") searchParams.set("productor", productor);

  const desde = (params.desde ?? "").trim();
  if (desde) searchParams.set("desde", desde);

  const hasta = (params.hasta ?? "").trim();
  if (hasta) searchParams.set("hasta", hasta);

  if ((params.page ?? 1) > 1) {
    searchParams.set("page", String(params.page));
  }

  if ((params.editar ?? 0) > 0) {
    searchParams.set("editar", String(params.editar));
  }

  if ((params.ver ?? 0) > 0) {
    searchParams.set("ver", String(params.ver));
  }

  const query = searchParams.toString();
  return query ? `/almacen?${query}` : "/almacen";
}

export default async function AlmacenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;

  const [productores, categorias, lotesData, resumen] = await Promise.all([
    getProductoresActivos(),
    getCategoriasActivas(),
    getLotes(search),
    getResumenLotes(),
  ]);

  const editarId = Number(search.editar ?? "0");
  const verId = Number(search.ver ?? "0");

  const pageSize = 12;
  const totalRows = lotesData.lotes.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const currentPage = Number.isFinite(parsedPage)
    ? Math.min(Math.max(parsedPage, 1), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const lotesPage = lotesData.lotes.slice(pageStart, pageStart + pageSize);
  const fromItem = totalRows === 0 ? 0 : pageStart + 1;
  const toItem = Math.min(pageStart + pageSize, totalRows);

  const paginationRangeStart = Math.max(1, currentPage - 2);
  const paginationRangeEnd = Math.min(totalPages, paginationRangeStart + 4);
  const paginationRange = Array.from(
    { length: paginationRangeEnd - paginationRangeStart + 1 },
    (_, index) => paginationRangeStart + index,
  );

  const listBaseUrl = buildAlmacenUrl({
    q: search.q,
    estado: search.estado,
    productor: search.productor,
    desde: search.desde,
    hasta: search.hasta,
    page: currentPage,
  });

  const loteVerDetalle =
    verId > 0
      ? (lotesData.lotes.find((lote) => Number(lote.id) === verId) ?? null)
      : null;

  const loteEditar =
    editarId > 0
      ? (lotesData.lotes.find((lote) => Number(lote.id) === editarId) ?? null)
      : null;

  let fotoClasificacionDetalle: string | null = null;
  let fotoClasificacionOriginal: string | null = null;
  if (loteVerDetalle) {
    const supabase = getSupabaseServerClient();
    const { data: fotoClasif } = await supabase
      .from("evidencias_fotos")
      .select("ruta_thumb,ruta_imagen")
      .eq("contexto", "lote_clasificacion")
      .eq("entidad_origen", "lotes")
      .eq("entidad_id", Number(loteVerDetalle.id))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    fotoClasificacionDetalle = fotoClasif?.ruta_thumb
      ? String(fotoClasif.ruta_thumb)
      : null;
    fotoClasificacionOriginal = fotoClasif?.ruta_imagen
      ? String(fotoClasif.ruta_imagen)
      : null;
  }

  const clasificaciones = loteVerDetalle
    ? await getClasificacionByLote(loteVerDetalle.id)
    : [];
  const asignacionesDetalle = loteVerDetalle
    ? await getAsignacionesByLote(loteVerDetalle.id)
    : {
      asignaciones: [] as AsignacionLoteRow[],
      pedidoMap: new Map<number, PedidoRow>(),
      clienteMap: new Map<number, string>(),
    };
  const categoriaMap = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );

  const asignadoPorCategoria = new Map<number, number>();
  for (const row of asignacionesDetalle.asignaciones) {
    const categoriaId = Number(row.categoria_id);
    asignadoPorCategoria.set(
      categoriaId,
      (asignadoPorCategoria.get(categoriaId) ?? 0) +
      Number(row.kg_asignados ?? 0),
    );
  }

  const clasificadoNetoPorCategoria = new Map<number, number>();
  for (const row of clasificaciones) {
    const categoriaId = Number(row.categoria_id);
    clasificadoNetoPorCategoria.set(
      categoriaId,
      (clasificadoNetoPorCategoria.get(categoriaId) ?? 0) +
      Number(row.peso_neto ?? 0),
    );
  }

  const resumenComercial = Array.from(clasificadoNetoPorCategoria.entries()).map(
    ([categoria_id, clasificadoNeto]) => {
      const asignado = Number(asignadoPorCategoria.get(categoria_id) ?? 0);
      const sobrante = Math.max(0, clasificadoNeto - asignado);
      return {
        categoria_id,
        clasificado_neto: Math.round(clasificadoNeto * 100) / 100,
        asignado: Math.round(asignado * 100) / 100,
        sobrante: Math.round(sobrante * 100) / 100,
      };
    },
  );

  const totalBrutoClasificado = clasificaciones.reduce(
    (acc, row) => acc + Number(row.peso_bruto ?? 0),
    0,
  );
  const totalNetoClasificado = clasificaciones.reduce(
    (acc, row) => acc + Number(row.peso_neto ?? 0),
    0,
  );

  const detalleDiferencia = loteVerDetalle
    ? Math.round(
      (Number(loteVerDetalle.peso_bruto_ingreso) - totalBrutoClasificado) *
      100,
    ) / 100
    : 0;

  const detalleMerma =
    loteVerDetalle && Number(loteVerDetalle.peso_bruto_ingreso) > 0
      ? Math.round(
        (detalleDiferencia / Number(loteVerDetalle.peso_bruto_ingreso)) *
        10000,
      ) / 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="almacen" />
      <main className="google-2027-theme relative flex-1 bg-white text-gray-900">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.02,
            backgroundImage:
              "radial-gradient(#111827 0.8px, transparent 0.8px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl p-6">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Módulo 2: Almacén
              </h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Aquí controlas el ciclo físico del lote: ingreso, seguimiento y
                avance de estado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ModuleFormModal
                buttonLabel="Registrar Lote"
                title="Registrar lote"
                description="Registra el ingreso inicial del lote con evidencia y datos logísticos."
              >
                <form action={createLoteAction} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="text-sm">
                        Número de lote (opcional, auto)
                      </span>
                      <input
                        name="numero_lote"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <PersonSearchField
                      name="productor_id"
                      label="Productor"
                      people={productores}
                      required
                      placeholder="Buscar productor por nombre o DNI"
                    />

                    <label className="grid gap-1">
                      <span className="text-sm">Producto *</span>
                      <select
                        name="producto"
                        defaultValue="Jengibre"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                        required
                      >
                        <option value="Jengibre">Jengibre</option>
                        <option value="Curcuma">Curcuma</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Categoría (opcional)</span>
                      <select
                        name="categoria_id"
                        defaultValue=""
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map((categoria) => (
                          <option
                            key={categoria.id}
                            value={String(categoria.id)}
                          >
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Fecha ingreso *</span>
                      <input
                        name="fecha_ingreso"
                        type="date"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                        required
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Guía ingreso</span>
                      <input
                        name="guia_ingreso"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Peso bruto ingreso (kg) *</span>
                      <input
                        name="peso_bruto_ingreso"
                        type="number"
                        step="0.01"
                        min="0"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                        required
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Número jabas</span>
                      <input
                        name="numero_jabas"
                        type="number"
                        min="0"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Chofer</span>
                      <input
                        name="chofer"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm">Placa vehículo</span>
                      <input
                        name="placa_vehiculo"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <label className="grid gap-1 sm:col-span-3">
                      <span className="text-sm">Observaciones</span>
                      <textarea
                        name="observaciones"
                        className="min-h-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                    </label>

                    <label className="grid gap-1 sm:col-span-3 sm:max-w-md">
                      <span className="text-sm">
                        Foto de ingreso del lote (opcional)
                      </span>
                      <input
                        type="file"
                        name="foto_lote_ingreso"
                        accept="image/jpeg,image/png,image/webp"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                      />
                      <span className="text-xs">
                        Se optimiza automáticamente a máximo 1080px y se guarda
                        miniatura.
                      </span>
                    </label>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="sx-btn sx-btn-primary"
                    >
                      Crear lote
                    </button>
                  </div>
                </form>
              </ModuleFormModal>

              <BackToDashboardButton
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50"
              />
            </div>
          </div>

          <section className="mb-8 grid gap-4 sm:grid-cols-4">
            {[
              {
                label: "Total Lotes",
                value: resumen.totalLotes,
                color: "from-blue-50 to-blue-50",
                textColor: "text-[#1A73E8]",
                icon: "📦",
              },
              {
                label: "Sin clasificar",
                value: resumen.sinClasificar,
                color: "from-yellow-50 to-yellow-50",
                textColor: "text-yellow-700",
                icon: "🟡",
              },
              {
                label: "Clasificados",
                value: resumen.clasificados,
                color: "from-green-50 to-green-50",
                textColor: "text-green-700",
                icon: "✅",
              },
              {
                label: "Kg en almacén",
                value: resumen.kgAlmacen,
                color: "from-purple-50 to-purple-50",
                textColor: "text-purple-700",
                icon: "⚖️",
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-xl bg-gradient-to-br ${card.color} p-4 shadow-sm transition duration-300 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {card.label}
                    </p>
                    <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className="text-3xl opacity-30">{card.icon}</div>
                </div>
              </div>
            ))}
          </section>

          {search.ok ? (
            <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm">
              ✓ {search.ok}
            </p>
          ) : null}
          {search.error || lotesData.errorMessage ? (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm">
              ✕ {search.error || lotesData.errorMessage}
            </p>
          ) : null}

          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">Filtros</h2>
            <form className="grid gap-3 sm:grid-cols-5">
              <input
                name="q"
                defaultValue={search.q ?? ""}
                placeholder="Buscar por número de lote"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 sm:col-span-2"
              />

              <select
                name="estado"
                defaultValue={search.estado ?? "todos"}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
              >
                <option value="todos">Todos los estados</option>
                <option value="sin_clasificar">sin_clasificar</option>
                <option value="clasificado">clasificado</option>
                <option value="asignado">asignado</option>
                <option value="liquidado">liquidado</option>
                <option value="cancelado">cancelado</option>
              </select>

              <select
                name="productor"
                defaultValue={search.productor ?? ""}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
              >
                <option value="">Todos los productores</option>
                {productores.map((productor) => (
                  <option key={productor.id} value={String(productor.id)}>
                    {productor.nombre_completo}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-2 sm:col-span-5">
                <label className="grid gap-1">
                  <span className="text-sm">Desde</span>
                  <input
                    name="desde"
                    type="date"
                    defaultValue={search.desde ?? ""}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Hasta</span>
                  <input
                    name="hasta"
                    type="date"
                    defaultValue={search.hasta ?? ""}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                  />
                </label>
              </div>

              <div className="sm:col-span-5">
                <button className="sx-btn sx-btn-primary">
                  Aplicar filtros
                </button>
              </div>
            </form>
          </section>

          {loteEditar ? (
            <ModuleFormModal
              isOpen={true}
              closeHref={listBaseUrl}
              title={`Editar lote ${loteEditar.numero_lote}`}
              description="Modifica los datos del lote y guarda los cambios."
              maxWidth="4xl"
            >
              <form action={updateLoteAction} className="grid gap-3">
                <input type="hidden" name="lote_id" value={loteEditar.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <PersonSearchField
                    name="productor_id"
                    label="Productor"
                    people={productores}
                    defaultId={Number(loteEditar.productor_id)}
                    required
                    placeholder="Buscar productor por nombre o DNI"
                  />

                  <label className="grid gap-1">
                    <span className="text-sm">Producto *</span>
                    <select name="producto" defaultValue={loteEditar.producto} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required>
                      <option value="Jengibre">Jengibre</option>
                      <option value="Curcuma">Curcuma</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Categoría</span>
                    <select name="categoria_id" defaultValue={loteEditar.categoria_id ? String(loteEditar.categoria_id) : ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                      <option value="">Sin categoría</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={String(categoria.id)}>{categoria.nombre}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Fecha ingreso *</span>
                    <input name="fecha_ingreso" type="date" defaultValue={loteEditar.fecha_ingreso} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Guía ingreso</span>
                    <input name="guia_ingreso" defaultValue={loteEditar.guia_ingreso ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Peso bruto ingreso (kg) *</span>
                    <input name="peso_bruto_ingreso" type="number" step="0.01" min="0" defaultValue={loteEditar.peso_bruto_ingreso} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Número jabas</span>
                    <input name="numero_jabas" type="number" min="0" defaultValue={loteEditar.numero_jabas ?? 0} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Chofer</span>
                    <input name="chofer" defaultValue={loteEditar.chofer ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm">Placa vehículo</span>
                    <input name="placa_vehiculo" defaultValue={loteEditar.placa_vehiculo ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <label className="grid gap-1 sm:col-span-3">
                    <span className="text-sm">Observaciones</span>
                    <textarea name="observaciones" defaultValue={loteEditar.observaciones ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <label className="grid gap-1 sm:col-span-3 sm:max-w-md">
                    <span className="text-sm">
                      Reemplazar foto de ingreso (opcional)
                    </span>
                    <input
                      type="file"
                      name="foto_lote_ingreso"
                      accept="image/jpeg,image/png,image/webp"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                    <span className="text-xs">
                      Si adjuntas una imagen, se guardará como nueva evidencia
                      de ingreso del lote.
                    </span>
                  </label>
                </div>

                <div>
                  <button type="submit" className="sx-btn sx-btn-primary">
                    Guardar cambios lote
                  </button>
                </div>
              </form>
            </ModuleFormModal>
          ) : null}

          {loteVerDetalle ? (
            <ModuleFormModal
              isOpen={true}
              closeHref={listBaseUrl}
              title={`Detalle clasificación: ${loteVerDetalle.numero_lote}`}
              description={`Total bruto: ${Math.round(totalBrutoClasificado * 100) / 100} kg | Total neto: ${Math.round(totalNetoClasificado * 100) / 100} kg | Diferencia: ${detalleDiferencia} kg | Merma: ${detalleMerma}%`}
              maxWidth="5xl"
            >

              {fotoClasificacionDetalle ? (
                <div className="mb-3">
                  <p className="mb-1 text-xs text-gray-500">
                    Miniatura correlacionada: evidencia de clasificación
                  </p>
                  <a
                    href={fotoClasificacionOriginal ?? fotoClasificacionDetalle}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <Image
                      src={fotoClasificacionDetalle}
                      alt={`Clasificación ${loteVerDetalle.numero_lote}`}
                      width={120}
                      height={80}
                      unoptimized
                      className="rounded border object-cover"
                    />
                  </a>
                </div>
              ) : null}

              <p className="text-xs text-gray-500">
                Qué muestra esta tabla: resultado técnico de clasificación
                (bruto, descuentos y neto) por categoría.
              </p>
              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Código clasif.</th>
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Peso bruto</th>
                      <th className="p-2">Peso jabas</th>
                      <th className="p-2">% humedad</th>
                      <th className="p-2">Desc. humedad</th>
                      <th className="p-2">Peso neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clasificaciones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center">
                          Este lote aún no tiene clasificación registrada.
                        </td>
                      </tr>
                    ) : null}

                    {clasificaciones.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2">
                          {row.codigo_clasificacion ?? "-"}
                        </td>
                        <td className="p-2">
                          {categoriaMap.get(row.categoria_id) ??
                            row.categoria_id}
                        </td>
                        <td className="p-2">{row.peso_bruto}</td>
                        <td className="p-2">{row.peso_jabas}</td>
                        <td className="p-2">{row.porcentaje_humedad}</td>
                        <td className="p-2">{row.peso_descuento_humedad}</td>
                        <td className="p-2">{row.peso_neto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-2 mt-4 text-base font-semibold">
                Trazabilidad comercial por categoría
              </h3>
              <p className="mb-2 text-xs">
                Qué muestra esta tabla: comparación entre kg clasificados,
                asignados y sobrantes por categoría.
              </p>
              <div className="mb-4 sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Kg clasificado neto</th>
                      <th className="p-2">Kg enviado/asignado</th>
                      <th className="p-2">Kg sobrante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenComercial.map((row) => (
                      <tr key={row.categoria_id} className="border-b">
                        <td className="p-2">
                          {categoriaMap.get(row.categoria_id) ??
                            row.categoria_id}
                        </td>
                        <td className="p-2">{row.clasificado_neto}</td>
                        <td className="p-2">{row.asignado}</td>
                        <td className="p-2">{row.sobrante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-2 text-base font-semibold">
                Destinos de venta / intención de venta (asignaciones)
              </h3>
              <p className="mb-2 text-xs">
                Qué muestra esta tabla: a qué pedido/cliente se destinó cada
                división del lote y su precio de venta.
              </p>
              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Código división</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Pedido</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Estado pedido</th>
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Kg enviados</th>
                      <th className="p-2">Precio plan/kg</th>
                      <th className="p-2">Precio venta/kg</th>
                      <th className="p-2">Subtotal venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignacionesDetalle.asignaciones.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-3 text-center">
                          Este lote aún no tiene asignaciones de venta.
                        </td>
                      </tr>
                    ) : null}

                    {asignacionesDetalle.asignaciones.map((row) => {
                      const pedido = asignacionesDetalle.pedidoMap.get(
                        Number(row.pedido_id),
                      );
                      const cliente = pedido
                        ? asignacionesDetalle.clienteMap.get(
                          Number(pedido.cliente_id),
                        )
                        : "-";
                      return (
                        <tr key={row.id} className="border-b">
                          <td className="p-2">{row.codigo_division ?? "-"}</td>
                          <td className="p-2">{row.fecha_asignacion}</td>
                          <td className="p-2">
                            {pedido?.numero_pedido ?? row.pedido_id}
                          </td>
                          <td className="p-2">{cliente ?? "-"}</td>
                          <td className="p-2">{pedido?.estado ?? "-"}</td>
                          <td className="p-2">
                            {categoriaMap.get(Number(row.categoria_id)) ??
                              row.categoria_id}
                          </td>
                          <td className="p-2">{row.kg_asignados}</td>
                          <td className="p-2">
                            {pedido ? Number(pedido.precio_kg) : "-"}
                          </td>
                          <td className="p-2">{row.precio_kg}</td>
                          <td className="p-2">{row.subtotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ModuleFormModal>
          ) : null}

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs">
              Qué muestra esta tabla: listado general de lotes con estado
              operativo y accesos a acciones.
            </p>
            <p className="mb-3 text-xs text-slate-500">
              Mostrando {fromItem}-{toItem} de {totalRows} lote(s)
            </p>
            <div className="sx-table-wrap">
              <table className="sx-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Foto</th>
                    <th className="p-2">Nro. lote</th>
                    <th className="p-2">Productor</th>
                    <th className="p-2">Producto</th>
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Fecha ingreso</th>
                    <th className="p-2">Peso bruto</th>
                    <th className="p-2">Jabas</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {totalRows === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-3 text-center">
                        Sin lotes para mostrar.
                      </td>
                    </tr>
                  ) : null}

                  {lotesPage.map((lote) => (
                    <tr key={lote.id} className="border-b align-top">
                      <td className="p-2">
                        {lotesData.fotoIngresoThumbMap.get(lote.id) ? (
                          <a
                            href={
                              lotesData.fotoIngresoOriginalMap.get(lote.id) ??
                              lotesData.fotoIngresoThumbMap.get(lote.id) ??
                              ""
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block"
                          >
                            <Image
                              src={lotesData.fotoIngresoThumbMap.get(lote.id) ?? ""}
                              alt={`Ingreso ${lote.numero_lote}`}
                              width={44}
                              height={44}
                              unoptimized
                              className="h-11 w-11 rounded object-cover"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-2">{lote.numero_lote}</td>
                      <td className="p-2">
                        {lotesData.productorMap.get(lote.productor_id) ??
                          lote.productor_id}
                      </td>
                      <td className="p-2">{lote.producto}</td>
                      <td className="p-2">
                        {lote.categoria_id
                          ? (categoriaMap.get(lote.categoria_id) ??
                            lote.categoria_id)
                          : "-"}
                      </td>
                      <td className="p-2">{lote.fecha_ingreso}</td>
                      <td className="p-2">{lote.peso_bruto_ingreso}</td>
                      <td className="p-2">{lote.numero_jabas ?? 0}</td>
                      <td className="p-2">{getEstadoLabel(lote.estado)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={buildAlmacenUrl({
                              q: search.q,
                              estado: search.estado,
                              productor: search.productor,
                              desde: search.desde,
                              hasta: search.hasta,
                              page: currentPage,
                              ver: Number(lote.id),
                            })}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                          >
                            Ver detalle
                          </Link>
                          <Link
                            href={buildAlmacenUrl({
                              q: search.q,
                              estado: search.estado,
                              productor: search.productor,
                              desde: search.desde,
                              hasta: search.hasta,
                              page: currentPage,
                              editar: Number(lote.id),
                            })}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildAlmacenUrl({
                    q: search.q,
                    estado: search.estado,
                    productor: search.productor,
                    desde: search.desde,
                    hasta: search.hasta,
                    page: Math.max(1, currentPage - 1),
                  })}
                  className={`sx-btn sx-btn-secondary ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                  aria-disabled={currentPage <= 1}
                >
                  Anterior
                </Link>

                {paginationRange.map((pageNumber) => (
                  <Link
                    key={pageNumber}
                    href={buildAlmacenUrl({
                      q: search.q,
                      estado: search.estado,
                      productor: search.productor,
                      desde: search.desde,
                      hasta: search.hasta,
                      page: pageNumber,
                    })}
                    className={pageNumber === currentPage ? "sx-btn sx-btn-primary" : "sx-btn sx-btn-secondary"}
                  >
                    {pageNumber}
                  </Link>
                ))}

                <Link
                  href={buildAlmacenUrl({
                    q: search.q,
                    estado: search.estado,
                    productor: search.productor,
                    desde: search.desde,
                    hasta: search.hasta,
                    page: Math.min(totalPages, currentPage + 1),
                  })}
                  className={`sx-btn sx-btn-secondary ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                  aria-disabled={currentPage >= totalPages}
                >
                  Siguiente
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
