import "server-only";

import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("Falta la variable NEXT_PUBLIC_SUPABASE_URL");
  }
  return supabaseUrl;
}

function getSupabaseServiceRoleKey() {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY para operaciones administrativas. Configura esta variable en el entorno de despliegue."
    );
  }
  return supabaseServiceRoleKey;
}

export function getSupabaseServerClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const apiKey = supabaseServiceRoleKey || supabaseAnonKey;

  if (!apiKey) {
    throw new Error(
      "Configura SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
