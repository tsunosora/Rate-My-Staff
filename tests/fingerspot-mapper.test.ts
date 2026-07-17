import { describe, expect, test } from "vitest";
import { mapScanlog, mapScanlogs } from "@/lib/services/fingerspot/mapper";

const codeToId = { "EMP-BUDI-001": 5, "EMP-RINAUJI-001": 4 };

describe("mapScanlog", () => {
  test("pin cocok + pagi (<12) -> scanType 'in'", () => {
    const r = mapScanlog({ pin: "EMP-BUDI-001", scanAt: "2026-07-16T08:00:00" }, { codeToId });
    expect(r).toEqual({ employeeId: 5, scanDate: new Date("2026-07-16T08:00:00"), scanType: "in", pin: "EMP-BUDI-001" });
  });

  test("siang (>=12) -> scanType 'out'", () => {
    const r = mapScanlog({ pin: "EMP-BUDI-001", scanAt: "2026-07-16T17:05:00" }, { codeToId });
    expect(r?.scanType).toBe("out");
  });

  test("pin tak dikenal -> null", () => {
    expect(mapScanlog({ pin: "ZZZ", scanAt: "2026-07-16T08:00:00" }, { codeToId })).toBeNull();
  });
});

describe("mapScanlogs", () => {
  test("pisahkan yang cocok & tidak, plus dedup (employee+waktu sama)", () => {
    const raws = [
      { pin: "EMP-BUDI-001", scanAt: "2026-07-16T08:00:00" },
      { pin: "EMP-BUDI-001", scanAt: "2026-07-16T08:00:00" }, // duplikat
      { pin: "EMP-RINAUJI-001", scanAt: "2026-07-16T17:00:00" },
      { pin: "TIDAKADA", scanAt: "2026-07-16T08:00:00" },
    ];
    const res = mapScanlogs(raws, { codeToId });
    expect(res.mapped).toHaveLength(2);
    expect(res.unmatched).toEqual(["TIDAKADA"]);
  });
});
