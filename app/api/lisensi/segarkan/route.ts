import { requireAdmin, json, route } from "@/lib/http";
import { segarkanLisensi } from "@/lib/lisensi/layanan";
import { ringkasanLisensi } from "@/lib/lisensi/ringkasan";

/**
 * Segarkan kunci sekarang juga — dipakai sesudah klien membayar / ganti paket, supaya tidak
 * perlu menunggu penyegaran berkala. Boleh saat hanya-baca (lihat aturan-jalur.ts): ini
 * satu-satunya jalan keluarnya.
 */
export const POST = route(async () => {
  await requireAdmin();
  await segarkanLisensi("manual");
  return json(await ringkasanLisensi());
});
