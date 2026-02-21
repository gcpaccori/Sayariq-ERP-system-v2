"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AutoActorFields() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const resolvedName =
        String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim() ||
        String(user.email || "").split("@")[0];

      setEmail(String(user.email || ""));
      setFullName(resolvedName);
    }

    void loadUser();
  }, [supabase]);

  return (
    <>
      <input type="hidden" name="actor_email" value={email} readOnly />
      <input type="hidden" name="actor_nombre" value={fullName} readOnly />
    </>
  );
}
