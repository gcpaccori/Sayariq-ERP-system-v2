import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

interface ForceAdmBody {
  userId?: string;
}

export async function POST(request: Request) {
  const { userId } = (await request.json()) as ForceAdmBody;

  if (!userId) {
    return NextResponse.json({ error: "Falta userId" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message ?? "No se encontró el usuario" },
      { status: 400 }
    );
  }

  const metadata = {
    ...(userData.user.user_metadata ?? {}),
    role: "adm",
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, role: "adm" });
}
