import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Keadaan pendaftaran karyawan dari MESIN, untuk Direktori.
 *
 * Mesin mode CLOUD mengirim sendiri data pendaftaran (realtime_enroll_data) begitu karyawan
 * didaftarkan di mesin — server tidak perlu (dan tidak bisa) menarik apa pun dari IP mesin di toko.
 * Tombol "Sinkron dari Mesin" cuma bermakna untuk mesin mode LAN. Dulu tombol itu tampil untuk
 * semua orang dan gagal "IP mesin belum diatur" di instalasi yang mesinnya cloud (18 Okt 2026).
 */

export type CaraSinkron = "lan" | "cloud" | "kosong";

export type MesinRingkas = { id: number; name: string; mode: string; ip: string | null };

/** "lan" kalau ada mesin LAN ber-IP (atau setelan IP lama), "cloud" kalau cuma mesin cloud. */
export function pilihCaraSinkron(mesin: readonly MesinRingkas[], ipLama: string | null | undefined): CaraSinkron {
  if (mesin.some((m) => m.mode === "lan" && (m.ip ?? "").trim() !== "")) return "lan";
  if ((ipLama ?? "").trim() !== "") return "lan";
  return mesin.length > 0 ? "cloud" : "kosong";
}

export type PinTanpaKaryawan = { machineId: number; mesin: string; pin: string; scan: number; terakhir: Date };

/** Jendela pencarian PIN yang scan tapi belum punya karyawan. */
export const HARI_PERIKSA_PIN = 30;

export async function keadaanPendaftaranMesin(prisma: PrismaClient, ipLama: string | null | undefined) {
  const mesin = await prisma.machine.findMany({
    select: { id: true, name: true, mode: true, ip: true, sn: true, lastSeenAt: true },
    orderBy: { id: "asc" },
  });
  const cara = pilihCaraSinkron(mesin, ipLama);

  // Pendaftaran terakhir yang dikirim mesin cloud. Nama tabel ditulis PascalCase: MySQL di server
  // Linux peka huruf besar.
  const [terakhir] = await prisma.$queryRaw<{ snMachine: string | null; createdAt: Date }[]>(Prisma.sql`
    SELECT snMachine, createdAt FROM FingerspotRawLog
    WHERE JSON_UNQUOTE(JSON_EXTRACT(rawBody, '$.request_code')) = 'realtime_enroll_data'
    ORDER BY createdAt DESC LIMIT 1`);

  const sejak = new Date(Date.now() - HARI_PERIKSA_PIN * 86400000);
  const pin = await prisma.$queryRaw<{ machineId: number; mesin: string; pin: string; scan: bigint; terakhir: Date }[]>(Prisma.sql`
    SELECT m.id AS machineId, m.name AS mesin, r.pin AS pin, COUNT(*) AS scan, MAX(r.createdAt) AS terakhir
    FROM FingerspotRawLog r
    JOIN Machine m ON m.sn = r.snMachine
    LEFT JOIN MachineEnrollment e ON e.machineId = m.id AND e.pin = r.pin
    WHERE r.createdAt >= ${sejak} AND r.pin IS NOT NULL AND r.pin <> '' AND e.id IS NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(r.rawBody, '$.request_code')) = 'realtime_glog'
    GROUP BY m.id, m.name, r.pin
    ORDER BY terakhir DESC
    LIMIT 50`);

  return {
    cara,
    mesin: mesin.map((m) => ({ id: m.id, name: m.name, mode: m.mode, lastSeenAt: m.lastSeenAt })),
    pendaftaranTerakhir: terakhir
      ? { at: terakhir.createdAt, mesin: mesin.find((m) => m.sn === terakhir.snMachine)?.name ?? null }
      : null,
    pinTanpaKaryawan: pin.map((p): PinTanpaKaryawan => ({ ...p, scan: Number(p.scan) })),
  };
}
