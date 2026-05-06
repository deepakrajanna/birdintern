import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Role-based route protection. We rely on the `role` claim NextAuth puts on
 * the JWT (see lib/auth.ts) to gate /intern, /supervisor, /admin and their
 * matching API namespaces.
 */
export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token?.role as string | undefined) || "intern";
    const path = req.nextUrl.pathname;

    const allow = (...roles: string[]) => roles.includes(role);

    if (path.startsWith("/intern") || path.startsWith("/api/intern")) {
      // Interns, supervisors and admins can hit intern endpoints (the
      // restriction by role is for landing redirects; APIs themselves verify
      // the actor). Tighten if you want stricter separation.
      if (!allow("intern", "supervisor", "admin")) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    if (path.startsWith("/supervisor") || path.startsWith("/api/supervisor")) {
      if (!allow("supervisor", "admin")) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      if (!allow("admin")) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/" },
  }
);

export const config = {
  matcher: [
    "/intern/:path*",
    "/supervisor/:path*",
    "/admin/:path*",
    "/api/intern/:path*",
    "/api/supervisor/:path*",
    "/api/admin/:path*",
  ],
};
