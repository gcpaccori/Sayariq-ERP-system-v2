"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";

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

const oauthProviders: Array<{ provider: Provider; label: string }> = [
  { provider: "google", label: "Google" },
  { provider: "twitter", label: "X / Twitter" },
  { provider: "facebook", label: "Facebook" },
  { provider: "github", label: "GitHub" },
  { provider: "discord", label: "Discord" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user?.id) {
        return;
      }

      try {
        await enforceAdmRole(user.id, user.user_metadata?.role);
        setAuthCookies("adm");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("La sesión existe, pero no pudimos actualizar tu rol.");
      }
    }

    void syncSession();
  }, [router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "login") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user?.id) {
        setError(authError?.message ?? "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }

      try {
        await enforceAdmRole(data.user.id, data.user.user_metadata?.role);
        setAuthCookies("adm");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Ingresaste, pero no se pudo dejar tu rol como adm.");
      }

      setLoading(false);
      return;
    }

    const normalizedName = fullName.trim() || email.split("@")[0];
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: "adm",
          full_name: normalizedName,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user?.id) {
      try {
        await enforceAdmRole(data.user.id, data.user.user_metadata?.role);
      } catch {
        setError("Usuario creado, pero no se pudo fijar rol adm.");
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Usuario creado. Si tienes confirmación por correo activa, valida tu email antes de entrar."
    );
    setMode("login");
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: Provider) => {
    setError(null);
    setMessage(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      if (oauthError.message.toLowerCase().includes("provider is not enabled")) {
        setError(
          `El proveedor ${provider} no está habilitado en Supabase. Actívalo en Authentication > Providers.`
        );
        return;
      }

      setError(oauthError.message);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e8f5ed]">
      <div className="absolute inset-0 bg-[url('/docs/persnal.jpg')] bg-cover bg-center opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/65 via-[#dff7e8]/55 to-white/65" />

      <section className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/15 bg-white/40 shadow-2xl backdrop-blur md:grid-cols-2">
          <aside className="hidden flex-col justify-between border-r border-[#0f2f20]/10 p-8 text-[#0f2f20] md:flex">
            <div>
              <img src="/docs/logo1-Photoroom.png" alt="Sayariq" className="h-14 w-auto" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#0d8a49]">Sayariq Export</p>
              <h1 className="mt-3 text-4xl font-black leading-tight">Portal ERP de operación agrícola y exportación.</h1>
              <p className="mt-4 text-sm text-[#284539]/80">
                Accede con tu cuenta para gestionar lotes, liquidaciones y operación diaria. Si no tienes
                sesión, puedes volver a la landing pública.
              </p>
            </div>
            <Link href="/" className="inline-flex w-fit rounded-full border border-[#0d8a49]/60 px-4 py-2 text-sm font-semibold text-[#0d8a49] hover:bg-[#0d8a49] hover:text-white">
              Volver al landing
            </Link>
          </aside>

          <section className="w-full bg-white/97 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sayariq ERP</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Acceso al sistema</h2>

            <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Crear usuario
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Nombre completo</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
              ) : null}

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Correo</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
              </button>
            </form>

            <div className="my-5 h-px bg-slate-200" />

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">O usa login social</p>
            <div className="grid grid-cols-1 gap-2">
              {oauthProviders.map((item) => (
                <button
                  key={item.provider}
                  type="button"
                  onClick={() => handleOAuthLogin(item.provider)}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Continuar con {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
