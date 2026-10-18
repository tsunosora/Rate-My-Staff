import { describe, expect, test } from "vitest";
import {
  AKURASI_MAKS_M,
  BATAS_TERBUKA_JAM,
  durasiMenit,
  jarakMasukKeluar,
  masihTerbuka,
  penandaKunjungan,
  periksaTitik,
  putuskanMulai,
  putuskanSelesai,
  ringkasPerKaryawan,
  saranNamaKlien,
  statusKunjungan,
  tautanPeta,
  type KunjunganUntukPenanda,
} from "@/lib/services/kunjungan/aturan";
import { mulaiKunjunganSchema, saringKunjunganSchema, selesaiKunjunganSchema } from "@/lib/validators/kunjungan";

const NOW = 1_800_000_000_000;
const menitLalu = (m: number) => new Date(NOW - m * 60_000);
const TITIK = { lat: -6.99, lng: 110.42, akurasiM: 20 };
// ~0,0009° lintang ≈ 100 m
const geser = (meter: number) => TITIK.lat + meter / 111_320;

function kunjungan(ubah: Partial<KunjunganUntukPenanda> = {}): KunjunganUntukPenanda {
  return {
    masukAt: menitLalu(60),
    keluarAt: menitLalu(20),
    masukLat: TITIK.lat,
    masukLng: TITIK.lng,
    keluarLat: TITIK.lat,
    keluarLng: TITIK.lng,
    masukAkurasiM: 20,
    keluarAkurasiM: 25,
    ...ubah,
  };
}

describe("periksaTitik", () => {
  test("titik sah", () => expect(periksaTitik(TITIK)).toBeNull());
  test("NaN / di luar bumi ditolak", () => {
    expect(periksaTitik({ ...TITIK, lat: NaN })?.kode).toBe("lokasi_kosong");
    expect(periksaTitik({ ...TITIK, lat: 91 })?.kode).toBe("lokasi_kosong");
    expect(periksaTitik({ ...TITIK, lng: -181 })?.kode).toBe("lokasi_kosong");
  });
  test("akurasi sampai batas diterima, lewat ditolak", () => {
    expect(periksaTitik({ ...TITIK, akurasiM: AKURASI_MAKS_M })).toBeNull();
    expect(periksaTitik({ ...TITIK, akurasiM: AKURASI_MAKS_M + 1 })?.kode).toBe("kabur");
  });
});

describe("putuskanMulai", () => {
  test("tanpa kunjungan terbuka → boleh, nama dirapikan", () => {
    const k = putuskanMulai({ namaKlien: "  Toko   Maju  Jaya ", titik: TITIK, terbuka: null, nowMs: NOW });
    expect(k).toEqual({ ok: true, namaKlien: "Toko Maju Jaya" });
  });
  test("masih ada kunjungan terbuka → ditolak, menyebut kliennya", () => {
    const k = putuskanMulai({
      namaKlien: "Klien B",
      titik: TITIK,
      terbuka: { id: 7, namaKlien: "Klien A", masukAt: menitLalu(30), keluarAt: null },
      nowMs: NOW,
    });
    expect(k.ok).toBe(false);
    if (!k.ok) {
      expect(k.kode).toBe("masih_terbuka");
      expect(k.alasan).toContain("Klien A");
    }
  });
  test("kunjungan terbuka lewat batas jam tidak menahan yang baru", () => {
    const k = putuskanMulai({
      namaKlien: "Klien B",
      titik: TITIK,
      terbuka: { id: 7, namaKlien: "Klien A", masukAt: menitLalu(BATAS_TERBUKA_JAM * 60 + 1), keluarAt: null },
      nowMs: NOW,
    });
    expect(k.ok).toBe(true);
  });
  test("pemeriksaan terbuka didahulukan dari isian", () => {
    const k = putuskanMulai({
      namaKlien: "",
      titik: { ...TITIK, akurasiM: 999 },
      terbuka: { id: 1, namaKlien: "Klien A", masukAt: menitLalu(5), keluarAt: null },
      nowMs: NOW,
    });
    expect(!k.ok && k.kode).toBe("masih_terbuka");
  });
  test("nama kosong/terlalu panjang & GPS kabur ditolak", () => {
    expect(putuskanMulai({ namaKlien: " a ", titik: TITIK, terbuka: null, nowMs: NOW }).ok).toBe(false);
    expect(putuskanMulai({ namaKlien: "x".repeat(151), titik: TITIK, terbuka: null, nowMs: NOW }).ok).toBe(false);
    const kabur = putuskanMulai({ namaKlien: "Klien", titik: { ...TITIK, akurasiM: 300 }, terbuka: null, nowMs: NOW });
    expect(!kabur.ok && kabur.kode).toBe("kabur");
  });
});

describe("putuskanSelesai", () => {
  const terbuka = { masukAt: menitLalu(30), keluarAt: null };
  test("sah", () => {
    expect(putuskanSelesai({ kunjungan: terbuka, titik: TITIK, hasil: "deal", nowMs: NOW })).toEqual({ ok: true, hasil: "deal" });
  });
  test("tidak ada / sudah selesai / kedaluwarsa", () => {
    expect(putuskanSelesai({ kunjungan: null, titik: TITIK, hasil: "deal", nowMs: NOW })).toMatchObject({ kode: "tidak_ada" });
    expect(
      putuskanSelesai({ kunjungan: { masukAt: menitLalu(30), keluarAt: menitLalu(1) }, titik: TITIK, hasil: "deal", nowMs: NOW }),
    ).toMatchObject({ kode: "sudah_selesai" });
    expect(
      putuskanSelesai({
        kunjungan: { masukAt: menitLalu(BATAS_TERBUKA_JAM * 60 + 5), keluarAt: null },
        titik: TITIK,
        hasil: "deal",
        nowMs: NOW,
      }),
    ).toMatchObject({ kode: "kedaluwarsa" });
  });
  test("hasil tak dikenal & GPS kosong ditolak", () => {
    expect(putuskanSelesai({ kunjungan: terbuka, titik: TITIK, hasil: "menang", nowMs: NOW })).toMatchObject({ kode: "hasil" });
    expect(putuskanSelesai({ kunjungan: terbuka, titik: { ...TITIK, lng: NaN }, hasil: "deal", nowMs: NOW })).toMatchObject({
      kode: "lokasi_kosong",
    });
  });
});

describe("status, durasi, jarak", () => {
  test("status", () => {
    expect(statusKunjungan({ masukAt: menitLalu(10), keluarAt: menitLalu(1) }, NOW)).toBe("selesai");
    expect(statusKunjungan({ masukAt: menitLalu(10), keluarAt: null }, NOW)).toBe("berjalan");
    expect(statusKunjungan({ masukAt: menitLalu(BATAS_TERBUKA_JAM * 60 + 1), keluarAt: null }, NOW)).toBe("tidak_selesai");
    expect(masihTerbuka({ masukAt: menitLalu(BATAS_TERBUKA_JAM * 60), keluarAt: null }, NOW)).toBe(true);
  });
  test("durasi menit dibulatkan, null kalau belum selesai, tidak negatif", () => {
    expect(durasiMenit(menitLalu(40), menitLalu(10))).toBe(30);
    expect(durasiMenit(menitLalu(40), null)).toBeNull();
    expect(durasiMenit(menitLalu(10), menitLalu(40))).toBe(0);
  });
  test("jarak masuk–keluar", () => {
    expect(jarakMasukKeluar(kunjungan({ keluarLat: geser(500) }))).toBeGreaterThan(490);
    expect(jarakMasukKeluar(kunjungan({ keluarLat: geser(500) }))).toBeLessThan(510);
    expect(jarakMasukKeluar(kunjungan({ keluarLat: null, keluarLng: null }))).toBeNull();
  });
});

describe("penandaKunjungan", () => {
  const kode = (k: KunjunganUntukPenanda) => penandaKunjungan(k, NOW).map((p) => p.kode);
  test("kunjungan wajar tanpa penanda", () => expect(kode(kunjungan())).toEqual([]));
  test("berpindah > 1 km", () => {
    expect(kode(kunjungan({ keluarLat: geser(1500) }))).toEqual(["jauh"]);
    expect(kode(kunjungan({ keluarLat: geser(900) }))).toEqual([]);
  });
  test("durasi < 3 menit", () => {
    expect(kode(kunjungan({ masukAt: menitLalu(3), keluarAt: menitLalu(1) }))).toEqual(["singkat"]);
    expect(kode(kunjungan({ masukAt: menitLalu(4), keluarAt: menitLalu(1) }))).toEqual([]);
  });
  test("akurasi buruk di titik mana pun", () => {
    expect(kode(kunjungan({ masukAkurasiM: 140 }))).toEqual(["kabur"]);
    expect(kode(kunjungan({ keluarAkurasiM: 120 }))).toEqual(["kabur"]);
  });
  test("terbuka > 12 jam = tidak selesai; yang masih berjalan tanpa penanda", () => {
    expect(kode(kunjungan({ masukAt: menitLalu(13 * 60), keluarAt: null, keluarLat: null, keluarLng: null, keluarAkurasiM: null }))).toEqual([
      "tidak_selesai",
    ]);
    expect(kode(kunjungan({ masukAt: menitLalu(30), keluarAt: null, keluarLat: null, keluarLng: null, keluarAkurasiM: null }))).toEqual([]);
  });
});

describe("ringkasPerKaryawan", () => {
  test("jumlah, durasi, deal, ditandai; urut terbanyak", () => {
    const r = ringkasPerKaryawan(
      [
        { ...kunjungan(), employeeId: 1, nama: "Andi", hasil: "deal" },
        { ...kunjungan({ masukAt: menitLalu(30), keluarAt: menitLalu(29) }), employeeId: 1, nama: "Andi", hasil: "tertarik" },
        { ...kunjungan({ keluarAt: null, keluarLat: null, keluarLng: null }), employeeId: 1, nama: "Andi", hasil: null },
        { ...kunjungan(), employeeId: 2, nama: "Budi", hasil: "deal" },
      ],
      NOW,
    );
    expect(r.map((x) => x.nama)).toEqual(["Andi", "Budi"]);
    expect(r[0]).toMatchObject({ jumlah: 3, selesai: 2, totalMenit: 41, deal: 1, ditandai: 1 });
    expect(r[1]).toMatchObject({ jumlah: 1, selesai: 1, totalMenit: 40, deal: 1, ditandai: 0 });
  });
});

describe("saranNamaKlien & tautanPeta", () => {
  test("tanpa duplikat (huruf besar/kecil), urutan terbaru dulu, dibatasi", () => {
    expect(saranNamaKlien(["Toko A", "toko  a", "Toko B", " ", "Toko A"])).toEqual(["Toko A", "Toko B"]);
    expect(saranNamaKlien(["a1", "a2", "a3"], 2)).toEqual(["a1", "a2"]);
  });
  test("tautan Google Maps", () => {
    expect(tautanPeta(-6.99, 110.42)).toBe("https://www.google.com/maps?q=-6.990000,110.420000");
  });
});

describe("validator", () => {
  test("koordinat kosong TIDAK jadi 0", () => {
    const p = mulaiKunjunganSchema.safeParse({ namaKlien: "Klien", lat: "", lng: "110", akurasi: "20" });
    expect(p.success).toBe(false);
  });
  test("mulai: field opsional kosong jadi null", () => {
    const p = mulaiKunjunganSchema.parse({ namaKlien: "Klien", alamat: "", tujuan: null, lat: "-6.9", lng: "110.4", akurasi: "12.5" });
    expect(p).toMatchObject({ alamat: null, tujuan: null, lat: -6.9, akurasi: 12.5 });
  });
  test("selesai: hasil wajib dari daftar", () => {
    expect(selesaiKunjunganSchema.safeParse({ hasil: "deal", lat: 1, lng: 1, akurasi: 5 }).success).toBe(true);
    expect(selesaiKunjunganSchema.safeParse({ hasil: "x", lat: 1, lng: 1, akurasi: 5 }).success).toBe(false);
  });
  test("saring: akhir sebelum awal ditolak", () => {
    expect(saringKunjunganSchema.safeParse({ start: "2026-10-10", end: "2026-10-01" }).success).toBe(false);
    expect(saringKunjunganSchema.safeParse({ start: "2026-10-01", end: "2026-10-10", hasil: "tanpa_hasil" }).success).toBe(true);
  });
});
