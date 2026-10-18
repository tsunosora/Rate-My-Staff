import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { requirePortalAccess, requirePortalOwner } from "@/lib/services/portal/auth";
import { toYmd } from "@/lib/services/leave/service";
import { timesheetSchema } from "@/lib/validators/timesheet";
import {
  BATAS_MUNDUR_HARI,
  awalMinggu,
  daftarTanggal,
  geserTanggal,
  persenTercatat,
  rapikanRentang,
  sisaBelumTercatat,
} from "@/lib/services/timesheet/aturan";
import {
  hadirPerHari,
  saranProyekUsaha,
  serializeEntri,
  simpanEntri,
  whereRentang,
} from "@/lib/services/timesheet/service";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PORTAL (butuh PIN) — catatan pekerjaan milik karyawan ini dalam satu rentang (bawaan:
 * 14 hari terakhir), plus total per hari dibandingkan jam hadir dari absensi, total minggu
 * ini, dan saran nama proyek.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const { employee, asManager } = await requirePortalAccess(token, req);

  const hariIni = toYmd(new Date());
  const senin = awalMinggu(hariIni);
  const sp = new URL(req.url).searchParams;
  const bawaanDari = geserTanggal(hariIni, -BATAS_MUNDUR_HARI);
  const { dari, sampai } = rapikanRentang(sp.get("dari"), sp.get("sampai"), {
    dari: bawaanDari < senin ? bawaanDari : senin,
    sampai: hariIni,
  });
  // Tanggal depan tidak punya apa pun untuk dicatat; minggu ini tetap dihitung penuh.
  const sampaiEfektif = sampai > hariIni ? hariIni : sampai;
  const dariAmbil = dari < senin ? dari : senin;

  const [entri, hadir, proyek] = await Promise.all([
    prisma.timesheetEntri.findMany({
      where: { employeeId: employee.id, tanggal: whereRentang(dariAmbil, sampaiEfektif) },
      orderBy: [{ tanggal: "desc" }, { mulai: "asc" }],
    }),
    hadirPerHari(prisma, { dari: dariAmbil, sampai: sampaiEfektif, employeeId: employee.id }),
    saranProyekUsaha(prisma),
  ]);

  const items = entri.map(serializeEntri);
  const tercatatPer = new Map<string, number>();
  for (const e of items) tercatatPer.set(e.tanggal, (tercatatPer.get(e.tanggal) ?? 0) + e.menit);
  const hadirPer = new Map(hadir.map((h) => [h.tanggal, h]));

  const hari = daftarTanggal(dariAmbil, sampaiEfektif)
    .reverse()
    .map((t) => {
      const tercatat = tercatatPer.get(t) ?? 0;
      const h = hadirPer.get(t);
      const menitHadir = h?.menit ?? 0;
      return {
        tanggal: t,
        tercatat,
        hadir: menitHadir,
        jamMasuk: h?.jamMasuk ?? null,
        jamPulang: h?.jamPulang ?? null,
        persen: persenTercatat(tercatat, menitHadir),
        belumTercatat: sisaBelumTercatat(tercatat, menitHadir),
      };
    });

  const mingguIni = hari
    .filter((h) => h.tanggal >= senin)
    .reduce((s, h) => ({ tercatat: s.tercatat + h.tercatat, hadir: s.hadir + h.hadir }), {
      tercatat: 0,
      hadir: 0,
    });

  return json({
    hariIni,
    batasMundurHari: BATAS_MUNDUR_HARI,
    batasTanggal: geserTanggal(hariIni, -BATAS_MUNDUR_HARI),
    bisaMenulis: !asManager,
    dari: dariAmbil,
    sampai: sampaiEfektif,
    items,
    hari,
    mingguIni: { awal: senin, ...mingguIni, persen: persenTercatat(mingguIni.tercatat, mingguIni.hadir) },
    proyek,
  });
});

/** PORTAL (butuh PIN) — catat satu pekerjaan. */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token, req);

  const parsed = timesheetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const hasil = await simpanEntri(prisma, {
    employeeId: employee.id,
    input: parsed.data,
    sumber: "portal",
  });
  if (!hasil.ok) return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  return json(serializeEntri(hasil.entri), { status: 201 });
});
