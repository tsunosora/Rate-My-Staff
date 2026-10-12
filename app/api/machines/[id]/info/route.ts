import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { alamatUtama, jenisAlamat } from "@/lib/services/fingerspot/kontak-mesin";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Info Mesin — yang DILIHAT server dari kontak mesin itu sendiri, tanpa mengirim perintah apa pun
 * ke mesin. Pengganti tombol "Info mesin" di software resmi Fingerspot: dipakai untuk memastikan
 * mesin benar-benar tersambung, lewat alamat mana, dan apakah scan-nya masih masuk.
 */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const m = await prisma.machine.findUnique({ where: { id: Number(id) } });
  if (!m) return json({ message: "Mesin tidak ditemukan." }, { status: 404 });

  const sekarang = Date.now();
  const sejamLalu = new Date(sekarang - 60 * 60 * 1000);

  const [kontakSejam, glog, enrolled] = await Promise.all([
    prisma.fingerspotRawLog.count({ where: { snMachine: m.sn, createdAt: { gte: sejamLalu } } }),
    prisma.fingerspotRawLog.findFirst({
      where: { snMachine: m.sn, rawBody: { path: "$.request_code", equals: "realtime_glog" } },
      orderBy: { id: "desc" },
      select: { pin: true, rawBody: true, createdAt: true },
    }),
    prisma.machineEnrollment.count({ where: { machineId: m.id } }),
  ]);

  let scanTerakhir: null | { pin: string | null; nama: string | null; jamMesin: string | null; diterima: Date } = null;
  if (glog) {
    const io = String(((glog.rawBody as { data?: { io_time?: unknown } })?.data?.io_time) ?? "");
    const p = io.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    const map = glog.pin
      ? await prisma.machineEnrollment.findUnique({
          where: { machineId_pin: { machineId: m.id, pin: glog.pin } },
          select: { employee: { select: { fullName: true } } },
        })
      : null;
    scanTerakhir = {
      pin: glog.pin,
      nama: map?.employee.fullName ?? null,
      // Jam menurut mesin itu sendiri (bukan jam server) — kalau beda jauh dari "diterima",
      // jam mesinnya yang perlu disetel.
      jamMesin: p ? `${p[3]}/${p[2]}/${p[1]} ${p[4]}.${p[5]}.${p[6]}` : null,
      diterima: glog.createdAt,
    };
  }

  const utama = alamatUtama();
  return json({
    id: m.id,
    nama: m.name,
    sn: m.sn,
    mode: m.mode,
    lanIp: m.ip,
    lanPort: m.port,
    terakhirKontak: m.lastSeenAt,
    detikSejakKontak: m.lastSeenAt ? Math.max(0, Math.round((sekarang - m.lastSeenAt.getTime()) / 1000)) : null,
    alamat: m.lastHost,
    jenisAlamat: jenisAlamat(m.lastHost, utama),
    alamatUtama: utama,
    ipPublik: m.lastIp,
    kontakSejam,
    karyawanTerdaftar: enrolled,
    scanTerakhir,
  });
});
