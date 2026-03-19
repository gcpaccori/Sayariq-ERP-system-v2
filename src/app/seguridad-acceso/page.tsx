import ModuleNavigation from "@/components/module-navigation";
import { normalizeRole, type SystemRole } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { updateUserRoleAction } from "./actions";

type SearchParams = {
  q?: string;
  role?: string;
  ok?: string;
  error?: string;
};

type SecurityUser = {
  id: string;
  email: string;
  role: SystemRole;
  fullName: string;
  createdAt: string;
};

const roleOptions: SystemRole[] = ["admin", "operario", "visualizador"];

function parseDate(rawDate: string) {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getUsers(searchParams: SearchParams) {
  const supabase = getSupabaseServerClient();
  const users: SecurityUser[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      return { users: [] as SecurityUser[], error: error.message };
    }

    const rows = data.users ?? [];
    for (const row of rows) {
      if (!row.id || !row.email) {
        continue;
      }

      users.push({
        id: row.id,
        email: row.email,
        role: normalizeRole(row.user_metadata?.role),
        fullName:
          String(row.user_metadata?.full_name || row.user_metadata?.name || row.email.split("@")[0]) ||
          row.email,
        createdAt: row.created_at || "",
      });
    }

    if (rows.length < 200) {
      break;
    }
  }

  const query = (searchParams.q ?? "").trim().toLowerCase();
  const roleFilter = normalizeRole(searchParams.role);

  const filtered = users.filter((user) => {
    const byText =
      !query ||
      user.email.toLowerCase().includes(query) ||
      user.fullName.toLowerCase().includes(query);
    const byRole = !searchParams.role || user.role === roleFilter;
    return byText && byRole;
  });

  filtered.sort((a, b) => a.email.localeCompare(b.email));

  return { users: filtered, error: "" };
}

export default async function SeguridadAccesoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { users, error } = await getUsers(params);

  const q = params.q ?? "";
  const role = params.role ?? "";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <ModuleNavigation currentModule="seguridad-acceso" />
      <section className="mx-auto w-full max-w-7xl p-4 lg:p-8">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Módulo 11</p>
          <h1 className="mt-1 text-2xl font-semibold">Seguridad de Acceso</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gestiona roles del sistema para administrador, operario y visualizador.
          </p>
        </header>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Buscar por nombre o correo</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="usuario@correo.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Filtrar por rol</span>
              <select
                name="role"
                defaultValue={role}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Todos</option>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:self-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Filtrar
              </button>
            </div>
          </form>

          {params.ok ? <p className="mt-3 text-sm font-medium text-emerald-700">{params.ok}</p> : null}
          {params.error ? <p className="mt-3 text-sm font-medium text-red-600">{params.error}</p> : null}
          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Correo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Rol actual</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Creado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Actualizar rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">{user.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold uppercase text-blue-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{parseDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <form action={updateUserRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="user_id" value={user.id} />
                          <select
                            name="role"
                            defaultValue={user.role}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                          >
                            {roleOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Guardar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
