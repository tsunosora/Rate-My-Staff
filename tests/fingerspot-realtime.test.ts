import { describe, expect, test } from "vitest";
import { extractJson, parseIoTime } from "@/lib/services/fingerspot/realtime";

/** Bangun body realtime: [4-byte LE panjang JSON][JSON][blob biner opsional]. */
function frame(json: object, blob?: Uint8Array): Uint8Array {
  const j = Buffer.from(JSON.stringify(json), "utf8");
  const p = Buffer.alloc(4);
  p.writeUInt32LE(j.length, 0);
  const parts: Uint8Array[] = [p, j];
  if (blob) {
    const bl = Buffer.alloc(4);
    bl.writeUInt32LE(blob.length, 0);
    parts.push(bl, blob);
  }
  return Buffer.concat(parts);
}

describe("extractJson", () => {
  test("ambil JSON glog dari body ber-frame", () => {
    const body = frame({ user_id: "6", io_time: "20260916130557", io_mode: 1, verify_mode: 0 });
    expect(extractJson(body)).toMatchObject({ user_id: "6", io_time: "20260916130557" });
  });

  test("ambil JSON enroll walau diikuti blob biner (template sidik jari)", () => {
    const body = frame(
      { user_id: "5", user_name: "LULUK Z", user_privilege: "USER" },
      Buffer.from([0x00, 0x01, 0x7b, 0x7d, 0xff, 0x00]) // blob berisi { } palsu
    );
    expect(extractJson(body)).toMatchObject({ user_id: "5", user_name: "LULUK Z" });
  });

  test("body tanpa JSON → null", () => {
    expect(extractJson(Buffer.from([0, 1, 2, 3]))).toBeNull();
  });
});

describe("parseIoTime", () => {
  test("YYYYMMDDHHMMSS → Date lokal", () => {
    expect(parseIoTime("20260916130557")).toEqual(new Date(2026, 8, 16, 13, 5, 57));
  });
  test("format salah → null", () => {
    expect(parseIoTime("2026-09-16")).toBeNull();
    expect(parseIoTime("")).toBeNull();
    expect(parseIoTime(undefined)).toBeNull();
  });
});
