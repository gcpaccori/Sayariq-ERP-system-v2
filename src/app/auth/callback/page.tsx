"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function setAuthCookies(role: "adm" | "operario") {
  const oneDay = 60 * 60 * 24;
  document.cookie = `sayariq-auth=1; path=/; max-age=${oneDay}; samesite=lax`;
  document.cookie = `sayariq-role=${role}; path=/; max-age=${oneDay}; samesite=lax`;
}

async function enforceAdmRole(userId: string, currentRole: unknown) {
  if (currentRole === "adm") {
    return;
  }

  const response = await fetch("/api/auth/force-adm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el rol a adm");
  }
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando enlace de acceso...");
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let handled = false;

    async function finishLogin(user: User) {
      if (handled) {
        return;
      }

      handled = true;

      try {
        await enforceAdmRole(user.id, user.user_metadata?.role);
        setAuthCookies("adm");
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setMessage("Ingresaste, pero no pudimos completar la sincronización del rol.");
      }
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
