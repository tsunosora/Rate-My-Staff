import { describe, expect, test } from "vitest";
import { computeInOutLabels, type ScanRow } from "@/lib/services/fingerspot/sync";

const row = (id: number, employeeId: number, iso: string, scanType: string | null): ScanRow => ({
  id, employeeId, scanDate: new Date(iso), scanType,
});

describe("computeInOutLabels", () => {
  test("shift sore: scan pertama jadi 'in' walau lewat jam 12", () => {
    // Lyan: dua scan sore yang tadinya salah ditandai out,out
    const rows = [
      row(1, 12, "2026-09-16T13:05:57", "out"),
      row(2, 12, "2026-09-16T20:59:24", "out"),
    ];
    const changes = computeInOutLabels(rows);
    // hanya scan awal yang berubah jadi "in"
    expect(changes).toEqual([{ id: 1, scanType: "in" }]);
  });

  test("shift pagi yang sudah benar tidak diubah", () => {
    const rows = [
      row(1, 22, "2026-09-16T07:46:24", "in"),
      row(2, 22, "2026-09-16T16:06:13", "out"),
    ];
    expect(computeInOutLabels(rows)).toEqual([]);
  });

  test("kelompok per karyawan & per hari terpisah", () => {
    const rows = [
      row(1, 1, "2026-09-16T08:00:00", "out"), // awal hari → harus in
      row(2, 1, "2026-09-16T17:00:00", "in"), // → harus out
      row(3, 1, "2026-09-17T08:00:00", "out"), // hari lain, awal → in
      row(4, 2, "2026-09-16T09:00:00", "out"), // karyawan lain, satu-satunya → in
    ];
    const changes = computeInOutLabels(rows);
    expect(changes).toEqual([
      { id: 1, scanType: "in" },
      { id: 2, scanType: "out" },
      { id: 3, scanType: "in" },
      { id: 4, scanType: "in" },
    ]);
  });

  test("tiga scan: awal=in, sisanya=out", () => {
    const rows = [
      row(1, 5, "2026-09-16T08:00:00", null),
      row(2, 5, "2026-09-16T12:00:00", null),
      row(3, 5, "2026-09-16T17:00:00", null),
    ];
    expect(computeInOutLabels(rows)).toEqual([
      { id: 1, scanType: "in" },
      { id: 2, scanType: "out" },
      { id: 3, scanType: "out" },
    ]);
  });
});
