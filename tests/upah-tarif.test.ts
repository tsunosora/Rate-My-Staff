import { describe, expect, test } from "vitest";
import {
  UPAH_HARIAN_MAKS, bolehHapusProyek, cariDuplikat, kunciNama, kunciSel, namaUnik, pesanGalat, rapikanNama,
  susunMatriks, validasiProyek, validasiTarifKotaDivisi, validasiTarifOpsional,
} from "@/lib/services/upah-tarif/aturan";
import { bolehJadiPic, rapikanWarna } from "@/lib/services/tim-kerja-admin/aturan";

describe("upah tarif — nama kota & divisi", () => {
  test("spasi berlebih dirapikan, huruf besar dipertahankan", () => {
    expect(rapikanNama("  Jakarta   Selatan ")).toBe("Jakarta Selatan");
    expect(rapikanNama(null)).toBe("");
  });
  test("kunci pembanding tanpa beda huruf besar", () => {
    expect(kunciNama(" JAKARTA  selatan")).toBe(kunciNama("jakarta Selatan"));
  });
});

describe("upah tarif — validasi", () => {
  const sah = { kota: "Jakarta", divisi: "Tukang", upahHarian: 150_000, lemburPerJam: 20_000 };
  test("tarif wajar lolos", () => {
    expect(validasiTarifKotaDivisi(sah)).toEqual([]);
  });
  test("nol boleh (tukang magang / lembur tidak dibayar)", () => {
    expect(validasiTarifKotaDivisi({ ...sah, upahHarian: 0, lemburPerJam: 0 })).toEqual([]);
  });
  test("minus ditolak", () => {
    expect(validasiTarifKotaDivisi({ ...sah, upahHarian: -1 })[0]).toMatchObject({ kolom: "upahHarian" });
  });
  test("lebih dari 10 juta/hari ditolak sebagai salah ketik", () => {
    expect(validasiTarifKotaDivisi({ ...sah, upahHarian: UPAH_HARIAN_MAKS })).toEqual([]);
    const g = validasiTarifKotaDivisi({ ...sah, upahHarian: UPAH_HARIAN_MAKS + 1 });
    expect(pesanGalat(g)).toMatch(/terlalu besar/);
  });
  test("NaN ditolak", () => {
    expect(validasiTarifKotaDivisi({ ...sah, lemburPerJam: Number.NaN })[0]).toMatchObject({ kolom: "lemburPerJam" });
  });
  test("kota / divisi kosong ditolak", () => {
    const g = validasiTarifKotaDivisi({ ...sah, kota: "  ", divisi: "" });
    expect(g.map((x) => x.kolom)).toEqual(["kota", "divisi"]);
  });
  test("tarif opsional: kosong boleh, isi tetap dijaga", () => {
    expect(validasiTarifOpsional({ upahHarian: null, lemburPerJam: undefined })).toEqual([]);
    expect(validasiTarifOpsional({ upahHarian: 20_000_000 })).toHaveLength(1);
  });
});

describe("upah tarif — duplikat", () => {
  const daftar = [
    { id: 1, kota: "Jakarta", divisi: "Tukang" },
    { id: 2, kota: "Bandung", divisi: "Tukang" },
  ];
  test("beda huruf besar tetap dianggap sama", () => {
    expect(cariDuplikat(daftar, " jakarta ", "TUKANG")?.id).toBe(1);
  });
  test("baris yang sedang diubah tidak dianggap duplikat dirinya sendiri", () => {
    expect(cariDuplikat(daftar, "Jakarta", "Tukang", 1)).toBeNull();
  });
  test("kombinasi baru lolos", () => {
    expect(cariDuplikat(daftar, "Jakarta", "Listrik")).toBeNull();
  });
});

describe("upah tarif — proyek", () => {
  test("selesai sebelum mulai ditolak", () => {
    const g = validasiProyek({ nama: "Pameran", mulai: new Date(2026, 9, 10), selesai: new Date(2026, 9, 9) });
    expect(g[0]).toMatchObject({ kolom: "selesai" });
  });
  test("hari yang sama boleh", () => {
    expect(validasiProyek({ nama: "Pameran", mulai: new Date(2026, 9, 10), selesai: new Date(2026, 9, 10) })).toEqual([]);
  });
  test("nama wajib", () => {
    expect(validasiProyek({ nama: " " })[0]).toMatchObject({ kolom: "nama" });
  });
  test("belum dipakai rekap → boleh dihapus", () => {
    expect(bolehHapusProyek(0)).toEqual({ boleh: true });
  });
  test("sudah dipakai rekap → tidak boleh, sarankan nonaktifkan", () => {
    const p = bolehHapusProyek(3);
    expect(p.boleh).toBe(false);
    if (!p.boleh) expect(p.pesan).toMatch(/Nonaktifkan/);
  });
});

describe("upah tarif — matriks", () => {
  test("baris kota × kolom divisi, ejaan berbeda digabung", () => {
    const m = susunMatriks([
      { id: 1, kota: "Jakarta", divisi: "Tukang", upahHarian: 150_000, lemburPerJam: 20_000, aktif: true },
      { id: 2, kota: "bandung", divisi: "Listrik", upahHarian: 140_000, lemburPerJam: 18_000, aktif: false },
      { id: 3, kota: "JAKARTA", divisi: "Listrik", upahHarian: 160_000, lemburPerJam: 22_000, aktif: true },
    ]);
    expect(m.kota).toEqual(["bandung", "Jakarta"]);
    expect(m.divisi).toEqual(["Listrik", "Tukang"]);
    expect(m.sel[kunciSel("jakarta", "listrik")]?.id).toBe(3);
    expect(m.sel[kunciSel("Bandung", "Tukang")]).toBeUndefined();
  });
  test("nama unik untuk saran isian", () => {
    expect(namaUnik(["Tukang", " tukang ", null, "", "Cat"])).toEqual(["Cat", "Tukang"]);
  });
});

describe("tim kerja (admin) — kepala tim", () => {
  const aktif = { isActive: true, deletedAt: null };
  test("karyawan aktif yang belum memimpin tim boleh jadi PIC", () => {
    expect(bolehJadiPic({ timTujuanId: 1, karyawan: aktif, memimpinTim: null })).toEqual({ ok: true });
  });
  test("sudah PIC tim ini → tetap boleh (simpan ulang aman)", () => {
    expect(bolehJadiPic({ timTujuanId: 1, karyawan: aktif, memimpinTim: { id: 1, nama: "Tim A" } }).ok).toBe(true);
  });
  test("sudah PIC tim lain → ditolak, sebut timnya", () => {
    const p = bolehJadiPic({ timTujuanId: 1, karyawan: aktif, memimpinTim: { id: 2, nama: "Tim B" } });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.pesan).toMatch(/Tim B/);
  });
  test("nonaktif / terhapus ditolak", () => {
    expect(bolehJadiPic({ timTujuanId: 1, karyawan: { isActive: false, deletedAt: null }, memimpinTim: null }).ok).toBe(false);
    expect(bolehJadiPic({ timTujuanId: 1, karyawan: { isActive: true, deletedAt: new Date() }, memimpinTim: null }).ok).toBe(false);
  });
  test("warna tim: hex 6 digit, selain itu bawaan", () => {
    expect(rapikanWarna("#AABBCC")).toBe("#aabbcc");
    expect(rapikanWarna("merah")).toBe("#6366f1");
    expect(rapikanWarna(null)).toBe("#6366f1");
  });
});
