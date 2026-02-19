// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5
import Image from "next/image";
import Link from "next/link";
import LiquidacionesShell from "@/components/liquidaciones-shell";
import LiquidacionesResumenTable from "@/components/liquidaciones-resumen-wrapper";

import {
  createAdelantoAction,
  createLiquidacionClienteAction,
  createLiquidacionProductorAction,
  registrarPagoParcialAction,
} from "./actions";
import ComprobanteInternoFields from "@/components/comprobante-interno-fields";
import { PagoLiquidacionForm } from "@/components/pago-liquidacion-form";
import OperationsSwitcher from "@/components/operations-switcher";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ModuleNavigation from "@/components/module-navigation";
import FormToggleSection from "@/components/form-toggle-section";
import PersonSearchField from "@/components/person-search-field";

type SearchParams = {
  lote?: string;
  pedido?: string;
  ok?: string;
  error?: string;
};

type Persona = { id: number; nombre_completo: string; tipo_documento?: string | null; documento?: string | null };
type Categoria = { id: number; nombre: string; orden: number };

type LoteRow = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  estado: "sin_clasificar" | "clasificado" | "asignado" | "liquidado" | "cancelado";
};

type PedidoRow = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  producto: string;
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado";
};

type LiquidacionRow = {
  id: number;
  numero_liquidacion: string;
  tipo: "productor" | "cliente";
  persona_id: number;
  lote_id: number | null;
  pedido_id: number | null;
  fecha_liquidacion: string;
  numero_comprobante: string | null;
  total_bruto: number;
  total_descuentos: number;
  total_adelantos: number;
  total_a_pagar: number;
  estado: "borrador" | "confirmada" | "anulada";
  estado_pago: "pendiente" | "parcial" | "pagado" | "cobrado";
  monto_pagado: number;
};

type AdelantoRow = {
  id: number;
  productor_id: number;
  lote_id: number | null;
  numero_comprobante: string | null;
  monto: number;
  fecha: string;
  motivo: string | null;
  estado: "pendiente" | "aplicado" | "cancelado";
  liquidacion_id: number | null;
  created_at?: string | null;
};

type PagoRow = {
  id: number;
  liquidacion_id: number;
  lote_id: number | null;
  monto: number;
  fecha: string;
  forma_pago: string | null;
  numero_comprobante: string | null;
  comprobante_interno_id: number | null;
  observaciones: string | null;
  created_at: string | null;
};

type ComprobanteInternoResumen = {
  id: number;
  tipo: "adelanto" | "venta" | "liquidacion";
  codigo_interno: string;
  entidad_origen: "adelantos" | "liquidaciones";
  entidad_origen_id: number;
};

type LoteClasificacionRow = {
  categoria_id: number;
  codigo_clasificacion: string | null;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  peso_descuento_humedad: number;
  peso_neto: number;
};

type LotePendienteRow = LoteClasificacionRow & {
  kg_vendidos: number;
  kg_liquidados: number;
  kg_pendientes_liquidar: number;
};

type PedidoAsignacionRow = {
  id: number;
  lote_id: number;
  categoria_id: number;
  codigo_division: string | null;
  fecha_asignacion: string;
  kg_asignados: number;
  precio_kg: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function shortDate(input: string | null | undefined) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getPersonasConRol(rol: "productor" | "cliente") {
  const supabase = getSupabaseServerClient();
  const { data: rolesData } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("rol", rol);

  const ids = [...new Set((rolesData ?? []).map((row) => Number(row.persona_id)))];
  if (ids.length === 0) return [] as Persona[];

  const { data: personasData } = await supabase
    .from("personas")
    .select("id,nombre_completo,tipo_documento,documento")
    .in("id", ids)
    .eq("estado", "activo")
    .order("nombre_completo", { ascending: true });

  return (personasData ?? []) as Persona[];
}

async function getCategorias() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categorias")
    .select("id,nombre,orden")
    .eq("estado", "activo")
    .order("orden", { ascending: true });

  return (data ?? []) as Categoria[];
}

async function getLotesLiquidables() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,producto,estado")
    .in("estado", ["sin_clasificar", "clasificado", "asignado"])
    .order("id", { ascending: false });

  const lotes = (data ?? []) as LoteRow[];
  if (lotes.length === 0) return lotes;

  const loteIds = lotes.map((row) => Number(row.id));

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("lote_id,categoria_id,kg_asignados")
    .in("lote_id", loteIds);

  const vendidos = new Map<string, number>();
  for (const row of asignaciones ?? []) {
    const key = `${row.lote_id}-${row.categoria_id}`;
    vendidos.set(key, (vendidos.get(key) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const { data: clasif } = await supabase
    .from("lote_clasificacion")
    .select("lote_id,categoria_id,peso_neto")
    .in("lote_id", loteIds);

  const { data: liqProd } = await supabase
    .from("liquidaciones")
    .select("id,lote_id")
    .eq("tipo", "productor")
    .in("lote_id", loteIds)
    .neq("estado", "anulada");

  const liqIds = (liqProd ?? []).map((row) => Number(row.id));
  const liqLoteMap = new Map<number, number>();
  for (const row of liqProd ?? []) {
    liqLoteMap.set(Number(row.id), Number(row.lote_id));
  }

  const { data: liqDet } =
    liqIds.length > 0
      ? await supabase
          .from("liquidacion_detalle")
          .select("liquidacion_id,categoria_id,peso_neto")
          .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ liquidacion_id: number; categoria_id: number; peso_neto: number }> };

  const liquidados = new Map<string, number>();
  for (const row of liqDet ?? []) {
    const loteId = liqLoteMap.get(Number(row.liquidacion_id));
    if (!loteId) continue;
    const key = `${loteId}-${row.categoria_id}`;
    liquidados.set(key, (liquidados.get(key) ?? 0) + Number(row.peso_neto ?? 0));
  }

  const lotesConPendiente = new Set<number>();
  for (const row of clasif ?? []) {
    const key = `${row.lote_id}-${row.categoria_id}`;
    const clasificado = Number(row.peso_neto ?? 0);
    const liquidado = Number(liquidados.get(key) ?? 0);
    if (clasificado - liquidado > 0.01) {
      lotesConPendiente.add(Number(row.lote_id));
    }
  }

  const lotesConLiquidacion = new Set<number>((liqProd ?? []).map((row) => Number(row.lote_id)));

  return lotes.filter((row) => {
    if (row.estado === "sin_clasificar") {
      return !lotesConLiquidacion.has(Number(row.id));
    }

    return lotesConPendiente.has(Number(row.id));
  });
}

async function getPedidosLiquidables() {
  const supabase = getSupabaseServerClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id,numero_pedido,cliente_id,producto,estado")
    .in("estado", ["en_proceso", "completado"])
    .order("id", { ascending: false });

  if (!pedidos || pedidos.length === 0) return [] as PedidoRow[];

  const ids = pedidos.map((row) => Number(row.id));
  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("pedido_id,categoria_id,kg_asignados")
    .in("pedido_id", ids);

  const asignadoMap = new Map<string, number>();
  for (const row of asignaciones ?? []) {
    const key = `${row.pedido_id}-${row.categoria_id}`;
    asignadoMap.set(key, (asignadoMap.get(key) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const { data: liqCli } = await supabase
    .from("liquidaciones")
    .select("id,pedido_id")
    .eq("tipo", "cliente")
    .in("pedido_id", ids)
    .neq("estado", "anulada");

  const liqIds = (liqCli ?? []).map((row) => Number(row.id));
  const liqPedidoMap = new Map<number, number>();
  for (const row of liqCli ?? []) {
    liqPedidoMap.set(Number(row.id), Number(row.pedido_id));
  }

  const { data: liqDet } =
    liqIds.length > 0
      ? await supabase
          .from("liquidacion_detalle")
          .select("liquidacion_id,categoria_id,peso_neto")
          .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ liquidacion_id: number; categoria_id: number; peso_neto: number }> };

  const liquidadoMap = new Map<string, number>();
  for (const row of liqDet ?? []) {
    const pedidoId = liqPedidoMap.get(Number(row.liquidacion_id));
    if (!pedidoId) continue;
    const key = `${pedidoId}-${row.categoria_id}`;
    liquidadoMap.set(key, (liquidadoMap.get(key) ?? 0) + Number(row.peso_neto ?? 0));
  }

  const pedidosConPendiente = new Set<number>();
  for (const [key, kgAsignado] of asignadoMap.entries()) {
    const kgLiquidado = liquidadoMap.get(key) ?? 0;
    if (kgAsignado - kgLiquidado > 0.01) {
      const pedidoId = Number(key.split("-")[0]);
      pedidosConPendiente.add(pedidoId);
    }
  }

  return (pedidos as PedidoRow[]).filter((row) => pedidosConPendiente.has(Number(row.id)));
}

async function getAdelantos() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("adelantos")
    .select("id,productor_id,lote_id,numero_comprobante,monto,fecha,motivo,estado,liquidacion_id,created_at")
    .order("id", { ascending: false });

  return (data ?? []) as AdelantoRow[];
}

async function getLiquidaciones() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("liquidaciones")
    .select(
      "id,numero_liquidacion,tipo,persona_id,lote_id,pedido_id,fecha_liquidacion,numero_comprobante,total_bruto,total_descuentos,total_adelantos,total_a_pagar,estado,estado_pago,monto_pagado"
    )
    .order("id", { ascending: false });

  return (data ?? []) as LiquidacionRow[];
}

async function getSelectedLoteData(loteId: number) {
  const supabase = getSupabaseServerClient();

  const { data: lote } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,producto,estado")
    .eq("id", loteId)
    .maybeSingle();

  if (!lote) return null;

  const { data: clasificaciones } = await supabase
    .from("lote_clasificacion")
    .select(
      "categoria_id,codigo_clasificacion,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,peso_descuento_humedad,peso_neto"
    )
    .eq("lote_id", loteId);

  const clasifRows = (clasificaciones ?? []) as LoteClasificacionRow[];

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("categoria_id,kg_asignados")
    .eq("lote_id", loteId);

  const vendidosMap = new Map<number, number>();
  for (const row of asignaciones ?? []) {
    const categoriaId = Number(row.categoria_id);
    vendidosMap.set(categoriaId, (vendidosMap.get(categoriaId) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const { data: liqProd } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "productor")
    .eq("lote_id", loteId)
    .neq("estado", "anulada");

  const liqIds = (liqProd ?? []).map((row) => Number(row.id));
  const { data: liqDet } =
    liqIds.length > 0
      ? await supabase
          .from("liquidacion_detalle")
          .select("categoria_id,peso_neto")
          .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ categoria_id: number; peso_neto: number }> };

  const liquidadosMap = new Map<number, number>();
  for (const row of liqDet ?? []) {
    const categoriaId = Number(row.categoria_id);
    liquidadosMap.set(categoriaId, (liquidadosMap.get(categoriaId) ?? 0) + Number(row.peso_neto ?? 0));
  }

  const pendientes: LotePendienteRow[] = clasifRows
    .map((row) => {
      const kgVendidos = round2(vendidosMap.get(Number(row.categoria_id)) ?? 0);
      const kgLiquidado = round2(liquidadosMap.get(Number(row.categoria_id)) ?? 0);
      const kgPendiente = round2(Math.max(0, Number(row.peso_neto) - kgLiquidado));
      return {
        ...row,
        kg_vendidos: kgVendidos,
        kg_liquidados: kgLiquidado,
        kg_pendientes_liquidar: kgPendiente,
      };
    })
    .filter((row) => row.kg_pendientes_liquidar > 0.01);

  const { data: adelantosPendientes } = await supabase
    .from("adelantos")
    .select("id,monto,fecha,motivo,lote_id,estado,numero_comprobante")
    .eq("productor_id", Number(lote.productor_id))
    .eq("estado", "pendiente")
    .or(`lote_id.is.null,lote_id.eq.${loteId}`);

  return {
    lote: lote as LoteRow,
    liquidacionSinClasificacion: clasifRows.length === 0 && lote.estado === "sin_clasificar",
    clasificaciones: pendientes,
    adelantosPendientes: (adelantosPendientes ?? []) as Array<{
      id: number;
      monto: number;
      fecha: string;
      motivo: string | null;
      lote_id: number | null;
      estado: string;
      numero_comprobante: string | null;
    }>,
  };
}

async function getSelectedPedidoData(pedidoId: number) {
  const supabase = getSupabaseServerClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id,numero_pedido,cliente_id,producto,estado")
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) return null;

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("id,lote_id,categoria_id,codigo_division,fecha_asignacion,kg_asignados,precio_kg")
    .eq("pedido_id", pedidoId);

  const grouped = new Map<number, { kg: number; precio: number }>();
  for (const row of (asignaciones ?? []) as PedidoAsignacionRow[]) {
    const categoriaId = Number(row.categoria_id);
    const current = grouped.get(categoriaId) ?? { kg: 0, precio: Number(row.precio_kg ?? 0) };
    current.kg += Number(row.kg_asignados ?? 0);
    if (!current.precio || current.precio <= 0) {
      current.precio = Number(row.precio_kg ?? 0);
    }
    grouped.set(categoriaId, current);
  }

  const { data: liqCli } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "cliente")
    .eq("pedido_id", pedidoId)
    .neq("estado", "anulada");

  const liqIds = (liqCli ?? []).map((row) => Number(row.id));
  const { data: liqDet } =
    liqIds.length > 0
      ? await supabase
          .from("liquidacion_detalle")
          .select("categoria_id,peso_neto")
          .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ categoria_id: number; peso_neto: number }> };

  const liquidadoMap = new Map<number, number>();
  for (const row of liqDet ?? []) {
    const categoriaId = Number(row.categoria_id);
    liquidadoMap.set(categoriaId, (liquidadoMap.get(categoriaId) ?? 0) + Number(row.peso_neto ?? 0));
  }

  return {
    pedido: pedido as PedidoRow,
    divisiones: (asignaciones ?? []) as PedidoAsignacionRow[],
    resumenCategorias: [...grouped.entries()].map(([categoria_id, value]) => ({
      categoria_id,
      kg_asignados: round2(Math.max(0, value.kg - (liquidadoMap.get(categoria_id) ?? 0))),
      precio_sugerido: round2(value.precio),
    })).filter((row) => row.kg_asignados > 0.01),
  };
}

export default async function LiquidacionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;

  const [productores, clientes, categorias, lotesLiquidables, pedidosLiquidables, adelantos, liquidaciones] =
    await Promise.all([
      getPersonasConRol("productor"),
      getPersonasConRol("cliente"),
      getCategorias(),
      getLotesLiquidables(),
      getPedidosLiquidables(),
      getAdelantos(),
      getLiquidaciones(),
    ]);

  const adelantoIds = adelantos.map((row) => Number(row.id)).filter((value) => value > 0);
  const liquidacionIds = liquidaciones.map((row) => Number(row.id)).filter((value) => value > 0);
  const supabase = getSupabaseServerClient();

  const [compAdelantosRes, compLiquidacionesRes] = await Promise.all([
    adelantoIds.length > 0
      ? supabase
          .from("comprobantes_internos")
          .select("id,tipo,codigo_interno,entidad_origen,entidad_origen_id")
          .eq("entidad_origen", "adelantos")
          .in("entidad_origen_id", adelantoIds)
      : Promise.resolve({ data: [] }),
    liquidacionIds.length > 0
      ? supabase
          .from("comprobantes_internos")
          .select("id,tipo,codigo_interno,entidad_origen,entidad_origen_id")
          .eq("entidad_origen", "liquidaciones")
          .in("entidad_origen_id", liquidacionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const compAdelantos = (compAdelantosRes.data ?? []) as ComprobanteInternoResumen[];
  const compLiquidaciones = (compLiquidacionesRes.data ?? []) as ComprobanteInternoResumen[];

  const compAdelantoMap = new Map<number, string>(
    compAdelantos.map((row) => [Number(row.entidad_origen_id), row.codigo_interno])
  );

  const compLiquidacionMap = new Map<number, string>(
    compLiquidaciones.map((row) => [Number(row.entidad_origen_id), row.codigo_interno])
  );

  const [fotosAdelantosRes, fotosLiquidacionesRes] = await Promise.all([
    adelantoIds.length > 0
        ? supabase
          .from("evidencias_fotos")
          .select("entidad_id,ruta_thumb,ruta_imagen,created_at")
          .eq("contexto", "adelanto")
          .eq("entidad_origen", "adelantos")
          .in("entidad_id", adelantoIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    liquidacionIds.length > 0
        ? supabase
          .from("evidencias_fotos")
          .select("entidad_id,ruta_thumb,ruta_imagen,created_at")
          .eq("contexto", "liquidacion")
          .eq("entidad_origen", "liquidaciones")
          .in("entidad_id", liquidacionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const pagosRes = await supabase
    .from("pagos_liquidacion")
    .select("id,liquidacion_id,lote_id,monto,fecha,forma_pago,numero_comprobante,comprobante_interno_id,observaciones,created_at")
    .order("id", { ascending: false });

  const pagos = (pagosRes.data ?? []) as PagoRow[];
  const totalPagosRegistrados = round2(pagos.reduce((acc, row) => acc + Number(row.monto ?? 0), 0));

  type FotoEvidencia = { thumb: string | null; image: string | null };

  const fotoAdelantoMap = new Map<number, FotoEvidencia>();
  for (const row of fotosAdelantosRes.data ?? []) {
    const entityId = Number(row.entidad_id);
    if (!fotoAdelantoMap.has(entityId) && row.ruta_thumb) {
      fotoAdelantoMap.set(entityId, { thumb: String(row.ruta_thumb), image: row.ruta_imagen ? String(row.ruta_imagen) : null });
    }
  }

  const fotoLiquidacionMap = new Map<number, FotoEvidencia>();
  for (const row of fotosLiquidacionesRes.data ?? []) {
    const entityId = Number(row.entidad_id);
    if (!fotoLiquidacionMap.has(entityId) && row.ruta_thumb) {
      fotoLiquidacionMap.set(entityId, { thumb: String(row.ruta_thumb), image: row.ruta_imagen ? String(row.ruta_imagen) : null });
    }
  }

  function getFotoThumb(map: Map<number, FotoEvidencia>, id: number) {
    const v = map.get(id);
    if (!v) return null;
    if (typeof v === "string") {
      const s = String(v).trim();
      return s === "" ? null : s;
    }
    const thumb = v?.thumb ?? null;
    const image = v?.image ?? null;
    if (thumb && String(thumb).trim() !== "") return String(thumb);
    if (image && String(image).trim() !== "") return String(image);
    return null;
  }

  function getFotoObject(map: Map<number, FotoEvidencia>, id: number) {
    const v = map.get(id);
    if (!v) return null;
    if (typeof v === "string") {
      const s = String(v).trim();
      return s === "" ? null : { thumb: s, image: s };
    }
    const thumb = v?.thumb ? String(v.thumb) : null;
    const image = v?.image ? String(v.image) : (thumb ?? null);
    return { thumb, image };
  }

  const personaMap = new Map([...productores, ...clientes].map((row) => [row.id, row.nombre_completo]));
  const categoriaMap = new Map(categorias.map((row) => [row.id, row.nombre]));
  const loteMap = new Map(lotesLiquidables.map((row) => [row.id, row.numero_lote]));
  const pedidoMap = new Map(pedidosLiquidables.map((row) => [row.id, row.numero_pedido]));
  const liquidacionMap = new Map(liquidaciones.map((row) => [row.id, row.numero_liquidacion]));
  const liquidacionPersonaMap = new Map(liquidaciones.map((row) => [row.id, row.persona_id]));

  const selectedLoteId = Number(search.lote ?? "0");
  const selectedPedidoId = Number(search.pedido ?? "0");

  const selectedLoteData = selectedLoteId > 0 ? await getSelectedLoteData(selectedLoteId) : null;
  const selectedPedidoData = selectedPedidoId > 0 ? await getSelectedPedidoData(selectedPedidoId) : null;

  const totalLiquidaciones = liquidaciones.filter((row) => row.estado !== "anulada").length;
  const productorPendientes = liquidaciones.filter(
    (row) => row.tipo === "productor" && (row.estado_pago === "pendiente" || row.estado_pago === "parcial")
  );
  const clientePendientes = liquidaciones.filter(
    (row) => row.tipo === "cliente" && (row.estado_pago === "pendiente" || row.estado_pago === "parcial")
  );

  const totalPorPagarProductor = round2(
    productorPendientes.reduce((acc, row) => acc + (Number(row.total_a_pagar) - Number(row.monto_pagado ?? 0)), 0)
  );
  const totalPorCobrarCliente = round2(
    clientePendientes.reduce((acc, row) => acc + (Number(row.total_a_pagar) - Number(row.monto_pagado ?? 0)), 0)
  );

  const adelantosPendientes = adelantos.filter((row) => row.estado === "pendiente");
  const totalAdelantosPorDescontar = round2(
    adelantosPendientes.reduce((acc, row) => acc + Number(row.monto ?? 0), 0)
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="liquidaciones" />
      <main className="google-2027-theme min-w-0 flex-1 p-6">
        <div className="mx-auto w-full max-w-7xl">
      <LiquidacionesShell
        initialTab="resumen"
        kpis={{
          totalLiquidaciones,
          productoresPendientes: productorPendientes.length,
          totalPorPagar: totalPorPagarProductor,
          totalPagos: totalPagosRegistrados,
        }}
      />
      
      

      <section className="mb-4 rounded border p-4">
        <p className="text-sm">
          Este módulo concentra compromisos con productores y cobranzas a clientes. Las cards separan lo
          pendiente por pagar vs por cobrar, y los adelantos quedan como monto por descontar hasta que se
          apliquen en una liquidación.
        </p>
      </section>

      {search.ok ? (
        <p className="mb-4 rounded border border-green-600 p-2 text-sm">{search.ok}</p>
      ) : null}
      {search.error ? (
        <p className="mb-4 rounded border border-red-600 p-2 text-sm">{search.error}</p>
      ) : null}

      <section id="tab-resumen" className="mb-6">
        <div className="sm:col-span-5 mt-4">
          <LiquidacionesResumenTable
            liquidaciones={liquidaciones}
            fotoMap={Object.fromEntries([...fotoLiquidacionMap])}
            personaMap={Object.fromEntries([...personaMap])}
            compLiquidacionMap={Object.fromEntries([...compLiquidacionMap])}
            loteMap={Object.fromEntries([...loteMap])}
            pedidoMap={Object.fromEntries([...pedidoMap])}
          />
        </div>
      </section>

      <section id="tab-operaciones" className="mb-6" style={{ display: 'none' }}>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Operaciones</h2>
            <p className="text-sm text-gray-600">Selecciona una sola acción para trabajar con foco y evitar errores de registro.</p>
          </div>

          <OperationsSwitcher
            adelantoContent={(
              <FormToggleSection
                title="Registrar adelanto"
                description="Cada adelanto genera comprobante único automático para compartir copia entre empresa y productor."
                defaultOpen
              >

                <form action={createAdelantoAction} className="grid gap-4">
                  <section className="rounded-xl border border-gray-100 p-3 md:p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 1: Selección</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PersonSearchField
                        name="productor_id"
                        label="Productor"
                        people={productores}
                        required
                        placeholder="Buscar productor por nombre o DNI"
                      />

                      <label className="grid gap-1">
                        <span className="text-sm">Lote (opcional)</span>
                        <select name="lote_id" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                          <option value="">Sin lote específico</option>
                          {lotesLiquidables.map((row) => (
                            <option key={row.id} value={String(row.id)}>
                              {row.numero_lote}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 p-3 md:p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 2: Monto y fecha</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-sm">Monto *</span>
                        <input name="monto" type="number" min="0" step="0.01" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm">Fecha *</span>
                        <input
                          name="fecha"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 p-3 md:p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 3: Motivo</h4>
                    <label className="grid gap-1">
                      <span className="text-sm">Motivo (observaciones)</span>
                      <textarea name="motivo" className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px]" placeholder="Motivo del adelanto (opcional)" />
                    </label>
                  </section>

                  <details className="rounded-xl border border-gray-100 p-3 md:p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">Paso 4 (opcional): Comprobante interno</summary>
                    <div className="mt-3">
                      <ComprobanteInternoFields />
                    </div>
                  </details>

                  <details className="rounded-xl border border-gray-100 p-3 md:p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">Paso 5 (opcional): Evidencia</summary>
                    <label className="mt-3 grid gap-1">
                      <span className="text-sm">Foto evidencia (opcional)</span>
                      <input type="file" name="foto_evidencia" accept="image/jpeg,image/png,image/webp" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      <span className="text-xs text-gray-500">Se optimiza automáticamente a máximo 1080px y se genera miniatura.</span>
                    </label>
                  </details>

                  <div className="mt-2 flex justify-end rounded-xl border-t border-gray-200 pt-3">
                    <button type="submit" className="inline-flex items-center gap-2.5 rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC]">
                      Registrar adelanto
                    </button>
                  </div>
                </form>
              </FormToggleSection>
            )}
            pagoContent={(
              <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                <PagoLiquidacionForm
                  liquidaciones={liquidaciones}
                  pagosLiquidacion={pagos}
                  adelantosProductor={adelantos}
                  personaMap={personaMap}
                  loteMap={loteMap}
                  pedidoMap={pedidoMap}
                />
              </div>
            )}
          />
        </div>
      </section>

      <section id="tab-liquidar" className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" style={{display: 'none'}}>
        <h2 className="mb-3 text-lg font-semibold">Liquidación de productor</h2>
        <p className="mb-3 text-sm">
          Selecciona un lote para liquidar solo lo vendido pendiente (el lote puede partirse y liquidarse varias veces).
        </p>

        <p className="mb-2 text-xs">Qué muestra esta tabla: lotes habilitados para liquidación de productor.</p>
        <div className="mb-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Lote</th>
                <th className="p-2">Productor</th>
                <th className="p-2">Producto</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lotesLiquidables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center">
                    No hay lotes pendientes de liquidar.
                  </td>
                </tr>
              ) : null}

              {lotesLiquidables.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.numero_lote}</td>
                  <td className="p-2">{personaMap.get(row.productor_id) ?? row.productor_id}</td>
                  <td className="p-2">{row.producto}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">
                    <Link href={`/liquidaciones?lote=${row.id}`} className="rounded border px-2 py-1">
                      Liquidar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedLoteData ? (
          <FormToggleSection title="Formulario de liquidación de productor" description="Completa datos, descuentos y evidencias antes de confirmar." defaultOpen>
          <form action={createLiquidacionProductorAction} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="lote_id" value={String(selectedLoteData.lote.id)} />

            <p className="text-sm">
              Lote: <strong>{selectedLoteData.lote.numero_lote}</strong> | Productor: <strong>{personaMap.get(selectedLoteData.lote.productor_id) ?? selectedLoteData.lote.productor_id}</strong>
            </p>

            {selectedLoteData.liquidacionSinClasificacion ? (
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="mb-2 text-sm">
                  Lote sin clasificar: esta liquidación se hará por <strong>monto directo</strong> (sin detalle por calidad).
                </p>
                <label className="grid gap-1 sm:max-w-xs">
                  <span className="text-sm">Monto directo a liquidar *</span>
                  <input
                    name="monto_directo"
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded border px-2 py-1"
                    required
                  />
                </label>
              </div>
            ) : (
              <>
                <p className="text-xs">Qué muestra esta tabla: detalle por categoría de kg vendidos, ya liquidados y pendientes por liquidar.</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2">Código clasif.</th>
                        <th className="p-2">Categoría</th>
                        <th className="p-2">Kg vendidos</th>
                        <th className="p-2">Kg ya liquidados</th>
                        <th className="p-2">Kg pendientes liquidar</th>
                        <th className="p-2">Precio/kg *</th>
                        <th className="p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLoteData.clasificaciones.map((row) => (
                        <tr key={row.categoria_id} className="border-b">
                          <td className="p-2">{row.codigo_clasificacion ?? "-"}</td>
                          <td className="p-2">{categoriaMap.get(row.categoria_id) ?? row.categoria_id}</td>
                          <td className="p-2">{row.kg_vendidos}</td>
                          <td className="p-2">{row.kg_liquidados}</td>
                          <td className="p-2">{row.kg_pendientes_liquidar}</td>
                          <td className="p-2">
                            <input
                              name={`precio_kg_${row.categoria_id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-28 rounded border px-2 py-1"
                              required
                            />
                          </td>
                          <td className="p-2">auto</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <label className="grid gap-1">
                <span className="text-sm">Fecha liquidación *</span>
                <input
                  name="fecha_liquidacion"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded border px-2 py-1"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Tipo comprobante</span>
                <select name="tipo_comprobante" defaultValue="ninguno" className="rounded border px-2 py-1">
                  <option value="ninguno">ninguno</option>
                  <option value="factura">factura</option>
                  <option value="boleta">boleta</option>
                  <option value="recibo">recibo</option>
                  <option value="nota_credito">nota_credito</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Forma pago</span>
                <select name="forma_pago" defaultValue="" className="rounded border px-2 py-1">
                  <option value="">(sin definir)</option>
                  <option value="efectivo">efectivo</option>
                  <option value="transferencia">transferencia</option>
                  <option value="cheque">cheque</option>
                  <option value="mixto">mixto</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Costo flete</span>
                <input name="costo_flete" type="number" step="0.01" min="0" className="rounded border px-2 py-1" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Costo cosecha</span>
                <input name="costo_cosecha" type="number" step="0.01" min="0" className="rounded border px-2 py-1" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Costo maquila</span>
                <input name="costo_maquila" type="number" step="0.01" min="0" className="rounded border px-2 py-1" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Descuento jabas</span>
                <input name="descuento_jabas" type="number" step="0.01" min="0" className="rounded border px-2 py-1" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Otros descuentos</span>
                <input name="otros_descuentos" type="number" step="0.01" min="0" className="rounded border px-2 py-1" />
              </label>
            </div>

            <fieldset className="rounded border p-3">
              <legend className="px-1 text-sm">Adelantos a descontar (opcionales)</legend>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="aplicar_adelantos_auto" value="1" defaultChecked />
                Aplicar automáticamente adelantos pendientes (si no marcas manualmente)
              </label>
              <p className="mb-2 text-xs">
                Si el adelanto excede el neto de la liquidación, el excedente queda como saldo pendiente de adelanto.
              </p>
              <div className="grid gap-2">
                {selectedLoteData.adelantosPendientes.length === 0 ? (
                  <p className="text-sm">No hay adelantos pendientes para este productor/lote.</p>
                ) : null}

                {selectedLoteData.adelantosPendientes.map((adelanto) => (
                  <label key={adelanto.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="adelantos" value={String(adelanto.id)} />
                    {adelanto.fecha} | {adelanto.numero_comprobante ?? "(sin comp.)"} | S/ {adelanto.monto} | {adelanto.motivo ?? "Sin motivo"}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-1">
              <span className="text-sm">Observaciones</span>
              <textarea name="observaciones" className="min-h-20 rounded border px-2 py-1" />
            </label>

            <ComprobanteInternoFields />

            <label className="grid gap-1 sm:max-w-md">
              <span className="text-sm">Foto evidencia de liquidación (opcional)</span>
              <input type="file" name="foto_evidencia" accept="image/jpeg,image/png,image/webp" className="rounded border px-2 py-1" />
              <span className="text-xs">Se optimiza automáticamente a máximo 1080px y se genera miniatura.</span>
            </label>

            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#1A73E8] px-3 py-2 font-medium text-white hover:bg-[#1765CC]">
                Crear liquidación productor
              </button>
              <Link href="/liquidaciones" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50">
                Cancelar
              </Link>
            </div>
          </form>
          </FormToggleSection>
        ) : null}
      </section>

      <section id="tab-control" className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" style={{display: 'none'}}>
        <h2 className="mb-2 text-lg font-semibold">Control</h2>
        <p className="mb-3 text-sm">Tablas completas con filtros, paginación y export (visual básico).</p>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Resumen de pagos</h2>
          <p className="mb-3 text-sm">
            Pagos registrados: <strong>{pagos.length}</strong> | Total importe: <strong>S/ {totalPagosRegistrados}</strong>
          </p>

          <p className="text-xs">Qué muestra esta tabla: historial de pagos parciales por liquidación.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Liquidación</th>
                  <th className="p-2">Comp. interno</th>
                  <th className="p-2">Persona</th>
                  <th className="p-2">Lote</th>
                  <th className="p-2">Monto</th>
                  <th className="p-2">Forma</th>
                  <th className="p-2">Nro. comp.</th>
                  <th className="p-2">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-3 text-center">
                      Sin pagos registrados.
                    </td>
                  </tr>
                ) : null}

                {pagos.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{shortDate(row.fecha)} {row.created_at ? new Date(row.created_at).toLocaleTimeString() : ""}</td>
                    <td className="p-2">{liquidacionMap.get(row.liquidacion_id) ?? row.liquidacion_id}</td>
                    <td className="p-2">{compLiquidacionMap.get(row.liquidacion_id) ?? "-"}</td>
                    <td className="p-2">{personaMap.get(liquidacionPersonaMap.get(row.liquidacion_id) ?? 0) ?? "-"}</td>
                    <td className="p-2">{row.lote_id ? loteMap.get(row.lote_id) ?? row.lote_id : "-"}</td>
                    <td className="p-2">{row.monto}</td>
                    <td className="p-2">{row.forma_pago ?? "-"}</td>
                    <td className="p-2">{row.numero_comprobante ?? "-"}</td>
                    <td className="p-2">{row.observaciones ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Resumen de adelantos</h2>
          <p className="mb-3 text-sm">
            Por descontar en liquidación: <strong>{adelantosPendientes.length}</strong> | Monto por descontar: <strong>S/ {totalAdelantosPorDescontar}</strong>
          </p>

          <p className="text-xs">Qué muestra esta tabla: adelantos entregados, su estado y en qué liquidación se aplicaron.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Foto</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Comprobante</th>
                  <th className="p-2">Comp. interno</th>
                  <th className="p-2">Productor</th>
                  <th className="p-2">Lote</th>
                  <th className="p-2">Monto</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Liquidación</th>
                </tr>
              </thead>
              <tbody>
                {adelantos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-3 text-center">
                      Sin adelantos.
                    </td>
                  </tr>
                ) : null}

                {adelantos.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      {(() => {
                        const fo = getFotoObject(fotoAdelantoMap, Number(row.id));
                        if (!fo) return <span className="text-xs text-gray-500">-</span>;
                        const thumb = fo.thumb;
                        const image = fo.image;
                        return image ? (
                          <a href={image} target="_blank" rel="noopener noreferrer" title="Ver imagen">
                            <Image src={thumb ?? image} alt={`Adelanto ${row.id}`} width={44} height={44} className="h-11 w-11 rounded object-cover" />
                          </a>
                        ) : thumb ? (
                          <Image src={thumb} alt={`Adelanto ${row.id}`} width={44} height={44} className="h-11 w-11 rounded object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        );
                      })()}
                    </td>
                    <td className="p-2">{shortDate(row.fecha)} {row.created_at ? new Date(row.created_at).toLocaleTimeString() : ""}</td>
                    <td className="p-2">{row.numero_comprobante ?? "-"}</td>
                    <td className="p-2">{compAdelantoMap.get(Number(row.id)) ?? "-"}</td>
                    <td className="p-2">{personaMap.get(row.productor_id) ?? row.productor_id}</td>
                    <td className="p-2">{row.lote_id ? loteMap.get(row.lote_id) ?? row.lote_id : "-"}</td>
                    <td className="p-2">{row.monto}</td>
                    <td className="p-2">{row.motivo ?? "-"}</td>
                    <td className="p-2">{row.estado}</td>
                    <td className="p-2">{row.liquidacion_id ? liquidacionMap.get(row.liquidacion_id) ?? row.liquidacion_id : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <h2 className="mb-3 text-lg font-semibold">Liquidación de cliente</h2>
        <p className="mb-3 text-sm">
          Selecciona un pedido para liquidar su saldo pendiente (si fue partido, se liquida por cortes).
        </p>

        <p className="mb-2 text-xs">Qué muestra esta tabla: pedidos habilitados para liquidación de cliente.</p>
        <div className="mb-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Pedido</th>
                <th className="p-2">Cliente</th>
                <th className="p-2">Producto</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidosLiquidables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center">
                    No hay pedidos con asignaciones para liquidar.
                  </td>
                </tr>
              ) : null}

              {pedidosLiquidables.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.numero_pedido}</td>
                  <td className="p-2">{personaMap.get(row.cliente_id) ?? row.cliente_id}</td>
                  <td className="p-2">{row.producto}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">
                    <Link href={`/liquidaciones?pedido=${row.id}`} className="rounded border px-2 py-1">
                      Liquidar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedPedidoData ? (
          <FormToggleSection title="Formulario de liquidación de cliente" description="Registra el cierre comercial del pedido con evidencia y comprobante." defaultOpen>
          <form action={createLiquidacionClienteAction} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="pedido_id" value={String(selectedPedidoData.pedido.id)} />

            <p className="text-sm">
              Pedido: <strong>{selectedPedidoData.pedido.numero_pedido}</strong> | Cliente: <strong>{personaMap.get(selectedPedidoData.pedido.cliente_id) ?? selectedPedidoData.pedido.cliente_id}</strong>
            </p>

            <p className="text-xs">Qué muestra esta tabla: saldo pendiente por categoría del pedido seleccionado.</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Kg pendientes</th>
                    <th className="p-2">Precio/kg</th>
                    <th className="p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPedidoData.resumenCategorias.map((row) => (
                    <tr key={row.categoria_id} className="border-b">
                      <td className="p-2">{categoriaMap.get(row.categoria_id) ?? row.categoria_id}</td>
                      <td className="p-2">{row.kg_asignados}</td>
                      <td className="p-2">
                        <input
                          name={`precio_kg_categoria_${row.categoria_id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={String(row.precio_sugerido)}
                          className="w-28 rounded border px-2 py-1"
                          required
                        />
                      </td>
                      <td className="p-2">auto</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-3 text-sm font-semibold">Divisiones (códigos de corte del pedido)</h3>
            <p className="text-xs">Qué muestra esta tabla: cortes/divisiones que explican origen de kg y precio de la liquidación.</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Código división</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Lote</th>
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Kg</th>
                    <th className="p-2">Precio/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPedidoData.divisiones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-center">
                        Sin divisiones registradas.
                      </td>
                    </tr>
                  ) : null}

                  {selectedPedidoData.divisiones.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{row.codigo_division ?? "-"}</td>
                      <td className="p-2">{row.fecha_asignacion}</td>
                      <td className="p-2">{loteMap.get(row.lote_id) ?? row.lote_id}</td>
                      <td className="p-2">{categoriaMap.get(row.categoria_id) ?? row.categoria_id}</td>
                      <td className="p-2">{row.kg_asignados}</td>
                      <td className="p-2">{row.precio_kg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-sm">Fecha liquidación *</span>
                <input
                  name="fecha_liquidacion"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded border px-2 py-1"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Tipo comprobante</span>
                <select name="tipo_comprobante" defaultValue="ninguno" className="rounded border px-2 py-1">
                  <option value="ninguno">ninguno</option>
                  <option value="factura">factura</option>
                  <option value="boleta">boleta</option>
                  <option value="recibo">recibo</option>
                  <option value="nota_credito">nota_credito</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Forma pago</span>
                <select name="forma_pago" defaultValue="" className="rounded border px-2 py-1">
                  <option value="">(sin definir)</option>
                  <option value="efectivo">efectivo</option>
                  <option value="transferencia">transferencia</option>
                  <option value="cheque">cheque</option>
                  <option value="mixto">mixto</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm">Observaciones</span>
              <textarea name="observaciones" className="min-h-20 rounded border px-2 py-1" />
            </label>

            <ComprobanteInternoFields />

            <label className="grid gap-1 sm:max-w-md">
              <span className="text-sm">Foto evidencia de liquidación (opcional)</span>
              <input type="file" name="foto_evidencia" accept="image/jpeg,image/png,image/webp" className="rounded border px-2 py-1" />
              <span className="text-xs">Se optimiza automáticamente a máximo 1080px y se genera miniatura.</span>
            </label>

            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#1A73E8] px-3 py-2 font-medium text-white hover:bg-[#1765CC]">
                Crear liquidación cliente
              </button>
              <Link href="/liquidaciones" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50">
                Cancelar
              </Link>
            </div>
          </form>
          </FormToggleSection>
        ) : null}
      </section>

      

      
      
        </div>
      </main>
    </div>
  );
}
