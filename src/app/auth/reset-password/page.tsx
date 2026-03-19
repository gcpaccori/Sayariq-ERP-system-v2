"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function isStrongPassword(password: string) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return password.length >= 10 && hasUpper && hasLower && hasNumber && hasSymbol;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (data.session) {
        setReady(true);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || !!session) {
        setReady(true);
      }
    });

    void checkSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isStrongPassword(password)) {
      setError(
        "Usa al menos 10 caracteres, incluyendo mayúscula, minúscula, número y símbolo."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage("Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sayariq ERP</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Restablecer contraseña</h1>

        {!ready ? (
          <p className="mt-4 text-sm text-slate-700">
            Abre esta página desde el enlace enviado a tu correo para continuar con el cambio de contraseña.
          </p>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500">
                Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.
              </p>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Confirmar contraseña</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
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
              {loading ? "Actualizando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
          Volver al login
        </Link>
      </section>
    </main>
  );
}