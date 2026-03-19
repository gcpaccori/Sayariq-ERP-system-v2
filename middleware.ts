import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { canReadModule, resolveModuleFromPath } from "@/lib/auth/permissions";
import { normalizeRole } from "@/lib/auth/roles";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/forgot-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path);
  const hasSession = request.cookies.get("sayariq-auth")?.value === "1";
  const role = normalizeRole(request.cookies.get("sayariq-role")?.value);

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (hasSession && !isPublicPath) {
    const moduleKey = resolveModuleFromPath(pathname);

    if (moduleKey && !canReadModule(role, moduleKey)) {
      return NextResponse.redirect(new URL("/dashboard?error=Acceso+denegado", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
