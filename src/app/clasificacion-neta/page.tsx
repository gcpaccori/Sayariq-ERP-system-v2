import ModuleNavigation from "@/components/module-navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { editarClasificacionNetaAction } from "./actions";

type SearchParams = {
  ok?: string;
  error?: string;
};

type Row = {
  id: number;
  lote_id: number;
  categoria_id: number;
  categoria_nombre: string;
  numero_lote: string;
  productor: string;
  peso_bruto_ingreso: number;
  peso_neto: number;
  peso_bruto: number;
  numero_jabas: number;
  peso_jabas: number;
  porcentaje_humedad: number;
  fecha_clasificacion: string;
  version_no: number;
  total_modificaciones: number;
};

type Persona = { id: number; nombre_completo: string };

export default async function ClasificacionNetaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const supabase = getSupabaseServerClient();

  const [{ data: rowsData }, { data: personasData }] = await Promise.all([
    supabase
      .from("vw_lote_clasificacion_vigente")
      .select(
        "id,lote_id,categoria_id,categoria_nombre,numero_lote,productor_id,peso_neto,peso_bruto,numero_jabas,peso_jabas,porcentaje_humedad,fecha_clasificacion,version_no",
      )
      .order("lote_id", { ascending: false }),
    supabase
      .from("personas")
      .select("id,nombre_completo")
      .eq("estado", "activo")
      .order("nombre_completo", { ascending: true }),
  ]);

  const rowsBase = (rowsData ?? []) as Array<{
    id: number;
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
  }>;

  const loteIds = [...new Set(rowsBase.map((r) => Number(r.lote_id)))];
  const productorIds = [...new Set(rowsBase.map((r) => Number(r.productor_id)))];

  const [lotesRes, productoresRes, procesosRes] = await Promise.all([
    loteIds.length > 0
      ? supabase.from("lotes").select("id,peso_bruto_ingreso").in("id", loteIds)
      : Promise.resolve({ data: [] }),
    productorIds.length > 0
      ? supabase.from("personas").select("id,nombre_completo").in("id", productorIds)
      : Promise.resolve({ data: [] }),
    loteIds.length > 0
      ? supabase.from("clasificacion_neta_proceso").select("lote_id,total_modificaciones").in("lote_id", loteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lotesMap = new Map<number, number>(
    (lotesRes.data ?? []).map((l) => [Number(l.id), Number(l.peso_bruto_ingreso ?? 0)]),
  );
  const productorMap = new Map<number, string>(
    (productoresRes.data ?? []).map((p) => [Number(p.id), String(p.nombre_completo)]),
  );
  const procesoMap = new Map<number, number>(
    (procesosRes.data ?? []).map((p) => [Number(p.lote_id), Number(p.total_modificaciones ?? 0)]),
  );

  const rows: Row[] = rowsBase.map((r) => ({
    id: Number(r.id),
    lote_id: Number(r.lote_id),
    categoria_id: Number(r.categoria_id),
    categoria_nombre: r.categoria_nombre,
    numero_lote: r.numero_lote,
    productor: productorMap.get(Number(r.productor_id)) ?? "N/D",
    peso_bruto_ingreso: lotesMap.get(Number(r.lote_id)) ?? 0,
    peso_neto: Number(r.peso_neto ?? 0),
    peso_bruto: Number(r.peso_bruto ?? 0),
    numero_jabas: Number(r.numero_jabas ?? 0),
    peso_jabas: Number(r.peso_jabas ?? 0),
    porcentaje_humedad: Number(r.porcentaje_humedad ?? 0),
    fecha_clasificacion: r.fecha_clasificacion,
    version_no: Number(r.version_no ?? 1),
    total_modificaciones: procesoMap.get(Number(r.lote_id)) ?? 0,
  }));

  const personas = (personasData ?? []) as Persona[];

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#1F2937]">
      <div className="flex">
        <ModuleNavigation currentModule="/clasificacion-neta" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Módulo 10</p>
            <h1 className="text-2xl font-semibold text-slate-900">Clasificación Neta · CRUT de lotes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Edición controlada de clasificación con trazabilidad de cambios, variación de peso y ajuste en kardex.
            </p>
            {search.ok ? <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{search.ok}</p> : null}
            {search.error ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{search.error}</p> : null}
          </header>

          <section className="space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                No hay clasificaciones vigentes para mostrar.
              </div>
            ) : (
              rows.map((row) => {
                const variacion = row.peso_neto - row.peso_bruto_ingreso;
                return (
                  <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <p><strong>Lote:</strong> {row.numero_lote}</p>
                      <p><strong>Productor:</strong> {row.productor}</p>
                      <p><strong>Categoría:</strong> {row.categoria_nombre}</p>
                      <p><strong>Ingreso:</strong> {row.peso_bruto_ingreso.toFixed(2)} kg</p>
                      <p><strong>Neto vigente:</strong> {row.peso_neto.toFixed(2)} kg</p>
                      <p><strong>Variación:</strong> {variacion.toFixed(2)} kg</p>
                      <p><strong>Versión:</strong> v{row.version_no}</p>
                      <p><strong>Modificaciones:</strong> {row.total_modificaciones}</p>
                      <p><strong>Fecha clasif:</strong> {row.fecha_clasificacion}</p>
                    </div>

                    <form action={editarClasificacionNetaAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
                      <input type="hidden" name="lote_id" value={row.lote_id} />
                      <input type="hidden" name="clasificacion_id" value={row.id} />

                      <label className="text-xs text-slate-600">
                        Peso bruto (kg)
                        <input name="peso_bruto" type="number" step="0.001" defaultValue={row.peso_bruto} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600">
                        N° jabas
                        <input name="numero_jabas" type="number" min={0} defaultValue={row.numero_jabas} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600">
                        Peso jabas (kg)
                        <input name="peso_jabas" type="number" step="0.001" defaultValue={row.peso_jabas} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600">
                        % humedad
                        <input name="porcentaje_humedad" type="number" step="0.01" defaultValue={row.porcentaje_humedad} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600">
                        Fecha clasificación
                        <input name="fecha_clasificacion" type="date" defaultValue={row.fecha_clasificacion} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600">
                        Actor (quién modifica)
                        <select name="actor_persona_id" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                          <option value="">No especificado</option>
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs text-slate-600 md:col-span-2">
                        Motivo de modificación
                        <input name="motivo" required placeholder="Ej: corrección por tierra/humedad" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

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

                      <label className="text-xs text-slate-600 md:col-span-3">
                        Observaciones
                        <textarea name="observaciones" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <label className="text-xs text-slate-600 md:col-span-3">
                        Detalle causa
                        <textarea name="detalle_causa" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                      </label>

                      <div className="md:col-span-3">
                        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                          Guardar edición y ajustar kardex
                        </button>
                      </div>
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
