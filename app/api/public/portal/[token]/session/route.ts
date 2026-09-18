import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { canAttempt, recordFailure, clearAttempts, sweep } from "@/lib/rate-limit";
import { requireEmployeeByToken, setPortalCookie, clearPortalCookie } from "@/lib/services/portal/auth";
import { normalizePin, checkPin, pinWarning } from "@/lib/services/portal/pin";
import { portalLoginSchema, portalSetPinSchema } from "@/lib/validators/portal";
import { posproPinAvailable, verifyPosproPin } from "@/lib/services/pospro/client";

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
    const check = checkPin(pin);
    // Hanya format yang menggagalkan. PIN lemah tetap disimpan, tapi karyawan
    // diberi tahu bahwa PIN-nya mudah ditebak.
    if (!check.valid) return badRequest({ pin: [check.error] });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { portalPin: await bcrypt.hash(pin, 10), portalPinSetAt: new Date() },
    });
    clearAttempts(key);
    await setPortalCookie(employee.id, token);
    return json({
      ok: true,
      created: !employee.portalPin,
      strength: check.strength,
      warning: pinWarning(check),
    });
  }

  // --- Masuk dengan PIN -------------------------------------------------------
  // Dua PIN diterima: PIN portal (dibuat di sini) dan PIN PosPro (PIN desainer/piket),
  // supaya karyawan tak perlu mengingat dua PIN.
  const parsed = portalLoginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const pin = normalizePin(parsed.data.pin);
  const localOk = employee.portalPin ? await bcrypt.compare(pin, employee.portalPin) : false;
  // PosPro hanya ditanya bila PIN lokal tidak cocok — hemat panggilan & tetap jalan
  // walau PosPro sedang mati (verifyPosproPin mengembalikan false, bukan melempar).
  const ok = localOk || (await verifyPosproPin(employee.posproUserId, pin));

  if (!ok) {
    recordFailure(key);
    // "PIN belum dibuat" hanya benar bila memang tak ada PIN mana pun. Kalau karyawan
    // punya PIN PosPro, kegagalan di sini artinya PIN-nya salah — bukan belum ada.
    if (!employee.portalPin && !(await posproPinAvailable(employee.posproUserId))) {
      return NextResponse.json(
        { message: "PIN belum dibuat.", code: "PIN_NOT_SET" },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "PIN salah." }, { status: 401 });
  }

  clearAttempts(key);
  await setPortalCookie(employee.id, token);
  return json({ ok: true, via: localOk ? "portal" : "pospro" });
});

/** PUBLIK — keluar dari portal (hapus cookie sesi). */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await ctx.params;
  await clearPortalCookie();
  return json({ ok: true });
});
