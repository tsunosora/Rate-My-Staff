import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseScanlogHtml,
  analyzeScanlog,
  describeScanlogFailure,
} from "@/lib/services/attendance/import-html";

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

  test("mendukung export 3-kolom scan (10 sel/baris)", () => {
    // Format ekspor mesin dengan hanya 3 kolom scan (Scan 1-3) → 10 sel/baris.
    // Regresi bug 422: parser lama mematok 11 sel & membuang semua baris ini.
    const html3 = `<TABLE>
<TR class="Band"><TD COLSPAN=6>Pegawai</TD><TD COLSPAN=4>Data scanlog</TD></TR>
<TR class="Header"><TD>PIN</TD><TD>NIP</TD><TD>Nama</TD><TD>Jabatan</TD><TD>Departemen</TD><TD>Kantor</TD><TD>Tanggal</TD><TD>Scan 1</TD><TD>Scan 2</TD><TD>Scan 3</TD></TR>
<TR><TD>5</TD><TD>5</TD><TD>Karyawan A</TD><TD>&nbsp;</TD><TD>&nbsp;</TD><TD>&nbsp;</TD><TD>02-06-2026</TD><TD>13:02:36</TD><TD>21:50:10</TD><TD>&nbsp;</TD></TR>
</TABLE>`;
    const rows = parseScanlogHtml(html3);
    expect(rows).toEqual([
      {
        pin: "5",
        name: "Karyawan A",
        dateISO: "2026-06-02",
        scans: ["13:02:36", "21:50:10"],
      },
    ]);
  });

  test("deteksi kolom via header: tahan kolom bergeser & format tanggal alternatif", () => {
    // Ada kolom "No" ekstra di depan → PIN geser ke indeks 1, Tanggal ke 7.
    // Tanggal pakai DD/MM/YYYY, dan ada 1 kolom scan.
    const shifted = `<TABLE>
<TR><TD>No</TD><TD>PIN</TD><TD>NIP</TD><TD>Nama</TD><TD>Jabatan</TD><TD>Departemen</TD><TD>Kantor</TD><TD>Tanggal</TD><TD>Scan 1</TD></TR>
<TR><TD>1</TD><TD>9</TD><TD>9</TD><TD>Budi</TD><TD>&nbsp;</TD><TD>&nbsp;</TD><TD>&nbsp;</TD><TD>07/06/2026</TD><TD>08:00:00</TD></TR>
</TABLE>`;
    const rows = parseScanlogHtml(shifted);
    expect(rows).toEqual([
      { pin: "9", name: "Budi", dateISO: "2026-06-07", scans: ["08:00:00"] },
    ]);
  });

  test("pesan diagnosa: header tak ditemukan", () => {
    const msg = describeScanlogFailure(
      analyzeScanlog("<TABLE><TR><TD>a</TD><TD>b</TD></TR></TABLE>")
    );
    expect(msg).toMatch(/header/i);
  });

  test("pesan diagnosa: header ada tapi tanggal invalid", () => {
    const bad = `<TABLE>
<TR><TD>PIN</TD><TD>NIP</TD><TD>Nama</TD><TD>Jabatan</TD><TD>Departemen</TD><TD>Kantor</TD><TD>Tanggal</TD><TD>Scan 1</TD></TR>
<TR><TD>9</TD><TD>9</TD><TD>Budi</TD><TD>x</TD><TD>x</TD><TD>x</TD><TD>2026 Juni 7</TD><TD>08:00:00</TD></TR>
</TABLE>`;
    const a = analyzeScanlog(bad);
    expect(a.rows).toHaveLength(0);
    expect(a.headerFound).toBe(true);
    expect(describeScanlogFailure(a)).toMatch(/DD-MM-YYYY/);
  });
});
