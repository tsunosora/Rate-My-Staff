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
