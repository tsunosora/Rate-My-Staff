import { describe, expect, test } from "vitest";
import {
  createPortalToken,
  verifyPortalToken,
  PORTAL_TTL_MS,
} from "@/lib/services/portal/session";
import { normalizePin, validatePin, randomPin } from "@/lib/services/portal/pin";

const KEY = "rahasia-uji-coba";
const TOKEN = "11111111-2222-3333-4444-555555555555";
const OTHER_TOKEN = "99999999-8888-7777-6666-555555555555";
const NOW = 1_770_000_000_000;

describe("sesi portal karyawan", () => {
  test("cookie yang dibuat bisa diverifikasi", () => {
    const cookie = createPortalToken(7, TOKEN, KEY, NOW);
    expect(verifyPortalToken(cookie, TOKEN, KEY, NOW)).toEqual({
      employeeId: 7,
      expiresAt: NOW + PORTAL_TTL_MS,
    });
  });

  test("kedaluwarsa setelah TTL lewat", () => {
    const cookie = createPortalToken(7, TOKEN, KEY, NOW);
    expect(verifyPortalToken(cookie, TOKEN, KEY, NOW + PORTAL_TTL_MS + 1)).toBeNull();
  });

  test("cookie karyawan lain ditolak untuk token ini", () => {
    const cookie = createPortalToken(7, OTHER_TOKEN, KEY, NOW);
    expect(verifyPortalToken(cookie, TOKEN, KEY, NOW)).toBeNull();
  });

  test("id karyawan yang diutak-atik ditolak (tanda tangan tak cocok)", () => {
    const cookie = createPortalToken(7, TOKEN, KEY, NOW);
    const forged = cookie.replace(/^7\./, "8.");
    expect(verifyPortalToken(forged, TOKEN, KEY, NOW)).toBeNull();
  });

  test("masa berlaku yang diperpanjang sendiri ditolak", () => {
    const cookie = createPortalToken(7, TOKEN, KEY, NOW);
    const [id, fp, , sig] = cookie.split(".");
    const forged = `${id}.${fp}.${NOW + 10 * PORTAL_TTL_MS}.${sig}`;
    expect(verifyPortalToken(forged, TOKEN, KEY, NOW)).toBeNull();
  });

  test("kunci berbeda (AUTH_SECRET diganti) membatalkan sesi lama", () => {
    const cookie = createPortalToken(7, TOKEN, KEY, NOW);
    expect(verifyPortalToken(cookie, TOKEN, "kunci-lain", NOW)).toBeNull();
  });

  test("cookie kosong / bentuk asing ditolak", () => {
    expect(verifyPortalToken(undefined, TOKEN, KEY, NOW)).toBeNull();
    expect(verifyPortalToken("", TOKEN, KEY, NOW)).toBeNull();
    expect(verifyPortalToken("bukan.cookie", TOKEN, KEY, NOW)).toBeNull();
  });
});

describe("PIN portal", () => {
  test("spasi & tanda hubung dibuang", () => {
    expect(normalizePin(" 12 34-56 ")).toBe("123456");
  });

  test("PIN wajar diterima", () => {
    expect(validatePin("8241")).toBeNull();
    expect(validatePin("90317")).toBeNull();
  });

  test("bukan angka ditolak", () => {
    expect(validatePin("abcd")).not.toBeNull();
    expect(validatePin("12a4")).not.toBeNull();
  });

  test("terlalu pendek / terlalu panjang ditolak", () => {
    expect(validatePin("123")).not.toBeNull();
    expect(validatePin("123456789")).not.toBeNull();
  });

  test("angka sama semua & berurutan ditolak", () => {
    expect(validatePin("1111")).not.toBeNull();
    expect(validatePin("1234")).not.toBeNull();
    expect(validatePin("4321")).not.toBeNull();
  });

  test("randomPin selalu lolos validasi", () => {
    for (let i = 0; i < 50; i++) {
      const pin = randomPin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(validatePin(pin)).toBeNull();
    }
  });
});
