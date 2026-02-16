import Image from "next/image";
import Link from "next/link";

import {
  createPersonaAction,
  togglePersonaEstadoAction,
  updatePersonaAction,
} from "./actions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Módulo 1: Personas</h1>
        <Link href="/" className="text-sm underline">
          Volver al inicio
        </Link>
      </div>

      <section className="mb-4 rounded border p-4">
        <p className="text-sm">
          Este módulo es el padrón maestro de personas. Las cards resumen cuántos registros activos tienes
          por rol (productor/cliente) y la tabla te permite filtrar, mantener y actualizar datos base del
          sistema.
        </p>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded border p-3">
          <p className="text-sm">Total Personas Activas</p>
          <p className="text-2xl font-bold">{resumen.totalActivas}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">Productores Activos</p>
          <p className="text-2xl font-bold">{resumen.productores}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm">Clientes Activos</p>
          <p className="text-2xl font-bold">{resumen.clientes}</p>
        </div>
      </section>

      {successMessage ? (
        <p className="mb-4 rounded border border-green-600 p-2 text-sm">{successMessage}</p>
      ) : null}
      {alertMessage ? (
        <p className="mb-4 rounded border border-red-600 p-2 text-sm">{alertMessage}</p>
      ) : null}

      <section className="mb-6 rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">
          {editing ? `Editar Persona #${editing.persona.id}` : "Registrar Persona"}
        </h2>

        <form
          key={formRenderKey}
          action={editing ? updatePersonaAction : createPersonaAction}
          className="grid gap-3"
        >
          {editing ? <input type="hidden" name="id" value={String(editing.persona.id)} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm">Nombre Completo *</span>
              <input
                name="nombre_completo"
                defaultValue={formPersona.nombre_completo}
                className="rounded border px-2 py-1"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Tipo Documento *</span>
              <select
                name="tipo_documento"
                defaultValue={formPersona.tipo_documento}
                className="rounded border px-2 py-1"
                required
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">CE</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Documento *</span>
              <input
                name="documento"
                defaultValue={formPersona.documento}
                className="rounded border px-2 py-1"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Estado *</span>
              <select
                name="estado"
                defaultValue={formPersona.estado}
                className="rounded border px-2 py-1"
                required
              >
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Teléfono</span>
              <input name="telefono" defaultValue={formPersona.telefono ?? ""} className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <input name="email" defaultValue={formPersona.email ?? ""} className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Banco</span>
              <input name="banco" defaultValue={formPersona.banco ?? ""} className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Cuenta Bancaria</span>
              <input
                name="cuenta_bancaria"
                defaultValue={formPersona.cuenta_bancaria ?? ""}
                className="rounded border px-2 py-1"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">CCI</span>
              <input name="cci" defaultValue={formPersona.cci ?? ""} className="rounded border px-2 py-1" />
            </label>

            <label className="grid gap-1 sm:col-span-2">
              <span className="text-sm">Dirección</span>
              <textarea
                name="direccion"
                defaultValue={formPersona.direccion ?? ""}
                className="min-h-20 rounded border px-2 py-1"
              />
            </label>
          </div>

          <fieldset className="grid gap-2 rounded border p-3">
            <legend className="px-1 text-sm">Roles (mínimo 1) *</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLE_OPTIONS.map((role) => (
                <label key={role.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.value}
                    defaultChecked={formRolesSet.has(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-1 sm:max-w-md">
            <span className="text-sm">Foto de perfil (opcional)</span>
            <input type="file" name="foto_persona" accept="image/jpeg,image/png,image/webp" className="rounded border px-2 py-1" />
            <span className="text-xs">Se procesa y optimiza automáticamente (máximo 1080px).</span>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="rounded border px-3 py-1 font-medium">
              {editing ? "Guardar cambios" : "Crear persona"}
            </button>
            {editing ? (
              <Link href="/personas" className="rounded border px-3 py-1">
                Cancelar edición
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mb-4 rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Filtros</h2>
        <form className="grid gap-3 sm:grid-cols-4">
          <input
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Buscar nombre, documento, email"
            className="rounded border px-2 py-1 sm:col-span-2"
          />

          <select name="rol" defaultValue={search.rol ?? "todos"} className="rounded border px-2 py-1">
            <option value="todos">Todos los roles</option>
            <option value="productor">Solo productores</option>
            <option value="cliente">Solo clientes</option>
            <option value="ambos">Productor y cliente</option>
          </select>

          <select name="estado" defaultValue={search.estado ?? "todos"} className="rounded border px-2 py-1">
            <option value="todos">Todos los estados</option>
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
          </select>

          <div className="sm:col-span-4">
            <button className="rounded border px-3 py-1">Aplicar filtros</button>
          </div>
        </form>
      </section>

      <section className="rounded border p-4">
        <p className="mb-2 text-xs">Qué muestra esta tabla: listado maestro de personas con sus roles, estado y acciones de mantenimiento.</p>
        <div className="overflow-x-auto rounded border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Foto</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Documento</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Roles</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 text-center">
                  Sin resultados.
                </td>
              </tr>
            ) : null}

            {personas.map((persona) => {
              const roles = rolesMap.get(persona.id) ?? [];
              const query = new URLSearchParams();
              if (search.q) query.set("q", search.q);
              if (search.rol) query.set("rol", search.rol);
              if (search.estado) query.set("estado", search.estado);
              query.set("edit", String(persona.id));

              return (
                <tr key={persona.id} className="border-b align-top">
                  <td className="p-2">
                    {fotoMap.get(persona.id) ? (
                      <a
                        href={fotoMap.get(persona.id)?.image ?? ""}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver imagen grande"
                      >
                        <Image
                          src={fotoMap.get(persona.id)?.thumb ?? ""}
                          alt={`Foto ${persona.nombre_completo}`}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-2">{persona.nombre_completo}</td>
                  <td className="p-2">{persona.tipo_documento} {persona.documento}</td>
                  <td className="p-2">{persona.telefono ?? "-"}</td>
                  <td className="p-2">{persona.email ?? "-"}</td>
                  <td className="p-2">{roles.length > 0 ? roles.join(", ") : "-"}</td>
                  <td className="p-2">{persona.estado}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/personas?${query.toString()}`} className="rounded border px-2 py-1">
                        Editar
                      </Link>
                      <form action={togglePersonaEstadoAction}>
                        <input type="hidden" name="id" value={String(persona.id)} />
                        <input type="hidden" name="estado_actual" value={persona.estado} />
                        <button type="submit" className="rounded border px-2 py-1">
                          {persona.estado === "activo" ? "Desactivar" : "Activar"}
                        </button>
                      </form>
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
