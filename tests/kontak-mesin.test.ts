import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { alamatUtama, jenisAlamat, kontakDari } from "@/lib/services/fingerspot/kontak-mesin";

const h = (o: Record<string, string>) => new Headers(o);

describe("kontak mesin (bahan Info Mesin)", () => {
  test("host dari header Host, dikecilkan, tanpa port", () => {
    expect(kontakDari(h({ host: "Absensi-Voliko.Qendali.com:443" })).host).toBe("absensi-voliko.qendali.com");
  });

  test("x-forwarded-host menang atas Host (proxy yang menyetelnya)", () => {
    expect(kontakDari(h({ host: "localhost:3007", "x-forwarded-host": "absensi-voliko.qendali.com" })).host)
      .toBe("absensi-voliko.qendali.com");
  });

  // Entri PERTAMA x-forwarded-for itu apa pun yang dikirim pemanggil; Cloudflare menambahkan
  // alamat aslinya di BELAKANG. cf-connecting-ip dipasang Cloudflare sendiri, jadi menang.
  test("IP: cf-connecting-ip dulu, lalu entri TERAKHIR x-forwarded-for", () => {
    expect(kontakDari(h({ "cf-connecting-ip": "36.1.2.3", "x-forwarded-for": "6.6.6.6, 36.1.2.3" })).ip).toBe("36.1.2.3");
    expect(kontakDari(h({ "x-forwarded-for": "6.6.6.6, 36.9.9.9" })).ip).toBe("36.9.9.9");
  });

  test("tanpa header apa pun = null, bukan string kosong (supaya nilai lama tidak ditimpa)", () => {
    expect(kontakDari(h({}))).toEqual({ host: null, ip: null });
  });

  test("jenis alamat dibandingkan ke host APP_URL", () => {
    const utama = alamatUtama("https://absensi-voliko.qendali.com");
    expect(utama).toBe("absensi-voliko.qendali.com");
    expect(jenisAlamat("absensi-voliko.qendali.com", utama)).toBe("utama");
    expect(jenisAlamat("absensi.volikoprint.com", utama)).toBe("lain");
    expect(jenisAlamat("192.168.1.20", utama)).toBe("lokal");
    expect(jenisAlamat("localhost", utama)).toBe("lokal");
    expect(jenisAlamat(null, utama)).toBeNull();
    expect(alamatUtama("")).toBeNull();
    expect(alamatUtama("bukan url")).toBeNull();
  });

  // Jalur realtime (dipakai mesin Fingerspot Revo) WAJIB mengirim kontaknya; tanpa itu Info Mesin
  // selamanya "belum tercatat" walau mesinnya menghubungi tiap beberapa detik.
  test("penerima realtime meneruskan kontak ke resolveMachine", () => {
    const src = readFileSync("app/api/fingerspot/realtime/route.ts", "utf8");
    expect(src).toMatch(/resolveMachine\(devId,\s*kontakDari\(req\.headers\)\)/);
  });
});
