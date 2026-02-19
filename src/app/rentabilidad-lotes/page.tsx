import Link from "next/link";
import { StatsCard } from "@/components/rentabilidad-stats-card";
import { RentabilidadFilters } from "@/components/rentabilidad-filters";
import { LoteProfitabilityCard } from "@/components/lote-profitability-card";

import { getSupabaseServerClient } from "@/lib/supabase/server";
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
          .from("lote_clasificacion")
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
      const pedidos = [...new Set(asignCat.map((row) => pedidoMap.get(Number(row.pedido_id)) ?? String(row.pedido_id)))];

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
        pedidos: pedidos.join(", ") || "-",
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
      <main className="google-2027-theme w-full flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Módulo 9: Rentabilidad
            </h1>
            <nav className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
              <Link
                href="/analitica"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Ir a Analítica
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50"
              >
                ← Inicio
              </Link>
            </nav>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Análisis de ganancias por lote y producto
          </p>
      </div>

      {/* Descripción */}
      <div className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong>¿Qué ves aquí?</strong> Cuánto ganaste por lote y producto, considerando ventas reales por categoría/división,
          qué parte se vendió o sobró, y cuánto ya pagaste al productor vs lo que falta pagar.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-8">
        <RentabilidadFilters
          lotesOptions={lotesOptions}
          currentProducto={productoFilter}
          currentLote={loteFilter}
        />
      </div>

      {/* KPIs Principales */}
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">
          Resumen Ejecutivo
        </h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatsCard
            title="Ventas totales"
            value={currency(totalScope.ventasTotales)}
            subtitle="Valor real según asignaciones"
            status="success"
          />
          <StatsCard
            title="Costo comprometido"
            value={currency(totalScope.costoComprometido)}
            subtitle="Total liquidaciones productor"
            status="neutral"
          />
          <StatsCard
            title="Pagado real"
            value={currency(totalScope.pagadoReal)}
            subtitle="Adelantos + pagos registrados"
            status="neutral"
          />
          <StatsCard
            title="Ganancia s/ pagado"
            value={currency(totalScope.gananciaSobrePagado)}
            subtitle="Ventas menos lo pagado hoy"
            status={totalScope.gananciaSobrePagado >= 0 ? 'success' : 'danger'}
          />
          <StatsCard
            title="Ganancia s/ comprometido"
            value={currency(totalScope.gananciaSobreComprometido)}
            subtitle="Ventas menos costo total"
            status={totalScope.gananciaSobreComprometido >= 0 ? 'success' : 'danger'}
          />
        </div>
      </section>

      {/* KPIs Volumen */}
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">
          Volumen (kg)
        </h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-3">
          <StatsCard
            title="Kg clasificados"
            value={totalScope.kgClasif}
            subtitle="Con categoría en almacén"
            status="info"
          />
          <StatsCard
            title="Kg vendidos"
            value={totalScope.kgVendido}
            subtitle="En particiones/pedidos"
            status="success"
          />
          <StatsCard
            title="Kg sobrantes"
            value={totalScope.kgSobrante}
            subtitle="No vendidos o parcial"
            status={totalScope.kgSobrante > 0 ? 'warning' : 'success'}
          />
        </div>
      </section>

      {/* Resumen por Producto */}
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 sm:mb-4">
          Consolidado por Producto
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">
          Vista agregada de todos los lotes filtrados por producto
        </p>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto text-xs sm:text-sm">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr className="text-xs sm:text-sm">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Producto</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">#</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Ventas</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Costo</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Pagado</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Saldo</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Gan. pago</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Gan. costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {productosAgg.map((row) => (
                  <tr key={row.producto} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-xs sm:text-sm">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-slate-900 dark:text-slate-100">{row.producto}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 dark:text-slate-400">{row.lotes}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-900 dark:text-slate-100">{currency(row.ventasTotales)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 dark:text-slate-400">{currency(row.costoComprometido)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-600 dark:text-slate-400">{currency(row.pagadoReal)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold" style={{ color: row.saldoPorPagar <= 0 ? '#10b981' : '#ef4444' }}>
                      {currency(row.saldoPorPagar)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold" style={{ color: row.gananciaSobrePagado >= 0 ? '#10b981' : '#ef4444' }}>
                      {currency(row.gananciaSobrePagado)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold" style={{ color: row.gananciaSobreComprometido >= 0 ? '#10b981' : '#ef4444' }}>
                      {currency(row.gananciaSobreComprometido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detalles por Lote */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 sm:mb-4">
          Rentabilidad Detallada por Lote
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-6">
          Expande cada lote para ver el desglose económico y detalle por categoría
        </p>

        {loteResumenes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              No hay lotes para mostrar con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
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
