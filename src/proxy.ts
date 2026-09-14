import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "trellis-calabarzon-production-fallback-secret-key-2026";
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/pending", "/api/auth"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  let token = null;
  try {
    token = await getToken({ req, secret });
    if (!token) {
      token = await getToken({ req, secret, cookieName: "__Secure-authjs.session-token", salt: "__Secure-authjs.session-token" });
    }
    if (!token) {
      token = await getToken({ req, secret, cookieName: "authjs.session-token", salt: "authjs.session-token" });
    }
    if (!token) {
      token = await getToken({ req, secret, cookieName: "__Secure-next-auth.session-token", salt: "__Secure-next-auth.session-token" });
    }
    if (!token) {
      token = await getToken({ req, secret, cookieName: "next-auth.session-token", salt: "next-auth.session-token" });
    }
  } catch (e) {
    console.error("Middleware getToken error:", e);
  }

  const isLoggedIn = Boolean(token && (token.email || token.id));

  if (!isLoggedIn && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    const res = NextResponse.redirect(loginUrl);
    // Delete stale or invalid session cookies to prevent browser redirect loops
    res.cookies.delete("authjs.session-token");
    res.cookies.delete("__Secure-authjs.session-token");
    res.cookies.delete("next-auth.session-token");
    res.cookies.delete("__Secure-next-auth.session-token");
    return res;
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|uploads).*)"],
};



