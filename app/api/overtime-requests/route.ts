import type { LeaveStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { lemburAdminSchema } from "@/lib/validators/lembur";
import { toYmd } from "@/lib/services/leave/service";
import { MAKS_MUNDUR_ADMIN } from "@/lib/services/lembur/aturan";
import {
  buatPengajuan,
  statusPenerapanBanyak,
  terapkanLembur,
  PESAN_BELUM_ADA_PULANG,
} from "@/lib/services/lembur/service";

const STATUSES = new Set(["pending", "approved", "rejected", "cancelled"]);

/** Daftar pengajuan lembur untuk owner/manajemen. Saring `status`, `bulan` (YYYY-MM), `employee_id`. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const perPage = 30;

  const status = sp.get("status");
  const employeeId = Number(sp.get("employee_id")) || null;
  const bulan = sp.get("bulan");
  let tanggal: Prisma.DateTimeFilter | undefined;
  if (bulan && /^\d{4}-\d{2}$/.test(bulan)) {
    const [y, m] = bulan.split("-").map(Number);
    tanggal = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  const where: Prisma.PengajuanLemburWhereInput = {
    ...(status && STATUSES.has(status) ? { status: status as LeaveStatus } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(tanggal ? { tanggal } : {}),
  };

  const [items, total, pending] = await Promise.all([
    prisma.pengajuanLembur.findMany({
      where,
      orderBy: [{ status: "asc" }, { tanggal: "desc" }, { id: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        employee: { select: { fullName: true, employeeCode: true, department: { select: { name: true } } } },
        decidedBy: { select: { name: true } },
      },
    }),
    prisma.pengajuanLembur.count({ where }),
    prisma.pengajuanLembur.count({ where: { status: "pending" } }),
  ]);

  const penerapan = await statusPenerapanBanyak(
    prisma,
    items.filter((i) => i.status === "approved")
  );

  // Daftar karyawan aktif untuk isian "Catat lembur" — sekalian di sini supaya halaman Lembur
  // tidak bergantung pada fitur lain (daftar karyawan berhalaman milik hr.employees).
  const karyawan =
    sp.get("with_employees") === "1"
      ? await prisma.employee.findMany({
          where: { deletedAt: null, isActive: true },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : undefined;

  return json({
    karyawan,
    items: items.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department?.name ?? null,
      tanggal: toYmd(r.tanggal),
      mulai: r.mulai,
      selesai: r.selesai,
      menit: r.menit,
      menitDisetujui: r.menitDisetujui,
      alasan: r.alasan,
      status: r.status,
      sumber: r.sumber,
      catatanKeputusan: r.catatanKeputusan,
      decidedAt: r.decidedAt,
      decidedBy: r.decidedBy?.name ?? null,
      createdAt: r.createdAt,
      /** Hanya untuk yang disetujui: diterapkan | belum_ada_scan_pulang | berbeda. */
      penerapan: penerapan.get(r.id) ?? null,
    })),
    total,
    page,
    perPage,
    pending,
  });
});

/** Owner/HR mencatat lembur langsung (sumber "admin"); bawaannya langsung disetujui. */
export const POST = route(async (req: Request) => {
  const session = await requireManager();
  const parsed = lemburAdminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { id: d.employeeId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!employee) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  const hasil = await buatPengajuan(prisma, {
    employee,
    input: d,
    sumber: "admin",
    maksMundur: MAKS_MUNDUR_ADMIN,
  });
  if (!hasil.ok) {
    if (hasil.status === 422) return badRequest({ [hasil.field ?? "form"]: [hasil.message] });
    return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  }

  if (d.setujui === false) return json({ ok: true, id: hasil.pengajuan.id, status: "pending" }, { status: 201 });

  const decider = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  await prisma.pengajuanLembur.update({
    where: { id: hasil.pengajuan.id },
    data: {
      status: "approved",
      menitDisetujui: hasil.pengajuan.menit,
      decidedById: decider?.id ?? null,
      decidedAt: new Date(),
    },
  });
  const terap = await terapkanLembur(prisma, {
    employeeId: employee.id,
    tanggal: d.tanggal,
    menit: hasil.pengajuan.menit,
  });
  return json(
    {
      ok: true,
      id: hasil.pengajuan.id,
      status: "approved",
      penerapan: terap.status,
      peringatan: terap.status === "belum_ada_scan_pulang" ? PESAN_BELUM_ADA_PULANG : null,
    },
    { status: 201 }
  );
});
