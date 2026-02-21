import ModuleNavigation from "@/components/module-navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { editarClasificacionNetaAction } from "./actions";
import AutoActorFields from "@/components/auto-actor-fields";

type SearchParams = { ok?: string; error?: string };

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

type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  peso_bruto_ingreso: number;
  estado: string;
};

type Persona = { id: number; nombre_completo: string };
type Proceso = { lote_id: number; total_modificaciones: number };

function toKey(loteId: number, categoriaId: number) {
  return `${loteId}:${categoriaId}`;
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

  const bloqueadosPorVenta = new Set<number>((asignacionesRes.data ?? []).map((row) => Number(row.lote_id)));

  const productorMap = new Map<number, string>(personas.map((p) => [Number(p.id), p.nombre_completo]));
  const procesoMap = new Map<number, number>(procesos.map((p) => [Number(p.lote_id), Number(p.total_modificaciones ?? 0)]));
  const vigenteMap = new Map<string, VigenteRow>(
    vigentes.map((row) => [toKey(Number(row.lote_id), Number(row.categoria_id)), row]),
  );

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#1F2937]">
      <div className="flex">
        <ModuleNavigation currentModule="/clasificacion-neta" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Módulo 10</p>
            <h1 className="text-2xl font-semibold text-slate-900">Clasificación Neta · CRUT de lotes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Reclasifica por todas las categorías activas. El peso del productor no cambia; cambia el neto real comercial.
            </p>
            {search.ok ? <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{search.ok}</p> : null}
            {search.error ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{search.error}</p> : null}
          </header>

          <section className="space-y-4">
            {lotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                No hay lotes en estados clasificables.
              </div>
            ) : (
              lotes.map((lote) => {
                const loteBloqueado = bloqueadosPorVenta.has(Number(lote.id));
                const rowsLote = vigentes.filter((row) => Number(row.lote_id) === Number(lote.id));
                const netoActual = rowsLote.reduce((acc, row) => acc + Number(row.peso_neto ?? 0), 0);
                const variacion = netoActual - Number(lote.peso_bruto_ingreso ?? 0);
                const versionActual = rowsLote.length > 0 ? Math.max(...rowsLote.map((r) => Number(r.version_no ?? 1))) : 1;

                return (
                  <article key={lote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-2 text-sm md:grid-cols-4">
                      <p><strong>Lote:</strong> {lote.numero_lote}</p>
                      <p><strong>Productor:</strong> {productorMap.get(Number(lote.productor_id)) ?? "N/D"}</p>
                      <p><strong>Ingreso productor:</strong> {Number(lote.peso_bruto_ingreso ?? 0).toFixed(2)} kg</p>
                      <p><strong>Neto clasificado:</strong> {netoActual.toFixed(2)} kg</p>
                      <p><strong>Variación:</strong> {variacion.toFixed(2)} kg</p>
                      <p><strong>Versión actual:</strong> v{versionActual}</p>
                      <p><strong>Modificaciones:</strong> {procesoMap.get(Number(lote.id)) ?? 0}</p>
                      <p><strong>Estado lote:</strong> {lote.estado}</p>
                    </div>

                    {loteBloqueado ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Lote bloqueado para reclasificación: ya tiene salidas/asignaciones (venta en proceso o ejecutada).
                      </p>
                    ) : null}

                    <form action={editarClasificacionNetaAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <input type="hidden" name="lote_id" value={lote.id} />

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="text-xs text-slate-600">
                          Fecha clasificación
                          <p className="mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            Automática al guardar (hoy)
                          </p>
                          <input type="hidden" name="fecha_clasificacion" value={new Date().toISOString().slice(0, 10)} readOnly />
                        </div>

                        <div className="text-xs text-slate-600">
                          Actor
                          <p className="mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            Se captura automáticamente desde sesión
                          </p>
                          <AutoActorFields />
                        </div>

                        <label className="text-xs text-slate-600">
                          Causa variación
                          <select name="causa_variacion" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            <option value="proceso">Proceso</option>
                            <option value="humedad">Humedad</option>
                            <option value="tierra">Tierra</option>
                            <option value="negociacion">Negociación</option>
                            <option value="otro">Otro</option>
                          </select>
                        </label>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-white text-slate-600">
                            <tr>
                              <th className="px-2 py-2 text-left">Categoría</th>
                              <th className="px-2 py-2 text-left">Peso bruto</th>
                              <th className="px-2 py-2 text-left">N° jabas</th>
                              <th className="px-2 py-2 text-left">Peso jabas</th>
                              <th className="px-2 py-2 text-left">% humedad</th>
                              <th className="px-2 py-2 text-left">Neto vigente</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {categorias.map((categoria) => {
                              const key = toKey(Number(lote.id), Number(categoria.id));
                              const actual = vigenteMap.get(key);
                              return (
                                <tr key={categoria.id}>
                                  <td className="px-2 py-2">{categoria.nombre}</td>
                                  <td className="px-2 py-2">
                                    <input disabled={loteBloqueado} name={`peso_bruto_${categoria.id}`} type="number" step="0.001" defaultValue={Number(actual?.peso_bruto ?? 0)} className="w-24 rounded border border-slate-300 px-2 py-1" />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input disabled={loteBloqueado} name={`numero_jabas_${categoria.id}`} type="number" min={0} defaultValue={Number(actual?.numero_jabas ?? 0)} className="w-20 rounded border border-slate-300 px-2 py-1" />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input disabled={loteBloqueado} name={`peso_jabas_${categoria.id}`} type="number" step="0.001" defaultValue={Number(actual?.peso_jabas ?? 0)} className="w-24 rounded border border-slate-300 px-2 py-1" />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input disabled={loteBloqueado} name={`porcentaje_humedad_${categoria.id}`} type="number" step="0.01" defaultValue={Number(actual?.porcentaje_humedad ?? 0)} className="w-20 rounded border border-slate-300 px-2 py-1" />
                                  </td>
                                  <td className="px-2 py-2">{Number(actual?.peso_neto ?? 0).toFixed(2)} kg</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-xs text-slate-600">
                          Motivo de modificación
                          <input disabled={loteBloqueado} name="motivo" required placeholder="Ej: ajuste por tierra y humedad" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-xs text-slate-600">
                          Detalle causa
                          <input disabled={loteBloqueado} name="detalle_causa" placeholder="Detalle opcional" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                        </label>
                      </div>

                      <label className="block text-xs text-slate-600">
                        Observaciones
                        <textarea disabled={loteBloqueado} name="observaciones" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <button disabled={loteBloqueado} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                        {loteBloqueado
                          ? "Bloqueado por venta/asignación"
                          : "Guardar reclasificación (todas las categorías)"}
                      </button>
                    </form>
                  </article>
                );
              })
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
