import { describe, expect, test } from "vitest";
import { NAMA_TIM_MAKS, bolehKeluarkan, bolehTambahAnggota, namaTimBaru, pilihTimPic, type CalonAnggota } from "@/lib/services/tim-kerja/aturan";

const calon = (ubah: Partial<CalonAnggota> = {}): CalonAnggota => ({ id: 9, isActive: true, deletedAt: null, timId: null, ...ubah });

describe("tim kerja — tambah anggota", () => {
  test("belum punya tim → boleh", () => {
    expect(bolehTambahAnggota(5, calon())).toEqual({ ok: true, sudahAnggota: false });
  });
  test("sudah di tim ini → boleh, tanpa perubahan (ketukan ganda aman)", () => {
    expect(bolehTambahAnggota(5, calon({ timId: 5 }))).toEqual({ ok: true, sudahAnggota: true });
  });
  test("di tim lain → ditolak dengan nama timnya", () => {
    const r = bolehTambahAnggota(5, calon({ timId: 6, namaTimSekarang: "Tim Rigging" }));
    expect(r).toMatchObject({ ok: false, kode: "tim_lain" });
    expect(!r.ok && r.alasan).toBe("Sudah di Tim Rigging. Minta admin memindahkannya.");
  });
  test("admin boleh memindahkan", () => {
    expect(bolehTambahAnggota(5, calon({ timId: 6 }), true)).toEqual({ ok: true, sudahAnggota: false });
  });
  test("tidak ada / nonaktif / terhapus → ditolak", () => {
    expect(bolehTambahAnggota(5, null).ok).toBe(false);
    expect(bolehTambahAnggota(5, calon({ isActive: false })).ok).toBe(false);
    expect(bolehTambahAnggota(5, calon({ deletedAt: new Date() })).ok).toBe(false);
  });
});

describe("tim kerja — keluarkan", () => {
  test("anggota biasa → boleh", () => {
    expect(bolehKeluarkan({ id: 5, picId: 1 }, { id: 9, timId: 5 })).toEqual({ ok: true });
  });
  test("kepala tim → ditolak", () => {
    expect(bolehKeluarkan({ id: 5, picId: 9 }, { id: 9, timId: 5 })).toMatchObject({ ok: false, kode: "kepala_tim" });
  });
  test("bukan anggota tim ini → ditolak", () => {
    expect(bolehKeluarkan({ id: 5, picId: 1 }, { id: 9, timId: 6 })).toMatchObject({ ok: false, kode: "bukan_anggota" });
    expect(bolehKeluarkan({ id: 5, picId: 1 }, null)).toMatchObject({ ok: false });
  });
});

describe("tim kerja — tim PIC", () => {
  test("memimpin tim → tim itu", () => {
    expect(pilihTimPic({ timId: 5, timDipimpinId: 5 })).toEqual({ pakai: 5, perluMasukkanPic: false });
  });
  test("memimpin tapi belum tercatat anggota → masukkan dirinya", () => {
    expect(pilihTimPic({ timId: null, timDipimpinId: 5 })).toEqual({ pakai: 5, perluMasukkanPic: true });
  });
  test("tim yang dipimpin menang atas tim tempat dia anggota", () => {
    expect(pilihTimPic({ timId: 6, timDipimpinId: 5 })).toEqual({ pakai: 5, perluMasukkanPic: false });
  });
  test("anggota tim orang lain → tim itu", () => {
    expect(pilihTimPic({ timId: 6, timDipimpinId: null })).toEqual({ pakai: 6, perluMasukkanPic: false });
  });
  test("belum punya tim → buat", () => {
    expect(pilihTimPic({ timId: null, timDipimpinId: null })).toEqual({ buat: true });
  });
});

describe("tim kerja — nama otomatis", () => {
  test("Tim <nama>, lalu (2), (3) tanpa beda huruf besar", () => {
    expect(namaTimBaru("Budi  Santoso", [])).toBe("Tim Budi Santoso");
    expect(namaTimBaru("Budi", ["tim budi"])).toBe("Tim Budi (2)");
    expect(namaTimBaru("Budi", ["Tim Budi", "Tim Budi (2)"])).toBe("Tim Budi (3)");
  });
  test("nama panjang dipotong supaya muat, akhiran tetap utuh", () => {
    const panjang = "A".repeat(200);
    expect(namaTimBaru(panjang, []).length).toBeLessThanOrEqual(NAMA_TIM_MAKS);
    const kedua = namaTimBaru(panjang, [namaTimBaru(panjang, [])]);
    expect(kedua.endsWith(" (2)")).toBe(true);
    expect(kedua.length).toBeLessThanOrEqual(NAMA_TIM_MAKS);
  });
});
