import Link from "next/link";
import { LoteProfitabilityCard } from "@/components/lote-profitability-card";
import { RentabilidadFilters } from "@/components/rentabilidad-filters";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import ModuleNavigation from "@/components/module-navigation";

type SearchParams = {
  producto?: "todos" | "Jengibre" | "Curcuma";
  lote?: string;
};

type Lote = {
  id: number;
  numero_lote: string;
  producto: "Jengibre" | "Curcuma";
  productor_id: number;
  fecha_ingreso: string;
  estado: string;
};

type Persona = {
  id: number;
  nombre_completo: string;
};

type Categoria = {
  id: number;
  nombre: string;
  orden: number;
};

type LoteClasificacion = {
  lote_id: number;
  categoria_id: number;
  codigo_clasificacion: string | null;
  peso_neto: number;
};

type Asignacion = {
  id: number;
  lote_id: number;
  pedido_id: number;
  categoria_id: number;
  codigo_division: string | null;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
};

type Pedido = {
  id: number;
  numero_pedido: string;
};

type LiquidacionProductor = {
  id: number;
  lote_id: number;
  numero_liquidacion: string;
  fecha_liquidacion: string;
  total_bruto: number;
  total_descuentos: number;
  total_adelantos: number;
  total_a_pagar: number;
  monto_pagado: number;
  estado: string;
  estado_pago: string;
};

type LoteCategoriaRow = {
  categoria: string;
  codigoClasificacion: string;
  kgClasif: number;
  kgVendido: number;
  kgSobrante: number;
  estadoSalida: "no_vendido" | "parcial" | "vendido_total";
  precioVentaProm: number;
  ventaTotal: number;
  particiones: string;
  pedidos: string;
};

type LoteResumen = {
  loteId: number;
  numeroLote: string;
  producto: "Jengibre" | "Curcuma";
  productor: string;
  fechaIngreso: string;
  estadoLote: string;
  kgClasif: number;
  kgVendido: number;
  kgSobrante: number;
  particionesCount: number;
  ventasTotales: number;
  costoComprometido: number;
  pagadoReal: number;
  saldoPorPagar: number;
  gananciaSobrePagado: number;
  gananciaSobreComprometido: number;
  categorias: LoteCategoriaRow[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function currency(value: number) {
  return `S/ ${round2(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(input: string) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function RentabilidadLotesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const productoFilter = search.producto === "Jengibre" || search.producto === "Curcuma" ? search.producto : "todos";
  const loteFilter = Number(search.lote ?? "0");

  const supabase = getSupabaseServerClient();

  let lotesQuery = supabase
    .from("lotes")
    .select("id,numero_lote,producto,productor_id,fecha_ingreso,estado")
    .neq("estado", "cancelado")
    .order("id", { ascending: false });

  if (productoFilter !== "todos") {
    lotesQuery = lotesQuery.eq("producto", productoFilter);
  }

  if (loteFilter > 0) {
    lotesQuery = lotesQuery.eq("id", loteFilter);
  }

  const [lotesRes, categoriasRes] = await Promise.all([
    lotesQuery,
    supabase.from("categorias").select("id,nombre,orden").order("orden", { ascending: true }),
  ]);

  const lotes = (lotesRes.data ?? []) as Lote[];
  const categorias = (categoriasRes.data ?? []) as Categoria[];

  const loteIds = lotes.map((row) => Number(row.id));
  const productorIds = [...new Set(lotes.map((row) => Number(row.productor_id)))];

  const [personasRes, clasifRes, asignacionesRes, liqProdRes] = await Promise.all([
    productorIds.length > 0
      ? supabase.from("personas").select("id,nombre_completo").in("id", productorIds)
      : Promise.resolve({ data: [] }),
    loteIds.length > 0
      ? supabase
        .from("vw_lote_clasificacion_vigente")
        .select("lote_id,categoria_id,codigo_clasificacion,peso_neto")
        .in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
    loteIds.length > 0
      ? supabase
        .from("pedido_asignaciones")
        .select("id,lote_id,pedido_id,categoria_id,codigo_division,kg_asignados,precio_kg,subtotal,fecha_asignacion")
        .in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
    loteIds.length > 0
      ? supabase
        .from("liquidaciones")
        .select(
          "id,lote_id,numero_liquidacion,fecha_liquidacion,total_bruto,total_descuentos,total_adelantos,total_a_pagar,monto_pagado,estado,estado_pago"
        )
        .eq("tipo", "productor")
        .neq("estado", "anulada")
        .in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const personas = (personasRes.data ?? []) as Persona[];
  const clasificaciones = (clasifRes.data ?? []) as LoteClasificacion[];
  const asignaciones = (asignacionesRes.data ?? []) as Asignacion[];
  const liquidacionesProd = (liqProdRes.data ?? []) as LiquidacionProductor[];

  const pedidoIds = [...new Set(asignaciones.map((row) => Number(row.pedido_id)))];
  const pedidosRes =
    pedidoIds.length > 0
      ? await supabase.from("pedidos").select("id,numero_pedido").in("id", pedidoIds)
      : { data: [] };
  const pedidos = (pedidosRes.data ?? []) as Pedido[];

  const personaMap = new Map<number, string>(personas.map((row) => [Number(row.id), row.nombre_completo]));
  const pedidoMap = new Map<number, string>(pedidos.map((row) => [Number(row.id), row.numero_pedido]));
  const categoriaMap = new Map<number, string>(categorias.map((row) => [Number(row.id), row.nombre]));

  const loteResumenes: LoteResumen[] = lotes.map((lote) => {
    const clasifLote = clasificaciones.filter((row) => Number(row.lote_id) === Number(lote.id));
    const asignLote = asignaciones.filter((row) => Number(row.lote_id) === Number(lote.id));
    const liqLote = liquidacionesProd.filter((row) => Number(row.lote_id) === Number(lote.id));

    const categoryIds = [...new Set([
      ...clasifLote.map((row) => Number(row.categoria_id)),
      ...asignLote.map((row) => Number(row.categoria_id)),
    ])];

    const categoriasRows: LoteCategoriaRow[] = categoryIds.map((categoriaId) => {
      const clasifCat = clasifLote.find((row) => Number(row.categoria_id) === categoriaId);
      const asignCat = asignLote.filter((row) => Number(row.categoria_id) === categoriaId);

      const kgClasif = round2(Number(clasifCat?.peso_neto ?? 0));
      const kgVendido = round2(asignCat.reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0));
      const kgSobrante = round2(Math.max(0, kgClasif - kgVendido));
      const ventaTotal = round2(asignCat.reduce((acc, row) => acc + Number(row.subtotal ?? 0), 0));
      const precioVentaProm = kgVendido > 0 ? round2(ventaTotal / kgVendido) : 0;

      const divisiones = [...new Set(asignCat.map((row) => row.codigo_division).filter((v): v is string => !!v))];
      const pedidosArr = [...new Set(asignCat.map((row) => pedidoMap.get(Number(row.pedido_id)) ?? String(row.pedido_id)))];

      let estadoSalida: "no_vendido" | "parcial" | "vendido_total" = "no_vendido";
      if (kgVendido > 0.01 && kgSobrante <= 0.01) estadoSalida = "vendido_total";
      else if (kgVendido > 0.01 && kgSobrante > 0.01) estadoSalida = "parcial";

      return {
        categoria: categoriaMap.get(categoriaId) ?? `Categoría ${categoriaId}`,
        codigoClasificacion: clasifCat?.codigo_clasificacion ?? "-",
        kgClasif,
        kgVendido,
        kgSobrante,
        estadoSalida,
        precioVentaProm,
        ventaTotal,
        particiones: divisiones.join(", ") || "-",
        pedidos: pedidosArr.join(", ") || "-",
      };
    });

    const kgClasif = round2(categoriasRows.reduce((acc, row) => acc + row.kgClasif, 0));
    const kgVendido = round2(categoriasRows.reduce((acc, row) => acc + row.kgVendido, 0));
    const kgSobrante = round2(categoriasRows.reduce((acc, row) => acc + row.kgSobrante, 0));

    const ventasTotales = round2(asignLote.reduce((acc, row) => acc + Number(row.subtotal ?? 0), 0));

    const costoComprometido = round2(
      liqLote.reduce((acc, row) => acc + Number(row.total_a_pagar ?? 0) + Number(row.total_adelantos ?? 0), 0)
    );

    const pagadoReal = round2(
      liqLote.reduce((acc, row) => acc + Number(row.monto_pagado ?? 0) + Number(row.total_adelantos ?? 0), 0)
    );

    const saldoPorPagar = round2(Math.max(0, costoComprometido - pagadoReal));
    const gananciaSobrePagado = round2(ventasTotales - pagadoReal);
    const gananciaSobreComprometido = round2(ventasTotales - costoComprometido);

    const particionesCount = new Set(asignLote.map((row) => row.codigo_division).filter((v): v is string => !!v)).size;

    return {
      loteId: Number(lote.id),
      numeroLote: lote.numero_lote,
      producto: lote.producto,
      productor: personaMap.get(Number(lote.productor_id)) ?? `Productor ${lote.productor_id}`,
      fechaIngreso: lote.fecha_ingreso,
      estadoLote: lote.estado,
      kgClasif,
      kgVendido,
      kgSobrante,
      particionesCount,
      ventasTotales,
      costoComprometido,
      pagadoReal,
      saldoPorPagar,
      gananciaSobrePagado,
      gananciaSobreComprometido,
      categorias: categoriasRows.sort((a, b) => b.ventaTotal - a.ventaTotal),
    };
  });

  const productosAgg = ["Jengibre", "Curcuma"].map((producto) => {
    const subset = loteResumenes.filter((row) => row.producto === producto);
    return {
      producto,
      lotes: subset.length,
      ventasTotales: round2(subset.reduce((acc, row) => acc + row.ventasTotales, 0)),
      costoComprometido: round2(subset.reduce((acc, row) => acc + row.costoComprometido, 0)),
      pagadoReal: round2(subset.reduce((acc, row) => acc + row.pagadoReal, 0)),
      saldoPorPagar: round2(subset.reduce((acc, row) => acc + row.saldoPorPagar, 0)),
      gananciaSobrePagado: round2(subset.reduce((acc, row) => acc + row.gananciaSobrePagado, 0)),
      gananciaSobreComprometido: round2(subset.reduce((acc, row) => acc + row.gananciaSobreComprometido, 0)),
      kgClasif: round2(subset.reduce((acc, row) => acc + row.kgClasif, 0)),
      kgVendido: round2(subset.reduce((acc, row) => acc + row.kgVendido, 0)),
      kgSobrante: round2(subset.reduce((acc, row) => acc + row.kgSobrante, 0)),
    };
  });

  const totalScope = {
    lotes: loteResumenes.length,
    ventasTotales: round2(loteResumenes.reduce((acc, row) => acc + row.ventasTotales, 0)),
    costoComprometido: round2(loteResumenes.reduce((acc, row) => acc + row.costoComprometido, 0)),
    pagadoReal: round2(loteResumenes.reduce((acc, row) => acc + row.pagadoReal, 0)),
    saldoPorPagar: round2(loteResumenes.reduce((acc, row) => acc + row.saldoPorPagar, 0)),
    gananciaSobrePagado: round2(loteResumenes.reduce((acc, row) => acc + row.gananciaSobrePagado, 0)),
    gananciaSobreComprometido: round2(loteResumenes.reduce((acc, row) => acc + row.gananciaSobreComprometido, 0)),
    kgClasif: round2(loteResumenes.reduce((acc, row) => acc + row.kgClasif, 0)),
    kgVendido: round2(loteResumenes.reduce((acc, row) => acc + row.kgVendido, 0)),
    kgSobrante: round2(loteResumenes.reduce((acc, row) => acc + row.kgSobrante, 0)),
  };

  const lotesOptions = lotes
    .map((row) => ({ id: row.id, numero_lote: row.numero_lote }))
    .sort((a, b) => b.id - a.id);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="rentabilidad-lotes" />
      <main className="google-2027-theme w-full flex-1 bg-white px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Módulo 9: Rentabilidad
              </h1>
              <p className="mt-1 text-sm text-slate-500">Ventas, costos y ganancias por lote y producto</p>
            </div>
            <nav className="flex items-center gap-2 flex-wrap">
              <Link href="/analitica" className="sx-btn sx-btn-secondary text-sm">Ir a Analítica</Link>
              <BackToDashboardButton className="sx-btn sx-btn-secondary text-sm" />
            </nav>
          </div>

          {/* ── Filtros ── */}
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <RentabilidadFilters
              lotesOptions={lotesOptions}
              currentProducto={productoFilter}
              currentLote={loteFilter}
            />
          </section>

          {/* ── KPIs unificados (1 sola fila) ── */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Lotes", value: String(totalScope.lotes), color: "text-slate-900" },
              { label: "Ventas", value: currency(totalScope.ventasTotales), color: "text-blue-700" },
              { label: "Costo total", value: currency(totalScope.costoComprometido), color: "text-slate-700" },
              { label: "Pagado real", value: currency(totalScope.pagadoReal), color: "text-slate-700" },
              { label: "Saldo por pagar", value: currency(totalScope.saldoPorPagar), color: totalScope.saldoPorPagar > 0 ? "text-red-600" : "text-emerald-600" },
              { label: "Ganancia", value: currency(totalScope.gananciaSobrePagado), color: totalScope.gananciaSobrePagado >= 0 ? "text-emerald-600" : "text-red-600" },
              { label: "Kg sobrante", value: String(totalScope.kgSobrante), color: totalScope.kgSobrante > 0 ? "text-amber-600" : "text-emerald-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-gray-50 p-3 shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                <p className={`mt-1 text-base font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </section>

          {/* ── Consolidado por Producto (2 tarjetas lado a lado) ── */}
          <section className="grid gap-4 sm:grid-cols-2">
            {productosAgg.map((row) => (
              <div key={row.producto} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{row.producto}</h3>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">{row.lotes} lotes</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-slate-500">Ventas</p><p className="font-bold text-blue-700">{currency(row.ventasTotales)}</p></div>
                  <div><p className="text-xs text-slate-500">Costo</p><p className="font-semibold text-slate-700">{currency(row.costoComprometido)}</p></div>
                  <div><p className="text-xs text-slate-500">Pagado</p><p className="font-semibold text-slate-700">{currency(row.pagadoReal)}</p></div>
                  <div><p className="text-xs text-slate-500">Saldo</p><p className={`font-bold ${row.saldoPorPagar > 0 ? "text-red-600" : "text-emerald-600"}`}>{currency(row.saldoPorPagar)}</p></div>
                  <div><p className="text-xs text-slate-500">Ganancia</p><p className={`font-bold ${row.gananciaSobrePagado >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currency(row.gananciaSobrePagado)}</p></div>
                  <div><p className="text-xs text-slate-500">Kg clasif.</p><p className="font-semibold text-slate-700">{row.kgClasif} kg</p></div>
                </div>
              </div>
            ))}
          </section>

          {/* ── Detalle por lote (tabla compacta) ── */}
          <section className="rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-bold text-gray-900">Rentabilidad por Lote</h2>
              <p className="mt-0.5 text-xs text-slate-500">Expande cada lote para ver el desglose por categoría</p>
            </div>

            {loteResumenes.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No hay lotes para mostrar con los filtros seleccionados.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {loteResumenes.map((lote) => (
                  <LoteProfitabilityCard
                    key={lote.loteId}
                    numeroLote={lote.numeroLote}
                    producto={lote.producto}
                    productor={lote.productor}
                    fechaIngreso={shortDate(lote.fechaIngreso)}
                    kgClasif={lote.kgClasif}
                    kgVendido={lote.kgVendido}
                    kgSobrante={lote.kgSobrante}
                    ventasTotales={lote.ventasTotales}
                    costoComprometido={lote.costoComprometido}
                    pagadoReal={lote.pagadoReal}
                    saldoPorPagar={lote.saldoPorPagar}
                    gananciaSobrePagado={lote.gananciaSobrePagado}
                    gananciaSobreComprometido={lote.gananciaSobreComprometido}
                    categorias={lote.categorias}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
