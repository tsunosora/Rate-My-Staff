import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import { cekRentang, rencanaSalin, tambahHari, MAKS_SEL_SIMPAN } from "@/lib/services/jadwal-shift/aturan";
import { terapkanSel, GalatJadwal } from "@/lib/services/jadwal-shift/simpan";
import { salinJadwalSchema } from "@/lib/validators/jadwal-shift";

/**
 * POST: salin roster rentang sumber (mis. minggu lalu) ke rentang tujuan sepanjang sama.
 * `timpa` (bawaan): sel tujuan yang tidak punya padanan dikembalikan ke jadwal tetap, jadi hasilnya
 * persis salinan. Karyawan = `employeeIds`, atau semua karyawan aktif (opsional per departemen).
 */
export const POST = route(async (req: Request) => {
  const session = await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = salinJadwalSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const cek = cekRentang(d.dariSumber, d.sampaiSumber);
  if (!cek.ok) return badRequest({ dariSumber: [cek.error] });
  const sampaiTujuan = tambahHari(d.dariTujuan, cek.hari - 1);
  if (!cekRentang(d.dariTujuan, sampaiTujuan).ok) return badRequest({ dariTujuan: ["Tanggal tujuan tidak sah"] });

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(d.employeeIds ? { id: { in: d.employeeIds } } : {}),
      ...(d.departmentId ? { departmentId: d.departmentId } : {}),
    },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length === 0) return badRequest({ employeeIds: ["Tidak ada karyawan yang dipilih"] });

  const [sumber, tujuan] = await Promise.all([
    prisma.jadwalShift.findMany({
      where: { employeeId: { in: employeeIds }, tanggal: { gte: atMidnight(d.dariSumber), lte: atMidnight(d.sampaiSumber) } },
    }),
    prisma.jadwalShift.findMany({
      where: { employeeId: { in: employeeIds }, tanggal: { gte: atMidnight(d.dariTujuan), lte: atMidnight(sampaiTujuan) } },
      select: { employeeId: true, tanggal: true },
    }),
  ]);

  const sel = rencanaSalin({
    employeeIds,
    dariSumber: d.dariSumber,
    dariTujuan: d.dariTujuan,
    jumlahHari: cek.hari,
    sumber: sumber.map((s) => ({
      employeeId: s.employeeId,
      tanggal: toYmd(s.tanggal),
      workScheduleId: s.workScheduleId,
      libur: s.libur,
      catatan: s.catatan,
    })),
    tujuanAda: tujuan.map((t) => ({ employeeId: t.employeeId, tanggal: toYmd(t.tanggal) })),
    timpa: d.timpa,
  });
  if (sel.length === 0) return json({ ok: true, disimpan: 0, dihapus: 0, dihitungUlang: 0, kosong: true });
  if (sel.length > MAKS_SEL_SIMPAN) return badRequest({ sel: [`Terlalu banyak sel (${sel.length}); maksimal ${MAKS_SEL_SIMPAN}.`] });

  const user = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  try {
    const hasil = await terapkanSel(prisma, sel, user?.id ?? null);
    return json({ ok: true, ...hasil, kosong: false });
  } catch (e) {
    if (e instanceof GalatJadwal) return badRequest({ sel: [e.message] });
    throw e;
  }
});
