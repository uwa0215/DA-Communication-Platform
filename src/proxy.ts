import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "trellis-calabarzon-production-fallback-secret-key-2026";
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/pending", "/api/auth"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  const hasSessionCookie = 
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token");

  let token = null;
  try {
    token = await getToken({ req, secret });
    if (!token) {
      token = await getToken({ req, secret, cookieName: "__Secure-authjs.session-token" });
    }
    if (!token) {
      token = await getToken({ req, secret, cookieName: "authjs.session-token" });
    }
  } catch (e) {
    console.error("Middleware getToken error:", e);
  }

  const isLoggedIn = Boolean(token || hasSessionCookie);

  if (!isLoggedIn && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
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


