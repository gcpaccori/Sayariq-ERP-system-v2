import Image from "next/image";
import Link from "next/link";

import {
  createLiquidacionClienteModulo6Action,
  registrarCobroClienteAction,
} from "./actions";
import ComprobanteInternoFields from "@/components/comprobante-interno-fields";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ModuleNavigation from "@/components/module-navigation";
import ModuleFormModal from "@/components/module-form-modal";

type SearchParams = {
  pedido?: string;
  ok?: string;
  error?: string;
};

type Persona = { id: number; nombre_completo: string };
type Categoria = { id: number; nombre: string; orden: number };

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
  persona_id: number;
  pedido_id: number | null;
  fecha_liquidacion: string;
  numero_comprobante: string | null;
  tipo_comprobante: string | null;
  total_a_pagar: number;
  estado: "borrador" | "confirmada" | "anulada";
  estado_pago: "pendiente" | "parcial" | "pagado" | "cobrado";
  monto_pagado: number;
};

type ComprobanteInternoResumen = {
  id: number;
  tipo: "adelanto" | "venta" | "liquidacion";
  codigo_interno: string;
  entidad_origen: "adelantos" | "liquidaciones";
  entidad_origen_id: number;
};

type PedidoAsignacionRow = {
  categoria_id: number;
  kg_asignados: number;
  precio_kg: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function getClientes() {
  const supabase = getSupabaseServerClient();

  const { data: rolesData } = await supabase
    .from("persona_roles")
    .select("persona_id")
    .eq("rol", "cliente");

  const ids = [...new Set((rolesData ?? []).map((row) => Number(row.persona_id)))];
  if (ids.length === 0) return [] as Persona[];

  const { data } = await supabase
    .from("personas")
    .select("id,nombre_completo")
    .in("id", ids)
    .eq("estado", "activo")
    .order("nombre_completo", { ascending: true });

  return (data ?? []) as Persona[];
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

async function getPedidosLiquidablesClientes() {
  const supabase = getSupabaseServerClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id,numero_pedido,cliente_id,producto,estado")
    .in("estado", ["en_proceso", "completado"])
    .order("id", { ascending: false });

  if (!pedidos || pedidos.length === 0) return [] as PedidoRow[];

  const pedidoIds = pedidos.map((row) => Number(row.id));

  const { data: asignaciones } = await supabase
    .from("pedido_asignaciones")
    .select("pedido_id,categoria_id,kg_asignados")
    .in("pedido_id", pedidoIds);

  const asignadoMap = new Map<string, number>();
  for (const row of asignaciones ?? []) {
    const key = `${row.pedido_id}-${row.categoria_id}`;
    asignadoMap.set(key, (asignadoMap.get(key) ?? 0) + Number(row.kg_asignados ?? 0));
  }

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id,pedido_id")
    .eq("tipo", "cliente")
    .in("pedido_id", pedidoIds)
    .neq("estado", "anulada");

  const liqIds = (liquidaciones ?? []).map((row) => Number(row.id));
  const liqPedidoMap = new Map<number, number>();
  for (const row of liquidaciones ?? []) {
    liqPedidoMap.set(Number(row.id), Number(row.pedido_id));
  }

  const { data: detalles } =
    liqIds.length > 0
      ? await supabase
        .from("liquidacion_detalle")
        .select("liquidacion_id,categoria_id,peso_neto")
        .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ liquidacion_id: number; categoria_id: number; peso_neto: number }> };

  const liquidadoMap = new Map<string, number>();
  for (const row of detalles ?? []) {
    const pedidoId = liqPedidoMap.get(Number(row.liquidacion_id));
    if (!pedidoId) continue;
    const key = `${pedidoId}-${row.categoria_id}`;
    liquidadoMap.set(key, (liquidadoMap.get(key) ?? 0) + Number(row.peso_neto ?? 0));
  }

  const pedidosConPendiente = new Set<number>();
  for (const [key, kgAsignado] of asignadoMap.entries()) {
    const kgLiquidado = liquidadoMap.get(key) ?? 0;
    if (kgAsignado - kgLiquidado > 0.01) {
      pedidosConPendiente.add(Number(key.split("-")[0]));
    }
  }

  return (pedidos as PedidoRow[]).filter((row) => pedidosConPendiente.has(Number(row.id)));
}

async function getLiquidacionesCliente() {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("liquidaciones")
    .select(
      "id,numero_liquidacion,persona_id,pedido_id,fecha_liquidacion,numero_comprobante,tipo_comprobante,total_a_pagar,estado,estado_pago,monto_pagado"
    )
    .eq("tipo", "cliente")
    .order("id", { ascending: false });

  return (data ?? []) as LiquidacionRow[];
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
    .select("categoria_id,kg_asignados,precio_kg")
    .eq("pedido_id", pedidoId);

  const resumen = new Map<number, { kg: number; precio: number }>();

  for (const row of (asignaciones ?? []) as PedidoAsignacionRow[]) {
    const categoriaId = Number(row.categoria_id);
    const actual = resumen.get(categoriaId) ?? { kg: 0, precio: Number(row.precio_kg ?? 0) };
    actual.kg += Number(row.kg_asignados ?? 0);
    if (!actual.precio || actual.precio <= 0) {
      actual.precio = Number(row.precio_kg ?? 0);
    }
    resumen.set(categoriaId, actual);
  }

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id")
    .eq("tipo", "cliente")
    .eq("pedido_id", pedidoId)
    .neq("estado", "anulada");

  const liqIds = (liquidaciones ?? []).map((row) => Number(row.id));
  const { data: detalles } =
    liqIds.length > 0
      ? await supabase
        .from("liquidacion_detalle")
        .select("categoria_id,peso_neto")
        .in("liquidacion_id", liqIds)
      : { data: [] as Array<{ categoria_id: number; peso_neto: number }> };

  const liquidadoMap = new Map<number, number>();
  for (const row of detalles ?? []) {
    const categoriaId = Number(row.categoria_id);
    liquidadoMap.set(categoriaId, (liquidadoMap.get(categoriaId) ?? 0) + Number(row.peso_neto ?? 0));
  }

  return {
    pedido: pedido as PedidoRow,
    categorias: [...resumen.entries()].map(([categoriaId, value]) => ({
      categoria_id: categoriaId,
      kg_asignados: round2(Math.max(0, value.kg - (liquidadoMap.get(categoriaId) ?? 0))),
      precio_sugerido: round2(value.precio),
    })).filter((row) => row.kg_asignados > 0.01),
  };
}

export default async function CobranzasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;

  const [clientes, categorias, pedidosLiquidables, liquidaciones] = await Promise.all([
    getClientes(),
    getCategorias(),
    getPedidosLiquidablesClientes(),
    getLiquidacionesCliente(),
  ]);

  const liquidacionIds = liquidaciones.map((row) => Number(row.id)).filter((value) => value > 0);
  const supabase = getSupabaseServerClient();
  const compRes =
    liquidacionIds.length > 0
      ? await supabase
        .from("comprobantes_internos")
        .select("id,tipo,codigo_interno,entidad_origen,entidad_origen_id")
        .eq("entidad_origen", "liquidaciones")
        .in("entidad_origen_id", liquidacionIds)
      : { data: [] };

  const comprobantesInternos = (compRes.data ?? []) as ComprobanteInternoResumen[];
  const compLiquidacionMap = new Map<number, string>(
    comprobantesInternos.map((row) => [Number(row.entidad_origen_id), row.codigo_interno])
  );

  const fotosLiquidacionesRes =
    liquidacionIds.length > 0
      ? await supabase
        .from("evidencias_fotos")
        .select("entidad_id,ruta_thumb,created_at")
        .eq("contexto", "liquidacion")
        .eq("entidad_origen", "liquidaciones")
        .in("entidad_id", liquidacionIds)
        .order("created_at", { ascending: false })
      : { data: [] };

  const fotoLiquidacionMap = new Map<number, string>();
  for (const row of fotosLiquidacionesRes.data ?? []) {
    const entityId = Number(row.entidad_id);
    if (!fotoLiquidacionMap.has(entityId) && row.ruta_thumb) {
      fotoLiquidacionMap.set(entityId, String(row.ruta_thumb));
    }
  }

  const personaMap = new Map(clientes.map((row) => [row.id, row.nombre_completo]));
  const categoriaMap = new Map(categorias.map((row) => [row.id, row.nombre]));
  const pedidoMap = new Map(pedidosLiquidables.map((row) => [row.id, row.numero_pedido]));

  const selectedPedidoId = Number(search.pedido ?? "0");
  const selectedPedidoData = selectedPedidoId > 0 ? await getSelectedPedidoData(selectedPedidoId) : null;

  const totalLiquidaciones = liquidaciones.filter((row) => row.estado !== "anulada").length;
  const pendientesCobro = liquidaciones.filter(
    (row) => row.estado === "confirmada" && (row.estado_pago === "pendiente" || row.estado_pago === "parcial")
  );

  const totalPorCobrar = round2(
    pendientesCobro.reduce(
      (acc, row) => acc + (Number(row.total_a_pagar ?? 0) - Number(row.monto_pagado ?? 0)),
      0
    )
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="cobranzas" />
      <main className="google-2027-theme w-full flex-1 p-6">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo 6: Cobranzas de Clientes</h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Cobranza estructurada para sostener caja y competitividad
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ModuleFormModal
                buttonLabel="Registrar Cobro"
                title="Registrar Cobro Parcial"
                description="Registra abonos a liquidaciones confirmadas de clientes."
                maxWidth="2xl"
              >
                <form action={registrarCobroClienteAction} className="grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Liquidación cliente *</span>
                    <select name="liquidacion_id" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required>
                      <option value="" disabled>Seleccionar liquidación</option>
                      {liquidaciones
                        .filter((row) => row.estado === "confirmada" && row.estado_pago !== "cobrado" && row.estado_pago !== "pagado")
                        .map((row) => (
                          <option key={row.id} value={String(row.id)}>
                            {row.numero_liquidacion} | pendiente: S/ {round2(Number(row.total_a_pagar) - Number(row.monto_pagado ?? 0))}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">Monto cobrado *</span>
                      <input name="monto_cobrado" type="number" min="0" step="0.01" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">Fecha cobro *</span>
                      <input name="fecha_cobro" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">Forma pago</span>
                      <select name="forma_pago" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                        <option value="">(sin definir)</option>
                        <option value="efectivo">efectivo</option>
                        <option value="transferencia">transferencia</option>
                        <option value="cheque">cheque</option>
                        <option value="mixto">mixto</option>
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Observaciones</span>
                    <input name="observaciones" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                  </label>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row">
                    <button type="submit" className="flex-1 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:shadow-md">
                      Registrar cobro
                    </button>
                  </div>
                </form>
              </ModuleFormModal>
              <Link href="/" className="sx-btn sx-btn-secondary">← Inicio</Link>
            </div>
          </div>

          {/* Alertas */}
          <section className="mx-auto max-w-7xl">
            {search.ok ? (
              <div className="sx-alert-success">✓ {search.ok}</div>
            ) : null}
            {search.error ? (
              <div className="sx-alert-error">✕ {search.error}</div>
            ) : null}
          </section>

          {/* Resumen Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Liquidaciones Cliente", value: totalLiquidaciones, color: "from-blue-50 to-blue-50", textColor: "text-[#1A73E8]", icon: "📋" },
              { label: "Pendientes de Cobro", value: pendientesCobro.length, color: "from-yellow-50 to-yellow-50", textColor: "text-yellow-700", icon: "⏳" },
              { label: "Total por Cobrar", value: `S/ ${totalPorCobrar}`, color: "from-green-50 to-green-50", textColor: "text-green-700", icon: "💰" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border border-gray-200 bg-gradient-to-br ${card.color} p-4 shadow-sm transition duration-300 hover:shadow-md hover:border-gray-300`}>
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

          {/* Crear liquidación de cliente */}
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Crear liquidación de cliente</h2>
              <p className="mt-1 text-sm text-gray-600">
                Genera comprobante único irrepetible y movimiento de ingreso en kardex.
              </p>
            </div>

            <div className="sx-table-wrap">
              <table className="sx-table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pedido</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Producto</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosLiquidables.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No hay pedidos disponibles para nueva liquidación cliente.
                      </td>
                    </tr>
                  ) : null}

                  {pedidosLiquidables.map((row) => (
                    <tr key={row.id} className="transition duration-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.numero_pedido}</td>
                      <td className="px-4 py-3">{personaMap.get(row.cliente_id) ?? row.cliente_id}</td>
                      <td className="px-4 py-3">{row.producto}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-[#1A73E8]">{row.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/cobranzas?pedido=${row.id}`} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition duration-200 hover:border-[#1A73E8] hover:text-[#1A73E8] hover:bg-blue-50">
                          Liquidar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Modal de liquidación cliente — aparece automáticamente si hay pedido seleccionado */}
          {selectedPedidoData ? (
            <ModuleFormModal
              isOpen={true}
              closeHref="/cobranzas"
              title={`Liquidar Pedido ${selectedPedidoData.pedido.numero_pedido}`}
              description={`Cliente: ${personaMap.get(selectedPedidoData.pedido.cliente_id) ?? selectedPedidoData.pedido.cliente_id}`}
              maxWidth="4xl"
            >
              <form action={createLiquidacionClienteModulo6Action} className="grid gap-4">
                <input type="hidden" name="pedido_id" value={String(selectedPedidoData.pedido.id)} />

                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoría</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Kg pendientes</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Precio/kg</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedPedidoData.categorias.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Este pedido ya no tiene kg pendientes por liquidar.
                          </td>
                        </tr>
                      ) : null}

                      {selectedPedidoData.categorias.map((row) => (
                        <tr key={row.categoria_id} className="transition duration-200 hover:bg-gray-50">
                          <td className="px-4 py-3">{categoriaMap.get(row.categoria_id) ?? row.categoria_id}</td>
                          <td className="px-4 py-3 font-medium">{row.kg_asignados}</td>
                          <td className="px-4 py-3">
                            <input
                              name={`precio_kg_categoria_${row.categoria_id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={String(row.precio_sugerido)}
                              className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                              required
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-500">auto</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Fecha liquidación *</span>
                    <input name="fecha_liquidacion" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" required />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Tipo comprobante</span>
                    <select name="tipo_comprobante" defaultValue="ninguno" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                      <option value="ninguno">ninguno</option>
                      <option value="factura">factura</option>
                      <option value="boleta">boleta</option>
                      <option value="recibo">recibo</option>
                      <option value="nota_credito">nota_credito</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">Forma pago</span>
                    <select name="forma_pago" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                      <option value="">(sin definir)</option>
                      <option value="efectivo">efectivo</option>
                      <option value="transferencia">transferencia</option>
                      <option value="cheque">cheque</option>
                      <option value="mixto">mixto</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">Observaciones</span>
                  <textarea name="observaciones" className="min-h-20 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20" />
                </label>

                <ComprobanteInternoFields />

                <label className="grid gap-1.5 sm:max-w-md">
                  <span className="text-sm font-semibold text-gray-900">Foto evidencia (opcional)</span>
                  <input type="file" name="foto_evidencia" accept="image/jpeg,image/png,image/webp" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium file:mr-3 file:bg-gray-100 file:border-0 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200" />
                  <span className="text-xs text-gray-600">Se optimiza a máximo 1080px. Formatos: JPEG, PNG, WebP.</span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row">
                  <button type="submit" className="flex-1 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:shadow-md">
                    Crear liquidación cliente
                  </button>
                  <Link href="/cobranzas" className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 hover:border-gray-400">
                    Cancelar
                  </Link>
                </div>
              </form>
            </ModuleFormModal>
          ) : null}

          <section className="rounded border p-4">
            <p className="mb-2 text-xs">Qué muestra esta tabla: historial de liquidaciones cliente con comprobantes y estado de cobro.</p>
            <div className="sx-table-wrap">
              <table className="sx-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Foto</th>
                    <th className="p-2">Nro. liquidación</th>
                    <th className="p-2">Comprobante</th>
                    <th className="p-2">Comp. interno</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Pedido</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Tipo comp.</th>
                    <th className="p-2">Total cobrar</th>
                    <th className="p-2">Monto cobrado</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Estado pago</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidaciones.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-3 text-center">
                        Sin liquidaciones de clientes.
                      </td>
                    </tr>
                  ) : null}

                  {liquidaciones.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">
                        {fotoLiquidacionMap.get(Number(row.id)) ? (
                          <Image src={fotoLiquidacionMap.get(Number(row.id)) ?? ""} alt={`Liquidación ${row.numero_liquidacion}`} width={44} height={44} className="h-11 w-11 rounded object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-2">{row.numero_liquidacion}</td>
                      <td className="p-2">{row.numero_comprobante ?? "-"}</td>
                      <td className="p-2">{compLiquidacionMap.get(Number(row.id)) ?? "-"}</td>
                      <td className="p-2">{personaMap.get(row.persona_id) ?? row.persona_id}</td>
                      <td className="p-2">{row.pedido_id ? pedidoMap.get(row.pedido_id) ?? row.pedido_id : "-"}</td>
                      <td className="p-2">{row.fecha_liquidacion}</td>
                      <td className="p-2">{row.tipo_comprobante ?? "ninguno"}</td>
                      <td className="p-2">{row.total_a_pagar}</td>
                      <td className="p-2">{row.monto_pagado}</td>
                      <td className="p-2">{row.estado}</td>
                      <td className="p-2">{row.estado_pago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
