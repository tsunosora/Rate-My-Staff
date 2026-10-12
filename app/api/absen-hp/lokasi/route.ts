import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { lokasiSchema } from "@/lib/services/absen-hp/skema";

/** Lokasi absen HP — rahasia QR TIDAK pernah dikirim ke peramban, cuma alamat layarnya. */
export const GET = route(async () => {
  await requireManager();
  const daftar = await prisma.absenLokasi.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    select: { id: true, nama: true, lat: true, lng: true, radiusM: true, wajibQr: true, layarToken: true, aktif: true },
  });
  return json(daftar);
});

export const POST = route(async (req) => {
  await requireManager();
  const parsed = lokasiSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const l = await prisma.absenLokasi.create({
    data: { ...parsed.data, qrRahasia: randomBytes(32).toString("hex"), layarToken: randomUUID() },
    select: { id: true },
  });
  return json(l, { status: 201 });
});
