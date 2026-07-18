import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScanlogHtml } from "@/lib/services/attendance/import-html";

const html = readFileSync(join(__dirname, "fixtures/scanlog-sample.html"), "utf8");

describe("parseScanlogHtml", () => {
  test("mengurai baris data & melewati header", () => {
    const rows = parseScanlogHtml(html);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      pin: "5",
      name: "LULUK Z",
      dateISO: "2026-05-02",
      scans: ["07:59:18", "16:50:50"],
    });
  });

  test("membuang sel kosong (&nbsp;) dan baris 1-scan tetap valid", () => {
    const rows = parseScanlogHtml(html);
    const oneScan = rows.find((r) => r.dateISO === "2026-05-16");
    expect(oneScan).toMatchObject({ pin: "6", name: "Damar", scans: ["21:00:34"] });
  });

  test("mengembalikan array kosong untuk input non-tabel", () => {
    expect(parseScanlogHtml("<html><body>kosong</body></html>")).toEqual([]);
  });
});
