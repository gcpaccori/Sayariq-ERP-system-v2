import Link from "next/link";

import AutoActorFields from "@/components/auto-actor-fields";
import BackToDashboardButton from "@/components/back-to-dashboard-button";
import ClasificacionNetaEditor from "@/components/clasificacion-neta-editor";
import ModuleNavigation from "@/components/module-navigation";
import ModuleFormModal from "@/components/module-form-modal";
import { selectCategoriasActivasCompat } from "@/lib/categorias";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { editarClasificacionNetaAction } from "./actions";

type SearchParams = {
  ok?: string;
  error?: string;
  lote?: string;
  rev?: string;
  q?: string;
  estado?: string;
  page?: string;
};

type Categoria = { id: number; nombre: string; codigo: string; orden: number };

type VigenteRow = {
  lote_id: number;
  categoria_id: number;
  categoria_nombre: string;
  numero_lote: string;
  productor_id: number;
  peso_neto: number;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  fecha_clasificacion: string;
  version_no: number;
};

type HistorialClasifRow = {
  lote_id: number;
  categoria_id: number;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  peso_neto: number;
  version_no: number;
  created_at: string;
};

type AuditoriaRow = {
  version_nueva: number;
  actor_persona_id: number | null;
  created_at: string;
};

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  peso_bruto_ingreso: number;
  numero_jabas: number;
  estado: string;
};

type Persona = { id: number; nombre_completo: string };
type Proceso = { lote_id: number; total_modificaciones: number; numero_jabas_ingreso: number; numero_jabas_clasificacion: number };

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function buildClasificacionNetaUrl(params: {
  q?: string;
  estado?: string;
  page?: number;
  lote?: number | null;
  rev?: number;
}) {
  const searchParams = new URLSearchParams();

  const q = (params.q ?? "").trim();
  if (q) searchParams.set("q", q);

  const estado = params.estado ?? "todos";
  if (estado !== "todos") searchParams.set("estado", estado);

  if ((params.page ?? 1) > 1) {
    searchParams.set("page", String(params.page));
  }

  if (params.lote && params.lote > 0) {
    searchParams.set("lote", String(params.lote));
  }

  if ((params.rev ?? 0) > 0) {
    searchParams.set("rev", String(params.rev));
  }

  const query = searchParams.toString();
  return query ? `/clasificacion-neta?${query}` : "/clasificacion-neta";
}

export default async function ClasificacionNetaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const supabase = getSupabaseServerClient();

  const [categoriasRes, lotesRes, vigentesRes, procesosRes, personasRes] = await Promise.all([
    selectCategoriasActivasCompat<Categoria>(supabase, "id,nombre,codigo,orden"),
    supabase
      .from("lotes")
      .select("id,numero_lote,productor_id,peso_bruto_ingreso,numero_jabas,estado")
      .in("estado", ["sin_clasificar", "clasificado", "asignado"])
      .order("id", { ascending: false }),
    supabase
      .from("vw_lote_clasificacion_vigente")
      .select("lote_id,categoria_id,categoria_nombre,numero_lote,productor_id,peso_neto,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,fecha_clasificacion,version_no"),
    supabase.from("clasificacion_neta_proceso").select("lote_id,total_modificaciones,numero_jabas_ingreso,numero_jabas_clasificacion"),
    supabase.from("personas").select("id,nombre_completo"),
  ]);

  const categorias = categoriasRes;
  const lotes = (lotesRes.data ?? []) as Lote[];
  const vigentes = (vigentesRes.data ?? []) as VigenteRow[];
  const procesos = (procesosRes.data ?? []) as Proceso[];
  const personas = (personasRes.data ?? []) as Persona[];

  const loteIds = lotes.map((row) => Number(row.id));
  const asignacionesRes =
    loteIds.length > 0
      ? await supabase.from("pedido_asignaciones").select("lote_id").in("lote_id", loteIds)
      : { data: [] };

  const lotesConAsignaciones = new Set<number>((asignacionesRes.data ?? []).map((row) => Number(row.lote_id)));

  const productorMap = new Map<number, string>(personas.map((p) => [Number(p.id), p.nombre_completo]));
  const procesoMap = new Map<number, number>(procesos.map((p) => [Number(p.lote_id), Number(p.total_modificaciones ?? 0)]));

  const query = (search.q ?? "").trim();
  const queryLower = query.toLowerCase();
  const allowedEstados = new Set(["todos", "sin_clasificar", "clasificado", "asignado"]);
  const estadoFilter = allowedEstados.has(search.estado ?? "") ? String(search.estado) : "todos";

  const lotesFiltrados = lotes.filter((lote) => {
    if (estadoFilter !== "todos" && lote.estado !== estadoFilter) {
      return false;
    }

    if (!queryLower) {
      return true;
    }

    const productor = (productorMap.get(Number(lote.productor_id)) ?? "").toLowerCase();
    return lote.numero_lote.toLowerCase().includes(queryLower) || productor.includes(queryLower);
  });

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(lotesFiltrados.length / pageSize));
  const pageFromQuery = Number.parseInt(search.page ?? "1", 10);
  const currentPage = Number.isFinite(pageFromQuery)
    ? Math.min(Math.max(pageFromQuery, 1), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const lotesPage = lotesFiltrados.slice(pageStart, pageStart + pageSize);
  const fromItem = lotesFiltrados.length === 0 ? 0 : pageStart + 1;
  const toItem = Math.min(pageStart + pageSize, lotesFiltrados.length);

  const paginationRangeStart = Math.max(1, currentPage - 2);
  const paginationRangeEnd = Math.min(totalPages, paginationRangeStart + 4);
  const paginationRange = Array.from(
    { length: paginationRangeEnd - paginationRangeStart + 1 },
    (_, index) => paginationRangeStart + index,
  );

  const listBaseUrl = buildClasificacionNetaUrl({
    q: query,
    estado: estadoFilter,
    page: currentPage,
  });

  const selectedLoteId = Number(search.lote ?? "0") || null;
  const selectedLote = selectedLoteId ? lotes.find((l) => Number(l.id) === selectedLoteId) ?? null : null;

  const [historialRes, auditoriaRes] = selectedLote
    ? await Promise.all([
      supabase
        .from("lote_clasificacion")
        .select("lote_id,categoria_id,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,peso_neto,version_no,created_at")
        .eq("lote_id", Number(selectedLote.id))
        .order("version_no", { ascending: true }),
      supabase
        .from("lote_clasificacion_auditoria")
        .select("version_nueva,actor_persona_id,created_at")
        .eq("lote_id", Number(selectedLote.id))
        .order("created_at", { ascending: false }),
    ])
    : [{ data: [] }, { data: [] }];

  const historialRows = (historialRes.data ?? []) as HistorialClasifRow[];
  const auditoriaRows = (auditoriaRes.data ?? []) as AuditoriaRow[];

  const historialMap = new Map<number, HistorialClasifRow[]>();
  for (const row of historialRows) {
    const version = Number(row.version_no ?? 1);
    const current = historialMap.get(version) ?? [];
    current.push(row);
    historialMap.set(version, current);
  }

  const versiones = [...historialMap.keys()].sort((a, b) => a - b);
  const versionActual = versiones.length > 0 ? versiones[versiones.length - 1] : 1;
  const requestedVersion = Number(search.rev ?? "0") || 0;
  const selectedVersion = requestedVersion > 0 && historialMap.has(requestedVersion) ? requestedVersion : versionActual;

  const auditoriaActorPorVersion = new Map<number, string>();
  const auditoriaFechaPorVersion = new Map<number, string>();
  for (const row of auditoriaRows) {
    const version = Number(row.version_nueva ?? 0);
    if (!version || auditoriaActorPorVersion.has(version)) continue;
    const actorId = Number(row.actor_persona_id ?? 0);
    auditoriaActorPorVersion.set(version, actorId > 0 ? productorMap.get(actorId) ?? `Persona ${actorId}` : "No identificado");
    auditoriaFechaPorVersion.set(version, row.created_at);
  }

  const selectedRowsVigentes = selectedLote
    ? vigentes.filter((row) => Number(row.lote_id) === Number(selectedLote.id))
    : [];

  const rowsVersionVista = (historialMap.get(selectedVersion) ?? []).map((row) => ({
    categoria_id: Number(row.categoria_id),
    peso_bruto: Number(row.peso_bruto ?? 0),
    numero_jabas: Number(row.numero_jabas ?? 0),
    peso_jabas: Number(row.peso_jabas ?? 0),
    porcentaje_humedad: Number(row.porcentaje_humedad ?? 0),
    peso_neto: Number(row.peso_neto ?? 0),
  }));

  const isHistorialView = selectedVersion !== versionActual;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <ModuleNavigation currentModule="/clasificacion-neta" />
      <main className="google-2027-theme relative flex-1 bg-white text-gray-900">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.02,
            backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl p-6">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Módulo 10: Clasificación Neta
              </h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Primero elige un lote. Luego reclasifica por todas las categorías activas sin tocar el peso liquidado al productor.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BackToDashboardButton className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition duration-200 hover:bg-gray-50" />
            </div>
          </div>

          {search.ok ? <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm">✓ {search.ok}</p> : null}
          {search.error ? <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm">✕ {search.error}</p> : null}

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Lotes disponibles</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mostrando {fromItem}-{toItem} de {lotesFiltrados.length} lote(s)
                </p>
              </div>

              <form method="get" className="grid w-full gap-2 md:max-w-2xl md:grid-cols-[1fr_180px_auto_auto]">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Buscar por lote o productor"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
                <select
                  name="estado"
                  defaultValue={estadoFilter}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="sin_clasificar">Sin clasificar</option>
                  <option value="clasificado">Clasificado</option>
                  <option value="asignado">Asignado</option>
                </select>
                <button type="submit" className="sx-btn sx-btn-primary">
                  Filtrar
                </button>
                <Link href="/clasificacion-neta" className="sx-btn sx-btn-secondary">
                  Limpiar
                </Link>
              </form>
            </div>

            {lotesFiltrados.length === 0 ? (
              <p className="text-sm text-slate-500">No hay lotes en estados clasificables.</p>
            ) : (
              <>
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2">Lote</th>
                        <th className="p-2">Productor</th>
                        <th className="p-2">Ingreso</th>
                        <th className="p-2">Jabas almacen</th>
                        <th className="p-2">Jabas clasificacion</th>
                        <th className="p-2">Saldo jabas</th>
                        <th className="p-2">Neto vigente</th>
                        <th className="p-2">Modificaciones</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotesPage.map((lote) => {
                        const rowsLote = vigentes.filter((row) => Number(row.lote_id) === Number(lote.id));
                        const netoActual = rowsLote.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                        const jabasClasificadas = rowsLote.reduce((acc, row) => acc + Number(row.numero_jabas ?? 0), 0);
                        const proceso = procesos.find((row) => Number(row.lote_id) === Number(lote.id));
                        const jabasIngreso = Number(proceso?.numero_jabas_ingreso ?? lote.numero_jabas ?? 0);
                        const saldoJabas = jabasIngreso - jabasClasificadas;
                        const isSelected = Number(selectedLote?.id) === Number(lote.id);

                        return (
                          <tr key={lote.id} className={`border-b align-top ${isSelected ? "bg-blue-50/50" : "hover:bg-gray-50 transition"}`}>
                            <td className="p-2">{lote.numero_lote}</td>
                            <td className="p-2">{productorMap.get(Number(lote.productor_id)) ?? "N/D"}</td>
                            <td className="p-2">{Number(lote.peso_bruto_ingreso ?? 0).toFixed(2)} kg</td>
                            <td className="p-2">{jabasIngreso}</td>
                            <td className="p-2">{jabasClasificadas}</td>
                            <td className={`p-2 ${saldoJabas < 0 ? "text-rose-700" : ""}`}>{saldoJabas}</td>
                            <td className="p-2">{netoActual.toFixed(2)} kg</td>
                            <td className="p-2">{procesoMap.get(Number(lote.id)) ?? 0}</td>
                            <td className="p-2">{lote.estado}</td>
                            <td className="p-2">
                              <Link
                                href={buildClasificacionNetaUrl({
                                  q: query,
                                  estado: estadoFilter,
                                  page: currentPage,
                                  lote: Number(lote.id),
                                })}
                                className="inline-flex rounded-lg border border-blue-200 px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                              >
                                {isSelected ? "Editando" : "Modificar clasificación"}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={buildClasificacionNetaUrl({ q: query, estado: estadoFilter, page: Math.max(1, currentPage - 1) })}
                      className={`sx-btn sx-btn-secondary ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                      aria-disabled={currentPage <= 1}
                    >
                      Anterior
                    </Link>

                    {paginationRange.map((pageNumber) => (
                      <Link
                        key={pageNumber}
                        href={buildClasificacionNetaUrl({ q: query, estado: estadoFilter, page: pageNumber })}
                        className={pageNumber === currentPage ? "sx-btn sx-btn-primary" : "sx-btn sx-btn-secondary"}
                      >
                        {pageNumber}
                      </Link>
                    ))}

                    <Link
                      href={buildClasificacionNetaUrl({ q: query, estado: estadoFilter, page: Math.min(totalPages, currentPage + 1) })}
                      className={`sx-btn sx-btn-secondary ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                      aria-disabled={currentPage >= totalPages}
                    >
                      Siguiente
                    </Link>
                  </div>
                </div>
              </>
            )}
          </section>

          {selectedLote ? (
            <ModuleFormModal
              isOpen={true}
              closeHref={listBaseUrl}
              title={`Reclasificación: Lote ${selectedLote.numero_lote}`}
              description={`Ingreso: ${Number(selectedLote.peso_bruto_ingreso ?? 0).toFixed(2)} kg | Jabas almacen: ${Number(selectedLote.numero_jabas ?? 0)} | Version actual: v${versionActual}`}
              maxWidth="5xl"
            >
              {(() => {
                const loteConAsignaciones = lotesConAsignaciones.has(Number(selectedLote.id));
                const netoActual = selectedRowsVigentes.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                const variacion = netoActual - Number(selectedLote.peso_bruto_ingreso ?? 0);

                return (
                  <>
                    <div className="mb-4 grid gap-3 rounded-xl bg-gray-50 p-4 shadow-inner text-sm sm:grid-cols-4">
                      <p><strong className="text-gray-900">Neto clasificado:</strong> {netoActual.toFixed(2)} kg</p>
                      <p><strong className="text-gray-900">Jabas almacen:</strong> {Number(selectedLote.numero_jabas ?? 0)}</p>
                      <p><strong className="text-gray-900">Jabas clasificacion:</strong> {selectedRowsVigentes.reduce((acc, row) => acc + Number(row.numero_jabas ?? 0), 0)}</p>
                      <p><strong className="text-gray-900">Variación:</strong> <span className={variacion > 0 ? "text-amber-700" : variacion < 0 ? "text-sky-700" : "text-emerald-700"}>{variacion > 0 ? "+" : ""}{variacion.toFixed(2)} kg</span></p>
                      <p><strong className="text-gray-900">Modificaciones:</strong> {procesoMap.get(Number(selectedLote.id)) ?? 0}</p>
                    </div>

                    <div className="mb-4 sx-table-wrap">
                      <table className="sx-table">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2">Registro</th>
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Kg vs almacén</th>
                            <th className="p-2">Actor</th>
                            <th className="p-2">Ver detalle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {versiones.map((version) => {
                            const rows = historialMap.get(version) ?? [];
                            const netoVersion = rows.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                            const deltaAlmacen = round3(netoVersion - Number(selectedLote.peso_bruto_ingreso ?? 0));
                            const fechaRegistro = auditoriaFechaPorVersion.get(version) ?? rows[0]?.created_at ?? "";
                            const actor =
                              version === 1
                                ? "Registro inicial"
                                : auditoriaActorPorVersion.get(version) ?? "No identificado";

                            return (
                              <tr key={version} className={`border-b align-top ${version === selectedVersion ? "bg-blue-50" : "hover:bg-gray-50 transition"}`}>
                                <td className="p-2">
                                  {version === 1 ? "Registro inicial" : `Modificación ${version - 1}`}
                                </td>
                                <td className="p-2">{fechaRegistro ? new Date(fechaRegistro).toLocaleString() : "-"}</td>
                                <td className={`p-2 ${deltaAlmacen > 0 ? "text-amber-700" : deltaAlmacen < 0 ? "text-sky-700" : "text-emerald-700"}`}>
                                  {deltaAlmacen > 0 ? "+" : ""}
                                  {deltaAlmacen.toFixed(3)} kg
                                </td>
                                <td className="p-2">{actor}</td>
                                <td className="p-2">
                                  <Link
                                    href={buildClasificacionNetaUrl({
                                      q: query,
                                      estado: estadoFilter,
                                      page: currentPage,
                                      lote: Number(selectedLote.id),
                                      rev: version,
                                    })}
                                    className="inline-flex rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
                                  >
                                    {version === selectedVersion ? "Viendo" : "Ver"}
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {loteConAsignaciones ? (
                      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Este lote ya tiene asignaciones/ventas. La reclasificación sigue permitida y registrará ajustes en kardex.
                      </p>
                    ) : null}

                    {isHistorialView ? (
                      <div className="space-y-3">
                        <p className="rounded-lg bg-slate-100 p-2 text-xs text-slate-700">
                          Estás viendo un registro histórico. Para editar, vuelve a la versión actual.
                        </p>
                        <div className="sx-table-wrap">
                          <table className="sx-table">
                            <thead>
                              <tr className="border-b text-left">
                                <th className="p-2">Categoría</th>
                                <th className="p-2">Peso bruto</th>
                                <th className="p-2">N° jabas</th>
                                <th className="p-2">Peso jabas</th>
                                <th className="p-2">% humedad</th>
                                <th className="p-2">Peso neto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowsVersionVista.map((row) => (
                                <tr key={row.categoria_id} className="border-b transition hover:bg-gray-50">
                                  <td className="p-2">{categorias.find((c) => Number(c.id) === row.categoria_id)?.nombre ?? row.categoria_id}</td>
                                  <td className="p-2">{Number(row.peso_bruto).toFixed(3)}</td>
                                  <td className="p-2">{Number(row.numero_jabas)}</td>
                                  <td className="p-2">{Number(row.peso_jabas).toFixed(3)}</td>
                                  <td className="p-2">{Number(row.porcentaje_humedad).toFixed(2)}</td>
                                  <td className="p-2">{Number(row.peso_neto).toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Link
                          href={buildClasificacionNetaUrl({
                            q: query,
                            estado: estadoFilter,
                            page: currentPage,
                            lote: Number(selectedLote.id),
                            rev: versionActual,
                          })}
                          className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Volver a versión actual para editar
                        </Link>
                      </div>
                    ) : (
                      <form action={editarClasificacionNetaAction} className="space-y-4">
                        <input type="hidden" name="lote_id" value={selectedLote.id} />
                        <div className="grid gap-3 md:grid-cols-4">
                          <label className="text-xs text-slate-600">
                            Fecha clasificación
                            <input
                              type="date"
                              name="fecha_clasificacion"
                              defaultValue={new Date().toISOString().slice(0, 10)}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                            />
                          </label>

                          <div className="text-xs text-slate-600">
                            Actor
                            <p className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20">
                              Se captura automáticamente desde sesión
                            </p>
                            <AutoActorFields />
                          </div>

                          <label className="text-xs text-slate-600">
                            Causa variación
                            <select
                              name="causa_variacion"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                            >
                              <option value="proceso">Proceso</option>
                              <option value="humedad">Humedad</option>
                              <option value="tierra">Tierra</option>
                              <option value="negociacion">Negociación</option>
                              <option value="otro">Otro</option>
                            </select>
                          </label>
                        </div>

                        <ClasificacionNetaEditor
                          categorias={categorias.map((c) => ({ id: Number(c.id), nombre: c.nombre }))}
                          rowsIniciales={selectedRowsVigentes.map((row) => ({
                            categoria_id: Number(row.categoria_id),
                            peso_bruto: Number(row.peso_bruto ?? 0),
                            numero_jabas: Number(row.numero_jabas ?? 0),
                            peso_jabas: Number(row.peso_jabas ?? 0),
                            porcentaje_humedad: Number(row.porcentaje_humedad ?? 0),
                            peso_neto: Number(row.peso_neto ?? 0),
                          }))}
                          pesoIngreso={Number(selectedLote.peso_bruto_ingreso ?? 0)}
                          numeroJabasIngreso={Number(selectedLote.numero_jabas ?? 0)}
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-xs text-slate-600">
                            Motivo de modificación
                            <input
                              name="motivo"
                              required
                              placeholder="Ej: ajuste por tierra y humedad"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                            />
                          </label>
                          <label className="text-xs text-slate-600">
                            Detalle causa
                            <input
                              name="detalle_causa"
                              placeholder="Detalle opcional"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                            />
                          </label>
                        </div>

                        <label className="block text-xs text-slate-600">
                          Observaciones
                          <textarea
                            name="observaciones"
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                          />
                        </label>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row">
                          <button
                            type="submit"
                            className="flex-1 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:shadow-md"
                          >
                            Guardar reclasificación (todas las categorías)
                          </button>
                          <Link
                            href={listBaseUrl}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 hover:border-gray-400"
                          >
                            Cancelar
                          </Link>
                        </div>
                      </form>
                    )}
                  </>
                );
              })()}
            </ModuleFormModal>
          ) : null}
        </div>
      </main>
    </div>
  );
}
