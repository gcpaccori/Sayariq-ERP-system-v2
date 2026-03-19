import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error:
        "Endpoint deshabilitado por seguridad. Asigna roles mediante panel administrativo del modulo de seguridad.",
    },
    { status: 410 }
  );
}
