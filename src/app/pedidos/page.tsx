import Link from "next/link";

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
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Módulo 3: Pedidos y Asignación</h1>
        <Link href="/" className="text-sm underline">
          Volver al inicio
        </Link>
      </div>

      <section className="mb-4 rounded border p-4">
        <p className="text-sm">
          Este módulo conecta demanda comercial con stock real. Las cards muestran el estado de cumplimiento
          de pedidos y la tabla te ayuda a asignar kg por lote/categoría para cerrar pendientes sin perder
          trazabilidad.
        </p>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-5">
        <div className="rounded border p-3">
          <p className="text-sm">Total pedidos</p>
          <p className="text-2xl font-bold">{resumen.totalPedidos}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">Pendientes</p>
          <p className="text-2xl font-bold">{resumen.pendientes}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">En proceso</p>
          <p className="text-2xl font-bold">{resumen.enProceso}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">Completados</p>
          <p className="text-2xl font-bold">{resumen.completados}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">Kg pendientes total</p>
          <p className="text-2xl font-bold">{resumen.kgPendientes}</p>
        </div>
      </section>

      {search.ok ? (
        <p className="mb-4 rounded border border-green-600 p-2 text-sm">{search.ok}</p>
      ) : null}
      {search.error || pedidosData.errorMessage ? (
        <p className="mb-4 rounded border border-red-600 p-2 text-sm">{search.error || pedidosData.errorMessage}</p>
      ) : null}

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Registrar pedido</h2>

        <form action={createPedidoAction} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-sm">Número pedido (opcional, auto)</span>
              <input name="numero_pedido" className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Cliente *</span>
              <select name="cliente_id" defaultValue="" className="rounded border px-2 py-1" required>
                <option value="" disabled>
                  Seleccionar cliente
                </option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={String(cliente.id)}>
                    {cliente.nombre_completo}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Producto *</span>
              <select name="producto" defaultValue="Jengibre" className="rounded border px-2 py-1" required>
                <option value="Jengibre">Jengibre</option>
                <option value="Curcuma">Curcuma</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Categoría (opcional)</span>
              <select name="categoria_id" defaultValue="" className="rounded border px-2 py-1">
                <option value="">Varias</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={String(categoria.id)}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Kg solicitados *</span>
              <input name="kg_solicitados" type="number" min="0" step="0.01" className="rounded border px-2 py-1" required />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Precio por kg *</span>
              <input name="precio_kg" type="number" min="0" step="0.01" className="rounded border px-2 py-1" required />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Fecha pedido *</span>
              <input name="fecha_pedido" type="date" className="rounded border px-2 py-1" required />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Fecha entrega</span>
              <input name="fecha_entrega" type="date" className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1 sm:col-span-3">
              <span className="text-sm">Observaciones</span>
              <textarea name="observaciones" className="min-h-20 rounded border px-2 py-1" />
            </label>
          </div>

          <div>
            <button type="submit" className="rounded border px-3 py-1 font-medium">
              Crear pedido
            </button>
          </div>
        </form>
      </section>

      <section className="mb-4 rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Filtros</h2>
        <form className="grid gap-3 sm:grid-cols-4">
          <input
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Buscar por número pedido"
            className="rounded border px-2 py-1 sm:col-span-2"
          />

          <select name="estado" defaultValue={search.estado ?? "todos"} className="rounded border px-2 py-1">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">pendiente</option>
            <option value="en_proceso">en_proceso</option>
            <option value="completado">completado</option>
            <option value="cancelado">cancelado</option>
          </select>

          <select name="cliente" defaultValue={search.cliente ?? ""} className="rounded border px-2 py-1">
            <option value="">Todos los clientes</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={String(cliente.id)}>
                {cliente.nombre_completo}
              </option>
            ))}
          </select>

          <div className="sm:col-span-4">
            <button className="rounded border px-3 py-1">Aplicar filtros</button>
          </div>
        </form>
      </section>

      {pedidoSeleccionado ? (
        <section className="mb-6 rounded border p-4">
          <h2 className="mb-2 text-lg font-semibold">Asignar lotes al pedido {pedidoSeleccionado.numero_pedido}</h2>
          <p className="text-sm">
            Cliente: {pedidosData.clienteMap.get(pedidoSeleccionado.cliente_id) ?? pedidoSeleccionado.cliente_id} |
            Producto: {pedidoSeleccionado.producto} |
            Categoría: {pedidoSeleccionado.categoria_id ? categoriaMap.get(pedidoSeleccionado.categoria_id) : "Varias"}
          </p>
          <p className="mb-3 text-sm">
            Kg solicitados: {pedidoSeleccionado.kg_solicitados} | Kg asignados: {kgAsignadoSeleccionado} | Kg faltantes: {kgFaltanteSeleccionado}
          </p>

          <p className="mb-2 text-xs">Qué muestra esta tabla: lotes disponibles por categoría para asignar kg al pedido seleccionado.</p>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Lote</th>
                  <th className="p-2">Productor</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Kg disponibles</th>
                  <th className="p-2">Asignación</th>
                </tr>
              </thead>
              <tbody>
                {loteDisponibles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center">
                      No hay lotes disponibles para este pedido.
                    </td>
                  </tr>
                ) : null}

                {loteDisponibles.map((row) => (
                  <tr key={`${row.lote_id}-${row.categoria_id}`} className="border-b align-top">
                    <td className="p-2">{row.numero_lote}</td>
                    <td className="p-2">{row.productor_nombre}</td>
                    <td className="p-2">{row.categoria_nombre}</td>
                    <td className="p-2">{row.kg_disponibles}</td>
                    <td className="p-2">
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
                          className="rounded border px-2 py-1"
                          required
                        />
                        <input
                          name="precio_kg"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={String(pedidoSeleccionado.precio_kg)}
                          className="rounded border px-2 py-1"
                          required
                        />
                        <input
                          name="fecha_asignacion"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          className="rounded border px-2 py-1"
                          required
                        />
                        <input
                          name="observaciones"
                          placeholder="Observación"
                          className="rounded border px-2 py-1"
                        />
                        <button type="submit" className="rounded border px-3 py-1 font-medium">
                          Asignar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-4 text-base font-semibold">Asignaciones registradas del pedido</h3>
          <p className="mb-2 text-xs">Qué muestra esta tabla: historial de cortes/asignaciones ya realizadas para este pedido.</p>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Lote</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Kg asignados</th>
                  <th className="p-2">Precio/kg</th>
                  <th className="p-2">Subtotal</th>
                  <th className="p-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {asignacionesPedidoSeleccionado.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-center">
                      Sin asignaciones para este pedido.
                    </td>
                  </tr>
                ) : null}

                {asignacionesPedidoSeleccionado.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{loteMapSel.get(Number(row.lote_id)) ?? row.lote_id}</td>
                    <td className="p-2">{categoriaMap.get(Number(row.categoria_id)) ?? row.categoria_id}</td>
                    <td className="p-2">{row.kg_asignados}</td>
                    <td className="p-2">{row.precio_kg}</td>
                    <td className="p-2">{row.subtotal}</td>
                    <td className="p-2">{row.fecha_asignacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded border p-4">
        <p className="mb-2 text-xs">Qué muestra esta tabla: resumen general de pedidos, cumplimiento en kg y acciones operativas.</p>
        <div className="overflow-x-auto rounded border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Nro. pedido</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Producto</th>
              <th className="p-2">Categoría</th>
              <th className="p-2">Kg solicitados</th>
              <th className="p-2">Kg asignados</th>
              <th className="p-2">% cumplimiento</th>
              <th className="p-2">Precio/kg</th>
              <th className="p-2">Total estimado</th>
              <th className="p-2">Fecha pedido</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidosData.pedidos.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-3 text-center">
                  Sin pedidos para mostrar.
                </td>
              </tr>
            ) : null}

            {pedidosData.pedidos.map((pedido) => {
              const asignados = round2(kgAsignadosMap.get(Number(pedido.id)) ?? 0);
              const solicitados = Number(pedido.kg_solicitados ?? 0);
              const cumplimiento = solicitados > 0 ? round2((asignados / solicitados) * 100) : 0;

              return (
                <tr key={pedido.id} className="border-b align-top">
                  <td className="p-2">{pedido.numero_pedido}</td>
                  <td className="p-2">{pedidosData.clienteMap.get(pedido.cliente_id) ?? pedido.cliente_id}</td>
                  <td className="p-2">{pedido.producto}</td>
                  <td className="p-2">{pedido.categoria_id ? categoriaMap.get(pedido.categoria_id) : "Varias"}</td>
                  <td className="p-2">{pedido.kg_solicitados}</td>
                  <td className="p-2">{asignados}</td>
                  <td className="p-2">{cumplimiento}%</td>
                  <td className="p-2">{pedido.precio_kg}</td>
                  <td className="p-2">{pedido.total_estimado}</td>
                  <td className="p-2">{pedido.fecha_pedido}</td>
                  <td className="p-2">{pedido.estado}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {pedido.estado !== "cancelado" ? (
                        <Link href={`/pedidos?asignar=${pedido.id}`} className="rounded border px-2 py-1">
                          Asignar lotes
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>
    </main>
  );
}
