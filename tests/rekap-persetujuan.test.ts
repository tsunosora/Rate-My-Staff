import { describe, expect, test } from "vitest";
import {
  alasanTolakSah, bacaRentang, bolehPutus, dariYmd, jumlahHari, mingguDari, rapikanLembur, rentangUpah, teksAtauNull, ymd,
} from "@/lib/services/upah/aturan";
import { putusRekapSchema, setujuiMassalSchema, tambahRekapSchema } from "@/lib/services/upah/skema";
import { fiturUntuk, ATURAN_API, ATURAN_HALAMAN } from "@/lib/lisensi/aturan-jalur";

const hariIni = () => ({ dari: new Date(2026, 9, 18), sampai: new Date(2026, 9, 18) });

describe("rentang tanggal", () => {
  test("bawaan dipakai kalau kosong", () => {
    const r = bacaRentang(null, null, hariIni);
    expect(r).toMatchObject({ dariYmd: "2026-10-18", sampaiYmd: "2026-10-18" });
  });

  test("satu sisi saja = satu hari", () => {
    expect(bacaRentang("2026-10-01", null, hariIni)).toMatchObject({ dariYmd: "2026-10-01", sampaiYmd: "2026-10-01" });
  });

  test("terbalik, tanggal mustahil, dan lebih dari 31 hari ditolak", () => {
    expect(bacaRentang("2026-10-10", "2026-10-01", hariIni)).toHaveProperty("galat");
    expect(bacaRentang("2026-02-30", null, hariIni)).toHaveProperty("galat");
    expect(bacaRentang("2026-10-01", "2026-10-31", hariIni)).not.toHaveProperty("galat");
    expect(bacaRentang("2026-10-01", "2026-11-01", hariIni)).toHaveProperty("galat");
  });

  test("minggu ini Senin–Minggu", () => {
    const m = mingguDari(new Date(2026, 9, 18)); // Minggu
    expect([ymd(m.dari), ymd(m.sampai)]).toEqual(["2026-10-12", "2026-10-18"]);
    const s = mingguDari(new Date(2026, 9, 19)); // Senin
    expect([ymd(s.dari), ymd(s.sampai)]).toEqual(["2026-10-19", "2026-10-25"]);
    expect(rentangUpah(null, null, new Date(2026, 9, 22))).toMatchObject({ dariYmd: "2026-10-19", sampaiYmd: "2026-10-25" });
  });

  test("jumlah hari inklusif, aman lintas bulan", () => {
    expect(jumlahHari(new Date(2026, 9, 30), new Date(2026, 10, 2))).toBe(4);
    expect(dariYmd("2026-10-18")?.getHours()).toBe(0);
  });
});

describe("persetujuan", () => {
  test("baris dibayar terkunci untuk siapa pun", () => {
    expect(bolehPutus({ persetujuan: "disetujui", pembayaranId: 3 }, "tolak").ok).toBe(false);
    expect(bolehPutus({ persetujuan: "menunggu", pembayaranId: 3 }, "setujui").ok).toBe(false);
  });

  test("keputusan boleh dibalik selama belum dibayar, tapi tidak diulang", () => {
    expect(bolehPutus({ persetujuan: "menunggu", pembayaranId: null }, "setujui").ok).toBe(true);
    expect(bolehPutus({ persetujuan: "ditolak", pembayaranId: null }, "setujui").ok).toBe(true);
    expect(bolehPutus({ persetujuan: "disetujui", pembayaranId: null }, "tolak").ok).toBe(true);
    expect(bolehPutus({ persetujuan: "disetujui", pembayaranId: null }, "setujui").ok).toBe(false);
  });

  test("alasan tolak wajib", () => {
    expect(alasanTolakSah("  ")).toBeNull();
    expect(alasanTolakSah("ok")).toBeNull();
    expect(alasanTolakSah("  tidak   hadir ")).toBe("tidak hadir");
    expect(putusRekapSchema.safeParse({ aksi: "tolak", versi: "x" }).success).toBe(false);
  });

  test("ubah admin tidak bisa mengganti sumber atau orangnya", () => {
    const p = putusRekapSchema.safeParse({ aksi: "ubah", versi: "x", status: "setengah", lemburJam: 2, sumber: "admin", employeeId: 9 });
    expect(p.success).toBe(true);
    expect(p.success && "sumber" in p.data).toBe(false);
    expect(p.success && "employeeId" in p.data).toBe(false);
  });

  test("status & lembur dibatasi", () => {
    expect(tambahRekapSchema.safeParse({ employeeId: 1, tanggal: "2026-10-18", status: "libur", lemburJam: 0 }).success).toBe(false);
    expect(tambahRekapSchema.safeParse({ employeeId: 1, tanggal: "2026-10-18", status: "hadir", lemburJam: 25 }).success).toBe(false);
    expect(rapikanLembur("1,5")).toBe(1.5);
    expect(rapikanLembur(-1)).toBeNull();
  });

  test("setujui massal wajib membawa waktu daftar dimuat", () => {
    expect(setujuiMassalSchema.safeParse({ dari: "2026-10-18", sampai: "2026-10-18" }).success).toBe(false);
    expect(setujuiMassalSchema.safeParse({ dari: "2026-10-18", sampai: "2026-10-18", timId: "tanpa", dimuatAt: "2026-10-18T01:00:00Z" }).success).toBe(true);
  });

  test("teks kosong jadi null", () => {
    expect(teksAtauNull("   ", 10)).toBeNull();
    expect(teksAtauNull(" Semarang  Barat ", 100)).toBe("Semarang Barat");
  });
});

describe("peta lisensi jalur yang dipakai", () => {
  test("persetujuan rekap = hr.absen_hp, rupiah = hr.upah", () => {
    expect(fiturUntuk("/api/rekap-tim", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/api/rekap-tim/12", ATURAN_API)).toBe("hr.absen_hp");
    expect(fiturUntuk("/api/upah/3/bayar", ATURAN_API)).toBe("hr.upah");
    expect(fiturUntuk("/api/upah/pembayaran/3", ATURAN_API)).toBe("hr.upah");
    expect(fiturUntuk("/attendance/rekap-tim", ATURAN_HALAMAN)).toBe("hr.absen_hp");
    expect(fiturUntuk("/upah/7", ATURAN_HALAMAN)).toBe("hr.upah");
  });
});
