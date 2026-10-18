import { describe, expect, test } from "vitest";
import {
  cariBentrok,
  cekMenit,
  cekTanggalLembur,
  keputusanTarik,
  MAKS_MENIT,
  menitDariJam,
  menitDariRentang,
  menitLemburStruk,
  pilihBarisPulang,
  statusPenerapan,
  teksDurasi,
  tentukanDurasi,
  ymdSah,
} from "@/lib/services/lembur/aturan";

describe("menitDariJam", () => {
  test("jam sah", () => {
    expect(menitDariJam("00:00")).toBe(0);
    expect(menitDariJam("17:30")).toBe(1050);
    expect(menitDariJam("23:59")).toBe(1439);
  });
  test("jam tidak sah", () => {
    expect(menitDariJam("24:00")).toBeNull();
    expect(menitDariJam("12:60")).toBeNull();
    expect(menitDariJam("7:00")).toBeNull();
    expect(menitDariJam("")).toBeNull();
  });
});

describe("menitDariRentang", () => {
  test("hari yang sama", () => {
    expect(menitDariRentang("17:00", "19:30")).toEqual({ ok: true, nilai: 150 });
  });
  test("lewat tengah malam", () => {
    expect(menitDariRentang("22:00", "02:00")).toEqual({ ok: true, nilai: 240 });
    expect(menitDariRentang("23:45", "00:15")).toEqual({ ok: true, nilai: 30 });
  });
  test("mulai == selesai ditolak", () => {
    expect(menitDariRentang("18:00", "18:00").ok).toBe(false);
  });
  test("format salah ditolak", () => {
    expect(menitDariRentang("18.00", "20:00").ok).toBe(false);
  });
});

describe("tentukanDurasi", () => {
  test("rentang mengalahkan angka menit yang ikut dikirim", () => {
    expect(tentukanDurasi({ mulai: "17:00", selesai: "18:00", menit: 999 })).toEqual({
      ok: true,
      nilai: { menit: 60, mulai: "17:00", selesai: "18:00" },
    });
  });
  test("cuma menit", () => {
    expect(tentukanDurasi({ menit: 90 })).toEqual({ ok: true, nilai: { menit: 90, mulai: null, selesai: null } });
  });
  test("string kosong dianggap tidak diisi", () => {
    expect(tentukanDurasi({ mulai: "", selesai: "", menit: 45 }).ok).toBe(true);
  });
  test("cuma satu jam diisi ditolak", () => {
    expect(tentukanDurasi({ mulai: "17:00", menit: 60 }).ok).toBe(false);
    expect(tentukanDurasi({ selesai: "17:00" }).ok).toBe(false);
  });
  test("tanpa jam dan tanpa menit ditolak", () => {
    expect(tentukanDurasi({}).ok).toBe(false);
    expect(tentukanDurasi({ menit: null }).ok).toBe(false);
  });
  test("melewati batas atas ditolak (termasuk dari rentang)", () => {
    expect(tentukanDurasi({ menit: MAKS_MENIT + 1 }).ok).toBe(false);
    // 06:00 → 05:00 keesokan hari = 23 jam
    expect(tentukanDurasi({ mulai: "06:00", selesai: "05:00" }).ok).toBe(false);
  });
});

describe("cekMenit", () => {
  test("batas", () => {
    expect(cekMenit(0).ok).toBe(false);
    expect(cekMenit(1).ok).toBe(true);
    expect(cekMenit(MAKS_MENIT).ok).toBe(true);
    expect(cekMenit(1.5).ok).toBe(false);
  });
});

describe("cekTanggalLembur", () => {
  const hariIni = "2026-10-18";
  test("hari ini sah", () => {
    expect(cekTanggalLembur(hariIni, hariIni, 7).ok).toBe(true);
  });
  test("mundur tepat 7 hari sah, 8 hari ditolak", () => {
    expect(cekTanggalLembur("2026-10-11", hariIni, 7).ok).toBe(true);
    expect(cekTanggalLembur("2026-10-10", hariIni, 7).ok).toBe(false);
  });
  test("melintasi akhir bulan", () => {
    expect(cekTanggalLembur("2026-09-28", "2026-10-03", 7).ok).toBe(true);
  });
  test("masa depan ditolak", () => {
    expect(cekTanggalLembur("2026-10-19", hariIni, 7).ok).toBe(false);
  });
  test("tanggal tidak ada di kalender ditolak", () => {
    expect(ymdSah("2026-02-30")).toBe(false);
    expect(cekTanggalLembur("2026-02-30", "2026-03-02", 7).ok).toBe(false);
  });
  test("batas admin lebih panjang", () => {
    expect(cekTanggalLembur("2026-08-20", hariIni, 62).ok).toBe(true);
  });
});

describe("cariBentrok", () => {
  const daftar = [
    { id: 1, tanggal: "2026-10-17", status: "rejected" },
    { id: 2, tanggal: "2026-10-17", status: "cancelled" },
    { id: 3, tanggal: "2026-10-16", status: "pending" },
    { id: 4, tanggal: "2026-10-15", status: "approved" },
  ];
  test("ditolak/dibatalkan tidak menghalangi", () => {
    expect(cariBentrok(daftar, "2026-10-17")).toBeNull();
  });
  test("menunggu & disetujui menghalangi", () => {
    expect(cariBentrok(daftar, "2026-10-16")?.id).toBe(3);
    expect(cariBentrok(daftar, "2026-10-15")?.id).toBe(4);
  });
  test("diri sendiri diabaikan", () => {
    expect(cariBentrok(daftar, "2026-10-16", 3)).toBeNull();
  });
});

describe("pilihBarisPulang", () => {
  const d = (h: number) => new Date(2026, 9, 17, h, 0, 0);
  test("scan pulang terakhir dipilih, scan masuk diabaikan", () => {
    const baris = [
      { id: 1, scanDate: d(8), scanType: "in" },
      { id: 2, scanDate: d(17), scanType: "out" },
      { id: 3, scanDate: d(20), scanType: "out" },
      { id: 4, scanDate: d(21), scanType: "in" },
    ];
    expect(pilihBarisPulang(baris)?.id).toBe(3);
  });
  test("tanpa scan pulang = null", () => {
    expect(pilihBarisPulang([{ id: 1, scanDate: d(8), scanType: "in" }])).toBeNull();
    expect(pilihBarisPulang([])).toBeNull();
  });
});

describe("keputusanTarik", () => {
  test("nilai masih yang ditulis persetujuan → dinolkan", () => {
    expect(keputusanTarik(90, 90)).toEqual({ ubah: true, nilai: 0 });
  });
  test("sudah diubah manual → dibiarkan", () => {
    expect(keputusanTarik(120, 90)).toEqual({ ubah: false, alasan: "diubah_manual", nilaiSekarang: 120 });
    expect(keputusanTarik(0, 90).ubah).toBe(false);
  });
});

describe("statusPenerapan", () => {
  test("tiga keadaan", () => {
    expect(statusPenerapan(null, 60)).toBe("belum_ada_scan_pulang");
    expect(statusPenerapan(60, 60)).toBe("diterapkan");
    expect(statusPenerapan(0, 60)).toBe("berbeda");
  });
});

describe("menitLemburStruk", () => {
  test("ambil yang lebih besar, tidak dijumlah", () => {
    expect(menitLemburStruk(30, 120)).toBe(120);
    expect(menitLemburStruk(150, 120)).toBe(150);
    expect(menitLemburStruk(0, 0)).toBe(0);
    expect(menitLemburStruk(-5, 0)).toBe(0);
  });
});

describe("teksDurasi", () => {
  test("format", () => {
    expect(teksDurasi(45)).toBe("45 menit");
    expect(teksDurasi(120)).toBe("2 jam");
    expect(teksDurasi(90)).toBe("1 jam 30 menit");
  });
});
