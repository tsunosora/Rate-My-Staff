import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { employeeUpdateSchema } from "@/lib/validators/employee";
import { wajibBolehMenambah } from "@/lib/lisensi/penjaga";
import { dataLapangan } from "@/lib/services/upah-tarif/karyawan";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
    // portalPin adalah hash PIN portal — jangan pernah ikut keluar ke klien.
    omit: { portalPin: true },
    include: {
      department: true,
      position: true,
      workSchedule: true,
      assessments: {
        where: { deletedAt: null },
        orderBy: { assessmentDate: "desc" },
        take: 10,
      },
    },
  });
  if (!employee) return notFound("Employee not found");
  return json(employee);
});

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const existing = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { timDipimpin: { select: { id: true, nama: true } } },
  });
  if (!existing) return notFound("Employee not found");

  const d = parsed.data;
  const lapangan = await dataLapangan(d);
  if (lapangan.timId !== undefined && lapangan.timId !== existing.timId) {
    // Kepala tim tetap di timnya sendiri — tim tanpa kepala tidak punya yang merekap.
    const dipimpin = existing.timDipimpin;
    if (dipimpin && lapangan.timId !== dipimpin.id) {
      return json({ message: `Karyawan ini kepala tim "${dipimpin.nama}". Ganti kepala tim itu dulu di Pengaturan → Tim Kerja.` }, { status: 409 });
    }
    if (lapangan.timId && !(await prisma.timKerja.findUnique({ where: { id: lapangan.timId }, select: { id: true } }))) {
      return json({ message: "Tim tidak ditemukan." }, { status: 422 });
    }
  }
  // Mengaktifkan kembali karyawan yang nonaktif menambah satu ke hitungan batas lisensi.
  if (d.isActive === true && !existing.isActive) await wajibBolehMenambah("limit.employees");
  const employee = await prisma.employee.update({
    where: { id: Number(id) },
    data: {
      ...(d.fullName !== undefined && { fullName: d.fullName }),
      ...(d.nickname !== undefined && { nickname: d.nickname || null }),
      ...(d.machinePin !== undefined && { machinePin: d.machinePin || null }),
      ...(d.departmentId !== undefined && { departmentId: d.departmentId || null }),
      ...(d.positionId !== undefined && { positionId: d.positionId || null }),
      ...(d.workScheduleId !== undefined && { workScheduleId: d.workScheduleId || null }),
      ...(d.joinDate !== undefined && { joinDate: d.joinDate ? new Date(d.joinDate) : null }),
      ...(d.salary !== undefined && { salary: d.salary ?? null }),
      ...(d.email !== undefined && { email: d.email || null }),
      ...(d.phone !== undefined && { phone: d.phone || null }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.posproUserId !== undefined && { posproUserId: d.posproUserId || null }),
      ...lapangan,
    },
    omit: { portalPin: true },
    include: { department: true, position: true, workSchedule: true, tim: { select: { id: true, nama: true, warna: true } } },
  });
  return json(employee);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const existing = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
  if (!existing) return notFound("Employee not found");

  // Soft delete
  await prisma.employee.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
  return json({ ok: true });
});
