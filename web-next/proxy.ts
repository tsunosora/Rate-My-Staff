import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: konvensi "middleware" -> "proxy". Kita buat instance Auth.js
// dari config RINGAN (tanpa PrismaAdapter) agar bundle proxy tidak memuat
// Prisma/native engine. Session dibaca dari JWT (tanpa akses DB).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/rate") ||
    pathname.startsWith("/absence") ||
    pathname.startsWith("/link-expired") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/fingerspot") ||
    pathname.startsWith("/api/auth");

  if (!isPublic && !req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
