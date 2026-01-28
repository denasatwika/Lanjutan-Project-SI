import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Role = "user" | "approver" | "admin";

const API_BASE =
  process.env.API_BASE_SERVER ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8787";

const SEGMENT_ROLE_MAP: Record<string, Role> = {
  user: "user",
  approver: "approver",
  admin: "admin",
};

const ROLE_HOME: Record<Role, string> = {
  user: "/user/dashboard",
  approver: "/approver/dashboard",
  admin: "/admin/dashboard",
};

type SessionResponse = {
  user: {
    id: string;
    roles: Role[];
    primaryRole: Role;
  };
};

async function fetchSession(req: NextRequest): Promise<SessionResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SessionResponse;
  } catch {
    return null;
  }
}

function resolveRequiredRole(pathname: string): Role | null {
  const [, firstSegment] = pathname.split("/");
  if (!firstSegment) return null;
  return SEGMENT_ROLE_MAP[firstSegment] ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for auth pages to avoid loops
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const requiredRole = resolveRequiredRole(pathname);

  if (!requiredRole) {
    return NextResponse.next();
  }

  const session = await fetchSession(req);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { roles, primaryRole } = session.user;
  if (!roles.includes(requiredRole)) {
    const home = ROLE_HOME[primaryRole] ?? "/";
    const redirectUrl = new URL(home, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/approver/:path*", "/user/:path*"],
};
