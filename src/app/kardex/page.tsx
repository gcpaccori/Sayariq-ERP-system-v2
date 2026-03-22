import Link from "next/link";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import ModuleNavigation from "@/components/module-navigation";
import ModuleFormModal from "@/components/module-form-modal";
import PersonSearchField from "@/components/person-search-field";

type Tab = "stock" | "lotes" | "dinero";

type SearchParams = {
  tab?: Tab;
  tipo_kardex?: "todos" | "producto" | "dinero";
  tipo_movimiento?: "todos" | "entrada" | "clasificacion" | "salida" | "ingreso" | "egreso";
  origen?: string;
  desde?: string;
  hasta?: string;
  persona?: string;
  lote?: string;
  categoria?: string;
  q?: string;
  mes?: string;
  rango?: "todos" | "ultimo_mes";
  page?: string;
  page_size?: string;
};

type Categoria = { id: number; nombre: string; orden: number };
type Persona = { id: number; nombre_completo: string; tipo_documento?: string | null; documento?: string | null };
type Lote = { id: number; numero_lote: string; productor_id: number };
type ClasificacionVigenteJabas = { lote_id: number; categoria_id: number; numero_jabas: number | null };

type KardexRow = {
  id: number;
  fecha: string;
  tipo_kardex: "producto" | "dinero";
  tipo_movimiento: "entrada" | "clasificacion" | "salida" | "ingreso" | "egreso";
  origen: string;
  origen_id: number | null;
  origen_numero: string | null;
  lote_id: number | null;
  categoria_id: number | null;
  peso_kg: number | null;
  monto: number | null;
  persona_id: number | null;
  concepto: string;
  observaciones: string | null;
};

type StockRow = {
  categoria_id: number;
  categoria: string;
  kg_entrados: number;
  kg_salidos: number;
  kg_disponibles: number;
  lotes_con_stock: number;
};

type MonthlySeriesRow = {
  month: string;
  dinero_ingreso: number;
  dinero_egreso: number;
  carga_entrada: number;
  carga_salida: number;
};

type AsignacionContext = {
  pedidoNumero: string;
  precioPlanKg: number;
  precioVentaKg: number;
  subtotalVenta: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function escapeLike(input: string) {
  return input.replaceAll("%", "").replaceAll(",", " ").trim();
}

function buildFilterQuery(base: URLSearchParams, tab: Tab) {
  const params = new URLSearchParams(base);
  params.set("tab", tab);
  return `/kardex?${params.toString()}`;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function loteCategoriaKey(loteId: number | null, categoriaId: number | null) {
  if (!loteId || !categoriaId) return null;
  return `${loteId}:${categoriaId}`;
}

function sanitizeDate(search: SearchParams, minDate: string | null) {
  const today = toIsoDate(new Date());
  const min = minDate ?? today;

  let desde = search.desde ?? "";
  let hasta = search.hasta ?? "";

  if (search.rango === "ultimo_mes") {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    desde = toIsoDate(start);
    hasta = toIsoDate(end);
  }

  if (search.mes && /^\d{4}-\d{2}$/.test(search.mes)) {
    desde = `${search.mes}-01`;
    const lastDay = new Date(Number(search.mes.slice(0, 4)), Number(search.mes.slice(5, 7)), 0);
    hasta = toIsoDate(lastDay);
  }

  if (desde && desde < min) desde = min;
  if (hasta && hasta < min) hasta = min;
  if (desde && desde > today) desde = today;
  if (hasta && hasta > today) hasta = today;
  if (desde && hasta && desde > hasta) {
    desde = hasta;
  }

  return { desde, hasta, minDate: min, maxDate: today };
}

async function getKardexDateBounds() {
  const supabase = getSupabaseServerClient();
  const [{ data: minData }, { data: maxData }] = await Promise.all([
    supabase.from("kardex").select("fecha").order("fecha", { ascending: true }).limit(1),
    supabase.from("kardex").select("fecha").order("fecha", { ascending: false }).limit(1),
  ]);

  return {
    minDate: minData?.[0]?.fecha ? String(minData[0].fecha).slice(0, 10) : null,
    maxDate: maxData?.[0]?.fecha ? String(maxData[0].fecha).slice(0, 10) : null,
  };
}

async function getCatalogs() {
  const supabase = getSupabaseServerClient();
  const [categoriasRes, personasRes, lotesRes] = await Promise.all([
    supabase.from("categorias").select("id,nombre,orden").order("orden", { ascending: true }),
    supabase.from("personas").select("id,nombre_completo,tipo_documento,documento").order("nombre_completo", { ascending: true }),
    supabase.from("lotes").select("id,numero_lote,productor_id").order("id", { ascending: false }),
  ]);

  return {
    categorias: (categoriasRes.data ?? []) as Categoria[],
    personas: (personasRes.data ?? []) as Persona[],
    lotes: (lotesRes.data ?? []) as Lote[],
  };
}

async function getKardexRows(search: SearchParams) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("kardex")
    .select(
      "id,fecha,tipo_kardex,tipo_movimiento,origen,origen_id,origen_numero,lote_id,categoria_id,peso_kg,monto,persona_id,concepto,observaciones"
    )
    .order("fecha", { ascending: false })
    .limit(1200);

  if (search.tipo_kardex && search.tipo_kardex !== "todos") {
    query = query.eq("tipo_kardex", search.tipo_kardex);
  }

  if (search.tipo_movimiento && search.tipo_movimiento !== "todos") {
    query = query.eq("tipo_movimiento", search.tipo_movimiento);
  }

  if (search.origen && search.origen !== "todos") {
    query = query.eq("origen", search.origen);
  }

  const personaId = Number(search.persona ?? "0");
  if (personaId > 0) {
    query = query.eq("persona_id", personaId);
  }

  const loteId = Number(search.lote ?? "0");
  if (loteId > 0) {
    query = query.eq("lote_id", loteId);
  }

  const categoriaId = Number(search.categoria ?? "0");
  if (categoriaId > 0) {
    query = query.eq("categoria_id", categoriaId);
  }

  if (search.desde) {
    query = query.gte("fecha", `${search.desde}T00:00:00`);
  }

  if (search.hasta) {
    query = query.lte("fecha", `${search.hasta}T23:59:59`);
  }

  if (search.q) {
    query = query.ilike("concepto", `%${escapeLike(search.q)}%`);
  }

  const { data, error } = await query;
  if (error) {
    return {
      rows: [] as KardexRow[],
      errorMessage: error.message,
    };
  }

  return {
    rows: (data ?? []) as KardexRow[],
    errorMessage: "",
  };
}

async function getAsignacionesContext(rows: KardexRow[]) {
  const supabase = getSupabaseServerClient();

  const asignacionIds = rows
    .filter((row) => row.origen === "asignacion_pedido" && row.origen_id)
    .map((row) => Number(row.origen_id))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (asignacionIds.length === 0) {
    return new Map<number, AsignacionContext>();
  }

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("id,pedido_id,precio_kg,subtotal")
    .in("id", asignacionIds);

  const pedidoIds = [...new Set((asignaciones ?? []).map((row) => Number(row.pedido_id)))];

  const { data: pedidos } =
    pedidoIds.length > 0
      ? await supabase
        .from("pedidos")
        .select("id,numero_pedido,precio_kg")
        .in("id", pedidoIds)
      : { data: [] as Array<{ id: number; numero_pedido: string; precio_kg: number }> };

  const pedidoMap = new Map<number, { numero_pedido: string; precio_kg: number }>();
  for (const row of pedidos ?? []) {
    pedidoMap.set(Number(row.id), {
      numero_pedido: String(row.numero_pedido),
      precio_kg: Number(row.precio_kg ?? 0),
    });
  }

  const map = new Map<number, AsignacionContext>();
  for (const row of asignaciones ?? []) {
    const pedido = pedidoMap.get(Number(row.pedido_id));
    if (!pedido) continue;

    map.set(Number(row.id), {
      pedidoNumero: pedido.numero_pedido,
      precioPlanKg: round2(pedido.precio_kg),
      precioVentaKg: round2(Number(row.precio_kg ?? 0)),
      subtotalVenta: round2(Number(row.subtotal ?? 0)),
    });
  }

  return map;
}

function computeStockByCategoria(rows: KardexRow[], categorias: Categoria[]): StockRow[] {
  const onlyProducto = rows.filter((row) => row.tipo_kardex === "producto");

  const map = new Map<number, { entrados: number; salidos: number; lotes: Set<number> }>();

  for (const categoria of categorias) {
    map.set(categoria.id, { entrados: 0, salidos: 0, lotes: new Set<number>() });
  }

  for (const row of onlyProducto) {
    if (!row.categoria_id) continue;
    const entry = map.get(Number(row.categoria_id)) ?? { entrados: 0, salidos: 0, lotes: new Set<number>() };

    const peso = Number(row.peso_kg ?? 0);

    if (row.tipo_movimiento === "clasificacion") {
      entry.entrados += peso;
      if (row.lote_id) entry.lotes.add(Number(row.lote_id));
    }

    if (row.tipo_movimiento === "salida") {
      entry.salidos += peso;
    }

    map.set(Number(row.categoria_id), entry);
  }

  const result: StockRow[] = [];

  for (const categoria of categorias) {
    const entry = map.get(categoria.id) ?? { entrados: 0, salidos: 0, lotes: new Set<number>() };
    const disponibles = round2(entry.entrados - entry.salidos);
    result.push({
      categoria_id: categoria.id,
      categoria: categoria.nombre,
      kg_entrados: round2(entry.entrados),
      kg_salidos: round2(entry.salidos),
      kg_disponibles: disponibles,
      lotes_con_stock: disponibles > 0 ? entry.lotes.size : 0,
    });
  }

  return result;
}

function computeSaldos(rows: KardexRow[], personas: Persona[]) {
  const onlyDinero = rows.filter((row) => row.tipo_kardex === "dinero");
  const map = new Map<number, { ingresos: number; egresos: number }>();

  for (const row of onlyDinero) {
    if (!row.persona_id) continue;
    const personaId = Number(row.persona_id);
    const entry = map.get(personaId) ?? { ingresos: 0, egresos: 0 };
    const monto = Number(row.monto ?? 0);

    if (row.tipo_movimiento === "ingreso") entry.ingresos += monto;
    if (row.tipo_movimiento === "egreso") entry.egresos += monto;

    map.set(personaId, entry);
  }

  return personas
    .filter((persona) => map.has(persona.id))
    .map((persona) => {
      const data = map.get(persona.id) ?? { ingresos: 0, egresos: 0 };
      return {
        persona_id: persona.id,
        nombre: persona.nombre_completo,
        total_deudas_nos_deben: round2(data.ingresos),
        total_deudas_debemos: round2(data.egresos),
        saldo: round2(data.ingresos - data.egresos),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function formatMonth(isoDate: string) {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function computeMonthlySeries(rows: KardexRow[]): MonthlySeriesRow[] {
  const map = new Map<string, MonthlySeriesRow>();

  for (const row of rows) {
    const month = formatMonth(row.fecha);
    if (!map.has(month)) {
      map.set(month, {
        month,
        dinero_ingreso: 0,
        dinero_egreso: 0,
        carga_entrada: 0,
        carga_salida: 0,
      });
    }

    const item = map.get(month)!;

    if (row.tipo_kardex === "dinero") {
      const monto = Number(row.monto ?? 0);
      if (row.tipo_movimiento === "ingreso") item.dinero_ingreso += monto;
      if (row.tipo_movimiento === "egreso") item.dinero_egreso += monto;
    }

    if (row.tipo_kardex === "producto") {
      const peso = Number(row.peso_kg ?? 0);
      if (row.tipo_movimiento === "entrada" || row.tipo_movimiento === "clasificacion") {
        item.carga_entrada += peso;
      }
      if (row.tipo_movimiento === "salida") {
        item.carga_salida += peso;
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      dinero_ingreso: round2(row.dinero_ingreso),
      dinero_egreso: round2(row.dinero_egreso),
      carga_entrada: round2(row.carga_entrada),
      carga_salida: round2(row.carga_salida),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const tab: Tab = search.tab === "lotes" || search.tab === "dinero" ? search.tab : "stock";

  const bounds = await getKardexDateBounds();
  const dateScope = sanitizeDate(search, bounds.minDate);
  const normalizedSearch: SearchParams = {
    ...search,
    desde: dateScope.desde,
    hasta: dateScope.hasta,
  };

  const [catalogs, kardexData] = await Promise.all([getCatalogs(), getKardexRows(normalizedSearch)]);

  const categoriaMap = new Map(catalogs.categorias.map((categoria) => [categoria.id, categoria.nombre]));
  const personaMap = new Map(catalogs.personas.map((persona) => [persona.id, persona.nombre_completo]));
  const loteMap = new Map(catalogs.lotes.map((lote) => [lote.id, lote.numero_lote]));

  const stockRows = computeStockByCategoria(kardexData.rows, catalogs.categorias);

  const detalleLotesRows = kardexData.rows.filter((row) => row.tipo_kardex === "producto");
  const asignacionContextMap = await getAsignacionesContext(detalleLotesRows);

  const loteIdsDetalle = [...new Set(detalleLotesRows.map((row) => Number(row.lote_id ?? 0)).filter((id) => id > 0))];
  const { data: clasifVigenteData } =
    loteIdsDetalle.length > 0
      ? await getSupabaseServerClient()
        .from("vw_lote_clasificacion_vigente")
        .select("lote_id,categoria_id,numero_jabas")
        .in("lote_id", loteIdsDetalle)
      : { data: [] as ClasificacionVigenteJabas[] };

  const jabasVigenteMap = new Map<string, number>();
  for (const row of (clasifVigenteData ?? []) as ClasificacionVigenteJabas[]) {
    const key = loteCategoriaKey(Number(row.lote_id), Number(row.categoria_id));
    if (!key) continue;
    jabasVigenteMap.set(key, Number(row.numero_jabas ?? 0));
  }

  const dineroRows = kardexData.rows.filter((row) => row.tipo_kardex === "dinero");
  const saldosRows = computeSaldos(kardexData.rows, catalogs.personas);

  const totalKgEntrados = round2(stockRows.reduce((acc, row) => acc + row.kg_entrados, 0));
  const totalKgSalidos = round2(stockRows.reduce((acc, row) => acc + row.kg_salidos, 0));
  const totalKgDisponibles = round2(stockRows.reduce((acc, row) => acc + row.kg_disponibles, 0));

  const totalMovimientos = kardexData.rows.length;
  const categoriasConStock = stockRows.filter((row) => row.kg_disponibles > 0).length;

  const totalDeudaProductores = round2(
    saldosRows
      .filter((row) => row.saldo < 0)
      .reduce((acc, row) => acc + Math.abs(row.saldo), 0)
  );

  const totalDeudaClientes = round2(
    saldosRows
      .filter((row) => row.saldo > 0)
      .reduce((acc, row) => acc + row.saldo, 0)
  );

  const monthlySeries = computeMonthlySeries(kardexData.rows);
  const maxDinero = Math.max(
    1,
    ...monthlySeries.map((row) => Math.max(row.dinero_ingreso, row.dinero_egreso))
  );
  const maxCarga = Math.max(
    1,
    ...monthlySeries.map((row) => Math.max(row.carga_entrada, row.carga_salida))
  );

  const pageSize = Math.min(200, Math.max(10, Number(search.page_size ?? "25") || 25));
  const page = Math.max(1, Number(search.page ?? "1") || 1);

  const queryParams = new URLSearchParams();
  if (search.tipo_kardex) queryParams.set("tipo_kardex", search.tipo_kardex);
  if (search.tipo_movimiento) queryParams.set("tipo_movimiento", search.tipo_movimiento);
  if (search.origen) queryParams.set("origen", search.origen);
  if (normalizedSearch.desde) queryParams.set("desde", normalizedSearch.desde);
  if (normalizedSearch.hasta) queryParams.set("hasta", normalizedSearch.hasta);
  if (search.mes) queryParams.set("mes", search.mes);
  if (search.rango) queryParams.set("rango", search.rango);
  if (search.persona) queryParams.set("persona", search.persona);
  if (search.lote) queryParams.set("lote", search.lote);
  if (search.categoria) queryParams.set("categoria", search.categoria);
  if (search.q) queryParams.set("q", search.q);
  queryParams.set("page_size", String(pageSize));

  const stockPageRows = stockRows.slice((page - 1) * pageSize, page * pageSize);
  const lotesPageRows = detalleLotesRows.slice((page - 1) * pageSize, page * pageSize);
  const dineroPageRows = dineroRows.slice((page - 1) * pageSize, page * pageSize);

  const pageRows = tab === "stock" ? stockRows.length : tab === "lotes" ? detalleLotesRows.length : dineroRows.length;
  const totalPages = Math.max(1, Math.ceil(pageRows / pageSize));
  const safePage = Math.min(page, totalPages);

  const exportCsvHref = `/kardex/export?${new URLSearchParams({ ...Object.fromEntries(queryParams), tab, format: "csv" }).toString()}`;
  const printHref = `/kardex/print?${new URLSearchParams({ ...Object.fromEntries(queryParams), tab }).toString()}`;

  const personaSeleccionadaId = Number(search.persona ?? "0");
  const personaSeleccionada =
    personaSeleccionadaId > 0
      ? catalogs.personas.find((persona) => persona.id === personaSeleccionadaId) ?? null
      : null;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="kardex" />
      <main className="google-2027-theme w-full flex-1 p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo 4: Kardex General</h1>
            <BackToDashboardButton className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50" />
          </div>

          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-700">
              El kardex unifica movimientos de producto y dinero en un solo historial auditable. Las cards
              resumen la posición actual (stock, deudas y volumen de movimientos) y los tabs detallan origen,
              impacto y trazabilidad.
            </p>
          </section>

          {kardexData.errorMessage ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">✕ {kardexData.errorMessage}</p>
          ) : null}

          <section className="mb-6 grid gap-3 sm:grid-cols-5">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Kg en almacén</p>
              <p className="mt-1 text-2xl font-bold text-green-900">{totalKgDisponibles}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Categorías con stock</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{categoriasConStock}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-white to-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Movimientos</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{totalMovimientos}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Deudas a productores</p>
              <p className="mt-1 text-2xl font-bold text-orange-900">{totalDeudaProductores}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Deudas de clientes</p>
              <p className="mt-1 text-2xl font-bold text-red-900">{totalDeudaClientes}</p>
            </div>
          </section>

          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-gray-900">Gráfico mensual (últimos 12 meses)</h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 shadow-inner">
                <h3 className="mb-2 font-medium">Dinero: ingreso vs egreso</h3>
                <div className="space-y-2 text-sm">
                  {monthlySeries.length === 0 ? <p>Sin datos mensuales.</p> : null}
                  {monthlySeries.map((row) => (
                    <div key={`dinero-${row.month}`} className="rounded-xl bg-white p-3 shadow-sm md:shadow-md">
                      <p className="mb-1 font-medium">{row.month}</p>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-20">Ingreso</span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600"
                            style={{ width: `${Math.max(2, (row.dinero_ingreso / maxDinero) * 100)}%` }}
                          />
                        </div>
                        <span>{row.dinero_ingreso}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20">Egreso</span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-600"
                            style={{ width: `${Math.max(2, (row.dinero_egreso / maxDinero) * 100)}%` }}
                          />
                        </div>
                        <span>{row.dinero_egreso}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 shadow-inner">
                <h3 className="mb-2 font-medium">Carga: entrada vs salida</h3>
                <div className="space-y-2 text-sm">
                  {monthlySeries.length === 0 ? <p>Sin datos mensuales.</p> : null}
                  {monthlySeries.map((row) => (
                    <div key={`carga-${row.month}`} className="rounded-xl bg-white p-3 shadow-sm md:shadow-md">
                      <p className="mb-1 font-medium">{row.month}</p>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-20">Entrada</span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${Math.max(2, (row.carga_entrada / maxCarga) * 100)}%` }}
                          />
                        </div>
                        <span>{row.carga_entrada}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20">Salida</span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                            style={{ width: `${Math.max(2, (row.carga_salida / maxCarga) * 100)}%` }}
                          />
                        </div>
                        <span>{row.carga_salida}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight text-gray-900">Filtros de Búsqueda</h2>
              <p className="text-xs text-slate-500">Ajusta los criterios para refinar el Kardex</p>
            </div>
            <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Búsqueda rápida</span>
                <input
                  name="q"
                  defaultValue={search.q ?? ""}
                  placeholder="Buscar por concepto o documento..."
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </div>

              <div className="grid gap-1.5 ">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo Kardex</span>
                <select
                  name="tipo_kardex"
                  defaultValue={search.tipo_kardex ?? "todos"}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                >
                  <option value="todos">Todos</option>
                  <option value="producto">Producto</option>
                  <option value="dinero">Dinero</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Movimiento</span>
                <select
                  name="tipo_movimiento"
                  defaultValue={search.tipo_movimiento ?? "todos"}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                >
                  <option value="todos">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="clasificacion">Clasificación</option>
                  <option value="salida">Salida</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Origen</span>
                <select name="origen" defaultValue={search.origen ?? "todos"} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                  <option value="todos">Todos los orígenes</option>
                  <option value="lote_ingreso">Lote Ingreso</option>
                  <option value="clasificacion">Clasificación</option>
                  <option value="asignacion_pedido">Asignación Pedido</option>
                  <option value="liquidacion_productor">Liquidación Productor</option>
                  <option value="liquidacion_cliente">Liquidación Cliente</option>
                  <option value="adelanto">Adelanto</option>
                  <option value="pago_directo">Pago Directo</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha desde</span>
                <input name="desde" type="date" min={dateScope.minDate} max={dateScope.maxDate} defaultValue={normalizedSearch.desde ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha hasta</span>
                <input name="hasta" type="date" min={dateScope.minDate} max={dateScope.maxDate} defaultValue={normalizedSearch.hasta ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">O por Mes</span>
                <input name="mes" type="month" defaultValue={search.mes ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rápido</span>
                <select name="rango" defaultValue={search.rango ?? "todos"} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                  <option value="todos">Cualquier fecha</option>
                  <option value="ultimo_mes">Último mes</option>
                </select>
              </div>

              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Persona (Productor/Cliente)</span>
                <PersonSearchField
                  name="persona"
                  label=""
                  people={catalogs.personas}
                  defaultId={Number(search.persona ?? "0")}
                  placeholder="Nombre o DNI..."
                />
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lote</span>
                <select name="lote" defaultValue={search.lote ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                  <option value="">Cualquier lote</option>
                  {catalogs.lotes.map((lote) => (
                    <option key={lote.id} value={String(lote.id)}>
                      {lote.numero_lote}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categoría</span>
                <select name="categoria" defaultValue={search.categoria ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                  <option value="">Cualquier categoría</option>
                  {catalogs.categorias.map((categoria) => (
                    <option key={categoria.id} value={String(categoria.id)}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items / Pág</span>
                <select name="page_size" defaultValue={String(pageSize)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="page" value="1" />

              <div className="flex items-end sm:col-span-3 lg:col-span-1">
                <button className="sx-btn sx-btn-primary w-full">Aplicar filtros</button>
              </div>
            </form>
          </section>

          <section className="mb-4 flex flex-wrap gap-2">
            <Link href={buildFilterQuery(queryParams, "stock")} className="sx-btn sx-btn-secondary">
              Stock por categoría
            </Link>
            <Link href={buildFilterQuery(queryParams, "lotes")} className="sx-btn sx-btn-secondary">
              Detalle por lote
            </Link>
            <Link href={buildFilterQuery(queryParams, "dinero")} className="sx-btn sx-btn-secondary">
              Movimientos de dinero
            </Link>
          </section>

          <section className="mb-4 flex flex-wrap gap-2">
            <Link href={exportCsvHref} className="sx-btn sx-btn-secondary">Exportar Excel (CSV)</Link>
            <Link href={printHref} className="sx-btn sx-btn-secondary" target="_blank">Imprimir / Guardar PDF</Link>
          </section>

          {tab === "stock" ? (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs">Qué muestra esta tabla: balance de entrada, salida y stock disponible por categoría.</p>
              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Kg entrados (clasif.)</th>
                      <th className="p-2">Kg salidos (asignados)</th>
                      <th className="p-2">Kg disponibles</th>
                      <th className="p-2">Lotes con stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center">
                          Sin movimientos para mostrar.
                        </td>
                      </tr>
                    ) : null}

                    {stockPageRows.map((row) => (
                      <tr key={row.categoria_id} className="border-b">
                        <td className="p-2">{row.categoria}</td>
                        <td className="p-2">{row.kg_entrados}</td>
                        <td className="p-2">{row.kg_salidos}</td>
                        <td className="p-2">{row.kg_disponibles}</td>
                        <td className="p-2">{row.lotes_con_stock}</td>
                      </tr>
                    ))}

                    <tr className="border-t font-semibold">
                      <td className="p-2">TOTAL</td>
                      <td className="p-2">{totalKgEntrados}</td>
                      <td className="p-2">{totalKgSalidos}</td>
                      <td className="p-2">{totalKgDisponibles}</td>
                      <td className="p-2">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "lotes" ? (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs">Qué muestra esta tabla: movimientos de producto por lote con destino comercial y precios.</p>
              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Lote</th>
                      <th className="p-2">Persona</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Tipo Mov.</th>
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Kg</th>
                      <th className="p-2">N° jabas (cat.)</th>
                      <th className="p-2">Destino venta</th>
                      <th className="p-2">Precio plan/kg</th>
                      <th className="p-2">Precio venta/kg</th>
                      <th className="p-2">Subtotal venta</th>
                      <th className="p-2">Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleLotesRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-3 text-center">
                          Sin movimientos de producto.
                        </td>
                      </tr>
                    ) : null}

                    {lotesPageRows.map((row) => {
                      const kgValue = Number(row.peso_kg ?? 0);
                      const signedKg = row.tipo_movimiento === "salida" ? -Math.abs(kgValue) : kgValue;
                      const asignacionCtx = row.origen_id
                        ? asignacionContextMap.get(Number(row.origen_id))
                        : undefined;

                      const jabasKey = loteCategoriaKey(row.lote_id, row.categoria_id);
                      const numeroJabas = jabasKey ? jabasVigenteMap.get(jabasKey) : undefined;

                      return (
                        <tr key={row.id} className="border-b align-top">
                          <td className="p-2">{row.lote_id ? loteMap.get(row.lote_id) ?? row.lote_id : "-"}</td>
                          <td className="p-2">{row.persona_id ? personaMap.get(row.persona_id) ?? row.persona_id : "-"}</td>
                          <td className="p-2">{new Date(row.fecha).toLocaleString()}</td>
                          <td className="p-2">{row.tipo_movimiento}</td>
                          <td className="p-2">{row.categoria_id ? categoriaMap.get(row.categoria_id) ?? row.categoria_id : "-"}</td>
                          <td className="p-2">{round2(signedKg)}</td>
                          <td className="p-2">{typeof numeroJabas === "number" ? numeroJabas : "-"}</td>
                          <td className="p-2">{asignacionCtx?.pedidoNumero ?? "-"}</td>
                          <td className="p-2">{asignacionCtx ? asignacionCtx.precioPlanKg : "-"}</td>
                          <td className="p-2">{asignacionCtx ? asignacionCtx.precioVentaKg : "-"}</td>
                          <td className="p-2">{asignacionCtx ? asignacionCtx.subtotalVenta : "-"}</td>
                          <td className="p-2">{row.concepto}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "dinero" ? (
            <>
              <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs">Qué muestra esta tabla: detalle cronológico de ingresos y egresos monetarios del kardex.</p>
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Persona</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Origen</th>
                        <th className="p-2">Concepto</th>
                        <th className="p-2">Monto</th>
                        <th className="p-2">Dirección</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dineroRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-3 text-center">
                            Sin movimientos de dinero.
                          </td>
                        </tr>
                      ) : null}

                      {dineroPageRows.map((row) => (
                        <tr key={row.id} className="border-b align-top">
                          <td className="p-2">{new Date(row.fecha).toLocaleString()}</td>
                          <td className="p-2">{row.persona_id ? personaMap.get(row.persona_id) ?? row.persona_id : "-"}</td>
                          <td className="p-2">{row.tipo_movimiento}</td>
                          <td className="p-2">{row.origen}</td>
                          <td className="p-2">{row.concepto}</td>
                          <td className="p-2">{round2(Number(row.monto ?? 0))}</td>
                          <td className="p-2">{row.tipo_movimiento === "egreso" ? "Empresa -> Persona" : "Persona -> Empresa"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="sx-table-wrap">
                <h3 className="border-b p-3 text-base font-semibold">
                  {personaSeleccionada
                    ? `Resumen de deuda de ${personaSeleccionada.nombre_completo}`
                    : "Resumen global de deudas (agrupado por persona)"}
                </h3>
                <p className="px-3 pt-2 text-xs">
                  {personaSeleccionada
                    ? "Qué muestra esta tabla: saldo neto de la persona filtrada, calculado como ingresos menos egresos."
                    : "Qué muestra esta tabla: sin filtro de persona, se agrupan todos los movimientos de dinero por persona y se calcula su saldo neto (ingresos - egresos)."}
                </p>
                <table className="sx-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Persona</th>
                      <th className="p-2">Total deudas (nos deben)</th>
                      <th className="p-2">Total deudas (debemos)</th>
                      <th className="p-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldosRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center">
                          Sin saldos para mostrar.
                        </td>
                      </tr>
                    ) : null}

                    {saldosRows.map((row) => (
                      <tr key={row.persona_id} className="border-b">
                        <td className="p-2">{row.nombre}</td>
                        <td className="p-2">{row.total_deudas_nos_deben}</td>
                        <td className="p-2">{row.total_deudas_debemos}</td>
                        <td className="p-2">{row.saldo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}

          <section className="mt-4 flex items-center gap-3 text-sm">
            <span>Página {safePage} de {totalPages}</span>
            {safePage > 1 ? (
              <Link href={`/kardex?${new URLSearchParams({ ...Object.fromEntries(queryParams), tab, page: String(safePage - 1) }).toString()}`} className="sx-btn sx-btn-secondary">Anterior</Link>
            ) : null}
            {safePage < totalPages ? (
              <Link href={`/kardex?${new URLSearchParams({ ...Object.fromEntries(queryParams), tab, page: String(safePage + 1) }).toString()}`} className="sx-btn sx-btn-secondary">Siguiente</Link>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
