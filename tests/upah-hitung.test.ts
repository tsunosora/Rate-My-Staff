import { describe, expect, test } from "vitest";
import {
  bagianBelumDibayar, hitungBaris, hitungPeriode, nilaiPenyesuaian, resolusiTarif, statusBayar,
  type BarisHitung, type BarisMasuk, type TarifKotaDivisiAktif, type TarifProyek,
} from "@/lib/services/upah/hitung";

const ORANG = { upahHarian: 150_000, upahLemburPerJam: 20_000 };
const PROYEK = new Map<number, TarifProyek>([
  [1, { id: 1, nama: "Pameran Gedung A", upahHarian: 200_000, lemburPerJam: 30_000 }],
  [2, { id: 2, nama: "Proyek tanpa tarif", upahHarian: null, lemburPerJam: null }],
  [3, { id: 3, nama: "Proyek tarif harian saja", upahHarian: 180_000, lemburPerJam: null }],
]);
const KD: TarifKotaDivisiAktif[] = [
  { kota: "Semarang", divisi: "Rigging", upahHarian: 170_000, lemburPerJam: 25_000 },
  { kota: "Solo", divisi: "Las", upahHarian: 160_000, lemburPerJam: 0 },
];

function baris(ubah: Partial<BarisMasuk> = {}): BarisMasuk {
  return { id: 1, tanggal: "2026-10-19", status: "hadir", lemburJam: 0, kota: null, divisi: null, proyekId: null, upahKhusus: null, ...ubah };
}

describe("resolusi tarif", () => {
  test("proyek dengan tarif menang, walau kota×divisi juga cocok", () => {
    const t = resolusiTarif(baris({ proyekId: 1, kota: "Semarang", divisi: "Rigging" }), ORANG, PROYEK, KD);
    expect(t).toEqual({ sumberTarif: "proyek", upahHarian: 200_000, sumberLembur: "proyek", lemburPerJam: 30_000 });
  });

  test("proyek tanpa tarif jatuh ke karyawan — kota×divisi TIDAK dipakai kalau baris punya proyek", () => {
    const t = resolusiTarif(baris({ proyekId: 2, kota: "Semarang", divisi: "Rigging" }), ORANG, PROYEK, KD);
    expect(t.sumberTarif).toBe("karyawan");
    expect(t.upahHarian).toBe(150_000);
  });

  test("kota×divisi tanpa beda huruf besar & spasi", () => {
    const t = resolusiTarif(baris({ kota: " semarang ", divisi: "RIGGING" }), ORANG, PROYEK, KD);
    expect(t).toEqual({ sumberTarif: "kota_divisi", upahHarian: 170_000, sumberLembur: "kota_divisi", lemburPerJam: 25_000 });
  });

  test("kota×divisi butuh keduanya terisi", () => {
    expect(resolusiTarif(baris({ kota: "Semarang" }), ORANG, PROYEK, KD).sumberTarif).toBe("karyawan");
    expect(resolusiTarif(baris({ divisi: "Rigging" }), ORANG, PROYEK, KD).sumberTarif).toBe("karyawan");
  });

  test("tanpa tarif apa pun → kosong, nol", () => {
    const t = resolusiTarif(baris(), { upahHarian: null, upahLemburPerJam: null }, PROYEK, KD);
    expect(t).toEqual({ sumberTarif: "kosong", upahHarian: 0, sumberLembur: "kosong", lemburPerJam: 0 });
  });

  test("lembur kosong di sumber terpilih jatuh ke tarif lembur orang", () => {
    expect(resolusiTarif(baris({ proyekId: 3 }), ORANG, PROYEK, KD)).toMatchObject({
      sumberTarif: "proyek", upahHarian: 180_000, sumberLembur: "karyawan", lemburPerJam: 20_000,
    });
    // Lembur kota×divisi bawaannya 0 (kolom tidak bisa null) = dianggap kosong.
    expect(resolusiTarif(baris({ kota: "Solo", divisi: "Las" }), ORANG, PROYEK, KD)).toMatchObject({
      sumberTarif: "kota_divisi", sumberLembur: "karyawan", lemburPerJam: 20_000,
    });
  });

  test("upah harian orang 0 dianggap belum diatur", () => {
    expect(resolusiTarif(baris(), { upahHarian: 0, upahLemburPerJam: null }, PROYEK, KD).sumberTarif).toBe("kosong");
  });
});

describe("upah satu baris", () => {
  test("hadir penuh + lembur", () => {
    const h = hitungBaris(baris({ lemburJam: 2 }), ORANG, PROYEK, KD);
    expect([h.upahPokok, h.upahLembur, h.upah]).toEqual([150_000, 40_000, 190_000]);
    expect(h.tarifKosong).toBe(false);
  });

  test("setengah hari = 0,5×", () => {
    expect(hitungBaris(baris({ status: "setengah" }), ORANG, PROYEK, KD).upah).toBe(75_000);
  });

  test("lembur dibayar walau absen; upah khusus tidak", () => {
    const h = hitungBaris(baris({ status: "absen", lemburJam: 3, upahKhusus: 50_000 }), ORANG, PROYEK, KD);
    expect([h.upahPokok, h.upahLembur, h.upahKhusus, h.upah]).toEqual([0, 60_000, 0, 60_000]);
  });

  test("upah khusus ditambahkan untuk hadir & setengah", () => {
    expect(hitungBaris(baris({ upahKhusus: 25_000, upahKhususCatatan: "Ketinggian" }), ORANG, PROYEK, KD)).toMatchObject({
      upahKhusus: 25_000, upah: 175_000, upahKhususCatatan: "Ketinggian",
    });
    expect(hitungBaris(baris({ status: "setengah", upahKhusus: 25_000 }), ORANG, PROYEK, KD).upah).toBe(100_000);
  });

  test("status tak dikenal dibaca absen", () => {
    expect(hitungBaris(baris({ status: "ngawur" }), ORANG, PROYEK, KD).status).toBe("absen");
  });

  test("tarif belum diatur ditandai: hadir tanpa tarif, atau lembur tanpa tarif lembur", () => {
    const tanpa = { upahHarian: null, upahLemburPerJam: null };
    expect(hitungBaris(baris(), tanpa, PROYEK, KD)).toMatchObject({ upah: 0, tarifKosong: true, sumberTarif: "kosong" });
    expect(hitungBaris(baris({ status: "absen" }), tanpa, PROYEK, KD).tarifKosong).toBe(false);
    expect(hitungBaris(baris({ lemburJam: 1 }), { upahHarian: 100_000, upahLemburPerJam: null }, PROYEK, KD).tarifKosong).toBe(true);
  });

  test("dibulatkan ke rupiah utuh per baris, dari jumlah mentahnya", () => {
    const ganjil = { upahHarian: 100_001, upahLemburPerJam: 10_000.5 };
    const h = hitungBaris(baris({ status: "setengah", lemburJam: 1 }), ganjil, PROYEK, KD);
    // 50.000,5 + 10.000,5 = 60.001 utuh — bukan 50.001 + 10.001 = 60.002.
    expect(h.upah).toBe(60_001);
    expect(Number.isInteger(h.upahPokok) && Number.isInteger(h.upahLembur)).toBe(true);
    expect(hitungBaris(baris({ lemburJam: 1.25 }), { upahHarian: 100_000, upahLemburPerJam: 15_001 }, PROYEK, KD).upah).toBe(118_751);
  });
});

describe("periode", () => {
  const dasar = {
    dari: "2026-10-19",
    sampai: "2026-10-25",
    karyawan: ORANG,
    proyek: PROYEK,
    kotaDivisi: KD,
  };

  test("total = Σ baris + bonus + tunjangan − potongan − kasbon", () => {
    const h = hitungPeriode({
      ...dasar,
      baris: [baris({ id: 1 }), baris({ id: 2, tanggal: "2026-10-20", status: "setengah", lemburJam: 1 }), baris({ id: 3, tanggal: "2026-10-21", status: "absen" })],
      penyesuaian: [
        { id: 1, tanggal: "2026-10-20", jenis: "bonus", jumlah: 10_000, catatan: null },
        { id: 2, tanggal: "2026-10-20", jenis: "tunjangan", jumlah: 5_000, catatan: null },
        { id: 3, tanggal: "2026-10-21", jenis: "potongan", jumlah: 7_000, catatan: null },
        { id: 4, tanggal: "2026-10-22", jenis: "kasbon", jumlah: 20_000, catatan: "pinjam" },
        { id: 5, tanggal: "2026-10-22", jenis: "aneh", jumlah: 999, catatan: null },
      ],
    });
    expect(h.ringkas).toMatchObject({
      hadir: 1, setengah: 1, absen: 1, lemburJam: 1, upahPokok: 225_000, upahLembur: 20_000, penyesuaian: -12_000,
      total: 150_000 + 95_000 + 10_000 + 5_000 - 7_000 - 20_000,
    });
    expect(h.penyesuaian).toHaveLength(4);
  });

  test("nilai penyesuaian bertanda dan utuh", () => {
    expect(nilaiPenyesuaian("bonus", 1_000.4)).toBe(1_000);
    expect(nilaiPenyesuaian("kasbon", 1_000)).toBe(-1_000);
    expect(nilaiPenyesuaian("potongan", -500)).toBe(-500);
  });

  test("baris yang sudah dibayar memakai salinan saat dibayar, bukan tarif sekarang", () => {
    const lama: BarisHitung = { ...hitungBaris(baris({ id: 9 }), { upahHarian: 120_000, upahLemburPerJam: null }, PROYEK, KD), pembayaranId: 4 };
    const h = hitungPeriode({ ...dasar, baris: [baris({ id: 9, pembayaranId: 4 }), baris({ id: 10, tanggal: "2026-10-20" })], penyesuaian: [], beku: new Map([[9, lama]]) });
    expect(h.baris.map((b) => b.upah)).toEqual([120_000, 150_000]);
    expect(h.ringkas.total).toBe(270_000);
  });

  test("bagian belum dibayar & status bayar", () => {
    const h = hitungPeriode({
      ...dasar,
      baris: [baris({ id: 1, pembayaranId: 7 }), baris({ id: 2, tanggal: "2026-10-20" })],
      penyesuaian: [{ id: 1, tanggal: "2026-10-20", jenis: "kasbon", jumlah: 50_000, catatan: null }],
    });
    expect(statusBayar(h)).toBe("sebagian");
    const sisa = bagianBelumDibayar(h);
    expect(sisa.baris.map((b) => b.id)).toEqual([2]);
    expect(sisa.ringkas.total).toBe(100_000);
    expect(statusBayar(hitungPeriode({ ...dasar, baris: [], penyesuaian: [] }))).toBe("kosong");
    expect(statusBayar(hitungPeriode({ ...dasar, baris: [baris()], penyesuaian: [] }))).toBe("belum");
    expect(statusBayar(hitungPeriode({ ...dasar, baris: [baris({ pembayaranId: 1 })], penyesuaian: [] }))).toBe("lunas");
  });

  test("baris diurutkan per tanggal", () => {
    const h = hitungPeriode({ ...dasar, baris: [baris({ id: 2, tanggal: "2026-10-21" }), baris({ id: 1, tanggal: "2026-10-19" })], penyesuaian: [] });
    expect(h.baris.map((b) => b.tanggal)).toEqual(["2026-10-19", "2026-10-21"]);
  });
});
