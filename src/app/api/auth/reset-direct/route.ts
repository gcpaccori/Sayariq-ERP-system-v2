import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error:
        "Endpoint deshabilitado por seguridad. Usa 'Olvidaste tu contraseña' para recuperar acceso por correo.",
    },
    { status: 410 }
  );
}