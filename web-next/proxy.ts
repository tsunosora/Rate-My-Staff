import { auth } from "@/lib/auth";

// Next.js 16: file konvensi "middleware" diganti "proxy". Fungsi tetap sama.
// Auth.js v5 mengembalikan handler yang kompatibel; default Node.js runtime
// di Next 16 aman untuk Prisma adapter (session pakai JWT, tanpa akses DB di sini).
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
