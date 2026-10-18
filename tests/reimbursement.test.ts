import { describe, expect, test } from "vitest";
import {
  JUMLAH_MAKS,
  MAKS_MUNDUR_HARI,
  bolehDibatalkanKaryawan,
  cekJumlah,
  cekTanggal,
  jumlahBerlaku,
  parseJumlah,
  rencanakan,
  rentangBulan,
  ringkas,
} from "@/lib/services/reimbursement/aturan";
import { klaimPortalSchema, keputusanSchema } from "@/lib/validators/reimbursement";

const NOW = new Date("2026-10-18T10:00:00");

describe("cekTanggal", () => {
  test("hari ini & kemarin sah", () => {
    expect(cekTanggal("2026-10-18", "2026-10-18").ok).toBe(true);
    expect(cekTanggal("2026-10-17", "2026-10-18").ok).toBe(true);
  });
  test("masa depan ditolak", () => {
    expect(cekTanggal("2026-10-19", "2026-10-18")).toMatchObject({ ok: false });
  });
  test("batas mundur tepat 60 hari sah, 61 ditolak (melintasi bulan)", () => {
    expect(MAKS_MUNDUR_HARI).toBe(60);
    expect(cekTanggal("2026-08-19", "2026-10-18").ok).toBe(true);
    expect(cekTanggal("2026-08-18", "2026-10-18")).toMatchObject({ ok: false });
  });
  test("tanggal yang tidak ada ditolak", () => {
    expect(cekTanggal("2026-02-30", "2026-10-18").ok).toBe(false);
    expect(cekTanggal("18-10-2026", "2026-10-18").ok).toBe(false);
  });
});

describe("parseJumlah & cekJumlah", () => {
  test("format Indonesia & polos", () => {
    expect(parseJumlah("15.000")).toBe(15000);
    expect(parseJumlah("1.250.000")).toBe(1250000);
    expect(parseJumlah("15000")).toBe(15000);
    expect(parseJumlah("Rp 25.500")).toBe(25500);
    expect(parseJumlah("12500,50")).toBe(12500.5);
    expect(parseJumlah(7000)).toBe(7000);
  });
  test("sampah ditolak", () => {
    expect(parseJumlah("abc")).toBeNull();
    expect(parseJumlah("")).toBeNull();
    expect(parseJumlah("-5000")).toBeNull();
    expect(parseJumlah("1.2.3")).toBeNull();
    expect(parseJumlah(NaN)).toBeNull();
  });
  test("batas jumlah", () => {
    expect(cekJumlah(1).ok).toBe(true);
    expect(cekJumlah(JUMLAH_MAKS).ok).toBe(true);
    expect(cekJumlah(JUMLAH_MAKS + 1).ok).toBe(false);
    expect(cekJumlah(0).ok).toBe(false);
    expect(cekJumlah(-1).ok).toBe(false);
    expect(cekJumlah(10.123).ok).toBe(false);
    expect(cekJumlah(null).ok).toBe(false);
  });
});

describe("rencanakan — transisi status", () => {
  const dasar = { jumlah: 100000, now: NOW };

  test("setujui dari menunggu, jumlah bawaan = yang diajukan", () => {
    const r = rencanakan({ ...dasar, status: "menunggu", aksi: "setujui" });
    expect(r).toMatchObject({ ok: true, rencana: { status: "disetujui", jumlahDisetujui: 100000, pemutus: "isi" } });
  });
  test("setujui boleh mengurangi jumlah, tidak boleh menambah", () => {
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "setujui", jumlahDisetujui: 80000 })).toMatchObject({
      ok: true,
      rencana: { jumlahDisetujui: 80000 },
    });
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "setujui", jumlahDisetujui: 100001 }).ok).toBe(false);
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "setujui", jumlahDisetujui: 0 }).ok).toBe(false);
  });
  test("tolak butuh catatan", () => {
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "tolak" }).ok).toBe(false);
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "tolak", catatan: "   " }).ok).toBe(false);
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "tolak", catatan: "Nota buram" })).toMatchObject({
      ok: true,
      rencana: { status: "ditolak", catatanKeputusan: "Nota buram", jumlahDisetujui: null },
    });
  });
  test("setujui/tolak cuma dari menunggu", () => {
    for (const s of ["disetujui", "ditolak", "dibayar"]) {
      expect(rencanakan({ ...dasar, status: s, aksi: "setujui" }).ok).toBe(false);
      expect(rencanakan({ ...dasar, status: s, aksi: "tolak", catatan: "x y z" }).ok).toBe(false);
    }
  });
  test("bayar cuma dari disetujui, tidak menimpa jumlah & catatan persetujuan", () => {
    const r = rencanakan({ ...dasar, status: "disetujui", aksi: "bayar" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rencana.status).toBe("dibayar");
      expect(r.rencana.dibayarAt).toEqual(NOW);
      expect(r.rencana.jumlahDisetujui).toBeUndefined();
      expect(r.rencana.catatanKeputusan).toBeUndefined();
      expect(r.rencana.pemutus).toBe("tetap");
    }
    for (const s of ["menunggu", "ditolak", "dibayar"]) {
      expect(rencanakan({ ...dasar, status: s, aksi: "bayar" }).ok).toBe(false);
    }
  });
  test("buka keputusan: dari disetujui/ditolak kembali menunggu; dibayar & menunggu ditolak", () => {
    for (const s of ["disetujui", "ditolak"]) {
      expect(rencanakan({ ...dasar, status: s, aksi: "buka" })).toMatchObject({
        ok: true,
        rencana: { status: "menunggu", jumlahDisetujui: null, catatanKeputusan: null, pemutus: "kosongkan", dibayarAt: null },
      });
    }
    expect(rencanakan({ ...dasar, status: "dibayar", aksi: "buka" }).ok).toBe(false);
    expect(rencanakan({ ...dasar, status: "menunggu", aksi: "buka" }).ok).toBe(false);
  });
  test("karyawan cuma boleh membatalkan selama menunggu", () => {
    expect(bolehDibatalkanKaryawan("menunggu")).toBe(true);
    for (const s of ["disetujui", "ditolak", "dibayar"]) expect(bolehDibatalkanKaryawan(s)).toBe(false);
  });
});

describe("ringkasan", () => {
  test("disetujui/dibayar memakai jumlah disetujui", () => {
    expect(jumlahBerlaku({ status: "disetujui", jumlah: 100, jumlahDisetujui: 80 })).toBe(80);
    expect(jumlahBerlaku({ status: "menunggu", jumlah: 100, jumlahDisetujui: null })).toBe(100);
    const r = ringkas([
      { status: "menunggu", jumlah: 10000, jumlahDisetujui: null },
      { status: "menunggu", jumlah: 5000.5, jumlahDisetujui: null },
      { status: "dibayar", jumlah: 50000, jumlahDisetujui: 40000 },
      { status: "aneh", jumlah: 1, jumlahDisetujui: null },
    ]);
    expect(r.menunggu).toEqual({ jumlahKlaim: 2, total: 15000.5 });
    expect(r.dibayar).toEqual({ jumlahKlaim: 1, total: 40000 });
    expect(r.ditolak).toEqual({ jumlahKlaim: 0, total: 0 });
  });
});

describe("rentangBulan", () => {
  test("awal bulan sampai awal bulan berikutnya, termasuk Desember", () => {
    const r = rentangBulan("2026-12");
    expect(r?.mulai.getMonth()).toBe(11);
    expect(r?.akhir.getFullYear()).toBe(2027);
    expect(r?.akhir.getMonth()).toBe(0);
    expect(rentangBulan("2026-13")).toBeNull();
    expect(rentangBulan("2026-1")).toBeNull();
  });
});

describe("validator", () => {
  test("klaim portal: jumlah dari teks form diubah jadi angka", () => {
    const p = klaimPortalSchema.safeParse({ tanggal: "2026-10-18", kategori: "parkir", jumlah: "5.000", keterangan: "Parkir klien" });
    expect(p.success && p.data.jumlah).toBe(5000);
  });
  test("kategori tak dikenal & keterangan pendek ditolak", () => {
    expect(klaimPortalSchema.safeParse({ tanggal: "2026-10-18", kategori: "hiburan", jumlah: "5000", keterangan: "abc" }).success).toBe(false);
    expect(klaimPortalSchema.safeParse({ tanggal: "2026-10-18", kategori: "makan", jumlah: "5000", keterangan: "ab" }).success).toBe(false);
  });
  test("keputusan: aksi di luar daftar ditolak", () => {
    expect(keputusanSchema.safeParse({ aksi: "hapus" }).success).toBe(false);
    expect(keputusanSchema.safeParse({ aksi: "setujui", jumlahDisetujui: "75.000" })).toMatchObject({
      success: true,
      data: { jumlahDisetujui: 75000 },
    });
  });
});
