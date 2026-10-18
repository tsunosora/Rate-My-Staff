import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { klaimAdminSchema } from "@/lib/validators/reimbursement";
import { atMidnight } from "@/lib/services/leave/service";
import { ringkas } from "@/lib/services/reimbursement/aturan";
import { saringan } from "@/lib/services/reimbursement/saring";
import { hapusFoto } from "@/lib/services/reimbursement/simpan";
import { fotoDariForm, medanForm, periksaKlaim, serialisasi } from "@/lib/services/reimbursement/service";

const PER_HALAMAN = 30;

/** Daftar klaim untuk owner + ringkasan per status (mengikuti saringan bulan & karyawan). */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const { where } = saringan(sp);
  // Ringkasan memakai saringan yang sama KECUALI status — supaya chip status tetap menunjukkan
  // angka tiap status walau satu status sedang dipilih.
  const tanpaStatus = new URLSearchParams(sp);
  tanpaStatus.delete("status");

  const [items, total, untukRingkasan, karyawan, menunggu] = await Promise.all([
    prisma.reimbursement.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
      skip: (page - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: {
        employee: { select: { fullName: true, employeeCode: true, department: { select: { name: true } } } },
        decidedBy: { select: { name: true } },
      },
    }),
    prisma.reimbursement.count({ where }),
    prisma.reimbursement.findMany({
      where: saringan(tanpaStatus).where,
      select: { status: true, jumlah: true, jumlahDisetujui: true },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
    prisma.reimbursement.count({ where: { status: "menunggu" } }),
  ]);

  return json({
    items: items.map((r) => ({
      ...serialisasi(r),
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department?.name ?? null,
      decidedBy: r.decidedBy?.name ?? null,
    })),
    total,
    page,
    perPage: PER_HALAMAN,
    menunggu,
    ringkasan: ringkas(
      untukRingkasan.map((r) => ({
        status: r.status,
        jumlah: Number(r.jumlah),
        jumlahDisetujui: r.jumlahDisetujui === null ? null : Number(r.jumlahDisetujui),
      }))
    ),
    karyawan,
  });
});

/** Owner mencatat klaim langsung (sumber "admin"). Multipart; foto opsional. Masuk sebagai menunggu. */
export const POST = route(async (req: Request) => {
  await requireManager();
  const form = await req.formData().catch(() => null);
  if (!form) return badRequest({ formErrors: ["Kiriman tidak terbaca. Coba lagi."] });

  const parsed = klaimAdminSchema.safeParse(
    medanForm(form, ["employeeId", "tanggal", "kategori", "jumlah", "keterangan"])
  );
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const galat = periksaKlaim(parsed.data);
  if (galat) return badRequest(galat);

  const karyawan = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!karyawan) return notFound("Karyawan tidak ditemukan.");

  const foto = await fotoDariForm(form, false);
  if (!foto.ok) return badRequest({ foto: [foto.error] });

  try {
    const created = await prisma.reimbursement.create({
      data: {
        employeeId: karyawan.id,
        tanggal: atMidnight(parsed.data.tanggal),
        kategori: parsed.data.kategori,
        jumlah: parsed.data.jumlah,
        keterangan: parsed.data.keterangan,
        fotoPath: foto.path,
        sumber: "admin",
      },
    });
    return json(serialisasi(created), { status: 201 });
  } catch (e) {
    await hapusFoto(foto.path);
    throw e;
  }
});
