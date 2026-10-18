import { describe, expect, test } from "vitest";
import {
  AKURASI_MAKS_M, JEDA_MENIT, JEDA_NOTIF_MENIT, batasBeritahu, bersihkanHp, bersihkanNamaTempat, bolehBeritahu,
  hitungStatus, periksaGps, periksaPic, putuskanAbsenAnggota, putuskanFreelance, saranTempat, samaHari,
  sesiYangDipakaiUlang, transisi, type MasukanAnggota, type Pic,
} from "@/lib/services/absen-tim/aturan";
import { sidikPerangkat } from "@/lib/services/absen-hp/aturan";
import { bebasHanyaBaca, fiturUntuk, ATURAN_API, ATURAN_HALAMAN } from "@/lib/lisensi/aturan-jalur";

const ID_HP = "perangkat-pic-0123456789abcdef";
const PIC: Pic = { isActive: true, absenHp: true, bisaAbsenTim: true, absenHpPerangkat: null };
const PAGI = new Date(2026, 9, 18, 8, 0, 0);
const NOW = new Date(2026, 9, 18, 9, 0, 0).getTime();
const VENUE = { lat: -6.2, lng: 106.8 };
const geser = (meter: number) => VENUE.lat + meter / 111_320;

function masukan(ubah: Partial<MasukanAnggota> = {}): MasukanAnggota {
  return {
    picId: 1,
    sesi: { picId: 1, mulaiAt: PAGI, ...VENUE },
    anggota: { id: 7, isActive: true, deletedAt: null },
    jenis: "in",
    terakhirSamaJenis: null,
    lat: geser(40),
    lng: VENUE.lng,
    akurasiM: 20,
    nowMs: NOW,
    ...ubah,
  };
}

describe("absen tim — PIC", () => {
  test("PIC sah dari HP pertama → boleh, HP dikunci", () => {
    expect(periksaPic(PIC, ID_HP)).toEqual({ ok: true, sidik: sidikPerangkat(ID_HP), kunciPerangkat: true });
  });
  test("HP yang sudah terkunci untuk PIC → boleh, tidak dikunci ulang", () => {
    expect(periksaPic({ ...PIC, absenHpPerangkat: sidikPerangkat(ID_HP) }, ID_HP)).toMatchObject({ ok: true, kunciPerangkat: false });
  });
  test("HP lain → ditolak", () => {
    expect(periksaPic({ ...PIC, absenHpPerangkat: sidikPerangkat("hp-lain-0123456789abcdef") }, ID_HP)).toMatchObject({ ok: false, kode: "hp_lain" });
  });
  test.each([
    [{ bisaAbsenTim: false }, "bukan_pic"],
    [{ absenHp: false }, "absen_hp_mati"],
    [{ isActive: false }, "tidak_aktif"],
  ] as const)("%o → %s", (ubah, kode) => {
    expect(periksaPic({ ...PIC, ...ubah }, ID_HP)).toMatchObject({ ok: false, kode });
  });
  test("id perangkat kosong/pendek → ditolak", () => {
    expect(periksaPic(PIC, "pendek")).toMatchObject({ ok: false, kode: "perangkat" });
  });
});

describe("absen tim — sesi", () => {
  test("GPS kabur ditolak, batasnya sama dengan absen HP", () => {
    expect(periksaGps(VENUE.lat, VENUE.lng, AKURASI_MAKS_M).ok).toBe(true);
    expect(periksaGps(VENUE.lat, VENUE.lng, AKURASI_MAKS_M + 1)).toMatchObject({ ok: false, kode: "kabur" });
    expect(periksaGps(NaN, VENUE.lng, 10)).toMatchObject({ ok: false, kode: "lokasi_kosong" });
  });
  test("nama tempat dirapikan, kosong ditolak", () => {
    expect(bersihkanNamaTempat("  JCC   Hall B ")).toEqual({ ok: true, nama: "JCC Hall B" });
    expect(bersihkanNamaTempat(" ")).toMatchObject({ ok: false, kode: "tempat_kosong" });
    expect(bersihkanNamaTempat("x".repeat(151))).toMatchObject({ ok: false, kode: "tempat_panjang" });
  });
  test("sesi hari ini bernama sama dipakai ulang (abaikan huruf besar & spasi), bukan dobel", () => {
    const daftar = [{ id: 3, namaTempat: "JCC Hall B", mulaiAt: PAGI }];
    expect(sesiYangDipakaiUlang(daftar, "jcc  hall b", new Date(NOW))?.id).toBe(3);
    expect(sesiYangDipakaiUlang(daftar, "ICE BSD", new Date(NOW))).toBeNull();
    const kemarin = [{ id: 2, namaTempat: "JCC Hall B", mulaiAt: new Date(2026, 9, 17, 8) }];
    expect(sesiYangDipakaiUlang(kemarin, "JCC Hall B", new Date(NOW))).toBeNull();
  });
  test("saran tempat: terbaru dulu, tanpa dobel", () => {
    expect(saranTempat([{ namaTempat: "JCC" }, { namaTempat: "jcc" }, { namaTempat: "ICE" }, { namaTempat: "JCC " }])).toEqual(["JCC", "ICE"]);
  });
  test("samaHari mengikuti kalender lokal", () => {
    expect(samaHari(new Date(2026, 9, 18, 0, 1), new Date(2026, 9, 18, 23, 59))).toBe(true);
    expect(samaHari(new Date(2026, 9, 18, 23, 59), new Date(2026, 9, 19, 0, 1))).toBe(false);
  });
});

describe("absen tim — mengabsen anggota", () => {
  test("sah → jenis apa adanya + jarak dari titik sesi", () => {
    const k = putuskanAbsenAnggota(masukan());
    expect(k).toMatchObject({ ok: true, jenis: "in" });
    if (k.ok) expect(k.jarakM).toBeGreaterThan(35);
    expect(putuskanAbsenAnggota(masukan({ jenis: "out" }))).toMatchObject({ ok: true, jenis: "out" });
  });
  test("jauh dari titik sesi TIDAK ditolak — tempatnya berpindah, owner yang menilai lewat jarak", () => {
    expect(putuskanAbsenAnggota(masukan({ lat: geser(5000) }))).toMatchObject({ ok: true });
  });
  test("sesi milik PIC lain → ditolak", () => {
    expect(putuskanAbsenAnggota(masukan({ sesi: { picId: 2, mulaiAt: PAGI, ...VENUE } }))).toMatchObject({ ok: false, kode: "sesi_lain" });
  });
  test("sesi kemarin → ditolak", () => {
    expect(putuskanAbsenAnggota(masukan({ sesi: { picId: 1, mulaiAt: new Date(2026, 9, 17, 8), ...VENUE } }))).toMatchObject({ ok: false, kode: "sesi_lewat" });
  });
  test("jenis selain in/out → ditolak", () => {
    expect(putuskanAbsenAnggota(masukan({ jenis: "istirahat" }))).toMatchObject({ ok: false, kode: "jenis" });
  });
  test("anggota nonaktif / terhapus / tak ada → ditolak", () => {
    expect(putuskanAbsenAnggota(masukan({ anggota: null }))).toMatchObject({ ok: false, kode: "anggota" });
    expect(putuskanAbsenAnggota(masukan({ anggota: { id: 7, isActive: false, deletedAt: null } }))).toMatchObject({ ok: false, kode: "anggota" });
    expect(putuskanAbsenAnggota(masukan({ anggota: { id: 7, isActive: true, deletedAt: new Date() } }))).toMatchObject({ ok: false, kode: "anggota" });
  });
  test("PIC tidak mengabsen dirinya di sini — itu jalur absen HP biasa", () => {
    expect(putuskanAbsenAnggota(masukan({ anggota: { id: 1, isActive: true, deletedAt: null } }))).toMatchObject({ ok: false, kode: "diri_sendiri" });
  });
  test("jeda ketukan ganda per orang per jenis", () => {
    const baru = new Date(NOW - (JEDA_MENIT * 60 - 5) * 1000);
    const lama = new Date(NOW - (JEDA_MENIT * 60 + 5) * 1000);
    expect(putuskanAbsenAnggota(masukan({ terakhirSamaJenis: baru }))).toMatchObject({ ok: false, kode: "baru_saja" });
    expect(putuskanAbsenAnggota(masukan({ terakhirSamaJenis: lama }))).toMatchObject({ ok: true });
  });
  test("GPS diambil ulang tiap absen dan wajib akurat", () => {
    expect(putuskanAbsenAnggota(masukan({ akurasiM: 500 }))).toMatchObject({ ok: false, kode: "kabur" });
  });
});

describe("absen tim — keputusan owner", () => {
  test("cuma yang menunggu bisa diputus, sekali", () => {
    expect(transisi("menunggu", null, "setujui")).toEqual({ ok: true, ke: "diterima" });
    expect(transisi("menunggu", null, "tolak")).toEqual({ ok: true, ke: "ditolak" });
    expect(transisi("diterima", 9, "tolak")).toMatchObject({ ok: false, kode: "sudah_diputus" });
    expect(transisi("ditolak", null, "setujui")).toMatchObject({ ok: false });
    expect(transisi("menunggu", 9, "setujui")).toMatchObject({ ok: false, kode: "sudah_tercatat" });
  });
  test("hitungan per status", () => {
    expect(hitungStatus([{ status: "menunggu" }, { status: "menunggu" }, { status: "ditolak" }, { status: "aneh" }])).toEqual({ menunggu: 2, diterima: 0, ditolak: 1 });
  });
  test("notifikasi paling banyak sekali per sesi per 30 menit", () => {
    expect(bolehBeritahu(null, NOW)).toBe(true);
    expect(bolehBeritahu(new Date(NOW - 5 * 60_000), NOW)).toBe(false);
    expect(bolehBeritahu(new Date(NOW - JEDA_NOTIF_MENIT * 60_000), NOW)).toBe(true);
    expect(batasBeritahu(NOW).getTime()).toBe(NOW - JEDA_NOTIF_MENIT * 60_000);
  });
});

describe("absen tim — freelance", () => {
  test("nama wajib, HP opsional & dirapikan", () => {
    expect(putuskanFreelance({ nama: "  Budi   Santoso ", hp: "0812-3456-7890", namaAda: [], tetapDaftarkan: false })).toEqual({ ok: true, nama: "Budi Santoso", hp: "081234567890" });
    expect(putuskanFreelance({ nama: "Budi", hp: "", namaAda: [], tetapDaftarkan: false })).toEqual({ ok: true, nama: "Budi", hp: null });
    expect(putuskanFreelance({ nama: " ", hp: null, namaAda: [], tetapDaftarkan: false })).toMatchObject({ ok: false, kode: "nama_kosong" });
  });
  test("nomor HP aneh ditolak", () => {
    expect(bersihkanHp("+62 812 3456 7890")).toEqual({ ok: true, hp: "6281234567890" });
    expect(bersihkanHp("abc")).toMatchObject({ ok: false, kode: "hp_salah" });
  });
  test("nama yang sudah ada ditahan sampai PIC menegaskan orangnya berbeda", () => {
    const m = { nama: "budi santoso", hp: null, namaAda: ["Budi Santoso"] };
    expect(putuskanFreelance({ ...m, tetapDaftarkan: false })).toMatchObject({ ok: false, kode: "nama_ada", namaAda: true });
    expect(putuskanFreelance({ ...m, tetapDaftarkan: true })).toMatchObject({ ok: true });
  });
});

describe("absen tim — lisensi", () => {
  test("API & halaman tim ikut add-on absen HP, tanpa kode fitur baru", () => {
    expect(fiturUntuk("/api/absen-tim", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/api/absen-tim/3/setujui", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/api/public/absen/abc/tim/absen", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/attendance/absen-tim", ATURAN_HALAMAN)).toBe("hr.absen_hp");
  });
  test("data kehadiran tetap masuk saat hanya-baca, pendaftaran freelance tidak", () => {
    expect(bebasHanyaBaca("/api/public/absen/abc/tim/sesi")).toBe(true);
    expect(bebasHanyaBaca("/api/public/absen/abc/tim/absen")).toBe(true);
    expect(bebasHanyaBaca("/api/public/absen/abc/tim/freelance")).toBe(false);
    expect(bebasHanyaBaca("/api/absen-tim/3/setujui")).toBe(false);
  });
});
