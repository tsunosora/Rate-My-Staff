import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { z } from "zod";

/** Daftar mesin absensi (per cabang) + jumlah karyawan terdaftar. */
export const GET = route(async () => {
  await requireSession();
  const machines = await prisma.machine.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { enrollments: true, attendances: true } } },
  });
  return json(
    machines.map((m) => ({
      id: m.id,
      sn: m.sn,
      name: m.name,
      mode: m.mode,
      ip: m.ip,
      port: m.port,
      lastSeenAt: m.lastSeenAt,
      employees: m._count.enrollments,
      attendances: m._count.attendances,
    }))
  );
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  mode: z.enum(["cloud", "lan"]),
  sn: z.string().trim().max(100).optional(),
  ip: z.string().trim().max(64).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
});

/**
 * Daftarkan mesin manual.
 * - cloud: SN opsional (isi kalau tahu SN dari mesin agar langsung ter-link saat push;
 *   kosong = mesin tetap muncul otomatis saat pertama push).
 * - lan: butuh IP (+port); SN opsional (default sintetis dari IP).
 */
export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  if (d.mode === "lan" && !d.ip) return badRequest({ ip: ["IP wajib untuk mode LAN"] });

  const sn = d.sn?.trim() || (d.mode === "lan" ? `lan:${d.ip}` : `manual:${randomUUID().slice(0, 8)}`);
  const existing = await prisma.machine.findUnique({ where: { sn } });
  if (existing) return badRequest({ sn: ["Mesin dengan SN ini sudah terdaftar"] });

  const m = await prisma.machine.create({
    data: {
      sn,
      name: d.name,
      mode: d.mode,
      ip: d.mode === "lan" ? d.ip : null,
      port: d.mode === "lan" ? d.port ?? 5005 : null,
    },
  });
  return json({ id: m.id, sn: m.sn, name: m.name, mode: m.mode }, { status: 201 });
});
