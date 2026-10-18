import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { notifyManagers } from "@/lib/notify";
import { requirePortalSession, requirePortalOwner } from "@/lib/services/portal/auth";
import { klaimPortalSchema } from "@/lib/validators/reimbursement";
import { atMidnight } from "@/lib/services/leave/service";
import { LABEL_KATEGORI } from "@/lib/services/reimbursement/aturan";
import { hapusFoto } from "@/lib/services/reimbursement/simpan";
import { fotoDariForm, medanForm, periksaKlaim, serialisasi } from "@/lib/services/reimbursement/service";

type Ctx = { params: Promise<{ token: string }> };

/** PORTAL (butuh PIN) — riwayat klaim reimbursement milik karyawan ini. */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token, req);
  const items = await prisma.reimbursement.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    take: 50,
  });
  return json({ items: items.map(serialisasi) });
});

/**
 * PORTAL (butuh PIN, karyawannya sendiri) — ajukan klaim. Multipart: tanggal, kategori, jumlah,
 * keterangan, foto (wajib). Aturan diperiksa DULU, foto baru disimpan — klaim yang ditolak tidak
 * meninggalkan berkas di disk.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token, req);

  const form = await req.formData().catch(() => null);
  if (!form) return badRequest({ formErrors: ["Kiriman tidak terbaca. Coba lagi."] });

  const parsed = klaimPortalSchema.safeParse(medanForm(form, ["tanggal", "kategori", "jumlah", "keterangan"]));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const galat = periksaKlaim(parsed.data);
  if (galat) return badRequest(galat);

  const foto = await fotoDariForm(form, true);
  if (!foto.ok) return badRequest({ foto: [foto.error] });

  let created;
  try {
    created = await prisma.reimbursement.create({
      data: {
        employeeId: employee.id,
        tanggal: atMidnight(parsed.data.tanggal),
        kategori: parsed.data.kategori,
        jumlah: parsed.data.jumlah,
        keterangan: parsed.data.keterangan,
        fotoPath: foto.path,
        sumber: "portal",
      },
    });
  } catch (e) {
    await hapusFoto(foto.path);
    throw e;
  }

  // Lonceng notifikasi merender data.title + data.message apa adanya.
  await notifyManagers("reimbursement", {
    title: `Klaim reimbursement: ${employee.fullName}`,
    message: `${LABEL_KATEGORI[parsed.data.kategori]} Rp${parsed.data.jumlah.toLocaleString("id-ID")} · nota ${parsed.data.tanggal}`,
    reimbursementId: created.id,
    employeeId: employee.id,
    employeeName: employee.fullName,
    kategori: parsed.data.kategori,
    kategoriLabel: LABEL_KATEGORI[parsed.data.kategori],
    jumlah: parsed.data.jumlah,
    tanggal: parsed.data.tanggal,
  });

  return json(serialisasi(created), { status: 201 });
});
