import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "trellis-calabarzon-production-fallback-secret-key-2026";
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/pending", "/api/auth"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|uploads).*)"],
};

