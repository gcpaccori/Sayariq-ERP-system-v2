import Link from "next/link";
import { Search, Eye } from "lucide-react";

import {
  asignarLotePedidoAction,
  createPedidoAction,
  deleteAsignacionPedidoAction,
  updateAsignacionPedidoAction,
  updatePedidoAction,
} from "./actions";
import { selectCategoriasActivasCompat } from "@/lib/categorias";
import { getClasificacionVigenteErrorMessage } from "@/lib/lote-clasificacion-vigente";
import {
  buildPedidoDetalleLabel,
  loadPedidoDetalleByPedidosCompat,
  loadPedidoDetalleCompat,
  summarizePedidoDetalle,
  type PedidoDetalleLine,
} from "@/lib/pedido-detalle";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import ModuleNavigation from "@/components/module-navigation";
import ModuleFormModal from "@/components/module-form-modal";
import PedidoEditor from "@/components/pedido-editor";

type SearchParams = {
  q?: string;
  estado?: "todos" | "pendiente" | "en_proceso" | "completado" | "cancelado";
  cliente?: string;
  page?: string;
  asignar?: string;
  editar?: string;
  ok?: string;
  error?: string;
};

type Cliente = {
  id: number;
  nombre_completo: string;
  tipo_documento: string | null;
  documento: string | null;
};

type Categoria = {
  id: number;
  nombre: string;
  codigo: string;
  orden: number;
};

type Pedido = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  producto: string;
  categoria_id: number | null;
  kg_solicitados: number;
  precio_kg: number;
  total_estimado: number;
  fecha_pedido: string;
  fecha_entrega: string | null;
  estado: "pendiente" | "en_proceso" | "completado" | "cancelado";
  observaciones: string | null;
};

type Asignacion = {
  id: number;
  pedido_id: number;
  pedido_detalle_id: number | null;
  lote_id: number;
  categoria_id: number;
  sin_clasificacion_neta: boolean;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
};

type LoteDisponible = {
  lote_id: number;
  numero_lote: string;
  productor_nombre: string;
  pedido_detalle_id: number;
  pedido_categoria_id: number;
  pedido_categoria_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  kg_disponibles: number;
  sin_clasificacion_neta: boolean;
  es_sustitucion: boolean;
  stock_badge: string;
};

type LotesDisponiblesResult = {
  lotes: LoteDisponible[];
  errorMessage: string;
};

function escapeLike(input: string) {
  return input.replaceAll("%", "").replaceAll(",", " ").trim();
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function getClientesActivos() {
  const supabase = getSupabaseServerClient();
  const { data: rolesData } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("rol", "cliente");

  const ids = [
    ...new Set((rolesData ?? []).map((row) => Number(row.persona_id))),
  ];
  if (ids.length === 0) return [] as Cliente[];

  const { data } = await supabase
    .from("personas")
    .select("id,nombre_completo,tipo_documento,documento")
    .in("id", ids)
    .eq("estado", "activo")
    .order("nombre_completo", { ascending: true });

  return (data ?? []) as Cliente[];
}

async function getCategoriasActivas() {
  const supabase = getSupabaseServerClient();
  return selectCategoriasActivasCompat<Categoria>(
    supabase,
    "id,nombre,codigo,orden",
  );
}

async function getPedidos(search: SearchParams) {
  const supabase = getSupabaseServerClient();

  const estado = search.estado ?? "todos";
  const cliente = Number(search.cliente ?? "0");
  const q = (search.q ?? "").trim();

  let query = supabase
    .from("pedidos")
    .select(
      "id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,precio_kg,total_estimado,fecha_pedido,fecha_entrega,estado,observaciones",
    )
    .order("id", { ascending: false });

  if (estado !== "todos") {
    query = query.eq("estado", estado);
  }

  if (cliente > 0) {
    query = query.eq("cliente_id", cliente);
  }

  if (q) {
    query = query.or(`numero_pedido.ilike.%${escapeLike(q)}%`);
  }

  const { data, error } = await query;

  if (error) {
    return {
      pedidos: [] as Pedido[],
      clienteMap: new Map<number, string>(),
      errorMessage: error.message,
    };
  }

  const pedidos = (data ?? []) as Pedido[];
  const clienteIds = [
    ...new Set(pedidos.map((pedido) => Number(pedido.cliente_id))),
  ];
  const clienteMap = new Map<number, string>();

  if (clienteIds.length > 0) {
    const { data: clientesData } = await supabase
      .from("personas")
      .select("id,nombre_completo")
      .in("id", clienteIds);

    for (const row of clientesData ?? []) {
      clienteMap.set(Number(row.id), String(row.nombre_completo));
    }
  }

  return {
    pedidos,
    clienteMap,
    errorMessage: "",
  };
}

async function getAsignacionesByPedidos(pedidoIds: number[]) {
  if (pedidoIds.length === 0) {
    return [] as Asignacion[];
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedido_asignaciones")
    .select(
      "id,pedido_id,pedido_detalle_id,lote_id,categoria_id,sin_clasificacion_neta,kg_asignados,precio_kg,subtotal,fecha_asignacion",
    )
    .in("pedido_id", pedidoIds);

  return (data ?? []) as Asignacion[];
}

async function getResumenPedidos() {
  const supabase = getSupabaseServerClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id,estado,kg_solicitados")
    .neq("estado", "cancelado");

  const pedidoIds = (pedidos ?? []).map((row) => Number(row.id));
  const asignaciones = await getAsignacionesByPedidos(pedidoIds);

  const asignadoMap = new Map<number, number>();
  for (const row of asignaciones) {
    const id = Number(row.pedido_id);
    asignadoMap.set(
      id,
      (asignadoMap.get(id) ?? 0) + Number(row.kg_asignados ?? 0),
    );
  }

  const totalPedidos = (pedidos ?? []).length;
  const pendientes = (pedidos ?? []).filter(
    (row) => row.estado === "pendiente",
  ).length;
  const enProceso = (pedidos ?? []).filter(
    (row) => row.estado === "en_proceso",
  ).length;
  const completados = (pedidos ?? []).filter(
    (row) => row.estado === "completado",
  ).length;

  let kgPendientes = 0;
  for (const pedido of pedidos ?? []) {
    const solicitados = Number(pedido.kg_solicitados ?? 0);
    const asignados = asignadoMap.get(Number(pedido.id)) ?? 0;
    kgPendientes += Math.max(0, solicitados - asignados);
  }

  return {
    totalPedidos,
    pendientes,
    enProceso,
    completados,
    kgPendientes: round2(kgPendientes),
  };
}

async function getPedidoById(id: number) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pedidos")
    .select(
      "id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,precio_kg,total_estimado,fecha_pedido,fecha_entrega,estado,observaciones",
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as Pedido | null;
}

async function getStockReferencialByCategoria() {
  const supabase = getSupabaseServerClient();
  const { data: clasificaciones } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("lote_id,categoria_id,peso_neto");

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("lote_id,categoria_id,kg_asignados,sin_clasificacion_neta");

  const asignadoMap = new Map<string, number>();
  const rawAsignadoPorLote = new Map<number, number>();

  for (const row of asignaciones ?? []) {
    const loteId = Number(row.lote_id);
    const categoriaId = Number(row.categoria_id);
    const kg = Number(row.kg_asignados ?? 0);
    if (row.sin_clasificacion_neta) {
      rawAsignadoPorLote.set(loteId, round2((rawAsignadoPorLote.get(loteId) ?? 0) + kg));
      continue;
    }

    const key = `${loteId}-${categoriaId}`;
    asignadoMap.set(key, round2((asignadoMap.get(key) ?? 0) + kg));
  }

  const totalNetoPorLote = new Map<number, number>();
  const asignadoClasificadoPorLote = new Map<number, number>();
  for (const row of clasificaciones ?? []) {
    const loteId = Number(row.lote_id);
    totalNetoPorLote.set(loteId, round2((totalNetoPorLote.get(loteId) ?? 0) + Number(row.peso_neto ?? 0)));
    const key = `${loteId}-${Number(row.categoria_id)}`;
    asignadoClasificadoPorLote.set(
      loteId,
      round2((asignadoClasificadoPorLote.get(loteId) ?? 0) + (asignadoMap.get(key) ?? 0)),
    );
  }

  const result = new Map<number, number>();
  for (const row of clasificaciones ?? []) {
    const loteId = Number(row.lote_id);
    const categoriaId = Number(row.categoria_id);
    const totalNeto = totalNetoPorLote.get(loteId) ?? 0;
    const rawAsignado = rawAsignadoPorLote.get(loteId) ?? 0;
    const asignadoClasificado = asignadoClasificadoPorLote.get(loteId) ?? 0;
    const disponibleGlobal = round2(totalNeto - asignadoClasificado - rawAsignado);
    const disponibleCategoria = round2(Number(row.peso_neto ?? 0) - (asignadoMap.get(`${loteId}-${categoriaId}`) ?? 0));
    const disponible = round2(Math.max(0, Math.min(disponibleCategoria, disponibleGlobal)));
    if (disponible <= 0.01) continue;
    result.set(categoriaId, round2((result.get(categoriaId) ?? 0) + disponible));
  }

  return result;
}

async function getAvailableLotesForPedido(
  pedido: Pedido,
  detalle: PedidoDetalleLine[],
): Promise<LotesDisponiblesResult> {
  const supabase = getSupabaseServerClient();

  const { data: lotes, error: lotesError } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id,peso_bruto_ingreso,estado")
    .in("estado", ["sin_clasificar", "clasificado", "asignado"])
    .eq("producto", pedido.producto);

  if (lotesError) {
    return {
      lotes: [],
      errorMessage: `No se pudieron cargar los lotes del producto ${pedido.producto}: ${lotesError.message}`,
    };
  }

  if (!lotes || lotes.length === 0) {
    return { lotes: [], errorMessage: "" };
  }

  const loteIds = lotes.map((lote) => Number(lote.id));

  const { data: clasificaciones, error: clasificacionesError } = await supabase
    .from("vw_lote_clasificacion_vigente")
    .select("lote_id,categoria_id,peso_neto")
    .in("lote_id", loteIds);

  if (clasificacionesError) {
    return {
      lotes: [],
      errorMessage: getClasificacionVigenteErrorMessage(clasificacionesError),
    };
  }

  const categoriaIds = [
    ...new Set((clasificaciones ?? []).map((row) => Number(row.categoria_id))),
  ];

  const categoriasResult =
    categoriaIds.length > 0
      ? await supabase.from("categorias").select("id,nombre").in("id", categoriaIds)
      : { data: [], error: null };
  const { data: categorias, error: categoriasError } = categoriasResult;

  if (categoriasError) {
    return {
      lotes: [],
      errorMessage: `No se pudieron cargar las categorias relacionadas: ${categoriasError.message}`,
    };
  }

  const { data: personas, error: personasError } = await supabase
    .from("personas")
    .select("id,nombre_completo")
    .in("id", [...new Set(lotes.map((row) => Number(row.productor_id)))]);

  if (personasError) {
    return {
      lotes: [],
      errorMessage: `No se pudieron cargar los productores de los lotes: ${personasError.message}`,
    };
  }

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("pedido_asignaciones")
    .select("lote_id,categoria_id,kg_asignados,sin_clasificacion_neta")
    .in("lote_id", loteIds);

  if (asignacionesError) {
    return {
      lotes: [],
      errorMessage: `No se pudieron cargar las asignaciones actuales: ${asignacionesError.message}`,
    };
  }

  const asignadoClasificadoMap = new Map<string, number>();
  const rawAsignadoPorLote = new Map<number, number>();
  for (const row of asignaciones ?? []) {
    const loteId = Number(row.lote_id);
    const kg = Number(row.kg_asignados ?? 0);
    if (row.sin_clasificacion_neta) {
      rawAsignadoPorLote.set(loteId, round2((rawAsignadoPorLote.get(loteId) ?? 0) + kg));
      continue;
    }

    const key = `${row.lote_id}-${row.categoria_id}`;
    asignadoClasificadoMap.set(key, round2((asignadoClasificadoMap.get(key) ?? 0) + kg));
  }

  const categoriaMap = new Map<number, string>();
  for (const row of categorias ?? []) {
    categoriaMap.set(Number(row.id), String(row.nombre));
  }

  const productorMap = new Map<number, string>();
  for (const row of personas ?? []) {
    productorMap.set(Number(row.id), String(row.nombre_completo));
  }

  const lotesMap = new Map<
    number,
    { numero_lote: string; productor_id: number; peso_bruto_ingreso: number; estado: string }
  >();
  for (const row of lotes) {
    lotesMap.set(Number(row.id), {
      numero_lote: String(row.numero_lote),
      productor_id: Number(row.productor_id),
      peso_bruto_ingreso: Number(row.peso_bruto_ingreso ?? 0),
      estado: String(row.estado),
    });
  }

  const resultado: LoteDisponible[] = [];
  const pendientes = new Map<number, number>();
  for (const line of detalle) {
    const faltante = round2(Number(line.kg_solicitados ?? 0) - Number(line.kg_asignados ?? 0));
    if (faltante > 0.01) {
      pendientes.set(Number(line.id), faltante);
    }
  }

  const totalNetoPorLote = new Map<number, number>();
  for (const row of clasificaciones ?? []) {
    const loteId = Number(row.lote_id);
    totalNetoPorLote.set(loteId, round2((totalNetoPorLote.get(loteId) ?? 0) + Number(row.peso_neto ?? 0)));
  }

  for (const row of clasificaciones ?? []) {
    const loteId = Number(row.lote_id);
    const categoriaId = Number(row.categoria_id);
    const neto = Number(row.peso_neto ?? 0);
    const asignado = asignadoClasificadoMap.get(`${loteId}-${categoriaId}`) ?? 0;
    const loteTotal = totalNetoPorLote.get(loteId) ?? 0;
    const rawAsignado = rawAsignadoPorLote.get(loteId) ?? 0;
    const asignadoClasificadoLote = (clasificaciones ?? []).reduce((acc, current) => {
      const key = `${current.lote_id}-${current.categoria_id}`;
      return Number(current.lote_id) === loteId ? acc + (asignadoClasificadoMap.get(key) ?? 0) : acc;
    }, 0);
    const disponibleGlobal = round2(loteTotal - asignadoClasificadoLote - rawAsignado);
    const disponible = round2(Math.max(0, Math.min(neto - asignado, disponibleGlobal)));
    if (disponible <= 0.01) continue;

    const loteData = lotesMap.get(loteId);
    if (!loteData) continue;

    for (const line of detalle) {
      const faltante = pendientes.get(Number(line.id)) ?? 0;
      if (faltante <= 0.01) continue;
      const esSustitucion = categoriaId !== Number(line.categoria_id);
      if (esSustitucion && !line.permite_sustitucion) continue;

      resultado.push({
        lote_id: loteId,
        numero_lote: loteData.numero_lote,
        productor_nombre: productorMap.get(loteData.productor_id) ?? String(loteData.productor_id),
        pedido_detalle_id: Number(line.id),
        pedido_categoria_id: Number(line.categoria_id),
        pedido_categoria_nombre: line.categoria_nombre,
        categoria_id: categoriaId,
        categoria_nombre: categoriaMap.get(categoriaId) ?? String(categoriaId),
        kg_disponibles: round2(Math.min(disponible, faltante)),
        sin_clasificacion_neta: false,
        es_sustitucion: esSustitucion,
        stock_badge: esSustitucion ? "Sustitucion" : "Clasificacion neta",
      });
    }
  }

  for (const lote of lotes) {
    if (String(lote.estado) !== "sin_clasificar") continue;
    const disponibleBruto = round2(Number(lote.peso_bruto_ingreso ?? 0) - (rawAsignadoPorLote.get(Number(lote.id)) ?? 0));
    if (disponibleBruto <= 0.01) continue;

    for (const line of detalle) {
      const faltante = pendientes.get(Number(line.id)) ?? 0;
      if (faltante <= 0.01) continue;

      resultado.push({
        lote_id: Number(lote.id),
        numero_lote: String(lote.numero_lote),
        productor_nombre: productorMap.get(Number(lote.productor_id)) ?? String(lote.productor_id),
        pedido_detalle_id: Number(line.id),
        pedido_categoria_id: Number(line.categoria_id),
        pedido_categoria_nombre: line.categoria_nombre,
        categoria_id: Number(line.categoria_id),
        categoria_nombre: line.categoria_nombre,
        kg_disponibles: round2(Math.min(disponibleBruto, faltante)),
        sin_clasificacion_neta: true,
        es_sustitucion: false,
        stock_badge: "Sin clasificacion neta",
      });
    }
  }

  return {
    lotes: resultado.sort((a, b) => {
      if (a.sin_clasificacion_neta !== b.sin_clasificacion_neta) {
        return a.sin_clasificacion_neta ? 1 : -1;
      }
      if (a.es_sustitucion !== b.es_sustitucion) {
        return a.es_sustitucion ? 1 : -1;
      }
      return b.kg_disponibles - a.kg_disponibles;
    }),
    errorMessage: "",
  };
}

function buildPedidosUrl(params: {
  q?: string;
  estado?: string;
  cliente?: string;
  page?: number;
  asignar?: number | null;
  editar?: number | null;
}) {
  const searchParams = new URLSearchParams();

  const q = (params.q ?? "").trim();
  if (q) searchParams.set("q", q);

  const estado = (params.estado ?? "todos").trim();
  if (estado && estado !== "todos") searchParams.set("estado", estado);

  const cliente = (params.cliente ?? "").trim();
  if (cliente && cliente !== "0") searchParams.set("cliente", cliente);

  if ((params.page ?? 1) > 1) {
    searchParams.set("page", String(params.page));
  }

  if ((params.asignar ?? 0) > 0) {
    searchParams.set("asignar", String(params.asignar));
  }

  if ((params.editar ?? 0) > 0) {
    searchParams.set("editar", String(params.editar));
  }

  const query = searchParams.toString();
  return query ? `/pedidos?${query}` : "/pedidos";
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const supabase = getSupabaseServerClient();

  const [clientes, categorias, pedidosData, resumen, stockReferencialMap] = await Promise.all([
    getClientesActivos(),
    getCategoriasActivas(),
    getPedidos(search),
    getResumenPedidos(),
    getStockReferencialByCategoria(),
  ]);

  const pedidoIds = pedidosData.pedidos.map((pedido) => Number(pedido.id));
  const [asignaciones, detalleByPedido] = await Promise.all([
    getAsignacionesByPedidos(pedidoIds),
    loadPedidoDetalleByPedidosCompat(supabase, pedidosData.pedidos),
  ]);

  const kgAsignadosMap = new Map<number, number>();
  for (const row of asignaciones) {
    const pedidoId = Number(row.pedido_id);
    kgAsignadosMap.set(
      pedidoId,
      (kgAsignadosMap.get(pedidoId) ?? 0) + Number(row.kg_asignados ?? 0),
    );
  }

  const categoriaMap = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );
  const detalleLineMap = new Map<number, PedidoDetalleLine>();
  for (const lines of detalleByPedido.values()) {
    for (const line of lines) {
      detalleLineMap.set(Number(line.id), line);
    }
  }

  const asignarId = Number(search.asignar ?? "0");
  const editarId = Number(search.editar ?? "0");

  const pageSize = 12;
  const totalRows = pedidosData.pedidos.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const currentPage = Number.isFinite(parsedPage)
    ? Math.min(Math.max(parsedPage, 1), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const pedidosPage = pedidosData.pedidos.slice(pageStart, pageStart + pageSize);
  const fromItem = totalRows === 0 ? 0 : pageStart + 1;
  const toItem = Math.min(pageStart + pageSize, totalRows);

  const paginationRangeStart = Math.max(1, currentPage - 2);
  const paginationRangeEnd = Math.min(totalPages, paginationRangeStart + 4);
  const paginationRange = Array.from(
    { length: paginationRangeEnd - paginationRangeStart + 1 },
    (_, index) => paginationRangeStart + index,
  );

  const listBaseUrl = buildPedidosUrl({
    q: search.q,
    estado: search.estado,
    cliente: search.cliente,
    page: currentPage,
  });

  const pedidoSeleccionado =
    asignarId > 0 ? await getPedidoById(asignarId) : null;
  const pedidoEditar = editarId > 0 ? await getPedidoById(editarId) : null;
  const detallePedidoSeleccionado = pedidoSeleccionado
    ? await loadPedidoDetalleCompat(supabase, pedidoSeleccionado)
    : [];
  const detallePedidoEditar = pedidoEditar
    ? await loadPedidoDetalleCompat(supabase, pedidoEditar)
    : [];
  const resumenDetalleSeleccionado = summarizePedidoDetalle(detallePedidoSeleccionado);

  const loteDisponiblesResult = pedidoSeleccionado
    ? await getAvailableLotesForPedido(pedidoSeleccionado, detallePedidoSeleccionado)
    : { lotes: [], errorMessage: "" };
  const loteDisponibles = loteDisponiblesResult.lotes;

  const asignacionesPedidoSeleccionado = pedidoSeleccionado
    ? asignaciones.filter(
      (row) => Number(row.pedido_id) === pedidoSeleccionado.id,
    )
    : [];

  const kgAsignadoSeleccionado = pedidoSeleccionado
    ? round2(
      asignacionesPedidoSeleccionado.reduce(
        (acc, row) => acc + Number(row.kg_asignados ?? 0),
        0,
      ),
    )
    : 0;

  const kgFaltanteSeleccionado = pedidoSeleccionado
    ? round2(Math.max(0, Number(resumenDetalleSeleccionado.kgSolicitados || pedidoSeleccionado.kg_solicitados) - kgAsignadoSeleccionado))
    : 0;

  const loteIdsSel = [
    ...new Set(
      asignacionesPedidoSeleccionado.map((row) => Number(row.lote_id)),
    ),
  ];
  const { data: lotesSelData } =
    loteIdsSel.length > 0
      ? await supabase
        .from("lotes")
        .select("id,numero_lote")
        .in("id", loteIdsSel)
      : { data: [] as Array<{ id: number; numero_lote: string }> };

  const loteMapSel = new Map<number, string>();
  for (const row of lotesSelData ?? []) {
    loteMapSel.set(Number(row.id), String(row.numero_lote));
  }

  const categoriasEditor = categorias.map((categoria) => ({
    id: categoria.id,
    codigo: categoria.codigo,
    nombre: categoria.nombre,
    stockReferencial: round2(stockReferencialMap.get(Number(categoria.id)) ?? 0),
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="pedidos" />
      <main className="google-2027-theme relative min-w-0 flex-1 bg-white p-6 text-gray-900">
        {/* Grid Background Pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.02,
            backgroundImage:
              "radial-gradient(#111827 0.8px, transparent 0.8px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <section>
            {/* Header */}
            <div className="mb-8 flex flex-col items-start justify-between gap-4 pt-1 md:flex-row md:flex-wrap md:items-center md:gap-6">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Módulo 3: Pedidos
                </h1>
                <p className="mt-1.5 text-sm font-medium text-gray-600">
                  Orquestación comercial de demanda con asignación de lotes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ModuleFormModal
                  buttonLabel="Registrar Pedido"
                  title="Registrar Pedido"
                  description="Usa el nuevo editor por lineas para definir categorias, kg, prioridades y sustituciones."
                >
                  <form action={createPedidoAction}>
                    <PedidoEditor
                      clientes={clientes}
                      categorias={categoriasEditor}
                      initial={{
                        producto: "Jengibre",
                        fecha_pedido: new Date().toISOString().slice(0, 10),
                        lineas: [],
                      }}
                      submitLabel="Crear pedido"
                      showNumeroPedido
                    />
                  </form>
                </ModuleFormModal>

                <BackToDashboardButton className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50" />
              </div>
            </div>

            {/* Resumen Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  label: "Total Pedidos",
                  value: resumen.totalPedidos,
                  color: "from-blue-50 to-blue-50",
                  textColor: "text-[#1A73E8]",
                  icon: "📋",
                },
                {
                  label: "Pendientes",
                  value: resumen.pendientes,
                  color: "from-red-50 to-red-50",
                  textColor: "text-red-700",
                  icon: "⏳",
                },
                {
                  label: "En Proceso",
                  value: resumen.enProceso,
                  color: "from-yellow-50 to-yellow-50",
                  textColor: "text-yellow-700",
                  icon: "⚙️",
                },
                {
                  label: "Completados",
                  value: resumen.completados,
                  color: "from-green-50 to-green-50",
                  textColor: "text-green-700",
                  icon: "✓",
                },
                {
                  label: "Kg Pendientes",
                  value: resumen.kgPendientes,
                  color: "from-purple-50 to-purple-50",
                  textColor: "text-purple-700",
                  icon: "⚖️",
                },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border border-gray-200 bg-gradient-to-br ${card.color} p-4 shadow-sm transition duration-300 hover:shadow-md hover:border-gray-300`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {card.label}
                      </p>
                      <p
                        className={`mt-2 text-3xl font-bold ${card.textColor}`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <div className="text-4xl opacity-30">{card.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alertas */}
            {search.ok ? (
              <div className="mb-8 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm">
                ✓ {search.ok}
              </div>
            ) : null}
            {search.error || pedidosData.errorMessage ? (
              <div className="mb-8 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm">
                ✕ {search.error || pedidosData.errorMessage}
              </div>
            ) : null}

            {/* Filtros */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Filtros y Búsqueda
              </h2>
              <form className="grid gap-3 sm:grid-cols-4">
                <div className="relative sm:col-span-2">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    name="q"
                    defaultValue={search.q ?? ""}
                    placeholder="Buscar por número pedido"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                  />
                </div>

                <select
                  name="estado"
                  defaultValue={search.estado ?? "todos"}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">pendiente</option>
                  <option value="en_proceso">en_proceso</option>
                  <option value="completado">completado</option>
                  <option value="cancelado">cancelado</option>
                </select>

                <select
                  name="cliente"
                  defaultValue={search.cliente ?? ""}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                >
                  <option value="">Todos los clientes</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={String(cliente.id)}>
                      {cliente.nombre_completo}
                    </option>
                  ))}
                </select>

                <div className="sm:col-span-4">
                  <button className="rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1765CC]">
                    Aplicar filtros
                  </button>
                </div>
              </form>
            </div>
          </section>

          {pedidoEditar ? (
            <ModuleFormModal
              isOpen={true}
              closeHref={listBaseUrl}
              title={`Editar Pedido ${pedidoEditar.numero_pedido}`}
              description="Edita cliente, lineas, prioridades y faltantes por categoria desde un unico editor."
              maxWidth="5xl"
            >
              <form action={updatePedidoAction}>
                <input type="hidden" name="pedido_id" value={pedidoEditar.id} />
                <PedidoEditor
                  clientes={clientes}
                  categorias={categoriasEditor}
                  initial={{
                    numero_pedido: pedidoEditar.numero_pedido,
                    cliente_id: pedidoEditar.cliente_id,
                    producto: pedidoEditar.producto as "Jengibre" | "Curcuma",
                    fecha_pedido: pedidoEditar.fecha_pedido,
                    fecha_entrega: pedidoEditar.fecha_entrega,
                    observaciones: pedidoEditar.observaciones,
                    lineas: detallePedidoEditar.map((line) => ({
                      key: `detalle-${line.id}`,
                      categoria_id: Number(line.categoria_id),
                      kg_solicitados: Number(line.kg_solicitados ?? 0),
                      precio_kg: Number(line.precio_kg ?? 0),
                      prioridad: Number(line.prioridad ?? 1),
                      permite_sustitucion: Boolean(line.permite_sustitucion),
                      observaciones: line.observaciones ?? "",
                      requiere_revision: Boolean(line.requiere_revision),
                    })),
                  }}
                  submitLabel="Guardar cambios pedido"
                />
              </form>
            </ModuleFormModal>
          ) : null}

          {pedidoSeleccionado ? (
            <ModuleFormModal
              isOpen={true}
              closeHref={listBaseUrl}
              title={`Asignar lotes al pedido ${pedidoSeleccionado.numero_pedido}`}
              description={`Cliente: ${pedidosData.clienteMap.get(pedidoSeleccionado.cliente_id) ?? pedidoSeleccionado.cliente_id} | Producto: ${pedidoSeleccionado.producto} | Lineas: ${detallePedidoSeleccionado.length}`}
              maxWidth="5xl"
            >
              <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Primero te mostramos el faltante real por linea. Ademas ya puedes asignar lotes en estado <code>sin_clasificar</code> desde Almacen; cuando eso ocurra queda marcado como &quot;sin clasificacion neta&quot;.
              </p>

              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg solicitados</p>
                  <p className="mt-2 text-2xl font-bold text-[#1A73E8]">{resumenDetalleSeleccionado.kgSolicitados}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg asignados</p>
                  <p className="mt-2 text-2xl font-bold text-green-700">{resumenDetalleSeleccionado.kgAsignados}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg faltantes</p>
                  <p className="mt-2 text-2xl font-bold text-red-700">{kgFaltanteSeleccionado}</p>
                </div>
              </div>

              <div className="mb-6 grid gap-3 lg:grid-cols-2">
                {detallePedidoSeleccionado.map((line) => {
                  const faltante = round2(Number(line.kg_solicitados ?? 0) - Number(line.kg_asignados ?? 0));
                  return (
                    <div key={line.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{line.categoria_nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Prioridad {line.prioridad} | Precio {line.precio_kg} | {line.permite_sustitucion ? "Acepta sustitucion" : "Solo categoria exacta"}
                          </p>
                        </div>
                        {line.requiere_revision ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                            Requiere revision
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Solicitado</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{line.kg_solicitados} kg</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Asignado</p>
                          <p className="mt-1 text-base font-bold text-emerald-700">{line.kg_asignados} kg</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pendiente</p>
                          <p className={`mt-1 text-base font-bold ${faltante > 0.01 ? "text-red-700" : "text-emerald-700"}`}>{faltante} kg</p>
                        </div>
                      </div>
                      {line.observaciones ? <p className="mt-3 text-xs text-slate-600">{line.observaciones}</p> : null}
                    </div>
                  );
                })}
              </div>

              <h3 className="mb-2 text-base font-semibold text-gray-900">Lotes disponibles</h3>
              <p className="mb-4 text-sm text-gray-600">
                Ahora la asignacion se filtra por linea pedida. Si una fila viene desde almacen sin pasar por clasificacion neta, lo veras marcado antes de asignar.
              </p>
              {loteDisponiblesResult.errorMessage ? (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm">
                  ! {loteDisponiblesResult.errorMessage}
                </div>
              ) : null}
              <div className="mb-8 sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Linea destino</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Lote</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Productor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Origen stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoria origen</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg disponibles</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Asignacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loteDisponibles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500">
                          {loteDisponiblesResult.errorMessage
                            ? "No se pudieron cargar los lotes disponibles para este pedido."
                            : "No hay lotes disponibles para este pedido."}
                        </td>
                      </tr>
                    ) : null}

                    {loteDisponibles.map((row) => (
                      <tr key={`${row.lote_id}-${row.pedido_detalle_id}-${row.categoria_id}-${row.stock_badge}`} className="border-b border-gray-200 align-top hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{row.pedido_categoria_nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {detalleLineMap.get(Number(row.pedido_detalle_id))?.permite_sustitucion ? "Acepta sustitucion" : "Exacta"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.numero_lote}</td>
                        <td className="px-4 py-3">{row.productor_nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.sin_clasificacion_neta ? "bg-amber-100 text-amber-800" : row.es_sustitucion ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {row.stock_badge}
                          </span>
                        </td>
                        <td className="px-4 py-3">{row.categoria_nombre}</td>
                        <td className="px-4 py-3 text-right font-medium">{row.kg_disponibles}</td>
                        <td className="px-4 py-3">
                          <form action={asignarLotePedidoAction} className="grid gap-2 xl:grid-cols-[100px_110px_130px_1fr_auto]">
                            <input type="hidden" name="pedido_id" value={String(pedidoSeleccionado.id)} />
                            <input type="hidden" name="pedido_detalle_id" value={String(row.pedido_detalle_id)} />
                            <input type="hidden" name="lote_id" value={String(row.lote_id)} />
                            <input type="hidden" name="categoria_id" value={String(row.categoria_id)} />
                            <input type="hidden" name="sin_clasificacion_neta" value={row.sin_clasificacion_neta ? "1" : "0"} />
                            <input
                              name="kg_asignados"
                              type="number"
                              min="0"
                              step="0.01"
                              max={String(row.kg_disponibles)}
                              placeholder="Kg"
                              className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#1A73E8]"
                              required
                            />
                            <input
                              name="precio_kg"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={String(detalleLineMap.get(Number(row.pedido_detalle_id))?.precio_kg ?? pedidoSeleccionado.precio_kg)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#1A73E8]"
                              required
                            />
                            <input
                              name="fecha_asignacion"
                              type="date"
                              defaultValue={new Date().toISOString().slice(0, 10)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#1A73E8]"
                              required
                            />
                            <input
                              name="observaciones"
                              placeholder={row.sin_clasificacion_neta ? "Obs. ej. despacho directo desde almacen" : "Obs"}
                              className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#1A73E8]"
                            />
                            <button type="submit" className="rounded bg-[#1A73E8] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1765CC]">
                              Asignar
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-2 text-base font-semibold text-gray-900">Asignaciones registradas</h3>
              <p className="mb-4 text-sm text-gray-600">Historial por lote y linea del pedido.</p>
              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Lote</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Linea pedido</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoria origen</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg asignados</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Precio/kg</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Subtotal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fecha</th>
                      <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignacionesPedidoSeleccionado.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-gray-500">Sin asignaciones para este pedido.</td>
                      </tr>
                    ) : null}

                    {asignacionesPedidoSeleccionado.map((row) => {
                      const linea = detalleLineMap.get(Number(row.pedido_detalle_id ?? 0));
                      return (
                        <tr key={row.id} className="group border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{loteMapSel.get(Number(row.lote_id)) ?? row.lote_id}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span>{linea?.categoria_nombre ?? "Linea sin vinculo"}</span>
                              {row.sin_clasificacion_neta ? (
                                <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  Sin clasificacion neta
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">{categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id}</td>
                          <td className="px-4 py-3 text-right">{row.kg_asignados}</td>
                          <td className="px-4 py-3 text-right">{row.precio_kg}</td>
                          <td className="px-4 py-3 text-right font-medium">{row.subtotal}</td>
                          <td className="px-4 py-3">{row.fecha_asignacion}</td>
                          <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-gray-50">
                            <div className="flex flex-wrap items-start justify-center gap-2">
                              <form action={updateAsignacionPedidoAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="asignacion_id" value={String(row.id)} />
                                <input
                                  name="kg_asignados"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={String(row.kg_asignados)}
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                                  required
                                />
                                <input
                                  name="precio_kg"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={String(row.precio_kg)}
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                                  required
                                />
                                <input
                                  name="fecha_asignacion"
                                  type="date"
                                  defaultValue={row.fecha_asignacion}
                                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                                  required
                                />
                                <input name="observaciones" placeholder="Obs" className="w-28 rounded border border-gray-300 px-2 py-1 text-xs" />
                                <button type="submit" className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">Modificar</button>
                              </form>

                              <form action={deleteAsignacionPedidoAction}>
                                <input type="hidden" name="asignacion_id" value={String(row.id)} />
                                <button type="submit" className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Quitar</button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ModuleFormModal>
          ) : null}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Resumen de Pedidos
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Vista general de pedidos con estado de cumplimiento y acciones
                operativas:
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Mostrando {fromItem}-{toItem} de {totalRows} pedido(s)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="sx-table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Nro. pedido
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                      Kg solicitados
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                      Kg asignados
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                      % cumplimiento
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                      Precio/kg
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                      Total estimado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Fecha pedido
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Estado
                    </th>
                    <th className="sticky right-0 bg-gray-50 px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-10">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {totalRows === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="p-4 text-center text-gray-500"
                      >
                        Sin pedidos para mostrar.
                      </td>
                    </tr>
                  ) : null}

                  {pedidosPage.map((pedido) => {
                    const asignados = round2(
                      kgAsignadosMap.get(Number(pedido.id)) ?? 0,
                    );
                    const lineasPedido = detalleByPedido.get(Number(pedido.id)) ?? [];
                    const resumenPedido = summarizePedidoDetalle(lineasPedido);
                    const solicitados = Number(resumenPedido.kgSolicitados || pedido.kg_solicitados || 0);
                    const cumplimiento =
                      solicitados > 0
                        ? round2((asignados / solicitados) * 100)
                        : 0;
                    const cumplimientoColor =
                      cumplimiento >= 100
                        ? "#34A853"
                        : cumplimiento >= 50
                          ? "#FBBC04"
                          : "#EA4335";

                    return (
                      <tr
                        key={pedido.id}
                        className="group border-b border-gray-200 align-top hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {pedido.numero_pedido}
                        </td>
                        <td className="px-4 py-3">
                          {pedidosData.clienteMap.get(pedido.cliente_id) ??
                            pedido.cliente_id}
                        </td>
                        <td className="px-4 py-3">{pedido.producto}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span>{buildPedidoDetalleLabel(lineasPedido)}</span>
                            <span className="text-xs text-slate-500">
                              {lineasPedido.length} linea(s)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {solicitados}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">
                          {asignados}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-semibold"
                          style={{ color: cumplimientoColor }}
                        >
                          {cumplimiento}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {resumenPedido.kgSolicitados > 0
                            ? round2(resumenPedido.totalEstimado / resumenPedido.kgSolicitados)
                            : pedido.precio_kg}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {resumenPedido.totalEstimado || pedido.total_estimado}
                        </td>
                        <td className="px-4 py-3">{pedido.fecha_pedido}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor:
                                pedido.estado === "pendiente"
                                  ? "#FFF3E0"
                                  : pedido.estado === "en_proceso"
                                    ? "#E8F5E9"
                                    : pedido.estado === "completado"
                                      ? "#E3F2FD"
                                      : "#FFEBEE",
                              color:
                                pedido.estado === "pendiente"
                                  ? "#E65100"
                                  : pedido.estado === "en_proceso"
                                    ? "#2E7D32"
                                    : pedido.estado === "completado"
                                      ? "#1565C0"
                                      : "#C62828",
                            }}
                          >
                            {pedido.estado}
                          </span>
                        </td>
                        <td className="sticky right-0 bg-white px-4 py-3 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-gray-50 z-10">
                          <div className="flex flex-wrap items-start justify-center gap-2">
                            {pedido.estado !== "cancelado" ? (
                              <Link
                                href={buildPedidosUrl({
                                  q: search.q,
                                  estado: search.estado,
                                  cliente: search.cliente,
                                  page: currentPage,
                                  asignar: Number(pedido.id),
                                })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                              >
                                <Eye size={14} />
                                Asignar
                              </Link>
                            ) : null}
                            <Link
                              href={buildPedidosUrl({
                                q: search.q,
                                estado: search.estado,
                                cliente: search.cliente,
                                page: currentPage,
                                editar: Number(pedido.id),
                              })}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              Editar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={buildPedidosUrl({
                      q: search.q,
                      estado: search.estado,
                      cliente: search.cliente,
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
                      href={buildPedidosUrl({
                        q: search.q,
                        estado: search.estado,
                        cliente: search.cliente,
                        page: pageNumber,
                      })}
                      className={pageNumber === currentPage ? "sx-btn sx-btn-primary" : "sx-btn sx-btn-secondary"}
                    >
                      {pageNumber}
                    </Link>
                  ))}

                  <Link
                    href={buildPedidosUrl({
                      q: search.q,
                      estado: search.estado,
                      cliente: search.cliente,
                      page: Math.min(totalPages, currentPage + 1),
                    })}
                    className={`sx-btn sx-btn-secondary ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    aria-disabled={currentPage >= totalPages}
                  >
                    Siguiente
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
