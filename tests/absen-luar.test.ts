import { describe, expect, test } from "vitest";
import {
  MAKS_LUAR_PER_HARI, bolehDiputus, isiQr, luarDiizinkan, putuskanAbsen, putuskanAbsenLuar, sidikPerangkat,
  type Lokasi, type MasukanLuar,
} from "@/lib/services/absen-hp/aturan";

const TOKO: Lokasi = { id: 1, nama: "Toko Pusat", lat: -7.9, lng: 110.4, radiusM: 100, wajibQr: false, qrRahasia: "r".repeat(32) };
const ID_HP = "perangkat-uji-0123456789abcdef";
const NOW = 1_800_000_000_000;
const geser = (meter: number) => TOKO.lat + meter / 111_320;

function masukan(ubah: Partial<MasukanLuar> = {}): MasukanLuar {
  return {
    aktif: true, perangkatTerdaftar: null, idPerangkat: ID_HP, lokasi: [TOKO],
    lat: geser(2000), lng: TOKO.lng, akurasiM: 20, qr: null, absenTerakhir: null, nowMs: NOW,
    izinkan: true, alasan: "kunjungan ke pelanggan", pengajuanHariIni: 0, ...ubah,
  };
}

describe("absen di luar lokasi — pengajuan", () => {
  test("di luar radius dengan alasan → diterima sebagai pengajuan, jarak & lokasi terdekat ikut", () => {
    const k = putuskanAbsenLuar(masukan());
    expect(k).toMatchObject({ ok: true, kunciPerangkat: true, alasan: "kunjungan ke pelanggan" });
    if (k.ok) {
      expect(k.lokasi?.id).toBe(1);
      expect(k.jarakM).toBeGreaterThan(1900);
      expect(k.sidik).toBe(sidikPerangkat(ID_HP));
    }
  });

  test("tanpa lokasi absen sama sekali tetap boleh mengajukan; jarak kosong", () => {
    const k = putuskanAbsenLuar(masukan({ lokasi: [] }));
    expect(k).toMatchObject({ ok: true, lokasi: null, jarakM: null });
  });

  test("dimatikan owner → ditolak lebih dulu", () => {
    expect(putuskanAbsenLuar(masukan({ izinkan: false }))).toMatchObject({ ok: false, kode: "luar_mati" });
    expect(luarDiizinkan(null)).toBe(true); // bawaan: boleh
    expect(luarDiizinkan("")).toBe(true);
    expect(luarDiizinkan("true")).toBe(true);
    expect(luarDiizinkan("false")).toBe(false);
    expect(luarDiizinkan(" FALSE ")).toBe(false);
  });

  test("di dalam radius tidak boleh mengajukan — termasuk lokasi ber-QR wajib (QR tidak bisa dilewati)", () => {
    expect(putuskanAbsenLuar(masukan({ lat: TOKO.lat }))).toMatchObject({ ok: false, kode: "di_dalam" });
    const ber = { ...TOKO, wajibQr: true };
    expect(putuskanAbsenLuar(masukan({ lokasi: [ber], lat: TOKO.lat }))).toMatchObject({ ok: false, kode: "di_dalam" });
    // QR yang dikirim pun diabaikan — pengajuan tidak pernah jadi absen langsung.
    expect(putuskanAbsenLuar(masukan({ lokasi: [ber], lat: TOKO.lat, qr: isiQr(ber, NOW) }))).toMatchObject({ ok: false, kode: "di_dalam" });
  });

  test("pengaman lain TIDAK dilonggarkan", () => {
    expect(putuskanAbsenLuar(masukan({ aktif: false }))).toMatchObject({ ok: false, kode: "tidak_aktif" });
    expect(putuskanAbsenLuar(masukan({ perangkatTerdaftar: sidikPerangkat("hp-lain-0123456789abcdef") }))).toMatchObject({ ok: false, kode: "hp_lain" });
    expect(putuskanAbsenLuar(masukan({ idPerangkat: "pendek" }))).toMatchObject({ ok: false, kode: "perangkat" });
    expect(putuskanAbsenLuar(masukan({ akurasiM: 400 }))).toMatchObject({ ok: false, kode: "kabur" });
    expect(putuskanAbsenLuar(masukan({ lat: NaN }))).toMatchObject({ ok: false, kode: "lokasi_kosong" });
    expect(putuskanAbsenLuar(masukan({ absenTerakhir: new Date(NOW - 60_000) }))).toMatchObject({ ok: false, kode: "baru_saja" });
    expect(putuskanAbsenLuar(masukan({ absenTerakhir: new Date(NOW - 3 * 60_000) })).ok).toBe(true);
  });

  test("HP yang sudah terkunci ke karyawan ini tidak dikunci ulang", () => {
    expect(putuskanAbsenLuar(masukan({ perangkatTerdaftar: sidikPerangkat(ID_HP) }))).toMatchObject({ ok: true, kunciPerangkat: false });
  });

  test("alasan wajib minimal 5 huruf (spasi tidak dihitung) dan tidak kepanjangan", () => {
    expect(putuskanAbsenLuar(masukan({ alasan: "  ab  " }))).toMatchObject({ ok: false, kode: "alasan_pendek" });
    expect(putuskanAbsenLuar(masukan({ alasan: "dinas" })).ok).toBe(true);
    expect(putuskanAbsenLuar(masukan({ alasan: "x".repeat(501) }))).toMatchObject({ ok: false, kode: "alasan_panjang" });
  });

  test(`maksimal ${MAKS_LUAR_PER_HARI} pengajuan per hari`, () => {
    expect(putuskanAbsenLuar(masukan({ pengajuanHariIni: MAKS_LUAR_PER_HARI - 1 })).ok).toBe(true);
    expect(putuskanAbsenLuar(masukan({ pengajuanHariIni: MAKS_LUAR_PER_HARI }))).toMatchObject({ ok: false, kode: "batas_harian" });
  });

  test("putuskanAbsen() biasa tetap menolak di luar radius — pengajuan tidak mengubahnya", () => {
    expect(putuskanAbsen(masukan())).toMatchObject({ ok: false, kode: "di_luar" });
  });
});

describe("absen di luar lokasi — keputusan owner", () => {
  test("cuma yang menunggu dan belum tercatat yang bisa diputus", () => {
    expect(bolehDiputus("menunggu", null)).toEqual({ ok: true });
    expect(bolehDiputus("diterima", 12).ok).toBe(false);
    expect(bolehDiputus("ditolak", null).ok).toBe(false);
    expect(bolehDiputus("menunggu", 7).ok).toBe(false);
  });
});
