import Link from "next/link";
import {
  Plus,
  Search,
  X,
  Eye,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

import { asignarLotePedidoAction, createPedidoAction } from "./actions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = {
  q?: string;
  estado?: "todos" | "pendiente" | "en_proceso" | "completado" | "cancelado";
  cliente?: string;
  asignar?: string;
  ok?: string;
  error?: string;
};

type Cliente = {
  id: number;
  nombre_completo: string;
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
  lote_id: number;
  categoria_id: number;
  kg_asignados: number;
  precio_kg: number;
  subtotal: number;
  fecha_asignacion: string;
};

type LoteDisponible = {
  lote_id: number;
  numero_lote: string;
  productor_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  kg_disponibles: number;
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

  const ids = [...new Set((rolesData ?? []).map((row) => Number(row.persona_id)))];
  if (ids.length === 0) return [] as Cliente[];

  const { data } = await supabase
    .from("personas")
    .select("id,nombre_completo")
    .in("id", ids)
    .eq("estado", "activo")
    .order("nombre_completo", { ascending: true });

  return (data ?? []) as Cliente[];
}

async function getCategoriasActivas() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categorias")
    .select("id,nombre,codigo,orden")
    .eq("estado", "activo")
    .order("orden", { ascending: true });

  return (data ?? []) as Categoria[];
}

async function getPedidos(search: SearchParams) {
  const supabase = getSupabaseServerClient();

  const estado = search.estado ?? "todos";
  const cliente = Number(search.cliente ?? "0");
  const q = (search.q ?? "").trim();

  let query = supabase
    .from("pedidos")
    .select(
      "id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,precio_kg,total_estimado,fecha_pedido,fecha_entrega,estado,observaciones"
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
  const clienteIds = [...new Set(pedidos.map((pedido) => Number(pedido.cliente_id)))];
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
    .select("id,pedido_id,lote_id,categoria_id,kg_asignados,precio_kg,subtotal,fecha_asignacion")
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
    asignadoMap.set(id, (asignadoMap.get(id) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const totalPedidos = (pedidos ?? []).length;
  const pendientes = (pedidos ?? []).filter((row) => row.estado === "pendiente").length;
  const enProceso = (pedidos ?? []).filter((row) => row.estado === "en_proceso").length;
  const completados = (pedidos ?? []).filter((row) => row.estado === "completado").length;

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
      "id,numero_pedido,cliente_id,producto,categoria_id,kg_solicitados,precio_kg,total_estimado,fecha_pedido,fecha_entrega,estado,observaciones"
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as Pedido | null;
}

async function getAvailableLotesForPedido(pedido: Pedido): Promise<LoteDisponible[]> {
  const supabase = getSupabaseServerClient();

  const { data: lotes } = await supabase
    .from("lotes")
    .select("id,numero_lote,productor_id")
    .in("estado", ["clasificado", "asignado"])
    .eq("producto", pedido.producto);

  if (!lotes || lotes.length === 0) return [];

  const loteIds = lotes.map((lote) => Number(lote.id));

  let clasifQuery = supabase
    .from("lote_clasificacion")
    .select("lote_id,categoria_id,peso_neto")
    .in("lote_id", loteIds);

  if (pedido.categoria_id) {
    clasifQuery = clasifQuery.eq("categoria_id", Number(pedido.categoria_id));
  }

  const { data: clasificaciones } = await clasifQuery;
  if (!clasificaciones || clasificaciones.length === 0) return [];

  const categoriaIds = [...new Set(clasificaciones.map((row) => Number(row.categoria_id)))];

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id,nombre")
    .in("id", categoriaIds);

  const { data: personas } = await supabase
    .from("personas")
    .select("id,nombre_completo")
    .in(
      "id",
      [...new Set(lotes.map((row) => Number(row.productor_id)))]
    );

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("lote_id,categoria_id,kg_asignados")
    .in("lote_id", loteIds)
    .in("categoria_id", categoriaIds);

  const asignadoMap = new Map<string, number>();
  for (const row of asignaciones ?? []) {
    const key = `${row.lote_id}-${row.categoria_id}`;
    asignadoMap.set(key, (asignadoMap.get(key) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const categoriaMap = new Map<number, string>();
  for (const row of categorias ?? []) {
    categoriaMap.set(Number(row.id), String(row.nombre));
  }

  const productorMap = new Map<number, string>();
  for (const row of personas ?? []) {
    productorMap.set(Number(row.id), String(row.nombre_completo));
  }

  const lotesMap = new Map<number, { numero_lote: string; productor_id: number }>();
  for (const row of lotes) {
    lotesMap.set(Number(row.id), {
      numero_lote: String(row.numero_lote),
      productor_id: Number(row.productor_id),
    });
  }

  const resultado: LoteDisponible[] = [];

  for (const row of clasificaciones) {
    const loteId = Number(row.lote_id);
    const categoriaId = Number(row.categoria_id);
    const neto = Number(row.peso_neto ?? 0);
    const asignado = asignadoMap.get(`${loteId}-${categoriaId}`) ?? 0;
    const disponible = round2(neto - asignado);
    if (disponible <= 0.01) continue;

    const loteData = lotesMap.get(loteId);
    if (!loteData) continue;

    resultado.push({
      lote_id: loteId,
      numero_lote: loteData.numero_lote,
      productor_nombre: productorMap.get(loteData.productor_id) ?? String(loteData.productor_id),
      categoria_id: categoriaId,
      categoria_nombre: categoriaMap.get(categoriaId) ?? String(categoriaId),
      kg_disponibles: disponible,
    });
  }

  return resultado.sort((a, b) => b.kg_disponibles - a.kg_disponibles);
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;

  const [clientes, categorias, pedidosData, resumen] = await Promise.all([
    getClientesActivos(),
    getCategoriasActivas(),
    getPedidos(search),
    getResumenPedidos(),
  ]);

  const pedidoIds = pedidosData.pedidos.map((pedido) => Number(pedido.id));
  const asignaciones = await getAsignacionesByPedidos(pedidoIds);

  const kgAsignadosMap = new Map<number, number>();
  for (const row of asignaciones) {
    const pedidoId = Number(row.pedido_id);
    kgAsignadosMap.set(pedidoId, (kgAsignadosMap.get(pedidoId) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const categoriaMap = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));

  const asignarId = Number(search.asignar ?? "0");
  const pedidoSeleccionado = asignarId > 0 ? await getPedidoById(asignarId) : null;

  const loteDisponibles = pedidoSeleccionado ? await getAvailableLotesForPedido(pedidoSeleccionado) : [];

  const asignacionesPedidoSeleccionado = pedidoSeleccionado
    ? asignaciones.filter((row) => Number(row.pedido_id) === pedidoSeleccionado.id)
    : [];

  const kgAsignadoSeleccionado = pedidoSeleccionado
    ? round2(asignacionesPedidoSeleccionado.reduce((acc, row) => acc + Number(row.kg_asignados ?? 0), 0))
    : 0;

  const kgFaltanteSeleccionado = pedidoSeleccionado
    ? round2(Math.max(0, Number(pedidoSeleccionado.kg_solicitados) - kgAsignadoSeleccionado))
    : 0;

  const loteIdsSel = [...new Set(asignacionesPedidoSeleccionado.map((row) => Number(row.lote_id)))];
  const supabase = getSupabaseServerClient();
  const { data: lotesSelData } =
    loteIdsSel.length > 0
      ? await supabase.from("lotes").select("id,numero_lote").in("id", loteIdsSel)
      : { data: [] as Array<{ id: number; numero_lote: string }> };

  const loteMapSel = new Map<number, string>();
  for (const row of lotesSelData ?? []) {
    loteMapSel.set(Number(row.id), String(row.numero_lote));
  }

  return (
    <main className="relative min-h-screen bg-white text-gray-900">
      {/* Grid Background Pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10">
        <section className="mx-auto max-w-7xl px-3 md:px-6">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6 pt-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo 3: Pedidos</h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Orquestación comercial de demanda con asignación de lotes
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50"
            >
              ← Inicio
            </Link>
          </div>

          {/* Resumen Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-5">
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                  </div>
                  <div className="text-4xl opacity-30">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {search.ok ? (
            <div className="mb-8 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm">✓ {search.ok}</div>
          ) : null}
          {search.error || pedidosData.errorMessage ? (
            <div className="mb-8 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm">✕ {search.error || pedidosData.errorMessage}</div>
          ) : null}

          {/* Crear Pedido Form */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Registrar Pedido</h2>
            <form action={createPedidoAction} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Número pedido (opcional, auto)</span>
                  <input name="numero_pedido" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Cliente *</span>
                  <select name="cliente_id" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required>
                    <option value="" disabled>Seleccionar cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={String(cliente.id)}>{cliente.nombre_completo}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Producto *</span>
                  <select name="producto" defaultValue="Jengibre" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required>
                    <option value="Jengibre">Jengibre</option>
                    <option value="Curcuma">Curcuma</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Categoría (opcional)</span>
                  <select name="categoria_id" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                    <option value="">Varias</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={String(categoria.id)}>{categoria.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Kg solicitados *</span>
                  <input name="kg_solicitados" type="number" min="0" step="0.01" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Precio por kg *</span>
                  <input name="precio_kg" type="number" min="0" step="0.01" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Fecha pedido *</span>
                  <input name="fecha_pedido" type="date" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-gray-700">Fecha entrega</span>
                  <input name="fecha_entrega" type="date" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <label className="grid gap-1 sm:col-span-3">
                  <span className="text-sm font-semibold text-gray-700">Observaciones</span>
                  <textarea name="observaciones" className="min-h-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>
              </div>

              <div>
                <button type="submit" className="rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1765CC]">
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>

          {/* Filtros */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Filtros y Búsqueda</h2>
            <form className="grid gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
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
                  <option key={cliente.id} value={String(cliente.id)}>{cliente.nombre_completo}</option>
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

        {pedidoSeleccionado ? (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Asignar lotes al pedido {pedidoSeleccionado.numero_pedido}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Cliente: <span className="font-medium">{pedidosData.clienteMap.get(pedidoSeleccionado.cliente_id) ?? pedidoSeleccionado.cliente_id}</span> | 
                Producto: <span className="font-medium">{pedidoSeleccionado.producto}</span> | 
                Categoría: <span className="font-medium">{pedidoSeleccionado.categoria_id ? categoriaMap.get(pedidoSeleccionado.categoria_id) : "Varias"}</span>
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg solicitados</p>
                <p className="mt-2 text-2xl font-bold text-[#1A73E8]">{pedidoSeleccionado.kg_solicitados}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg asignados</p>
                <p className="mt-2 text-2xl font-bold text-green-700">{kgAsignadoSeleccionado}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Kg faltantes</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{kgFaltanteSeleccionado}</p>
              </div>
            </div>

            <h3 className="mb-2 text-base font-semibold text-gray-900">Lotes disponibles</h3>
            <p className="mb-4 text-sm text-gray-600">Selecciona lotes para asignar kg a este pedido:</p>
            <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Productor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg disponibles</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Asignación</th>
                  </tr>
                </thead>
                <tbody>
                  {loteDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">No hay lotes disponibles para este pedido.</td>
                    </tr>
                  ) : null}

                  {loteDisponibles.map((row) => (
                    <tr key={`${row.lote_id}-${row.categoria_id}`} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.numero_lote}</td>
                      <td className="px-4 py-3">{row.productor_nombre}</td>
                      <td className="px-4 py-3">{row.categoria_nombre}</td>
                      <td className="px-4 py-3 text-right font-medium">{row.kg_disponibles}</td>
                      <td className="px-4 py-3">
                        <form action={asignarLotePedidoAction} className="grid gap-2 sm:grid-cols-5">
                          <input type="hidden" name="pedido_id" value={String(pedidoSeleccionado.id)} />
                          <input type="hidden" name="lote_id" value={String(row.lote_id)} />
                          <input type="hidden" name="categoria_id" value={String(row.categoria_id)} />

                          <input
                            name="kg_asignados"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Kg"
                            className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#1A73E8]"
                            required
                          />
                          <input
                            name="precio_kg"
                            type="number"
                            min="0" 
                            step="0.01"
                            defaultValue={String(pedidoSeleccionado.precio_kg)}
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
                            placeholder="Obs"
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
            <p className="mb-4 text-sm text-gray-600">Historial de cortes realizados para este pedido:</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg asignados</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Precio/kg</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Subtotal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {asignacionesPedidoSeleccionado.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">Sin asignaciones para este pedido.</td>
                    </tr>
                  ) : null}

                  {asignacionesPedidoSeleccionado.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{loteMapSel.get(Number(row.lote_id)) ?? row.lote_id}</td>
                      <td className="px-4 py-3">{categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id}</td>
                      <td className="px-4 py-3 text-right">{row.kg_asignados}</td>
                      <td className="px-4 py-3 text-right">{row.precio_kg}</td>
                      <td className="px-4 py-3 text-right font-medium">{row.subtotal}</td>
                      <td className="px-4 py-3">{row.fecha_asignacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Resumen de Pedidos</h2>
            <p className="mt-1 text-sm text-gray-600">Vista general de pedidos con estado de cumplimiento y acciones operativas:</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nro. pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg solicitados</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Kg asignados</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">% cumplimiento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Precio/kg</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Total estimado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fecha pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosData.pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-gray-500">Sin pedidos para mostrar.</td>
                  </tr>
                ) : null}

                {pedidosData.pedidos.map((pedido) => {
                  const asignados = round2(kgAsignadosMap.get(Number(pedido.id)) ?? 0);
                  const solicitados = Number(pedido.kg_solicitados ?? 0);
                  const cumplimiento = solicitados > 0 ? round2((asignados / solicitados) * 100) : 0;
                  const cumplimientoColor = cumplimiento >= 100 ? "#34A853" : cumplimiento >= 50 ? "#FBBC04" : "#EA4335";

                  return (
                    <tr key={pedido.id} className="border-b border-gray-200 align-top hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{pedido.numero_pedido}</td>
                      <td className="px-4 py-3">{pedidosData.clienteMap.get(pedido.cliente_id) ?? pedido.cliente_id}</td>
                      <td className="px-4 py-3">{pedido.producto}</td>
                      <td className="px-4 py-3">{pedido.categoria_id ? categoriaMap.get(pedido.categoria_id) : "Varias"}</td>
                      <td className="px-4 py-3 text-right">{pedido.kg_solicitados}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">{asignados}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: cumplimientoColor }}>
                        {cumplimiento}%
                      </td>
                      <td className="px-4 py-3 text-right">{pedido.precio_kg}</td>
                      <td className="px-4 py-3 text-right font-medium">{pedido.total_estimado}</td>
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
                      <td className="px-4 py-3">
                        {pedido.estado !== "cancelado" ? (
                          <Link
                            href={`/pedidos?asignar=${pedido.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            Asignar
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
