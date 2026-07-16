import type { NextAuthConfig } from "next-auth";

/**
 * Config Auth.js yang RINGAN & aman untuk proxy/middleware:
 * TANPA PrismaAdapter dan TANPA provider yang butuh Node (bcrypt/prisma).
 * Dipakai proxy.ts hanya untuk mendekode session JWT (tanpa akses DB).
 * Config penuh (adapter + Credentials) ada di lib/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
