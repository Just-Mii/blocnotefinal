import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/types";
// Import ONLY from session-options — lib/auth.ts imports next/headers which
// is unavailable in the Edge runtime used by middleware.
import { sessionOptions } from "@/lib/session-options";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets through unconditionally
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/icon.svg")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  try {
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );

    if (!session.isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Session timeout check (60 min default)
    const timeoutMs = 60 * 60 * 1000;
    if (timeoutMs > 0 && Date.now() - session.lastActivity > timeoutMs) {
      await session.destroy();
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
