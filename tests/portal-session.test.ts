import { describe, expect, test } from "vitest";
import {
  createPortalToken,
  verifyPortalToken,
  PORTAL_TTL_MS,
} from "@/lib/services/portal/session";
import { normalizePin, checkPin, pinWarning, randomPin } from "@/lib/services/portal/pin";

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

  test("format salah DITOLAK (bukan sekadar diperingatkan)", () => {
    expect(checkPin("abcd").valid).toBe(false);
    expect(checkPin("12a4").valid).toBe(false);
    expect(checkPin("123").valid).toBe(false);
    expect(checkPin("123456789").valid).toBe(false);
  });

  test("PIN mudah ditebak TETAP DITERIMA, tapi ditandai lemah", () => {
    for (const pin of ["1111", "1234", "4321", "1212", "1122"]) {
      const c = checkPin(pin);
      expect(c.valid).toBe(true);
      expect(c.strength).toBe("lemah");
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(pinWarning(c)).toContain("lemah");
    }
  });

  test("mirip tahun lahir ditandai lemah", () => {
    expect(checkPin("1998").strength).toBe("lemah");
    expect(checkPin("2011").reasons).toContain("mirip tahun lahir");
  });

  test("hanya dua angka berbeda ditandai lemah", () => {
    expect(checkPin("8188").strength).toBe("lemah");
  });

  test("4 angka wajar = sedang, 6 angka wajar = kuat", () => {
    expect(checkPin("8241").strength).toBe("sedang");
    expect(checkPin("903175").strength).toBe("kuat");
  });

  test("tak ada peringatan untuk PIN yang tidak lemah", () => {
    expect(pinWarning(checkPin("8241"))).toBeNull();
    expect(pinWarning(checkPin("903175"))).toBeNull();
  });

  test("randomPin selalu kuat & valid", () => {
    for (let i = 0; i < 50; i++) {
      const pin = randomPin();
      expect(pin).toMatch(/^\d{6}$/);
      const c = checkPin(pin);
      expect(c.valid).toBe(true);
      expect(c.strength).toBe("kuat");
    }
  });
});
