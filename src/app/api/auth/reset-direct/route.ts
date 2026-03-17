import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

interface ResetDirectBody {
  email?: string;
  newPassword?: string;
}

export async function POST(request: Request) {
  const { email, newPassword } = (await request.json()) as ResetDirectBody;

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Falta email" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  let userId: string | null = null;

  for (let page = 1; page <= 20; page += 1) {
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    const users = usersData.users ?? [];

    const matchedUser = users.find(
      (user) => (user.email ?? "").trim().toLowerCase() === normalizedEmail
    );

    if (matchedUser?.id) {
      userId = matchedUser.id;
      break;
    }

    if (users.length < 200) {
      break;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "No existe un usuario con ese correo" }, { status: 404 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}