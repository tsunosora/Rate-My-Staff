import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { canAttempt, recordFailure, clearAttempts, sweep } from "@/lib/rate-limit";
import { requireEmployeeByToken, setPortalCookie, clearPortalCookie } from "@/lib/services/portal/auth";
import { normalizePin, validatePin } from "@/lib/services/portal/pin";
import { portalLoginSchema, portalSetPinSchema } from "@/lib/validators/portal";

type Ctx = { params: Promise<{ token: string }> };

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Response baru tiap panggilan — objek Response tidak boleh dipakai ulang lintas request. */
function tooManyAttempts() {
  return NextResponse.json(
    { message: "Terlalu banyak percobaan PIN. Coba lagi 15 menit lagi." },
    { status: 429 }
  );
}

/**
 * PUBLIK — buka sesi portal.
 * - PIN belum ada  : kirim { pin, confirm } untuk membuatnya (sekali, oleh pemegang tautan).
 * - PIN sudah ada  : kirim { pin } untuk masuk, atau { currentPin, pin, confirm } untuk ganti PIN.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requireEmployeeByToken(token);
  const body = await req.json().catch(() => null);

  sweep();
  const key = `portal:${clientIp(req)}:${token}`;
  if (!canAttempt(key)) return tooManyAttempts();

  // --- Buat PIN pertama kali / ganti PIN -------------------------------------
  const isSetup = body !== null && typeof body === "object" && "confirm" in body;
  if (isSetup) {
    const parsed = portalSetPinSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    if (employee.portalPin) {
      // Ganti PIN wajib menyebut PIN lama — tautan saja tidak cukup.
      const current = normalizePin(parsed.data.currentPin ?? "");
      const ok = current !== "" && (await bcrypt.compare(current, employee.portalPin));
      if (!ok) {
        recordFailure(key);
        return badRequest({ currentPin: ["PIN lama salah."] });
      }
    }

    const pin = normalizePin(parsed.data.pin);
    const problem = validatePin(pin);
    if (problem) return badRequest({ pin: [problem] });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { portalPin: await bcrypt.hash(pin, 10), portalPinSetAt: new Date() },
    });
    clearAttempts(key);
    await setPortalCookie(employee.id, token);
    return json({ ok: true, created: !employee.portalPin });
  }

  // --- Masuk dengan PIN -------------------------------------------------------
  const parsed = portalLoginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  if (!employee.portalPin) {
    return NextResponse.json(
      { message: "PIN belum dibuat.", code: "PIN_NOT_SET" },
      { status: 409 }
    );
  }

  const ok = await bcrypt.compare(normalizePin(parsed.data.pin), employee.portalPin);
  if (!ok) {
    recordFailure(key);
    return NextResponse.json({ message: "PIN salah." }, { status: 401 });
  }

  clearAttempts(key);
  await setPortalCookie(employee.id, token);
  return json({ ok: true });
});

/** PUBLIK — keluar dari portal (hapus cookie sesi). */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await ctx.params;
  await clearPortalCookie();
  return json({ ok: true });
});
