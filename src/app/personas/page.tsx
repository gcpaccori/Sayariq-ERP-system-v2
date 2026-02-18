import PersonasModuleUI from "@/components/personas-module-ui";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ModuleNavigation from "@/components/module-navigation";

type Rol =
  | "productor"
  | "cliente"
  | "estibador"
  | "transportista"
  | "operador_planta"
  | "personal"
  | "supervisor"
  | "comprador"
  | "administrativo"
  | "calidad";

const ROLE_OPTIONS: Array<{ value: Rol; label: string }> = [
  { value: "productor", label: "Productor" },
  { value: "cliente", label: "Cliente" },
  { value: "estibador", label: "Estibador" },
  { value: "transportista", label: "Transportista" },
  { value: "operador_planta", label: "Operador de planta" },
  { value: "personal", label: "Personal" },
  { value: "supervisor", label: "Supervisor" },
  { value: "comprador", label: "Comprador" },
  { value: "administrativo", label: "Administrativo" },
  { value: "calidad", label: "Calidad" },
];

const ROLE_SET = new Set<Rol>(ROLE_OPTIONS.map((role) => role.value));

function parseRol(raw: unknown): Rol | null {
  if (typeof raw !== "string") return null;

  const normalized = raw.trim().toLowerCase().replaceAll(" ", "_");
  const aliases: Record<string, Rol> = {
    operador_de_planta: "operador_planta",
  };

  const candidate = (aliases[normalized] ?? normalized) as Rol;
  return ROLE_SET.has(candidate) ? candidate : null;
}

type Persona = {
  id: number;
  nombre_completo: string;
  tipo_documento: "DNI" | "RUC" | "CE";
  documento: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  banco: string | null;
  cuenta_bancaria: string | null;
  cci: string | null;
  estado: "activo" | "inactivo";
};

type SearchParams = {
  q?: string;
  rol?: "todos" | "productor" | "cliente" | "ambos";
  estado?: "todos" | "activo" | "inactivo";
  edit?: string;
  ok?: string;
  error?: string;
};

type FotoPersona = {
  thumb: string;
  image: string;
};

const emptyForm: Persona = {
  id: 0,
  nombre_completo: "",
  tipo_documento: "DNI",
  documento: "",
  telefono: "",
  email: "",
  direccion: "",
  banco: "",
  cuenta_bancaria: "",
  cci: "",
  estado: "activo",
};

function escapeLike(input: string) {
  return input.replaceAll("%", "").replaceAll(",", " ").trim();
}

async function getPersonas(search: SearchParams) {
  const supabase = getSupabaseServerClient();

  const queryText = (search.q ?? "").trim();
  const estadoFilter = search.estado ?? "todos";
  const rolFilter = search.rol ?? "todos";

  let personasQuery = supabase
    .from("personas")
    .select(
      "id,nombre_completo,tipo_documento,documento,telefono,email,direccion,banco,cuenta_bancaria,cci,estado"
    )
    .order("id", { ascending: false });

  if (estadoFilter !== "todos") {
    personasQuery = personasQuery.eq("estado", estadoFilter);
  }

  if (queryText) {
    const term = escapeLike(queryText);
    personasQuery = personasQuery.or(
      `nombre_completo.ilike.%${term}%,documento.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data: personasData, error: personasError } = await personasQuery;
  if (personasError) {
    return {
      personas: [] as Persona[],
      rolesMap: new Map<number, Rol[]>(),
      fotoMap: new Map<number, FotoPersona>(),
      errorMessage: personasError.message,
      resumen: { totalActivas: 0, productores: 0, clientes: 0 },
    };
  }

  const personas = (personasData ?? []) as Persona[];
  const personaIds = personas.map((persona) => persona.id);

  const rolesMap = new Map<number, Rol[]>();
  if (personaIds.length > 0) {
    const { data: rolesData } = await supabase
      .from("persona_roles")
      .select("persona_id,rol")
      .in("persona_id", personaIds);

    for (const row of rolesData ?? []) {
      const personaId = Number(row.persona_id);
      const rol = parseRol(row.rol);
      if (!rol) continue;
      if (!rolesMap.has(personaId)) {
        rolesMap.set(personaId, []);
      }
      rolesMap.get(personaId)?.push(rol);
    }
  }

  const personasFiltradas = personas.filter((persona) => {
    if (rolFilter === "todos") return true;
    const roles = rolesMap.get(persona.id) ?? [];
    if (rolFilter === "ambos") {
      return roles.includes("productor") && roles.includes("cliente");
    }
    return roles.includes(rolFilter);
  });

  const fotoMap = new Map<number, FotoPersona>();
  const personasFiltradasIds = personasFiltradas.map((persona) => Number(persona.id));
  if (personasFiltradasIds.length > 0) {
    const { data: fotosData } = await supabase
      .from("evidencias_fotos")
      .select("entidad_id,ruta_thumb,ruta_imagen,created_at")
      .eq("contexto", "persona_perfil")
      .eq("entidad_origen", "personas")
      .in("entidad_id", personasFiltradasIds)
      .order("created_at", { ascending: false });

    for (const row of fotosData ?? []) {
      const personaId = Number(row.entidad_id);
      if (!fotoMap.has(personaId) && row.ruta_thumb) {
        fotoMap.set(personaId, {
          thumb: String(row.ruta_thumb),
          image: String(row.ruta_imagen ?? row.ruta_thumb),
        });
      }
    }
  }

  const { data: personasActivas } = await supabase
    .from("personas")
    .select("id")
    .eq("estado", "activo");

  const idsActivas = (personasActivas ?? []).map((row) => Number(row.id));

  let productores = 0;
  let clientes = 0;

  if (idsActivas.length > 0) {
    const { data: rolesActivos } = await supabase
      .from("persona_roles")
      .select("persona_id,rol")
      .in("persona_id", idsActivas);

    const mapaRolesActivos = new Map<number, Set<Rol>>();

    for (const row of rolesActivos ?? []) {
      const personaId = Number(row.persona_id);
      const rol = parseRol(row.rol);
      if (!rol) continue;
      if (!mapaRolesActivos.has(personaId)) {
        mapaRolesActivos.set(personaId, new Set());
      }
      mapaRolesActivos.get(personaId)?.add(rol);
    }

    for (const rolSet of mapaRolesActivos.values()) {
      if (rolSet.has("productor")) productores += 1;
      if (rolSet.has("cliente")) clientes += 1;
    }
  }

  return {
    personas: personasFiltradas,
    rolesMap,
    fotoMap,
    errorMessage: "",
    resumen: {
      totalActivas: idsActivas.length,
      productores,
      clientes,
    },
  };
}

async function getPersonaById(id: number) {
  const supabase = getSupabaseServerClient();
  const { data: persona } = await supabase
    .from("personas")
    .select(
      "id,nombre_completo,tipo_documento,documento,telefono,email,direccion,banco,cuenta_bancaria,cci,estado"
    )
    .eq("id", id)
    .single();

  if (!persona) return null;

  const { data: rolesData } = await supabase
    .from("persona_roles")
    .select("rol")
    .eq("persona_id", id);

  const roles = (rolesData ?? [])
    .map((row) => parseRol(row.rol))
    .filter((value): value is Rol => value !== null);

  return { persona: persona as Persona, roles };
}

function isChecked(roles: Rol[], rol: Rol) {
  return roles.includes(rol);
}

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;

  const { personas, rolesMap, fotoMap, errorMessage, resumen } = await getPersonas(search);

  const editId = Number(search.edit ?? 0);
  const editing = editId > 0 ? await getPersonaById(editId) : null;
  const rolesFromList = editId > 0 ? rolesMap.get(editId) ?? [] : [];

  const formPersona = editing?.persona ?? emptyForm;
  const formRoles = editing?.roles?.length ? editing.roles : rolesFromList;
  const formRolesSet = new Set(formRoles);
  const formRenderKey = `${editing?.persona.id ?? "new"}-${[...formRolesSet].sort().join("|")}`;

  const successMessage = search.ok ?? "";
  const alertMessage = search.error ?? errorMessage;

  return (
    <>
      <ModuleNavigation currentModule="personas" />
      <PersonasModuleUI
        personas={personas}
        rolesMap={rolesMap}
        fotoMap={fotoMap}
        resumen={resumen}
        successMessage={successMessage}
        alertMessage={alertMessage}
      />
    </>
  );
}
