import Link from "next/link";

import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    <main className="google-2027-theme mx-auto w-full max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Módulo 9: Rentabilidad por Lote y Producto</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/analitica" className="underline">Ir a Analítica</Link>
          <Link href="/" className="underline">Volver al inicio</Link>
        </div>
      </div>

      <section className="mb-4 rounded border p-4">
        <p className="mb-3 text-sm">
          Este módulo responde cuánto ganaste por lote y por producto, considerando: ventas reales por categoría/división,
          qué parte se vendió o sobró, y cuánto ya pagaste/te falta pagar al productor.
        </p>
        <form className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Producto</span>
            <select name="producto" defaultValue={productoFilter} className="rounded border px-2 py-1">
              <option value="todos">Todos</option>
              <option value="Jengibre">Jengibre</option>
              <option value="Curcuma">Curcuma</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Lote (opcional)</span>
            <select name="lote" defaultValue={loteFilter > 0 ? String(loteFilter) : ""} className="rounded border px-2 py-1">
              <option value="">Todos los lotes</option>
              {lotesOptions.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.numero_lote}
                </option>
              ))}
            </select>
          </label>

          <button className="rounded border px-3 py-1">Aplicar</button>
        </form>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded border p-3"><p className="text-xs">Ventas de lotes</p><p className="text-lg font-bold">{currency(totalScope.ventasTotales)}</p><p className="text-[11px]">Valor de venta real según particiones/asignaciones.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Costo comprometido productor</p><p className="text-lg font-bold">{currency(totalScope.costoComprometido)}</p><p className="text-[11px]">Total de liquidaciones productor (a pagar + adelantos aplicados).</p></div>
        <div className="rounded border p-3"><p className="text-xs">Pagado real productor</p><p className="text-lg font-bold">{currency(totalScope.pagadoReal)}</p><p className="text-[11px]">Lo ya desembolsado (adelantos + pagos registrados).</p></div>
        <div className="rounded border p-3"><p className="text-xs">Ganancia sobre pagado</p><p className="text-lg font-bold">{currency(totalScope.gananciaSobrePagado)}</p><p className="text-[11px]">Ventas menos lo efectivamente pagado hasta hoy.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Ganancia sobre comprometido</p><p className="text-lg font-bold">{currency(totalScope.gananciaSobreComprometido)}</p><p className="text-[11px]">Ventas menos costo total comprometido del lote.</p></div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded border p-3"><p className="text-xs">Kg clasificados</p><p className="text-lg font-bold">{totalScope.kgClasif}</p><p className="text-[11px]">Kg con categoría registrada en almacén.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Kg vendidos</p><p className="text-lg font-bold">{totalScope.kgVendido}</p><p className="text-[11px]">Kg que ya entraron a particiones/pedidos.</p></div>
        <div className="rounded border p-3"><p className="text-xs">Kg sobrantes</p><p className="text-lg font-bold">{totalScope.kgSobrante}</p><p className="text-[11px]">Kg no vendidos o vendidos parcialmente.</p></div>
      </section>

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Resumen por producto (todos sus lotes)</h2>
        <p className="mb-3 text-sm">Consolida cuánto aporta cada producto en ventas, costos, pagos y margen.</p>
        <p className="mb-2 text-xs">Qué muestra esta tabla: consolidado económico por producto sumando todos sus lotes filtrados.</p>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Producto</th>
                <th className="p-2"># Lotes</th>
                <th className="p-2">Ventas</th>
                <th className="p-2">Costo comprometido</th>
                <th className="p-2">Pagado real</th>
                <th className="p-2">Saldo por pagar</th>
                <th className="p-2">Ganancia sobre pagado</th>
                <th className="p-2">Ganancia sobre comprometido</th>
                <th className="p-2">Kg sobrante</th>
              </tr>
            </thead>
            <tbody>
              {productosAgg.map((row) => (
                <tr key={row.producto} className="border-b">
                  <td className="p-2">{row.producto}</td>
                  <td className="p-2">{row.lotes}</td>
                  <td className="p-2">{currency(row.ventasTotales)}</td>
                  <td className="p-2">{currency(row.costoComprometido)}</td>
                  <td className="p-2">{currency(row.pagadoReal)}</td>
                  <td className="p-2">{currency(row.saldoPorPagar)}</td>
                  <td className="p-2">{currency(row.gananciaSobrePagado)}</td>
                  <td className="p-2">{currency(row.gananciaSobreComprometido)}</td>
                  <td className="p-2">{row.kgSobrante}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Rentabilidad detallada por lote</h2>
        <p className="mb-3 text-sm">
          Cada bloque de lote muestra: rendimiento económico, estado de pago al productor y detalle por categoría
          (si vendiste total, parcial o no vendiste; precio y particiones donde entró).
        </p>

        {loteResumenes.length === 0 ? <p className="text-sm">Sin lotes para el filtro actual.</p> : null}

        <div className="space-y-4">
          {loteResumenes.map((lote) => (
            <details key={lote.loteId} className="rounded border p-3" open>
              <summary className="cursor-pointer text-sm font-semibold">
                {lote.numeroLote} | {lote.producto} | Productor: {lote.productor} | Ganancia sobre pagado: {currency(lote.gananciaSobrePagado)}
              </summary>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded border p-2"><p className="text-[11px]">Ventas lote</p><p className="font-bold">{currency(lote.ventasTotales)}</p></div>
                <div className="rounded border p-2"><p className="text-[11px]">Costo comprometido</p><p className="font-bold">{currency(lote.costoComprometido)}</p></div>
                <div className="rounded border p-2"><p className="text-[11px]">Pagado real</p><p className="font-bold">{currency(lote.pagadoReal)}</p></div>
                <div className="rounded border p-2"><p className="text-[11px]">Saldo por pagar</p><p className="font-bold">{currency(lote.saldoPorPagar)}</p></div>
                <div className="rounded border p-2"><p className="text-[11px]">Kg vendidos / sobrantes</p><p className="font-bold">{lote.kgVendido} / {lote.kgSobrante}</p></div>
                <div className="rounded border p-2"><p className="text-[11px]">Particiones usadas</p><p className="font-bold">{lote.particionesCount}</p></div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <p className="text-xs">Ingreso: {shortDate(lote.fechaIngreso)} | Estado lote: {lote.estadoLote}</p>
                <p className="text-xs">Ganancia sobre comprometido: {currency(lote.gananciaSobreComprometido)}</p>
              </div>

              <div className="mt-3 overflow-x-auto rounded border">
                <p className="px-2 pt-2 text-xs">Qué muestra esta tabla: detalle por categoría del lote (kg, precio, venta, divisiones y pedidos destino).</p>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Cod. clasificación</th>
                      <th className="p-2">Kg clasif.</th>
                      <th className="p-2">Kg vendido</th>
                      <th className="p-2">Kg sobrante</th>
                      <th className="p-2">Estado salida</th>
                      <th className="p-2">Precio venta prom/kg</th>
                      <th className="p-2">Venta total</th>
                      <th className="p-2">Particiones</th>
                      <th className="p-2">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lote.categorias.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-2 text-center">Sin categorías/ventas registradas para este lote.</td>
                      </tr>
                    ) : null}
                    {lote.categorias.map((row, index) => (
                      <tr key={`${lote.loteId}-${row.categoria}-${index}`} className="border-b">
                        <td className="p-2">{row.categoria}</td>
                        <td className="p-2">{row.codigoClasificacion}</td>
                        <td className="p-2">{row.kgClasif}</td>
                        <td className="p-2">{row.kgVendido}</td>
                        <td className="p-2">{row.kgSobrante}</td>
                        <td className="p-2">{row.estadoSalida}</td>
                        <td className="p-2">{row.precioVentaProm}</td>
                        <td className="p-2">{currency(row.ventaTotal)}</td>
                        <td className="p-2">{row.particiones}</td>
                        <td className="p-2">{row.pedidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
