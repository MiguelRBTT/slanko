import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_HEADER,
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { authenticateRequest, isPublicApiPath, isProtectedApiPath } from "@/lib/auth/authorize";
import { AppError } from "@/lib/errors/app-error";
import { buildContentSecurityPolicy, createNonce } from "@/lib/http/security-headers";

const AUTH_CONTEXT_HEADERS = [USER_ID_HEADER, USER_EMAIL_HEADER, USER_ROLE_HEADER];

/** Páginas: CSP com nonce novo a cada requisição (o Next.js aplica o nonce nos próprios scripts). */
function withPageSecurity(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api")) {
    return withPageSecurity(request);
  }

  // O contexto de autenticação só pode vir do middleware, nunca do cliente.
  const requestHeaders = new Headers(request.headers);
  AUTH_CONTEXT_HEADERS.forEach((header) => requestHeaders.delete(header));

  if (isPublicApiPath(pathname) || !isProtectedApiPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  try {
    const authContext = await authenticateRequest(request.headers.get(AUTH_HEADER), pathname);

    if (authContext) {
      requestHeaders.set(USER_ID_HEADER, authContext.userId);
      requestHeaders.set(USER_EMAIL_HEADER, authContext.email);
      requestHeaders.set(USER_ROLE_HEADER, authContext.role);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const config = {
  // Runtime Node.js: o middleware consulta o banco para validar se o usuário segue ativo.
  runtime: "nodejs",
  matcher: [
    "/api/:path*",
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
