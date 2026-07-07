import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Rotas alcançáveis sem sessão. Checagem otimista (só presença do cookie):
// a verificação real acontece no AppShell/actions com auth.api.getSession.
const PUBLIC =
  /^\/(login|esqueci-senha|redefinir-senha|convite|sem-convite|api\/auth)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (PUBLIC.test(pathname)) {
    if (hasSession && pathname === "/login") {
      return NextResponse.redirect(new URL("/produtos", request.url));
    }
    return NextResponse.next();
  }
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
