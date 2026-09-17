import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: konvensi "middleware" -> "proxy". Kita buat instance Auth.js
// dari config RINGAN (tanpa PrismaAdapter) agar bundle proxy tidak memuat
// Prisma/native engine. Session dibaca dari JWT (tanpa akses DB).
const { auth } = NextAuth(authConfig);

// Proxy hanya menegakkan AUTENTIKASI (sudah login?). Otorisasi per-role
// ditegakkan di server-layout tiap seksi (app/(dashboard)/**/layout.tsx) +
// di dalam tiap route API (requireManager/requireAdmin).
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Mesin Fingerspot mode Web mem-POST ke "/" dgn header request_code (protokol realtime).
  // Diarahkan ke /api/fingerspot/realtime lewat rewrite INTERNAL di next.config.ts
  // (bukan rewrite di middleware — itu memakai host publik & menyebabkan loop lewat
  // Cloudflare → error 1000). Di sini cukup biarkan lolos (jangan redirect ke login).
  if (req.method === "POST" && req.headers.get("request_code")) {
    return;
  }

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/rate") ||
    pathname.startsWith("/absence") ||
    pathname.startsWith("/link-expired") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/fingerspot") ||
    pathname.startsWith("/iclock") ||
    pathname.startsWith("/api/auth");

  if (!isPublic && !req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
