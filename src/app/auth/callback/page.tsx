"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { normalizeRole, type SystemRole } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function setAuthCookies(role: SystemRole) {
  const oneDay = 60 * 60 * 24;
  document.cookie = `sayariq-auth=1; path=/; max-age=${oneDay}; samesite=lax`;
  document.cookie = `sayariq-role=${role}; path=/; max-age=${oneDay}; samesite=lax`;
}

export default function AuthCallbackPage() {
  const [message] = useState("Validando enlace de acceso...");
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let handled = false;

    async function finishLogin(user: User) {
      if (handled) {
        return;
      }

      handled = true;

      const role = normalizeRole(user.user_metadata?.role);
      setAuthCookies(role);
      router.replace("/dashboard");
      router.refresh();
    }

    async function resolveExistingSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (user) {
        await finishLogin(user);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await finishLogin(session.user);
      }
    });

    void resolveExistingSession();

    const fallbackTimer = setTimeout(() => {
      if (!handled) {
        router.replace("/login");
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        {message}
      </div>
    </main>
  );
}
