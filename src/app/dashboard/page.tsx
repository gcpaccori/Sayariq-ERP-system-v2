import DashboardPersonasUi from "@/components/dashboard-personas-ui";
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

export default async function DashboardPage() {
  const people = await getPeopleData();
  return <DashboardPersonasUi people={people} />;
}
