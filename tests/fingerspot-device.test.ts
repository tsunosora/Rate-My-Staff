import { describe, expect, test } from "vitest";
import { decodeRecords, toRawScans, decodeUserPins } from "@/lib/services/fingerspot/device";

/** Bangun satu record general-log 48 byte sesuai format mesin Revo W-230N (ZDC2911). */
function makeRecord(pin: string, y: number, mo: number, d: number, h: number, mi: number, s: number, action = 1): Buffer {
  const r = Buffer.alloc(48);
  r.write(pin, 0, "latin1");
  r[35] = s;
  r.writeUInt16LE((mo << 12) | (((y - 1900) & 0x7f) << 2) | 1, 36);
  r.writeUInt16LE((mi << 10) | (h << 5) | d, 38);
  r.writeUInt32BE(action, 40);
  return r;
}

describe("decodeRecords", () => {
  test("dekode PIN + tanggal/jam + action dengan benar", () => {
    const buf = makeRecord("1001", 2026, 9, 16, 8, 5, 39, 1);
    const recs = decodeRecords(buf);
    expect(recs).toHaveLength(1);
    expect(recs[0].pin).toBe("1001");
    expect(recs[0].action).toBe(1);
    expect(recs[0].scanAt).toEqual(new Date(2026, 8, 16, 8, 5, 39));
  });

  test("dekode banyak record berurutan", () => {
    const buf = Buffer.concat([
      makeRecord("1", 2024, 1, 22, 6, 21, 37, 1),
      makeRecord("22", 2026, 9, 16, 16, 6, 13, 2),
      makeRecord("9", 2026, 9, 16, 16, 6, 15, 2),
    ]);
    const recs = decodeRecords(buf);
    expect(recs.map((r) => r.pin)).toEqual(["1", "22", "9"]);
    expect(recs[2].scanAt).toEqual(new Date(2026, 8, 16, 16, 6, 15));
  });

  test("buang record kosong / tanggal rusak", () => {
    const good = makeRecord("1001", 2026, 9, 16, 8, 0, 0);
    const emptyPin = makeRecord("", 2026, 9, 16, 8, 0, 0);
    const badMonth = Buffer.alloc(48);
    badMonth.write("1002", 0, "latin1");
    badMonth.writeUInt16LE((15 << 12) | (((2026 - 1900) & 0x7f) << 2), 36); // bulan 15 = tidak valid
    const recs = decodeRecords(Buffer.concat([good, emptyPin, badMonth]));
    expect(recs).toHaveLength(1);
    expect(recs[0].pin).toBe("1001");
  });

  test("abaikan sisa byte yang tidak genap 48", () => {
    const buf = Buffer.concat([makeRecord("1001", 2026, 9, 16, 8, 0, 0), Buffer.alloc(20)]);
    expect(decodeRecords(buf)).toHaveLength(1);
  });

  test("toRawScans memetakan ke bentuk mapper (pin + scanAt)", () => {
    const recs = decodeRecords(makeRecord("1001", 2026, 9, 16, 8, 5, 39));
    const raw = toRawScans(recs);
    expect(raw[0]).toEqual({ pin: "1001", scanAt: recs[0].scanAt });
  });
});

/** Bangun satu record daftar-user 36 byte (PIN di 24 byte pertama, sisanya info sidik jari). */
function makeUser(pin: string): Buffer {
  const r = Buffer.alloc(36);
  r.write(pin, 0, "latin1");
  return r;
}

describe("decodeUserPins", () => {
  test("ekstrak daftar PIN dari blok user", () => {
    const buf = Buffer.concat(["1", "12", "27"].map(makeUser));
    expect(decodeUserPins(buf)).toEqual(["1", "12", "27"]);
  });

  test("lewati record kosong & sisa byte tak genap", () => {
    const buf = Buffer.concat([makeUser("6"), makeUser(""), makeUser("22"), Buffer.alloc(10)]);
    expect(decodeUserPins(buf)).toEqual(["6", "22"]);
  });
});
