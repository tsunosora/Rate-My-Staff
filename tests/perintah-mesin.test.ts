import { describe, expect, it } from "vitest";
import {
  ambilDaftarPin,
  ambilInfoPengguna,
  ambilPinMesin,
  badanPerintah,
  berhasil,
  normalisasiPin,
  PERINTAH_BOLEH,
} from "@/lib/services/fingerspot/perintah";

describe("normalisasiPin", () => {
  it("membuang nol di depan PIN angka", () => {
    expect(normalisasiPin("00000009")).toBe("9");
    expect(normalisasiPin(12)).toBe("12");
  });
  it("PIN bukan angka dibiarkan; kosong = null", () => {
    expect(normalisasiPin(" A7 ")).toBe("A7");
    expect(normalisasiPin("")).toBeNull();
    expect(normalisasiPin(null)).toBeNull();
  });
});

describe("ambilDaftarPin — bentuk jawaban GET_USER_ID_LIST belum pasti, jadi semua bentuk dibaca", () => {
  it("larik objek ber-user_id", () => {
    expect(ambilDaftarPin({ user_id_array: [{ user_id: "00000001", backup_number: 0 }, { user_id: "2" }] })).toEqual(["1", "2"]);
  });
  it("larik string di kunci ber-user_id", () => {
    expect(ambilDaftarPin({ user_id_list: ["1", "00000010"] })).toEqual(["1", "10"]);
  });
  it("PIN kembar (beberapa sidik jari satu orang) dihitung sekali", () => {
    expect(ambilDaftarPin({ data: [{ user_id: "3", backup_number: 0 }, { user_id: "3", backup_number: 1 }] })).toEqual(["3"]);
  });
  it("larik angka di kunci lain TIDAK dianggap PIN", () => {
    expect(ambilDaftarPin({ backup_numbers: [0, 1, 2] })).toEqual([]);
  });
  it("PIN mentah tetap tersimpan untuk dikirim balik ke mesin", () => {
    expect([...ambilPinMesin({ user_id_array: [{ user_id: "00000009" }] }).entries()]).toEqual([["9", "00000009"]]);
  });
});

describe("ambilInfoPengguna", () => {
  it("membaca nama di tingkat mana pun", () => {
    expect(ambilInfoPengguna({ user_info: { user_id: "00000028", user_name: " Dea " } })).toEqual({ pin: "28", nama: "Dea" });
  });
  it("tanpa nama = null (karyawan tetap dibuat dengan nama sementara)", () => {
    expect(ambilInfoPengguna({ user_id: "5" })).toEqual({ pin: "5", nama: null });
  });
  it("tanpa user_id = null", () => {
    expect(ambilInfoPengguna({ hasil: "OK" })).toBeNull();
  });
});

describe("badanPerintah", () => {
  it("tanpa parameter = badan kosong", () => {
    expect(badanPerintah({}).length).toBe(0);
    expect(badanPerintah(null).length).toBe(0);
  });
  it("4-byte LE panjang + JSON + satu byte 0", () => {
    const b = badanPerintah({ user_id: "9" });
    const json = JSON.stringify({ user_id: "9" });
    expect(b.readUInt32LE(0)).toBe(json.length);
    expect(b.subarray(4, 4 + json.length).toString("utf8")).toBe(json);
    expect(b[b.length - 1]).toBe(0);
    expect(b.length).toBe(4 + json.length + 1);
  });
});

describe("pengaman", () => {
  it("hanya perintah BACA yang boleh diantre — CLEAR_* menghapus isi mesin tanpa bisa dibatalkan", () => {
    for (const k of PERINTAH_BOLEH) expect(k.startsWith("GET_")).toBe(true);
  });
  it("kode balasan OK / kosong = berhasil", () => {
    expect(berhasil("OK")).toBe(true);
    expect(berhasil(null)).toBe(true);
    expect(berhasil("ERROR_INVALID_PARAM")).toBe(false);
  });
});

import { pecahBlob, pinDariBlob } from "@/lib/services/fingerspot/perintah";

/** Bangun badan kiriman mesin: [len][json](byte0?)([len][blob])*. */
function badanMesin(json: object, blobs: Buffer[], nolSesudahJson = false) {
  const j = Buffer.from(JSON.stringify(json));
  const parts: Buffer[] = [Buffer.alloc(4), j];
  parts[0].writeUInt32LE(j.length, 0);
  if (nolSesudahJson) parts.push(Buffer.from([0]));
  for (const b of blobs) {
    const l = Buffer.alloc(4);
    l.writeUInt32LE(b.length, 0);
    parts.push(l, b);
  }
  return Buffer.concat(parts);
}

/** Rekaman 36 byte: PIN teks ASCII diisi byte 0, sisanya acak. */
function rekamanTeks(pin: string) {
  const r = Buffer.alloc(36, 0);
  r.write(pin, 0, "ascii");
  r[30] = 7; // byte lain (mis. hak akses) tidak boleh mengganggu
  return r;
}

describe("daftar PIN di blob biner (jawaban asli mesin: user_id_array = \"BIN_1\")", () => {
  const meta = { user_id_array: "BIN_1", user_id_count: 3, one_user_id_size: 36 };

  it("PIN teks per rekaman 36 byte", () => {
    const blob = Buffer.concat(["1", "10", "00000031"].map(rekamanTeks));
    const pecah = pecahBlob(badanMesin(meta, [blob]));
    expect(pecah).toHaveLength(1);
    expect([...pinDariBlob(meta, pecah)!.entries()]).toEqual([["1", "1"], ["10", "10"], ["31", "00000031"]]);
  });

  it("dengan byte 0 penutup JSON (bentuk FkWeb)", () => {
    const blob = Buffer.concat(["5", "6", "7"].map(rekamanTeks));
    const pecah = pecahBlob(badanMesin(meta, [blob], true));
    expect([...pinDariBlob(meta, pecah)!.keys()]).toEqual(["5", "6", "7"]);
  });

  it("PIN sebagai angka 4-byte LE", () => {
    const blob = Buffer.concat([12, 13, 14].map((n) => { const r = Buffer.alloc(36, 0); r.writeUInt32LE(n, 0); return r; }));
    expect([...pinDariBlob(meta, pecahBlob(badanMesin(meta, [blob])))!.keys()]).toEqual(["12", "13", "14"]);
  });

  it("blob kurang panjang = null (byte mentah disimpan untuk diperiksa, bukan ditebak)", () => {
    const blob = rekamanTeks("1");
    expect(pinDariBlob(meta, pecahBlob(badanMesin(meta, [blob])))).toBeNull();
  });

  it("tanpa rujukan BIN = null", () => {
    expect(pinDariBlob({ user_id_count: 2 }, [])).toBeNull();
  });
});
