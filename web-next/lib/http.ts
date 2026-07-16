import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/** Ambil session; lempar Response 401 bila belum login. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session) throw NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return session;
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(errors: unknown) {
  return NextResponse.json({ errors }, { status: 422 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ message }, { status: 404 });
}

/**
 * Bungkus handler route: tangkap Response yang dilempar (mis. dari requireSession)
 * dan error tak terduga → 500. Menjaga tiap route tetap ringkas.
 */
export function route<Ctx>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return NextResponse.json({ message: "Internal error" }, { status: 500 });
    }
  };
}
