import { describe, expect, test } from "vitest";
import { keyIncompleteRows } from "@/lib/services/attendance/incomplete-rows";

describe("keyIncompleteRows", () => {
  test("uid unik meski (employeeId, tanggal) sama (duplikat import) — cegah bug 'ubah satu, yang lain ikut berubah'", () => {
    const rows = [
      { employeeId: 10, date: "2026-08-04", missing: "out" as const },
      { employeeId: 10, date: "2026-08-04", missing: "out" as const }, // duplikat
      { employeeId: 11, date: "2026-08-04", missing: "in" as const },
    ];
    const keyed = keyIncompleteRows(rows);
    const uids = keyed.map((r) => r.uid);
    expect(new Set(uids).size).toBe(rows.length); // semua unik
    expect(uids[0]).not.toBe(uids[1]);
  });

  test("mempertahankan field asli + menambah uid", () => {
    const [r] = keyIncompleteRows([{ employeeId: 5, date: "2026-08-01", missing: "in" as const }]);
    expect(r).toMatchObject({ employeeId: 5, date: "2026-08-01", missing: "in" });
    expect(typeof r.uid).toBe("string");
  });
});
