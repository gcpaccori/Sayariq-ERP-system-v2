import Link from "next/link";

import AutoActorFields from "@/components/auto-actor-fields";
import ClasificacionNetaEditor from "@/components/clasificacion-neta-editor";
import ModuleNavigation from "@/components/module-navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { editarClasificacionNetaAction } from "./actions";

type SearchParams = { ok?: string; error?: string; lote?: string; rev?: string };

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
  estado: string;
};

type Persona = { id: number; nombre_completo: string };
type Proceso = { lote_id: number; total_modificaciones: number };

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export default async function ClasificacionNetaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const supabase = getSupabaseServerClient();

  const [categoriasRes, lotesRes, vigentesRes, procesosRes, personasRes] = await Promise.all([
    supabase.from("categorias").select("id,nombre,codigo,orden").eq("estado", "activo").order("orden", { ascending: true }),
    supabase
      .from("lotes")
      .select("id,numero_lote,productor_id,peso_bruto_ingreso,estado")
      .in("estado", ["sin_clasificar", "clasificado", "asignado"])
      .order("id", { ascending: false }),
    supabase
      .from("vw_lote_clasificacion_vigente")
      .select("lote_id,categoria_id,categoria_nombre,numero_lote,productor_id,peso_neto,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,fecha_clasificacion,version_no"),
    supabase.from("clasificacion_neta_proceso").select("lote_id,total_modificaciones"),
    supabase.from("personas").select("id,nombre_completo"),
  ]);

  const categorias = (categoriasRes.data ?? []) as Categoria[];
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
    <div className="min-h-screen bg-[#F4F6FA] text-[#1F2937]">
      <div className="flex">
        <ModuleNavigation currentModule="/clasificacion-neta" />
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Módulo 10</p>
            <h1 className="text-2xl font-semibold text-slate-900">Clasificación Neta · CRUT de lotes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Primero elige un lote. Luego reclasifica por todas las categorías activas sin tocar el peso liquidado al productor.
            </p>
            {search.ok ? <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{search.ok}</p> : null}
            {search.error ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{search.error}</p> : null}
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Lotes disponibles</h2>
            {lotes.length === 0 ? (
              <p className="text-sm text-slate-500">No hay lotes en estados clasificables.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-2 py-2 text-left">Lote</th>
                      <th className="px-2 py-2 text-left">Productor</th>
                      <th className="px-2 py-2 text-left">Ingreso</th>
                      <th className="px-2 py-2 text-left">Neto vigente</th>
                      <th className="px-2 py-2 text-left">Modificaciones</th>
                      <th className="px-2 py-2 text-left">Estado</th>
                      <th className="px-2 py-2 text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {lotes.map((lote) => {
                      const rowsLote = vigentes.filter((row) => Number(row.lote_id) === Number(lote.id));
                      const netoActual = rowsLote.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                      const isSelected = Number(selectedLote?.id) === Number(lote.id);

                      return (
                        <tr key={lote.id} className={isSelected ? "bg-blue-50/50" : ""}>
                          <td className="px-2 py-2 font-medium">{lote.numero_lote}</td>
                          <td className="px-2 py-2">{productorMap.get(Number(lote.productor_id)) ?? "N/D"}</td>
                          <td className="px-2 py-2">{Number(lote.peso_bruto_ingreso ?? 0).toFixed(2)} kg</td>
                          <td className="px-2 py-2">{netoActual.toFixed(2)} kg</td>
                          <td className="px-2 py-2">{procesoMap.get(Number(lote.id)) ?? 0}</td>
                          <td className="px-2 py-2">{lote.estado}</td>
                          <td className="px-2 py-2">
                            <Link
                              href={`/clasificacion-neta?lote=${lote.id}`}
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
            )}
          </section>

          {selectedLote ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {(() => {
                const loteConAsignaciones = lotesConAsignaciones.has(Number(selectedLote.id));
                const netoActual = selectedRowsVigentes.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                const variacion = netoActual - Number(selectedLote.peso_bruto_ingreso ?? 0);

                return (
                  <>
                    <div className="mb-4 grid gap-2 text-sm md:grid-cols-4">
                      <p><strong>Lote:</strong> {selectedLote.numero_lote}</p>
                      <p><strong>Ingreso productor:</strong> {Number(selectedLote.peso_bruto_ingreso ?? 0).toFixed(2)} kg</p>
                      <p><strong>Neto clasificado:</strong> {netoActual.toFixed(2)} kg</p>
                      <p><strong>Variación:</strong> {variacion.toFixed(2)} kg</p>
                      <p><strong>Versión actual:</strong> v{versionActual}</p>
                      <p><strong>Modificaciones:</strong> {procesoMap.get(Number(selectedLote.id)) ?? 0}</p>
                      <p><strong>Registro en vista:</strong> {selectedVersion === 1 ? "Registro inicial" : `Modificación ${selectedVersion - 1} (v${selectedVersion})`}</p>
                    </div>

                    <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-2 py-2 text-left">Registro</th>
                            <th className="px-2 py-2 text-left">Fecha</th>
                            <th className="px-2 py-2 text-left">Kg vs almacén</th>
                            <th className="px-2 py-2 text-left">Actor</th>
                            <th className="px-2 py-2 text-left">Ver detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
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
                              <tr key={version} className={version === selectedVersion ? "bg-blue-50" : ""}>
                                <td className="px-2 py-2 font-medium">
                                  {version === 1 ? "Registro inicial" : `Modificación ${version - 1}`}
                                </td>
                                <td className="px-2 py-2">{fechaRegistro ? new Date(fechaRegistro).toLocaleString() : "-"}</td>
                                <td className={`px-2 py-2 ${deltaAlmacen > 0 ? "text-amber-700" : deltaAlmacen < 0 ? "text-sky-700" : "text-emerald-700"}`}>
                                  {deltaAlmacen > 0 ? "+" : ""}
                                  {deltaAlmacen.toFixed(3)} kg
                                </td>
                                <td className="px-2 py-2">{actor}</td>
                                <td className="px-2 py-2">
                                  <Link
                                    href={`/clasificacion-neta?lote=${selectedLote.id}&rev=${version}`}
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
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-white text-slate-600">
                              <tr>
                                <th className="px-2 py-2 text-left">Categoría</th>
                                <th className="px-2 py-2 text-left">Peso bruto</th>
                                <th className="px-2 py-2 text-left">N° jabas</th>
                                <th className="px-2 py-2 text-left">Peso jabas</th>
                                <th className="px-2 py-2 text-left">% humedad</th>
                                <th className="px-2 py-2 text-left">Peso neto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {rowsVersionVista.map((row) => (
                                <tr key={row.categoria_id}>
                                  <td className="px-2 py-2">{categorias.find((c) => Number(c.id) === row.categoria_id)?.nombre ?? row.categoria_id}</td>
                                  <td className="px-2 py-2">{Number(row.peso_bruto).toFixed(3)}</td>
                                  <td className="px-2 py-2">{Number(row.numero_jabas)}</td>
                                  <td className="px-2 py-2">{Number(row.peso_jabas).toFixed(3)}</td>
                                  <td className="px-2 py-2">{Number(row.porcentaje_humedad).toFixed(2)}</td>
                                  <td className="px-2 py-2">{Number(row.peso_neto).toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Link
                          href={`/clasificacion-neta?lote=${selectedLote.id}&rev=${versionActual}`}
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
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                            />
                          </label>

                          <div className="text-xs text-slate-600">
                            Actor
                            <p className="mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                              Se captura automáticamente desde sesión
                            </p>
                            <AutoActorFields />
                          </div>

                          <label className="text-xs text-slate-600">
                            Causa variación
                            <select
                              name="causa_variacion"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
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
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-xs text-slate-600">
                            Motivo de modificación
                            <input
                              name="motivo"
                              required
                              placeholder="Ej: ajuste por tierra y humedad"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs text-slate-600">
                            Detalle causa
                            <input
                              name="detalle_causa"
                              placeholder="Detalle opcional"
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>

                        <label className="block text-xs text-slate-600">
                          Observaciones
                          <textarea
                            name="observaciones"
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                          />
                        </label>

                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Guardar reclasificación (todas las categorías)
                        </button>
                      </form>
                    )}
                  </>
                );
              })()}
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              Selecciona un lote en la tabla superior para abrir el formulario de reclasificación.
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
