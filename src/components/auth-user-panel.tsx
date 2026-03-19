"use client";

import { LogOut, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeRole, type SystemRole } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthUser {
  email: string;
  fullName: string;
  role: SystemRole;
  avatarUrl: string | null;
}

function resolveAvatarUrl(rawAvatar: unknown, rawPicture: unknown): string | null {
  if (typeof rawAvatar === "string" && rawAvatar.trim().length > 0) {
    return rawAvatar;
  }

  if (typeof rawPicture === "string" && rawPicture.trim().length > 0) {
    return rawPicture;
  }

  return null;
}

function setAuthCookies(role: SystemRole) {
  const oneDay = 60 * 60 * 24;
  document.cookie = `sayariq-auth=1; path=/; max-age=${oneDay}; samesite=lax`;
  document.cookie = `sayariq-role=${role}; path=/; max-age=${oneDay}; samesite=lax`;
}

export default function AuthUserPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!authUser?.email) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const role = normalizeRole(authUser.user_metadata?.role);
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email.split("@")[0];
      const avatarUrl = resolveAvatarUrl(
        authUser.user_metadata?.avatar_url,
        authUser.user_metadata?.picture
      );

      setAuthCookies(role);
      setUser({ email: authUser.email, fullName, role, avatarUrl });
      setIsLoading(false);
    }

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email) {
        setUser(null);
        document.cookie = "sayariq-auth=; path=/; max-age=0";
        document.cookie = "sayariq-role=; path=/; max-age=0";
        return;
      }

      const role = normalizeRole(session.user.user_metadata?.role);
      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email.split("@")[0];
      const avatarUrl = resolveAvatarUrl(
        session.user.user_metadata?.avatar_url,
        session.user.user_metadata?.picture
      );

      setAuthCookies(role);
      setUser({ email: session.user.email, fullName, role, avatarUrl });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "sayariq-auth=; path=/; max-age=0";
    document.cookie = "sayariq-role=; path=/; max-age=0";
    router.push("/");
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {isLoading ? (
        <p className="text-xs text-slate-500">Cargando usuario…</p>
      ) : user ? (
        <>
          <div className="flex items-center gap-2">
            {user.avatarUrl ? (
              <div
                aria-label={`Foto de ${user.fullName}`}
                className="h-9 w-9 rounded-full border border-slate-200 bg-cover bg-center"
                style={{ backgroundImage: `url(${user.avatarUrl})` }}
              />
            ) : (
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-700">
                {user.fullName.slice(0, 2)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            <Shield size={12} />
            {user.role}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500">No hay sesión activa.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Ir a login
          </button>
        </>
      )}
    </div>
  );
}
