import type { SystemRole } from "@/lib/auth/roles";

export interface ModulePermission {
  read: boolean;
  write: boolean;
}

export type ModuleKey =
  | "seguridad-acceso"
  | "dashboard"
  | "personas"
  | "almacen"
  | "pedidos"
  | "kardex"
  | "liquidaciones"
  | "cobranzas"
  | "analitica"
  | "estado-cuenta-productor"
  | "rentabilidad-lotes"
  | "clasificacion-neta";

export const MODULE_FROM_PATH: Array<{ prefix: string; module: ModuleKey }> = [
  { prefix: "/seguridad-acceso", module: "seguridad-acceso" },
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/personas", module: "personas" },
  { prefix: "/almacen", module: "almacen" },
  { prefix: "/pedidos", module: "pedidos" },
  { prefix: "/kardex", module: "kardex" },
  { prefix: "/liquidaciones", module: "liquidaciones" },
  { prefix: "/cobranzas", module: "cobranzas" },
  { prefix: "/analitica", module: "analitica" },
  { prefix: "/estado-cuenta-productor", module: "estado-cuenta-productor" },
  { prefix: "/rentabilidad-lotes", module: "rentabilidad-lotes" },
  { prefix: "/clasificacion-neta", module: "clasificacion-neta" },
];

const ALL_MODULES: ModuleKey[] = [
  "seguridad-acceso",
  "dashboard",
  "personas",
  "almacen",
  "pedidos",
  "kardex",
  "liquidaciones",
  "cobranzas",
  "analitica",
  "estado-cuenta-productor",
  "rentabilidad-lotes",
  "clasificacion-neta",
];

function withAllAccess(write = true): Record<ModuleKey, ModulePermission> {
  return ALL_MODULES.reduce((acc, module) => {
    acc[module] = { read: true, write };
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>);
}

export const ROLE_PERMISSIONS: Record<SystemRole, Record<ModuleKey, ModulePermission>> = {
  admin: withAllAccess(true),
  operario: {
    "seguridad-acceso": { read: false, write: false },
    dashboard: { read: true, write: false },
    personas: { read: true, write: true },
    almacen: { read: true, write: true },
    pedidos: { read: true, write: true },
    kardex: { read: true, write: false },
    liquidaciones: { read: true, write: true },
    cobranzas: { read: true, write: true },
    analitica: { read: true, write: false },
    "estado-cuenta-productor": { read: true, write: false },
    "rentabilidad-lotes": { read: true, write: false },
    "clasificacion-neta": { read: true, write: true },
  },
  visualizador: {
    "seguridad-acceso": { read: false, write: false },
    dashboard: { read: true, write: false },
    personas: { read: true, write: false },
    almacen: { read: true, write: false },
    pedidos: { read: true, write: false },
    kardex: { read: true, write: false },
    liquidaciones: { read: true, write: false },
    cobranzas: { read: true, write: false },
    analitica: { read: true, write: false },
    "estado-cuenta-productor": { read: true, write: false },
    "rentabilidad-lotes": { read: true, write: false },
    "clasificacion-neta": { read: true, write: false },
  },
};

export function resolveModuleFromPath(pathname: string): ModuleKey | null {
  const found = MODULE_FROM_PATH.find((item) => pathname.startsWith(item.prefix));
  return found?.module ?? null;
}

export function canReadModule(role: SystemRole, module: ModuleKey): boolean {
  return ROLE_PERMISSIONS[role][module].read;
}

export function canWriteModule(role: SystemRole, module: ModuleKey): boolean {
  return ROLE_PERMISSIONS[role][module].write;
}
