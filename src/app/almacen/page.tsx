import AlmacenModuleUI from "@/components/almacen-module-ui";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = {
  q?: string;
  estado?: string;
  productor?: string;
  desde?: string;
  hasta?: string;
  clasificar?: string;
  ver?: string;
  ok?: string;
  error?: string;
};

type Productor = { id: number; nombre_completo: string };
type Categoria = { id: number; codigo: string; nombre: string; precio_kg: number; orden: number };
type Lote = {
  id: number;
  numero_lote: string;
  productor_id: number;
  producto: string;
  categoria_id: number | null;
  fecha_ingreso: string;
  peso_bruto_ingreso: number;
  numero_jabas: number | null;
  estado: string;
  observaciones: string | null;
};

function escapeLike(input: string) {
  return input.replaceAll("%", "").replaceAll(",", " ").trim();
}

async function getProductoresActivos() {
  const supabase = getSupabaseServerClient();
  const { data: rolesData } = await supabase.from("persona_roles").select("persona_id").eq("rol", "productor");
  const ids = [...new Set((rolesData ?? []).map((r: any) => Number(r.persona_id)))] as number[];
  if (ids.length === 0) return [] as Productor[];
  const { data: personas } = await supabase.from("personas").select("id,nombre_completo").in("id", ids).eq("estado", "activo").order("nombre_completo", { ascending: true });
  return (personas ?? []).map((p: any) => ({ id: Number(p.id), nombre_completo: String(p.nombre_completo) }));
}

async function getCategoriasActivas() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("categorias").select("id,codigo,nombre,precio_kg,orden").eq("estado", "activo").order("orden", { ascending: true });
  return (data ?? []) as Categoria[];
}

async function getLotes(search: SearchParams) {
  const supabase = getSupabaseServerClient();
  const q = (search.q ?? "").trim();
  let lotesQuery = supabase.from("lotes").select("id,numero_lote,productor_id,producto,categoria_id,fecha_ingreso,peso_bruto_ingreso,numero_jabas,estado,observaciones").order("id", { ascending: false });
  if (search.estado && search.estado !== "todos") lotesQuery = lotesQuery.eq("estado", search.estado);
  if (q) {
    const term = escapeLike(q);
    lotesQuery = lotesQuery.or(`numero_lote.ilike.%${term}%`);
  }
  const { data, error } = await lotesQuery;
  if (error) return { lotes: [] as Lote[], productorMap: new Map<number, string>(), fotoIngresoMap: new Map<number, string>(), errorMessage: error.message };
  const lotes = (data ?? []) as Lote[];

  const productorIds = [...new Set(lotes.map((l) => Number(l.productor_id)))] as number[];
  const productorMap = new Map<number, string>();
  if (productorIds.length > 0) {
    const { data: personas } = await supabase.from("personas").select("id,nombre_completo").in("id", productorIds);
    for (const p of personas ?? []) productorMap.set(Number(p.id), String(p.nombre_completo));
  }

  const loteIds = lotes.map((r) => Number(r.id));
  const fotoIngresoMap = new Map<number, string>();
  if (loteIds.length > 0) {
    const { data: fotos } = await supabase.from("evidencias_fotos").select("entidad_id,ruta_thumb").eq("contexto", "lote_ingreso").eq("entidad_origen", "lotes").in("entidad_id", loteIds).order("created_at", { ascending: false });
    for (const f of fotos ?? []) {
      const id = Number(f.entidad_id);
      if (!fotoIngresoMap.has(id) && f.ruta_thumb) fotoIngresoMap.set(id, String(f.ruta_thumb));
    }
  }

  return { lotes, productorMap, fotoIngresoMap, errorMessage: "" };
}

async function getResumenLotes() {
  const supabase = getSupabaseServerClient();
  const { data: lotes } = await supabase.from("lotes").select("estado,peso_bruto_ingreso").neq("estado", "cancelado");
  const totalLotes = (lotes ?? []).length;
  const sinClasificar = (lotes ?? []).filter((r: any) => r.estado === "sin_clasificar").length;
  const clasificados = (lotes ?? []).filter((r: any) => r.estado === "clasificado").length;
  const kgAlmacen = Math.round(((lotes ?? []).reduce((acc: number, row: any) => acc + Number(row.peso_bruto_ingreso ?? 0), 0)) * 100) / 100;
  return { totalLotes, sinClasificar, clasificados, kgAlmacen };
}

export default async function AlmacenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const [productores, categorias, lotesData, resumen] = await Promise.all([getProductoresActivos(), getCategoriasActivas(), getLotes(search), getResumenLotes()]);

  const clasificaciones = [] as any[];
  const asignacionesDetalle = { asignaciones: [] as any[], pedidoMap: new Map<number, any>(), clienteMap: new Map<number, string>() };

  const productorMapObj = Object.fromEntries(lotesData.productorMap);
  const fotoIngresoMapObj = Object.fromEntries(lotesData.fotoIngresoMap);
  const categoriaMapObj = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));

  return (
    <AlmacenModuleUI
      productores={productores}
      categorias={categorias}
      lotes={lotesData.lotes as any}
      productorMap={productorMapObj}
      fotoIngresoMap={fotoIngresoMapObj}
      resumen={resumen}
      clasificaciones={clasificaciones}
      asignaciones={asignacionesDetalle.asignaciones}
      categoriaMap={categoriaMapObj}
    />
  );
}
