import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import { expandDates } from "@/lib/services/leave/range";
import { cekRentang, rencanaIsiMassal, MAKS_SEL_SIMPAN, type SelSimpan } from "@/lib/services/jadwal-shift/aturan";
import { terapkanSel, GalatJadwal } from "@/lib/services/jadwal-shift/simpan";
import { simpanJadwalSchema } from "@/lib/validators/jadwal-shift";

/**
 * GET ?dari=YYYY-MM-DD&sampai=YYYY-MM-DD[&departmentId=]
 * Kisi jadwal: karyawan aktif (+ jadwal tetapnya), baris roster di rentang, daftar jadwal kerja,
 * dan penanda libur nasional / Minggu otomatis. Jadwal efektif per sel dihitung di klien dari
 * data ini dengan aturan yang sama (roster menang, kalau tidak jadwal tetap).
 */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  const dari = sp.get("dari") ?? "";
  const sampai = sp.get("sampai") ?? "";
  const cek = cekRentang(dari, sampai);
  if (!cek.ok) return badRequest({ dari: [cek.error] });
  const departmentId = Number(sp.get("departmentId") ?? "") || null;

  const empWhere: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    isActive: true,
    ...(departmentId ? { departmentId } : {}),
  };

  const [employees, schedules, holidays, autoSundayRaw] = await Promise.all([
    prisma.employee.findMany({
      where: empWhere,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        department: { select: { id: true, name: true } },
        workScheduleId: true,
      },
    }),
    prisma.workSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, startTime: true, endTime: true, isHoliday: true, flexibleHours: true },
    }),
    prisma.holiday.findMany({ where: { date: { gte: atMidnight(dari), lte: atMidnight(sampai) } } }),
    getSetting("auto_sunday_holiday"),
  ]);

  const roster = employees.length
    ? await prisma.jadwalShift.findMany({
        where: {
          employeeId: { in: employees.map((e) => e.id) },
          tanggal: { gte: atMidnight(dari), lte: atMidnight(sampai) },
        },
        include: { workSchedule: { select: { id: true, name: true, deletedAt: true } } },
      })
    : [];

  // Jadwal yang sudah dihapus (soft) tapi masih dirujuk roster lama tetap perlu namanya.
  const known = new Set(schedules.map((s) => s.id));
  const extraIds = [
    ...new Set(
      [...roster.map((r) => r.workScheduleId), ...employees.map((e) => e.workScheduleId)].filter(
        (x): x is number => x != null && !known.has(x)
      )
    ),
  ];
  const extras = extraIds.length
    ? await prisma.workSchedule.findMany({
        where: { id: { in: extraIds } },
        select: { id: true, name: true, startTime: true, endTime: true, isHoliday: true, flexibleHours: true },
      })
    : [];

  const holidayName = new Map(holidays.map((h) => [toYmd(h.date), h.name]));
  const autoSunday = autoSundayRaw === "true";

  return json({
    dari,
    sampai,
    autoSunday,
    tanggal: expandDates(dari, sampai).map((d) => {
      const hari = new Date(`${d}T00:00:00`).getDay();
      return { tanggal: d, hari, liburNasional: holidayName.get(d) ?? null, mingguLibur: autoSunday && hari === 0 };
    }),
    jadwal: [...schedules.map((s) => ({ ...s, dihapus: false })), ...extras.map((s) => ({ ...s, dihapus: true }))],
    karyawan: employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      employeeCode: e.employeeCode,
      department: e.department?.name ?? null,
      departmentId: e.department?.id ?? null,
      workScheduleId: e.workScheduleId,
    })),
    sel: roster.map((r) => ({
      employeeId: r.employeeId,
      tanggal: toYmd(r.tanggal),
      workScheduleId: r.workScheduleId,
      libur: r.libur,
      catatan: r.catatan,
    })),
  });
});

/** PUT: simpan sel (`{sel:[...]}`) atau isi massal (`{massal:{...}}`). */
export const PUT = route(async (req: Request) => {
  const session = await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = simpanJadwalSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  let sel: SelSimpan[];
  if ("sel" in parsed.data) {
    sel = parsed.data.sel;
    for (const s of sel) {
      if (!cekRentang(s.tanggal, s.tanggal).ok) return badRequest({ sel: ["Tanggal tidak sah"] });
    }
  } else {
    const m = parsed.data.massal;
    const cek = cekRentang(m.dari, m.sampai);
    if (!cek.ok) return badRequest({ dari: [cek.error] });
    sel = rencanaIsiMassal({ employeeIds: m.employeeIds, dari: m.dari, sampai: m.sampai, pola: m.pola, hari: m.hari });
  }
  if (sel.length === 0) return badRequest({ sel: ["Tidak ada sel yang diubah"] });
  if (sel.length > MAKS_SEL_SIMPAN) {
    return badRequest({ sel: [`Terlalu banyak sel sekaligus (${sel.length}); maksimal ${MAKS_SEL_SIMPAN}. Perkecil rentang atau jumlah karyawan.`] });
  }

  const user = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;

  try {
    const hasil = await terapkanSel(prisma, sel, user?.id ?? null);
    return json({ ok: true, ...hasil });
  } catch (e) {
    if (e instanceof GalatJadwal) return badRequest({ sel: [e.message] });
    throw e;
  }
});

/** POST = PUT (beberapa klien lebih mudah mengirim POST). */
export const POST = PUT;
