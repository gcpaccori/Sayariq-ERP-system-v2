import DashboardPersonasUi from "@/components/dashboard-personas-ui";
import ModuleNavigation from "@/components/module-navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type DashboardPerson = {
  id: number;
  nombreCompleto: string;
  tipoDocumento: string;
  documento: string;
  direccion: string | null;
  estado: "activo" | "inactivo";
  roles: string[];
  saldo: number;
};

type DashboardExecutiveChart = {
  categories: string[];
  ventas: number[];
  cobros: number[];
  pagosProductor: number[];
  balance: number[];
  pendienteCobro: number;
  pendientePago: number;
  agingLabels: string[];
  agingCobrar: number[];
  agingPagar: number[];
  conversionLabels: string[];
  conversionValues: number[];
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthsWindowFromRange(start: Date, end: Date) {
  const months: Array<{ key: string; label: string; date: Date }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor.getTime() <= endMonth.getTime()) {
    const date = new Date(cursor);
    const key = getMonthKey(date);
    const label = date.toLocaleDateString("es-PE", { month: "short", year: "2-digit", timeZone: "UTC" });
    months.push({ key, label: label.replace(".", ""), date });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

async function getPeopleData(): Promise<DashboardPerson[]> {
  const supabase = getSupabaseServerClient();

  const { data: personasData } = await supabase
    .from("personas")
    .select("id,nombre_completo,tipo_documento,documento,direccion,estado")
    .order("id", { ascending: false })
    .limit(5000);

  const personas = (personasData ?? []) as Array<{
    id: number;
    nombre_completo: string;
    tipo_documento: string;
    documento: string;
    direccion: string | null;
    estado: "activo" | "inactivo";
  }>;

  const personaIds = personas.map((person) => Number(person.id));

  let rolesData: Array<{ persona_id: number; rol: string }> = [];
  let kardexData: Array<{ persona_id: number | null; tipo_movimiento: string; monto: number | null }> = [];

  if (personaIds.length > 0) {
    const [rolesRes, kardexRes] = await Promise.all([
      supabase.from("persona_roles").select("persona_id,rol").in("persona_id", personaIds),
      supabase
        .from("kardex")
        .select("persona_id,tipo_movimiento,monto")
        .eq("tipo_kardex", "dinero")
        .in("persona_id", personaIds),
    ]);

    rolesData = (rolesRes.data ?? []) as Array<{ persona_id: number; rol: string }>;
    kardexData = (kardexRes.data ?? []) as Array<{
      persona_id: number | null;
      tipo_movimiento: string;
      monto: number | null;
    }>;
  }

  const rolesMap = new Map<number, string[]>();
  for (const row of rolesData) {
    const personaId = Number(row.persona_id);
    if (!rolesMap.has(personaId)) rolesMap.set(personaId, []);
    rolesMap.get(personaId)?.push(String(row.rol));
  }

  const saldoMap = new Map<number, number>();
  for (const row of kardexData) {
    const personaId = Number(row.persona_id ?? 0);
    if (!personaId) continue;
    const current = saldoMap.get(personaId) ?? 0;
    const monto = Number(row.monto ?? 0);

    const next = row.tipo_movimiento === "ingreso" ? current + monto : current - monto;
    saldoMap.set(personaId, next);
  }

  return personas.map((person) => ({
    id: Number(person.id),
    nombreCompleto: person.nombre_completo,
    tipoDocumento: person.tipo_documento,
    documento: person.documento,
    direccion: person.direccion,
    estado: person.estado,
    roles: (rolesMap.get(Number(person.id)) ?? []).sort((a, b) => a.localeCompare(b)),
    saldo: Number((saldoMap.get(Number(person.id)) ?? 0).toFixed(2)),
  }));
}

async function getExecutiveChartData(): Promise<DashboardExecutiveChart> {
  const supabase = getSupabaseServerClient();
  const now = new Date();

  const [liquidacionesRes, lotesRes, clasifRes, asignacionesRes, cobrosRes] = await Promise.all([
    supabase
      .from("liquidaciones")
      .select("fecha_liquidacion,tipo,total_a_pagar,monto_pagado,estado,estado_pago")
      .neq("estado", "anulada")
      .order("fecha_liquidacion", { ascending: true })
      .limit(50000),
    supabase.from("lotes").select("id").limit(50000),
    supabase.from("lote_clasificacion").select("lote_id").limit(50000),
    supabase.from("pedido_asignaciones").select("pedido_id,lote_id").limit(50000),
    supabase
      .from("liquidaciones")
      .select("pedido_id,tipo,estado_pago,monto_pagado,estado,fecha_liquidacion")
      .eq("tipo", "cliente")
      .neq("estado", "anulada")
      .limit(50000),
  ]);

  const liquidacionesData = liquidacionesRes.data;
  const liquidacionFechas = ((liquidacionesData ?? []) as Array<{ fecha_liquidacion: string | null }>)
    .map((row) => row.fecha_liquidacion)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  const rangeStart =
    liquidacionFechas.length > 0
      ? new Date(
        Math.min(
          ...liquidacionFechas.map((date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
        )
      )
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rangeEnd =
    liquidacionFechas.length > 0
      ? new Date(
        Math.max(
          ...liquidacionFechas.map((date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
        )
      )
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const months = buildMonthsWindowFromRange(rangeStart, rangeEnd);
  const monthKeys = new Set(months.map((month) => month.key));

  const monthly = new Map<string, { ventas: number; cobros: number; pagosProductor: number }>();
  for (const month of months) {
    monthly.set(month.key, { ventas: 0, cobros: 0, pagosProductor: 0 });
  }

  let pendienteCobro = 0;
  let pendientePago = 0;

  const agingLabels = ["0-14 días", "15-30 días", "31-60 días", "+60 días"];
  const agingCobrar = [0, 0, 0, 0];
  const agingPagar = [0, 0, 0, 0];

  const rows = (liquidacionesData ?? []) as Array<{
    fecha_liquidacion: string | null;
    tipo: "cliente" | "productor" | null;
    total_a_pagar: number | null;
    monto_pagado: number | null;
    estado: string | null;
    estado_pago: string | null;
  }>;

  for (const row of rows) {
    if (!row.fecha_liquidacion || !row.tipo) continue;

    const date = new Date(row.fecha_liquidacion);
    if (Number.isNaN(date.getTime())) continue;

    const key = getMonthKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
    if (!monthKeys.has(key)) continue;

    const bucket = monthly.get(key);
    if (!bucket) continue;

    const total = Number(row.total_a_pagar ?? 0);
    const pagado = Number(row.monto_pagado ?? 0);

    if (row.tipo === "cliente") {
      bucket.ventas += total;
      bucket.cobros += pagado;
      pendienteCobro += Math.max(0, total - pagado);
    }

    if (row.tipo === "productor") {
      bucket.pagosProductor += total;
      pendientePago += Math.max(0, total - pagado);
    }

    const saldo = Math.max(0, total - pagado);
    if (saldo <= 0) continue;

    const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
    const bucketIndex = days <= 14 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3;

    if (row.tipo === "cliente") {
      agingCobrar[bucketIndex] = round2(agingCobrar[bucketIndex] + saldo);
    } else if (row.tipo === "productor") {
      agingPagar[bucketIndex] = round2(agingPagar[bucketIndex] + saldo);
    }
  }

  const categories: string[] = [];
  const ventas: number[] = [];
  const cobros: number[] = [];
  const pagosProductor: number[] = [];
  const balance: number[] = [];

  for (const month of months) {
    const bucket = monthly.get(month.key) ?? { ventas: 0, cobros: 0, pagosProductor: 0 };
    const ventasMonth = round2(bucket.ventas);
    const cobrosMonth = round2(bucket.cobros);
    const pagosMonth = round2(bucket.pagosProductor);
    const balanceMonth = round2(cobrosMonth - pagosMonth);

    categories.push(month.label);
    ventas.push(ventasMonth);
    cobros.push(cobrosMonth);
    pagosProductor.push(pagosMonth);
    balance.push(balanceMonth);
  }

  const lotesIngresados = (lotesRes.data ?? []).length;
  const lotesClasificados = new Set(
    ((clasifRes.data ?? []) as Array<{ lote_id: number | null }>).map((row) => Number(row.lote_id ?? 0)).filter(Boolean)
  ).size;
  const asignacionesData = (asignacionesRes.data ?? []) as Array<{ pedido_id: number | null; lote_id: number | null }>;
  const lotesAsignados = new Set(asignacionesData.map((row) => Number(row.lote_id ?? 0)).filter(Boolean)).size;

  const lotesPorPedido = new Map<number, Set<number>>();
  for (const row of asignacionesData) {
    const pedidoId = Number(row.pedido_id ?? 0);
    const loteId = Number(row.lote_id ?? 0);
    if (!pedidoId || !loteId) continue;
    if (!lotesPorPedido.has(pedidoId)) {
      lotesPorPedido.set(pedidoId, new Set<number>());
    }
    lotesPorPedido.get(pedidoId)?.add(loteId);
  }

  const lotesCobradosSet = new Set<number>();
  for (const row of ((cobrosRes.data ?? []) as Array<{
    pedido_id: number | null;
    tipo: "cliente" | "productor" | null;
    estado_pago: string | null;
    monto_pagado: number | null;
    estado: string | null;
    fecha_liquidacion: string | null;
  }>)) {
    const pedidoId = Number(row.pedido_id ?? 0);
    const tieneCobro = Number(row.monto_pagado ?? 0) > 0 || row.estado_pago === "parcial" || row.estado_pago === "cobrado" || row.estado_pago === "pagado";
    if (!pedidoId || row.tipo !== "cliente" || !tieneCobro) continue;

    for (const loteId of lotesPorPedido.get(pedidoId) ?? []) {
      lotesCobradosSet.add(loteId);
    }
  }

  const lotesCobrados = lotesCobradosSet.size;

  const conversionLabels = [
    "Lotes ingresados",
    "Lotes clasificados",
    "Lotes asignados",
    "Lotes cobrados",
  ];
  const conversionValues = [lotesIngresados, lotesClasificados, lotesAsignados, lotesCobrados].map((value) => Number(value));

  return {
    categories,
    ventas,
    cobros,
    pagosProductor,
    balance,
    pendienteCobro: round2(pendienteCobro),
    pendientePago: round2(pendientePago),
    agingLabels,
    agingCobrar,
    agingPagar,
    conversionLabels,
    conversionValues,
  };
}

export default async function DashboardPage() {
  const [people, executiveChart] = await Promise.all([getPeopleData(), getExecutiveChartData()]);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="dashboard" />
      <div className="flex-1">
        <DashboardPersonasUi people={people} executiveChart={executiveChart} />
      </div>
    </div>
  );
}
