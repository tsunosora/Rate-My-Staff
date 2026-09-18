import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { adminPortalPinSchema } from "@/lib/validators/portal";
import { normalizePin, checkPin, pinWarning, randomPin } from "@/lib/services/portal/pin";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Tetapkan PIN portal karyawan (mis. karyawan lupa PIN).
 * Body `{ pin }` untuk PIN tertentu, atau `{}` agar sistem membuatkan PIN acak.
 * PIN balikan hanya ditampilkan SEKALI — di DB hanya tersimpan hash-nya.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;

  const employee = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: { id: true },
  });
  if (!employee) return notFound("Karyawan tidak ditemukan");

  const parsed = adminPortalPinSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const raw = parsed.data.pin?.trim();
  const pin = raw ? normalizePin(raw) : randomPin();
  const check = checkPin(pin);
  if (!check.valid) return badRequest({ pin: [check.error] });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { portalPin: await bcrypt.hash(pin, 10), portalPinSetAt: new Date() },
  });

  return json({ ok: true, pin, strength: check.strength, warning: pinWarning(check) });
});

/** Kosongkan PIN — karyawan akan diminta membuat PIN baru saat membuka tautannya. */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: { id: true },
  });
  if (!employee) return notFound("Karyawan tidak ditemukan");

  await prisma.employee.update({
    where: { id: employee.id },
    data: { portalPin: null, portalPinSetAt: null },
  });
  return json({ ok: true });
});
