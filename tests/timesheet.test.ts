import { describe, expect, test } from "vitest";
import {
  BATAS_MUNDUR_HARI,
  MAKS_RENTANG_HARI,
  awalMinggu,
  cariTumpangTindih,
  daftarTanggal,
  jamKeMenit,
  masihBisaDiubah,
  menitHadir,
  menitKeJam,
  periksaRentangJam,
  periksaTanggal,
  persenTercatat,
  rapikanProyek,
  rapikanRentang,
  rekapPerKaryawan,
  rekapPerProyek,
  saranProyek,
  selesaiTerakhir,
  sisaBelumTercatat,
} from "@/lib/services/timesheet/aturan";

describe("jamKeMenit / menitKeJam", () => {
  test("jam sah", () => {
    expect(jamKeMenit("00:00")).toBe(0);
    expect(jamKeMenit("09:30")).toBe(570);
    expect(jamKeMenit("23:59")).toBe(1439);
    expect(menitKeJam(570)).toBe("09:30");
  });
  test("jam tidak sah ditolak", () => {
    for (const j of ["9:30", "24:00", "12:60", "", "ab:cd", "12.30"]) expect(jamKeMenit(j)).toBeNull();
    expect(jamKeMenit(null)).toBeNull();
  });
});

describe("periksaRentangJam", () => {
  test("durasi dihitung", () => {
    expect(periksaRentangJam("08:00", "10:15")).toEqual({ ok: true, menit: 135 });
  });
  test("selesai harus setelah mulai", () => {
    expect(periksaRentangJam("10:00", "10:00").ok).toBe(false);
    expect(periksaRentangJam("22:00", "02:00").ok).toBe(false);
  });
  test("lebih dari 16 jam ditolak", () => {
    expect(periksaRentangJam("00:00", "16:00").ok).toBe(true);
    expect(periksaRentangJam("00:00", "16:01").ok).toBe(false);
  });
  test("format salah", () => {
    expect(periksaRentangJam("8:00", "10:00").ok).toBe(false);
  });
});

describe("periksaTanggal", () => {
  const hariIni = "2026-10-18";
  test("hari ini & batas mundur boleh", () => {
    expect(periksaTanggal(hariIni, hariIni).ok).toBe(true);
    expect(periksaTanggal("2026-10-04", hariIni).ok).toBe(true); // tepat 14 hari
  });
  test("lebih dari batas & tanggal depan ditolak", () => {
    expect(periksaTanggal("2026-10-03", hariIni).ok).toBe(false);
    expect(periksaTanggal("2026-10-19", hariIni).ok).toBe(false);
  });
  test("owner tanpa batas mundur, tetap tanpa tanggal depan", () => {
    expect(periksaTanggal("2026-01-01", hariIni, { tanpaBatasMundur: true }).ok).toBe(true);
    expect(periksaTanggal("2026-10-19", hariIni, { tanpaBatasMundur: true }).ok).toBe(false);
  });
  test("masihBisaDiubah mengikuti batas yang sama", () => {
    expect(BATAS_MUNDUR_HARI).toBe(14);
    expect(masihBisaDiubah("2026-10-04", hariIni)).toBe(true);
    expect(masihBisaDiubah("2026-10-03", hariIni)).toBe(false);
  });
});

describe("cariTumpangTindih", () => {
  const lain = [
    { id: 1, mulai: "08:00", selesai: "10:00" },
    { id: 2, mulai: "13:00", selesai: "15:00" },
  ];
  test("bersentuhan bukan tumpang-tindih", () => {
    expect(cariTumpangTindih({ mulai: "10:00", selesai: "13:00" }, lain)).toBeNull();
  });
  test("beririsan terdeteksi", () => {
    expect(cariTumpangTindih({ mulai: "09:30", selesai: "11:00" }, lain)?.id).toBe(1);
    expect(cariTumpangTindih({ mulai: "07:00", selesai: "16:00" }, lain)?.id).toBe(1);
    expect(cariTumpangTindih({ mulai: "14:00", selesai: "14:30" }, lain)?.id).toBe(2);
  });
  test("entri yang sedang disunting diabaikan", () => {
    expect(cariTumpangTindih({ mulai: "08:30", selesai: "09:30" }, lain, 1)).toBeNull();
  });
});

describe("selesaiTerakhir & saranProyek", () => {
  test("ambil jam selesai paling akhir", () => {
    expect(selesaiTerakhir([{ mulai: "13:00", selesai: "15:00" }, { mulai: "08:00", selesai: "10:00" }])).toBe("15:00");
    expect(selesaiTerakhir([])).toBeNull();
  });
  test("proyek dirapikan, unik tanpa peduli huruf, paling sering di depan", () => {
    expect(rapikanProyek("  Booth   Pameran ")).toBe("Booth Pameran");
    expect(
      saranProyek([
        { proyek: "booth pameran", tanggal: "2026-10-01" },
        { proyek: "Booth Pameran", tanggal: "2026-10-02" },
        { proyek: "Booth Pameran", tanggal: "2026-10-03" },
        { proyek: "Kalender", tanggal: "2026-10-10" },
        { proyek: "", tanggal: "2026-10-10" },
      ])
    ).toEqual(["Booth Pameran", "Kalender"]);
  });
});

describe("tanggal & rentang", () => {
  test("awalMinggu = Senin", () => {
    expect(awalMinggu("2026-10-18")).toBe("2026-10-12"); // Minggu
    expect(awalMinggu("2026-10-12")).toBe("2026-10-12"); // Senin
    expect(awalMinggu("2026-10-14")).toBe("2026-10-12");
    expect(awalMinggu("2026-11-01")).toBe("2026-10-26");
  });
  test("daftarTanggal inklusif", () => {
    expect(daftarTanggal("2026-09-30", "2026-10-02")).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });
  test("rapikanRentang: bawaan, dibalik, dipotong", () => {
    const bawaan = { dari: "2026-10-01", sampai: "2026-10-18" };
    expect(rapikanRentang(null, "salah", bawaan)).toEqual(bawaan);
    expect(rapikanRentang("2026-10-10", "2026-10-01", bawaan)).toEqual({ dari: "2026-10-01", sampai: "2026-10-10" });
    const r = rapikanRentang("2025-01-01", "2026-10-18", bawaan);
    expect(daftarTanggal(r.dari, r.sampai)).toHaveLength(MAKS_RENTANG_HARI);
  });
});

describe("menitHadir & persen", () => {
  test("masuk & pulang lengkap", () => {
    expect(menitHadir("08:00", "17:00")).toBe(540);
  });
  test("baru masuk: dihitung sampai sekarang hanya untuk hari ini", () => {
    expect(menitHadir("08:00", null, { hariIni: true, menitSekarang: 10 * 60 })).toBe(120);
    expect(menitHadir("08:00", null, { hariIni: false, menitSekarang: 10 * 60 })).toBe(0);
  });
  test("tanpa scan masuk = 0", () => {
    expect(menitHadir(null, "17:00")).toBe(0);
  });
  test("persen & sisa", () => {
    expect(persenTercatat(270, 540)).toBe(50);
    expect(persenTercatat(100, 0)).toBeNull();
    expect(sisaBelumTercatat(270, 540)).toBe(270);
    expect(sisaBelumTercatat(600, 540)).toBe(0);
  });
});

describe("rekap", () => {
  const entri = [
    { employeeId: 1, tanggal: "2026-10-12", menit: 240, proyek: "Booth A" },
    { employeeId: 1, tanggal: "2026-10-12", menit: 180, proyek: "booth a" },
    { employeeId: 1, tanggal: "2026-10-19", menit: 60, proyek: "" },
    { employeeId: 2, tanggal: "2026-10-13", menit: 120, proyek: "Kalender" },
  ];
  const hadir = [
    { employeeId: 1, tanggal: "2026-10-12", menit: 480 },
    { employeeId: 2, tanggal: "2026-10-13", menit: 0 },
    { employeeId: 3, tanggal: "2026-10-13", menit: 300 },
  ];

  test("per karyawan: total, hari, minggu", () => {
    const r = rekapPerKaryawan(entri, hadir);
    const k1 = r.find((x) => x.employeeId === 1)!;
    expect(k1.tercatat).toBe(480);
    expect(k1.hadir).toBe(480);
    expect(k1.persen).toBe(100);
    expect(k1.jumlahEntri).toBe(3);
    expect(k1.hari.map((h) => h.tanggal)).toEqual(["2026-10-12", "2026-10-19"]);
    expect(k1.minggu).toEqual([
      { awal: "2026-10-12", tercatat: 420, hadir: 480, persen: 88 },
      { awal: "2026-10-19", tercatat: 60, hadir: 0, persen: null },
    ]);
    const k2 = r.find((x) => x.employeeId === 2)!;
    expect(k2.persen).toBeNull(); // hadir 0 tidak bisa dibandingkan
    const k3 = r.find((x) => x.employeeId === 3)!; // hadir tanpa catatan tetap muncul
    expect(k3).toMatchObject({ tercatat: 0, hadir: 300, persen: 0, jumlahEntri: 0 });
  });

  test("per proyek: gabung tanpa peduli huruf, urut jam terbanyak", () => {
    const p = rekapPerProyek(entri);
    expect(p[0]).toEqual({
      proyek: "Booth A",
      menit: 420,
      jumlahEntri: 2,
      karyawan: [{ employeeId: 1, menit: 420 }],
    });
    expect(p.map((x) => x.proyek)).toEqual(["Booth A", "Kalender", ""]);
  });
});
