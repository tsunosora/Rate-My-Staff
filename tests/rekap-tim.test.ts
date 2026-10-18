import { describe, expect, test } from "vitest";
import {
  MUNDUR_MAKS_HARI, bersihkanKiriman, bolehBeritahu, bukanAnggota, isiAwal, isiBerubah, normalisasiLembur,
  periksaTanggal, pilihanLembur, pilihanUnik, putuskanBaris, rentangTanggal, type BarisLama, type IsiRekap,
} from "@/lib/services/rekap-tim/aturan";
import { ATURAN_API, bebasHanyaBaca, fiturUntuk } from "@/lib/lisensi/aturan-jalur";

const SEKARANG = new Date(2026, 9, 18, 14, 30);
const ISI: IsiRekap = { status: "hadir", lemburJam: 2, kota: "Semarang", divisi: "Rigging", proyekId: 3 };
const lama = (ubah: Partial<BarisLama> = {}): BarisLama => ({ ...ISI, id: 1, persetujuan: "disetujui", pembayaranId: null, ...ubah });

describe("rekap tim — tanggal", () => {
  test("hari ini boleh", () => {
    expect(periksaTanggal("2026-10-18", SEKARANG)).toMatchObject({ ok: true, ymd: "2026-10-18" });
  });
  test("tanggal = tengah malam LOKAL", () => {
    const t = periksaTanggal("2026-10-18", SEKARANG);
    expect(t.ok && t.tanggal.getTime()).toBe(new Date(2026, 9, 18).getTime());
  });
  test(`mundur ${MUNDUR_MAKS_HARI} hari boleh, ${MUNDUR_MAKS_HARI + 1} tidak`, () => {
    expect(periksaTanggal("2026-10-11", SEKARANG).ok).toBe(true);
    expect(periksaTanggal("2026-10-10", SEKARANG)).toMatchObject({ ok: false, kode: "terlalu_lama" });
  });
  test("masa depan ditolak", () => {
    expect(periksaTanggal("2026-10-19", SEKARANG)).toMatchObject({ ok: false, kode: "masa_depan" });
  });
  test("tanggal palsu & format salah ditolak, bukan digeser", () => {
    expect(periksaTanggal("2026-02-30", new Date(2026, 2, 3))).toMatchObject({ ok: false, kode: "tanggal" });
    expect(periksaTanggal("18-10-2026", SEKARANG)).toMatchObject({ ok: false, kode: "tanggal" });
    expect(periksaTanggal(null, SEKARANG)).toMatchObject({ ok: false });
  });
  test("rentang untuk pemilih tanggal", () => {
    expect(rentangTanggal(SEKARANG)).toEqual({ min: "2026-10-11", max: "2026-10-18" });
  });
});

describe("rekap tim — lembur", () => {
  test("kosong = 0, koma desimal diterima, dibulatkan ke 0,5", () => {
    expect(normalisasiLembur("")).toEqual({ ok: true, jam: 0 });
    expect(normalisasiLembur("1,5")).toEqual({ ok: true, jam: 1.5 });
    expect(normalisasiLembur(2.3)).toEqual({ ok: true, jam: 2.5 });
    expect(normalisasiLembur(15)).toEqual({ ok: true, jam: 15 });
  });
  test("negatif, lebih dari 15, atau bukan angka ditolak", () => {
    expect(normalisasiLembur(-1).ok).toBe(false);
    expect(normalisasiLembur(15.5).ok).toBe(false);
    expect(normalisasiLembur("abc").ok).toBe(false);
  });
  test("pilihan 0..15 per 0,5", () => {
    const p = pilihanLembur();
    expect(p[0]).toBe(0);
    expect(p.at(-1)).toBe(15);
    expect(p).toHaveLength(31);
  });
});

describe("rekap tim — perubahan & persetujuan", () => {
  test("belum ada baris → buat", () => {
    expect(putuskanBaris(null, ISI)).toBe("buat");
  });
  test("disetujui, tidak berubah → tetap (persetujuan dibiarkan)", () => {
    expect(putuskanBaris(lama(), { ...ISI, kota: "  semarang " })).toBe("tetap");
  });
  test.each([
    ["status", { status: "setengah" as const }],
    ["lembur", { lemburJam: 2.5 }],
    ["kota", { kota: "Jakarta" }],
    ["divisi", { divisi: null }],
    ["proyek", { proyekId: null }],
  ])("disetujui lalu %s berubah → ubah (kembali menunggu)", (_n, ubah) => {
    expect(putuskanBaris(lama(), { ...ISI, ...ubah })).toBe("ubah");
  });
  test("sudah dibayar → terkunci, berubah atau tidak", () => {
    expect(putuskanBaris(lama({ pembayaranId: 9 }), { ...ISI, status: "absen" })).toBe("terkunci");
    expect(putuskanBaris(lama({ pembayaranId: 9 }), ISI)).toBe("terkunci");
  });
  test("lembur dibandingkan per setengah jam", () => {
    expect(isiBerubah(ISI, { ...ISI, lemburJam: 2.0000001 })).toBe(false);
  });
});

describe("rekap tim — hanya anggota tim PIC", () => {
  const karyawan = [
    { id: 1, timId: 5, isActive: true, deletedAt: null },
    { id: 2, timId: 5, isActive: true, deletedAt: null },
    { id: 3, timId: 6, isActive: true, deletedAt: null },
    { id: 4, timId: 5, isActive: false, deletedAt: null },
    { id: 7, timId: 5, isActive: true, deletedAt: new Date() },
  ];
  test("semua anggota aktif → kosong", () => {
    expect(bukanAnggota(5, [1, 2], karyawan)).toEqual([]);
  });
  test("tim lain, nonaktif, terhapus, id tebakan → ditolak", () => {
    expect(bukanAnggota(5, [1, 3, 4, 7, 99], karyawan)).toEqual([3, 4, 7, 99]);
  });
});

describe("rekap tim — kiriman HP", () => {
  test("dibersihkan: lembur dinormalkan, teks dirapikan, proyek kosong = null", () => {
    const r = bersihkanKiriman([{ employeeId: 3, status: "hadir", lemburJam: "1,5", kota: "  Semarang  Barat ", divisi: "", proyekId: "" }]);
    expect(r).toEqual({ ok: true, baris: [{ employeeId: 3, status: "hadir", lemburJam: 1.5, kota: "Semarang Barat", divisi: null, proyekId: null }] });
  });
  test("satu orang dua kali → ditolak", () => {
    expect(bersihkanKiriman([{ employeeId: 3, status: "hadir" }, { employeeId: 3, status: "absen" }])).toMatchObject({ ok: false, kode: "dobel" });
  });
  test("status kosong/asing, id salah, proyek salah, daftar kosong → ditolak", () => {
    expect(bersihkanKiriman([{ employeeId: 3 }])).toMatchObject({ ok: false, kode: "status" });
    expect(bersihkanKiriman([{ employeeId: 3, status: "libur" }])).toMatchObject({ ok: false, kode: "status" });
    expect(bersihkanKiriman([{ employeeId: "x", status: "hadir" }])).toMatchObject({ ok: false, kode: "kiriman" });
    expect(bersihkanKiriman([{ employeeId: 3, status: "hadir", proyekId: -1 }])).toMatchObject({ ok: false, kode: "proyek" });
    expect(bersihkanKiriman([])).toMatchObject({ ok: false, kode: "kosong" });
    expect(bersihkanKiriman({})).toMatchObject({ ok: false, kode: "kiriman" });
  });
  test("lembur boleh walau absen (dibayar, sama dengan Event)", () => {
    expect(bersihkanKiriman([{ employeeId: 3, status: "absen", lemburJam: 3 }])).toMatchObject({ ok: true, baris: [{ lemburJam: 3 }] });
  });
});

describe("rekap tim — pilihan & isi awal", () => {
  test("pilihan unik tanpa beda huruf besar, urut abjad, kosong dibuang", () => {
    expect(pilihanUnik(["Semarang", "jakarta"], [null, "semarang", " Jakarta "], ["", "Bandung"])).toEqual(["Bandung", "jakarta", "Semarang"]);
  });
  test("isi awal: tersimpan menang; belum ada → bawaan karyawan, status kosong", () => {
    expect(isiAwal(ISI, { kotaBawaan: "X", divisiBawaan: "Y" })).toEqual(ISI);
    expect(isiAwal(null, { kotaBawaan: "Solo", divisiBawaan: "Las" })).toEqual({ status: null, lemburJam: 0, kota: "Solo", divisi: "Las", proyekId: null });
  });
  test("notifikasi paling banyak sekali per 30 menit", () => {
    const now = SEKARANG.getTime();
    expect(bolehBeritahu(null, now)).toBe(true);
    expect(bolehBeritahu(new Date(now - 10 * 60_000), now)).toBe(false);
    expect(bolehBeritahu(new Date(now - 30 * 60_000), now)).toBe(true);
  });
});

describe("rekap tim — lisensi", () => {
  test("rute HP PIC ikut absen HP; rekap bebas hanya-baca, kelola tidak", () => {
    expect(fiturUntuk("/api/public/absen/abc/tim/rekap", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/api/public/absen/abc/tim/kelola", ATURAN_API)).toBe("hr.absen_hp");
    expect(bebasHanyaBaca("/api/public/absen/abc/tim/rekap")).toBe(true);
    expect(bebasHanyaBaca("/api/public/absen/abc/tim/kelola")).toBe(false);
  });
});
