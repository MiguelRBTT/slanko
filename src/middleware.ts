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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  try {
    const authContext = await authenticateRequest(request.headers.get(AUTH_HEADER), pathname);
    const requestHeaders = new Headers(request.headers);

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
  matcher: ["/api/:path*"],
};
