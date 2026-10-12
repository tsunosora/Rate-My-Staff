import { describe, expect, test } from "vitest";
import {
  AKURASI_MAKS_M, SLOT_DETIK, isiQr, jarakMeter, jenisGambar, putuskanAbsen, qrSah, sidikPerangkat,
  type Lokasi, type Masukan,
} from "@/lib/services/absen-hp/aturan";

const TOKO: Lokasi = { id: 1, nama: "Toko Pusat", lat: -7.9, lng: 110.4, radiusM: 100, wajibQr: false, qrRahasia: "r".repeat(32) };
const ID_HP = "perangkat-uji-0123456789abcdef";
const NOW = 1_800_000_000_000;

function masukan(ubah: Partial<Masukan> = {}): Masukan {
  return {
    aktif: true, perangkatTerdaftar: null, idPerangkat: ID_HP, lokasi: [TOKO],
    lat: TOKO.lat, lng: TOKO.lng, akurasiM: 20, qr: null, absenTerakhir: null, nowMs: NOW, ...ubah,
  };
}

// ~0,0009° lintang ≈ 100 m
const geser = (meter: number) => TOKO.lat + meter / 111_320;

describe("absen HP — keputusan", () => {
  test("di titik lokasi, GPS akurat, HP pertama → diterima dan HP dikunci", () => {
    const k = putuskanAbsen(masukan());
    expect(k.ok).toBe(true);
    if (k.ok) {
      expect(k.kunciPerangkat).toBe(true);
      expect(k.sidik).toBe(sidikPerangkat(ID_HP));
      expect(k.sidik).not.toContain(ID_HP); // yang disimpan sidiknya, bukan id-nya
    }
  });

  test("karyawan yang belum dinyalakan owner ditolak lebih dulu", () => {
    expect(putuskanAbsen(masukan({ aktif: false }))).toMatchObject({ ok: false, kode: "tidak_aktif" });
  });

  test("HP lain ditolak; HP yang sama diterima tanpa mengunci ulang", () => {
    expect(putuskanAbsen(masukan({ perangkatTerdaftar: sidikPerangkat("hp-lain-0123456789abcdef") }))).toMatchObject({ ok: false, kode: "hp_lain" });
    const k = putuskanAbsen(masukan({ perangkatTerdaftar: sidikPerangkat(ID_HP) }));
    expect(k).toMatchObject({ ok: true, kunciPerangkat: false });
  });

  test("di luar radius ditolak dengan jarak yang disebut", () => {
    const k = putuskanAbsen(masukan({ lat: geser(250) }));
    expect(k).toMatchObject({ ok: false, kode: "di_luar", lokasi: "Toko Pusat" });
    if (!k.ok) expect(k.jarakM).toBeGreaterThan(200);
    expect(putuskanAbsen(masukan({ lat: geser(80) })).ok).toBe(true);
  });

  test("GPS kabur ditolak walau titiknya di dalam radius", () => {
    expect(putuskanAbsen(masukan({ akurasiM: AKURASI_MAKS_M + 1 }))).toMatchObject({ ok: false, kode: "kabur" });
  });

  test("ketukan ganda dalam jeda ditolak, sesudahnya boleh", () => {
    expect(putuskanAbsen(masukan({ absenTerakhir: new Date(NOW - 30_000) }))).toMatchObject({ ok: false, kode: "baru_saja" });
    expect(putuskanAbsen(masukan({ absenTerakhir: new Date(NOW - 3 * 60_000) })).ok).toBe(true);
  });

  test("lokasi terdekat yang dipakai, bukan yang pertama di daftar", () => {
    const jauh: Lokasi = { ...TOKO, id: 2, nama: "Gudang", lat: TOKO.lat + 1 };
    const k = putuskanAbsen(masukan({ lokasi: [jauh, TOKO] }));
    expect(k.ok && k.lokasi.nama).toBe("Toko Pusat");
  });

  test("tanpa lokasi sama sekali → ditolak dengan alasan yang jelas", () => {
    expect(putuskanAbsen(masukan({ lokasi: [] }))).toMatchObject({ ok: false, kode: "tanpa_lokasi" });
  });
});

describe("absen HP — QR berganti", () => {
  const QR: Lokasi = { ...TOKO, wajibQr: true };

  test("lokasi wajib QR: tanpa QR minta pindai, QR saat ini diterima", () => {
    expect(putuskanAbsen(masukan({ lokasi: [QR] }))).toMatchObject({ ok: false, kode: "perlu_qr", perluQr: true });
    expect(putuskanAbsen(masukan({ lokasi: [QR], qr: isiQr(QR, NOW) }))).toMatchObject({ ok: true, qr: true });
  });

  test("QR satu slot lalu masih diterima, dua slot lalu ditolak", () => {
    expect(qrSah(QR, isiQr(QR, NOW - SLOT_DETIK * 1000), NOW)).toBe(true);
    expect(qrSah(QR, isiQr(QR, NOW - 2 * SLOT_DETIK * 1000), NOW)).toBe(false);
  });

  test("QR lokasi lain atau rahasia lain ditolak", () => {
    const lain = { ...QR, id: 9 };
    expect(qrSah(QR, isiQr(lain, NOW), NOW)).toBe(false);
    expect(qrSah(QR, isiQr({ ...QR, qrRahasia: "x".repeat(32) }, NOW), NOW)).toBe(false);
    expect(qrSah(QR, "https://contoh.test", NOW)).toBe(false);
  });
});

describe("absen HP — pembantu", () => {
  test("jarak haversine masuk akal", () => {
    expect(Math.round(jarakMeter(0, 0, 0, 1) / 1000)).toBe(111);
    expect(jarakMeter(TOKO.lat, TOKO.lng, TOKO.lat, TOKO.lng)).toBe(0);
  });

  test("tanda tangan gambar: JPEG/PNG/WebP diterima, HTML ditolak", () => {
    expect(jenisGambar(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(jenisGambar(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(jenisGambar(new Uint8Array(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")))).toBe("webp");
    expect(jenisGambar(new Uint8Array(Buffer.from("<html><script>")))).toBeNull();
  });
});
