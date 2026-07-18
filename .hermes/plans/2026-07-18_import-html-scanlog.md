# Import HTML Scanlog Mesin Absensi — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Tambahkan tombol "Import Scanlog" di halaman Absensi yang mengunggah file HTML export mesin (`dbg_kartu_scanlog`), mengurai kolom Scan 1–4 per karyawan per tanggal, menghitung status kehadiran sesuai jadwal kerja, menampilkan preview, lalu meng-commit ke tabel `Attendance`.

**Architecture:** Tiga lapis murni-testable → (1) parser HTML → baris terstruktur, (2) mapper+kalkulator → preview attendance (reuse `computeAttendanceRow`), (3) route API multipart (mode `preview` & `commit`). UI: modal 2-langkah (upload → preview → konfirmasi). Tidak menambah dependency (parsing pakai regex; format mesin fixed).

**Tech Stack:** Next.js 16 (App Router, route handlers), Prisma/MySQL, Zod, Vitest, React 19 client component, Tailwind.

---

## Current Context / Assumptions

Berdasarkan pembacaan kode & contoh file:

- **Format file** (`dbg_kartu_scanlog`): `<TABLE>` dengan 2 baris header (`class="Band"`, `class="Header"`) lalu baris data. Kolom per baris:
  `PIN | NIP | Nama | Jabatan | Departemen | Kantor | Tanggal | Scan 1 | Scan 2 | Scan 3 | Scan 4`.
  - `Tanggal` format `DD-MM-YYYY`. Waktu scan format `HH:MM:SS`. Sel kosong = `&nbsp;`.
  - Tiap sel teks dibungkus `<FONT ...>TEKS</FONT>`.
  - Satu baris = 1 karyawan × 1 tanggal, dengan 1–4 punch. Baris dikelompokkan per PIN.
  - Contoh edge case nyata: Damar (PIN 6) `16-05-2026` hanya punya **satu** scan `21:00:34` (Scan 2–4 kosong).
- **PIN ↔ karyawan:** PIN mesin dicocokkan ke `Employee.employeeCode` (konvensi yang sudah dipakai `lib/services/fingerspot/mapper.ts` & `app/api/fingerspot/process/route.ts`).
- **Scan chronologis:** Scan 1..4 sudah urut menaik = punch mentah. Aturan pairing yang dipakai:
  - ≥2 scan → scan **pertama = "in"**, scan **terakhir = "out"** (scan tengah = istirahat, diabaikan di v1 — konsisten dgn `/api/attendance/manual` yang hanya simpan in+out).
  - 1 scan → tentukan in/out via heuristik `noonHour` (default 12): `< 12:00` = "in", else "out" (mirror `mapScanlog`).
- **Perhitungan status:** reuse `computeAttendanceRow` (`lib/services/attendance/report.ts`) yang sudah hitung `lateMinutes`/`overtimeMinutes`/`status` dari `workSchedule`.
- **Hari libur (KEPUTUSAN USER):** Minggu otomatis libur **dan** tanggal custom — keduanya **sudah ada infrastrukturnya**, tinggal dipakai ulang:
  - Tabel `Holiday` + CRUD `/api/holidays` + card "Hari Libur" di `settings/page.tsx` (tanggal custom).
  - Setting `auto_sunday_holiday` + checkbox "Minggu otomatis hari libur" di `settings/page.tsx`.
  - `aggregateAttendance` sudah menghitung `holidaySet` + `autoSunday`. **Tidak perlu UI/route baru** — import cukup menghitung `isHoliday` dgn rumus yang sama: `holidayDates.has(dateISO) || (autoSunday && hari==Minggu)`, lalu diteruskan ke `computeAttendanceRow`.
- **Scan istirahat (KEPUTUSAN USER):** mesin belum melakukan scan istirahat → v1 **abaikan** (cukup in pertama & out terakhir). Desain dibuat extensible agar mudah ditambah nanti.
- **Semantik commit per hari (KEPUTUSAN USER):** hapus record `Attendance` lama `(employeeId, tanggal)` lalu tulis ulang (import HTML = sumber otoritatif harian), **tetapi dengan izin bila bentrok**: jika sudah ada absensi hari itu dari **sumber/mesin berbeda** (`machineName != "import-html"`, mis. `fingerspot`/`manual`), baris ditandai **conflict** di preview dan hanya ditimpa bila user mencentang konfirmasi (`overwriteConflicts=true`). Hari tanpa data lama, atau yang sumbernya sudah `import-html`, ditimpa langsung. `machineName = "import-html"`.

**Helper yang sudah ada & dipakai ulang (jangan tulis ulang):**
- `route`, `requireSession`, `json`, `badRequest` — `lib/http.ts`
- `computeAttendanceRow`, `parseTimeToMinutes` — `lib/services/attendance/report.ts`
- Pola resolve `codeToId` — lihat `app/api/fingerspot/process/route.ts:35-39`
- `Modal` — `components/ui/Modal.tsx`; `api()` — `lib/fetcher.ts`

> **Catatan wajib (AGENTS.md):** versi Next.js ini punya breaking changes. Sebelum menulis route handler & multipart `formData()`, baca `node_modules/next/dist/docs/` untuk Route Handlers (Request/Response, `formData`, `runtime`). Verifikasi API `req.formData()` & `Blob.text()` sesuai versi terpasang.

---

## Files Likely To Change / Create

- **Create** `lib/services/attendance/import-html.ts` — parser HTML → `ParsedScanRow[]`.
- **Create** `lib/services/attendance/import-map.ts` — `buildImportPreview()` + derivasi scan record.
- **Create** `app/api/attendance/import/route.ts` — POST multipart (preview & commit).
- **Modify** `app/(dashboard)/attendance/page.tsx` — tombol + modal import (upload → preview → konfirmasi).
- **Create** `tests/attendance-import-parser.test.ts` — unit test parser.
- **Create** `tests/attendance-import-map.test.ts` — unit test mapper/kalkulator.
- (Opsional) **Create** `tests/fixtures/scanlog-sample.html` — fixture kecil (2 karyawan, termasuk baris 1-scan).

**Konvensi test:** Vitest (`npm test` → `vitest run`), import pakai alias `@/` (didukung `vite-tsconfig-paths` di `vitest.config.ts`). Sebelum menulis test pertama, buka 1 file di `tests/` yang sudah ada untuk meniru gaya `describe/it/expect`.

---

## Phase 0 — Fixture & Kontrak Tipe

### Task 0.1: Buat fixture HTML kecil untuk test

**Objective:** Fixture minimal berisi 2 header row + 3 data row (2 karyawan; salah satunya baris 1-scan) untuk menguji parser & edge case.

**Files:**
- Create: `tests/fixtures/scanlog-sample.html`

**Step 1:** Tulis fixture (potong dari contoh nyata; cukup 3 baris data):

```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">
<HTML><HEAD><TITLE>dbg_kartu_scanlog</TITLE></HEAD>
<BODY BGCOLOR=#C0C0C0>
<TABLE BORDER=0 CELLSPACING=1 CELLPADDING=2 BGCOLOR=#C0C0C0>
<TR VALIGN="TOP" class="Band" BGCOLOR=#F0FBFF><TD NOWRAP COLSPAN=6 ALIGN="CENTER" HEIGHT=18><B>Pegawai</B></TD><TD NOWRAP COLSPAN=5 ALIGN="CENTER" HEIGHT=18><B>Data scanlog</B></TD></TR>
<TR VALIGN="TOP" class="Header" BGCOLOR=#F0FBFF><TD NOWRAP WIDTH=40 ALIGN="CENTER">PIN</TD><TD NOWRAP WIDTH=40 ALIGN="CENTER">NIP</TD><TD NOWRAP WIDTH=95 ALIGN="CENTER">Nama</TD><TD NOWRAP WIDTH=63 ALIGN="CENTER">Jabatan</TD><TD NOWRAP WIDTH=86 ALIGN="CENTER">Departemen</TD><TD NOWRAP WIDTH=57 ALIGN="CENTER">Kantor</TD><TD NOWRAP WIDTH=64 ALIGN="CENTER">Tanggal</TD><TD NOWRAP WIDTH=56 ALIGN="CENTER">Scan 1</TD><TD NOWRAP WIDTH=56 ALIGN="CENTER">Scan 2</TD><TD NOWRAP WIDTH=56 ALIGN="CENTER">Scan 3</TD><TD NOWRAP WIDTH=56 ALIGN="CENTER">Scan 4</TD></TR>
<TR><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT STYLE="font-family: Segoe UI; font-size: 8pt; color: #000000">5</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>5</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>LULUK Z</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>02-05-2026</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>07:59:18</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>16:50:50</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD></TR>
<TR><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>6</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>6</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>Damar</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>Staff</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>02-05-2026</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>13:05:35</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>21:04:23</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD></TR>
<TR><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>6</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>6</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>Damar</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>Staff</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>16-05-2026</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>21:00:34</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD><TD NOWRAP ALIGN="LEFT" BGCOLOR=#FFFFFF><FONT>&nbsp;</FONT></TD></TR>
</TABLE></BODY></HTML>
```

**Step 2: Commit**

```bash
git add tests/fixtures/scanlog-sample.html
git commit -m "test(attendance): fixture HTML scanlog untuk import"
```

---

## Phase 1 — Parser HTML (murni, TDD)

### Task 1.1: Definisikan tipe & test parser (RED)

**Objective:** Test parser: fixture → array baris terstruktur, header ter-skip, `&nbsp;` jadi kosong, tanggal `DD-MM-YYYY`→`YYYY-MM-DD`, scan kosong dibuang.

**Files:**
- Create: `tests/attendance-import-parser.test.ts`

**Step 1: Tulis test gagal**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseScanlogHtml } from "@/lib/services/attendance/import-html";

const html = readFileSync(join(__dirname, "fixtures/scanlog-sample.html"), "utf8");

describe("parseScanlogHtml", () => {
  it("mengurai baris data & melewati header", () => {
    const rows = parseScanlogHtml(html);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      pin: "5",
      name: "LULUK Z",
      dateISO: "2026-05-02",
      scans: ["07:59:18", "16:50:50"],
    });
  });

  it("membuang sel kosong (&nbsp;) dan baris 1-scan tetap valid", () => {
    const rows = parseScanlogHtml(html);
    const oneScan = rows.find((r) => r.dateISO === "2026-05-16");
    expect(oneScan).toMatchObject({ pin: "6", name: "Damar", scans: ["21:00:34"] });
  });

  it("mengembalikan array kosong untuk input non-tabel", () => {
    expect(parseScanlogHtml("<html><body>kosong</body></html>")).toEqual([]);
  });
});
```

**Step 2: Run → verifikasi GAGAL**

Run: `npm test -- attendance-import-parser`
Expected: FAIL — "parseScanlogHtml is not a function / module not found".

### Task 1.2: Implementasi parser (GREEN)

**Files:**
- Create: `lib/services/attendance/import-html.ts`

**Step 1: Implementasi minimal**

```ts
export type ParsedScanRow = {
  pin: string;
  name: string;
  dateISO: string; // YYYY-MM-DD
  scans: string[]; // ["HH:MM:SS", ...] hanya yang terisi, urut sesuai kolom
};

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/;
const DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Ambil teks bersih dari satu sel <TD>: buang tag & decode &nbsp; → "". */
function cellText(tdInner: string): string {
  const noTags = tdInner.replace(/<[^>]+>/g, "");
  const decoded = noTags.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
  return decoded.trim();
}

/** Urai HTML export mesin (dbg_kartu_scanlog) → baris data terstruktur. */
export function parseScanlogHtml(html: string): ParsedScanRow[] {
  const rows: ParsedScanRow[] = [];
  const trMatches = html.match(/<TR[\s\S]*?<\/TR>/gi) ?? [];

  for (const tr of trMatches) {
    const cells = (tr.match(/<TD[\s\S]*?<\/TD>/gi) ?? []).map((td) =>
      cellText(td.replace(/^<TD[^>]*>/i, "").replace(/<\/TD>$/i, ""))
    );
    if (cells.length < 11) continue; // header "Band" (2 sel) & baris tak lengkap ter-skip

    const pin = cells[0];
    const dateCell = cells[6];
    const dm = DATE_RE.exec(dateCell);
    if (!pin || !dm) continue; // baris "Header" (PIN/NIP/…) ter-skip di sini

    const dateISO = `${dm[3]}-${dm[2]}-${dm[1]}`;
    const scans = cells.slice(7, 11).filter((c) => TIME_RE.test(c));

    rows.push({ pin, name: cells[2] ?? "", dateISO, scans });
  }

  return rows;
}
```

**Step 2: Run → verifikasi LULUS**

Run: `npm test -- attendance-import-parser`
Expected: PASS (3 test).

**Step 3: Commit**

```bash
git add lib/services/attendance/import-html.ts tests/attendance-import-parser.test.ts
git commit -m "feat(attendance): parser HTML scanlog mesin"
```

---

## Phase 2 — Mapper + Kalkulator Preview (murni, TDD)

### Task 2.1: Test derivasi scan in/out per baris (RED)

**Objective:** Uji aturan pairing: ≥2 scan → first=in/last=out; 1 scan → heuristik noon.

**Files:**
- Create: `tests/attendance-import-map.test.ts`

**Step 1: Tulis test gagal**

```ts
import { describe, it, expect } from "vitest";
import { deriveScans } from "@/lib/services/attendance/import-map";

describe("deriveScans", () => {
  it("dua scan → in (pertama) & out (terakhir)", () => {
    expect(deriveScans(["07:59:18", "16:50:50"])).toEqual([
      { time: "07:59:18", scanType: "in" },
      { time: "16:50:50", scanType: "out" },
    ]);
  });

  it("empat scan → hanya pakai pertama (in) & terakhir (out)", () => {
    const r = deriveScans(["08:00:00", "12:00:00", "13:00:00", "17:00:00"]);
    expect(r).toEqual([
      { time: "08:00:00", scanType: "in" },
      { time: "17:00:00", scanType: "out" },
    ]);
  });

  it("satu scan pagi → in; satu scan malam → out (heuristik noon 12)", () => {
    expect(deriveScans(["08:01:30"])).toEqual([{ time: "08:01:30", scanType: "in" }]);
    expect(deriveScans(["21:00:34"])).toEqual([{ time: "21:00:34", scanType: "out" }]);
  });

  it("nol scan → kosong", () => {
    expect(deriveScans([])).toEqual([]);
  });
});
```

**Step 2: Run → GAGAL**

Run: `npm test -- attendance-import-map`
Expected: FAIL — module not found.

### Task 2.2: Implementasi `deriveScans` (GREEN)

**Files:**
- Create: `lib/services/attendance/import-map.ts`

**Step 1: Implementasi**

```ts
import { computeAttendanceRow, type ScheduleInfo } from "./report";

export type DerivedScan = { time: string; scanType: "in" | "out" };

/** Reduksi 1–4 punch (urut menaik) → in (pertama) & out (terakhir). */
export function deriveScans(scans: string[], noonHour = 12): DerivedScan[] {
  const clean = scans.filter(Boolean);
  if (clean.length === 0) return [];
  if (clean.length === 1) {
    const hour = Number(clean[0].slice(0, 2));
    return [{ time: clean[0], scanType: hour < noonHour ? "in" : "out" }];
  }
  return [
    { time: clean[0], scanType: "in" },
    { time: clean[clean.length - 1], scanType: "out" },
  ];
}
```

**Step 2: Run → LULUS.** `npm test -- attendance-import-map`

**Step 3: Commit**

```bash
git add lib/services/attendance/import-map.ts tests/attendance-import-map.test.ts
git commit -m "feat(attendance): derivasi scan in/out dari punch mesin"
```

### Task 2.3: Test `buildImportPreview` (RED)

**Objective:** Gabung baris parsed + daftar karyawan (dgn schedule) → preview per baris (matched/unmatched, status terhitung) + summary. Reuse `computeAttendanceRow`.

**Files:**
- Modify: `tests/attendance-import-map.test.ts`

**Step 1: Tambah test**

```ts
import { buildImportPreview, type ImportEmployee } from "@/lib/services/attendance/import-map";

const employees: ImportEmployee[] = [
  {
    id: 10,
    employeeCode: "5",
    fullName: "Luluk Zahro",
    workSchedule: { startTime: "08:00", endTime: "16:00", lateToleranceMinutes: 15, isHoliday: false },
  },
  // PIN 6 sengaja tidak ada → unmatched
];

describe("buildImportPreview", () => {
  it("mencocokkan PIN→employeeCode & menghitung status dari jadwal", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["07:59:18", "16:50:50"] }];
    const { rows: preview, summary } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({
      pin: "5",
      employeeId: 10,
      matched: true,
      dateISO: "2026-05-02",
      clockIn: "07:59",
      clockOut: "16:50",
      status: "on_time",
      overtimeMinutes: 50,
    });
    expect(summary.matched).toBe(1);
    expect(summary.unmatched).toBe(0);
  });

  it("baris terlambat menandai status late + lateMinutes", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-11", scans: ["08:30:00", "16:05:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({ status: "late", lateMinutes: 30 });
  });

  it("PIN tak dikenal → matched=false, employeeId=null, masuk daftar unmatched", () => {
    const rows = [{ pin: "6", name: "Damar", dateISO: "2026-05-02", scans: ["13:05:35", "21:04:23"] }];
    const { rows: preview, summary } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({ matched: false, employeeId: null });
    expect(summary.unmatched).toBe(1);
    expect(summary.unmatchedPins).toContain("6");
  });

  it("tanggal Minggu dgn autoSunday → isHoliday=true diteruskan (status holiday saat tanpa scan efektif)", () => {
    // 2026-05-03 = Minggu. Ada scan → tetap dihitung, tapi flag isHoliday harus terisi.
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-03", scans: ["08:00:00", "16:00:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { autoSunday: true });
    expect(preview[0].isHoliday).toBe(true);
  });

  it("tanggal custom di holidayDates → isHoliday=true", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-11", scans: ["08:00:00", "16:00:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, {
      holidayDates: new Set(["2026-05-11"]),
    });
    expect(preview[0].isHoliday).toBe(true);
  });
});
```

**Step 2: Run → GAGAL.** `npm test -- attendance-import-map`

### Task 2.4: Implementasi `buildImportPreview` (GREEN)

**Files:**
- Modify: `lib/services/attendance/import-map.ts`

**Step 1: Tambah tipe & fungsi**

```ts
import type { ParsedScanRow } from "./import-html";

export type ImportEmployee = {
  id: number;
  employeeCode: string;
  fullName: string;
  workSchedule: ScheduleInfo | null;
};

export type ImportPreviewRow = {
  pin: string;
  fileName: string;          // nama di file
  employeeId: number | null;
  employeeName: string | null; // nama di DB
  dateISO: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  lateMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  matched: boolean;
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    unmatchedPins: string[];
  };
};

export type PreviewOptions = {
  holidayDates?: Set<string>; // YYYY-MM-DD custom (dari tabel Holiday)
  autoSunday?: boolean;       // setting auto_sunday_holiday
  noonHour?: number;
};

/** Rumus libur sama persis dgn aggregateAttendance. */
export function isHolidayDate(dateISO: string, opts: PreviewOptions): boolean {
  if (opts.holidayDates?.has(dateISO)) return true;
  if (opts.autoSunday && new Date(`${dateISO}T00:00:00`).getDay() === 0) return true;
  return false;
}

export function buildImportPreview(
  parsed: ParsedScanRow[],
  employees: ImportEmployee[],
  opts: PreviewOptions = {}
): ImportPreview {
  const byCode = new Map(employees.map((e) => [e.employeeCode, e]));
  const rows: ImportPreviewRow[] = [];
  const unmatchedPins = new Set<string>();

  for (const r of parsed) {
    const holiday = isHolidayDate(r.dateISO, opts);
    const emp = byCode.get(r.pin) ?? null;
    if (!emp) {
      unmatchedPins.add(r.pin);
      rows.push({
        pin: r.pin, fileName: r.name, employeeId: null, employeeName: null,
        dateISO: r.dateISO, clockIn: null, clockOut: null,
        status: "unmatched", lateMinutes: 0, overtimeMinutes: 0,
        isHoliday: holiday, matched: false,
      });
      continue;
    }

    const derived = deriveScans(r.scans, opts.noonHour ?? 12);
    const computed = computeAttendanceRow({
      employeeId: emp.id,
      date: r.dateISO,
      schedule: emp.workSchedule,
      isHoliday: holiday,
      scans: derived.map((d) => ({
        scanDate: new Date(`${r.dateISO}T${d.time}`),
        scanType: d.scanType,
      })),
    });

    rows.push({
      pin: r.pin, fileName: r.name, employeeId: emp.id, employeeName: emp.fullName,
      dateISO: r.dateISO, clockIn: computed.clockIn, clockOut: computed.clockOut,
      status: computed.status, lateMinutes: computed.lateMinutes,
      overtimeMinutes: computed.overtimeMinutes, isHoliday: holiday, matched: true,
    });
  }

  return {
    rows,
    summary: {
      total: parsed.length,
      matched: rows.filter((x) => x.matched).length,
      unmatched: rows.filter((x) => !x.matched).length,
      unmatchedPins: [...unmatchedPins],
    },
  };
}
```

**Step 2: Run → LULUS.** `npm test -- attendance-import-map`

**Step 3: Commit**

```bash
git add lib/services/attendance/import-map.ts tests/attendance-import-map.test.ts
git commit -m "feat(attendance): buildImportPreview mapping scanlog→attendance"
```

---

## Phase 3 — Route API `/api/attendance/import`

> Baca dulu `node_modules/next/dist/docs/` (Route Handlers, `formData`) sebelum menulis. Verifikasi `req.formData()`, `Blob.text()`, dan apakah perlu `export const runtime = "nodejs"`.

**Konstanta bersama:** definisikan `const IMPORT_MACHINE = "import-html";` (dipakai untuk tulis & deteksi conflict).

### Task 3.1: Handler preview + deteksi libur & conflict (tanpa tulis DB)

**Objective:** POST multipart `{ file, commit?, overwriteConflicts? }`. Load karyawan + hari libur (tabel `Holiday` + setting `auto_sunday_holiday`), build preview, lalu **enrich tiap baris matched dgn `conflict`** (ada absensi hari itu dari mesin lain). Jika `commit != "true"`, kembalikan preview.

**Files:**
- Create: `app/api/attendance/import/route.ts`

**Step 1: Implementasi preview + conflict**

```ts
import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { parseScanlogHtml } from "@/lib/services/attendance/import-html";
import {
  buildImportPreview,
  deriveScans,
  type ImportEmployee,
  type ImportPreviewRow,
} from "@/lib/services/attendance/import-map";

export const runtime = "nodejs"; // verifikasi di docs Next terpasang

const IMPORT_MACHINE = "import-html";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dayRange(d: string) {
  const start = new Date(`${d}T00:00:00`);
  return { start, end: new Date(start.getTime() + 86400000) };
}

async function loadEmployees(): Promise<ImportEmployee[]> {
  const emps = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    include: { workSchedule: true },
  });
  return emps.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    workSchedule: e.workSchedule
      ? {
          startTime: e.workSchedule.startTime,
          endTime: e.workSchedule.endTime,
          lateToleranceMinutes: e.workSchedule.lateToleranceMinutes,
          isHoliday: e.workSchedule.isHoliday,
        }
      : null,
  }));
}

/** Baris preview + info conflict lintas-mesin untuk dikirim ke klien. */
type EnrichedRow = ImportPreviewRow & { conflict: boolean; existingSources: string[] };

export const POST = route(async (req: Request) => {
  await requireSession();

  const formData = await req.formData();
  const file = formData.get("file");
  const commit = formData.get("commit") === "true";
  const overwriteConflicts = formData.get("overwriteConflicts") === "true";
  if (!(file instanceof Blob)) return badRequest({ file: ["File tidak ada"] });

  const html = await file.text();
  const parsed = parseScanlogHtml(html);
  if (parsed.length === 0) return badRequest({ file: ["Tidak ada baris scanlog terdeteksi"] });

  // Hari libur: rumus sama dgn aggregateAttendance.
  const [employees, holidayRows, autoSundayRaw] = await Promise.all([
    loadEmployees(),
    prisma.holiday.findMany(),
    getSetting("auto_sunday_holiday"),
  ]);
  const holidayDates = new Set(holidayRows.map((h) => dateKey(h.date)));
  const autoSunday = autoSundayRaw === "true";

  const preview = buildImportPreview(parsed, employees, { holidayDates, autoSunday });

  // Deteksi conflict: absensi eksisting hari itu dari mesin != import-html.
  const matched = preview.rows.filter((r) => r.matched && r.employeeId != null);
  const conflictDays = new Map<string, Set<string>>(); // "empId|date" -> set(machineName)
  if (matched.length > 0) {
    const empIds = [...new Set(matched.map((r) => r.employeeId!))];
    const sorted = [...matched].map((r) => r.dateISO).sort();
    const start = new Date(`${sorted[0]}T00:00:00`);
    const end = new Date(new Date(`${sorted[sorted.length - 1]}T00:00:00`).getTime() + 86400000);
    const existing = await prisma.attendance.findMany({
      where: { employeeId: { in: empIds }, scanDate: { gte: start, lt: end } },
      select: { employeeId: true, scanDate: true, machineName: true },
    });
    for (const a of existing) {
      const key = `${a.employeeId}|${dateKey(a.scanDate)}`;
      const set = conflictDays.get(key) ?? new Set<string>();
      set.add(a.machineName ?? "unknown");
      conflictDays.set(key, set);
    }
  }

  const rows: EnrichedRow[] = preview.rows.map((r) => {
    if (!r.matched || r.employeeId == null) return { ...r, conflict: false, existingSources: [] };
    const sources = conflictDays.get(`${r.employeeId}|${r.dateISO}`) ?? new Set<string>();
    const foreign = [...sources].filter((s) => s !== IMPORT_MACHINE);
    return { ...r, conflict: foreign.length > 0, existingSources: foreign };
  });
  const conflicts = rows.filter((r) => r.conflict).length;

  if (!commit) {
    return json({ rows, summary: { ...preview.summary, conflicts }, committed: false });
  }

  // Task 3.2 mengisi bagian commit.
  return json({ rows, summary: { ...preview.summary, conflicts }, committed: false });
});
```

**Step 2: Verifikasi ketik/lint**

Run: `npm run lint`
Expected: no error pada file baru.

**Step 3: Commit**

```bash
git add app/api/attendance/import/route.ts
git commit -m "feat(api): route import scanlog — preview + libur + deteksi conflict mesin"
```

### Task 3.2: Mode commit ber-izin (overwrite dgn guard conflict)

**Objective:** Saat `commit=true`, tulis baris matched. Hari **conflict** (mesin lain) hanya ditimpa bila `overwriteConflicts=true`; kalau tidak → **skip** & dilaporkan. Hari non-conflict ditimpa langsung. Semua dalam `prisma.$transaction`.

**Files:**
- Modify: `app/api/attendance/import/route.ts`

**Step 1: Ganti blok commit** (bagian setelah `if (!commit) ...`):

```ts
  let created = 0;
  let skippedConflicts = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const row of rows) {
        if (!row.matched || row.employeeId == null) continue;
        if (row.conflict && !overwriteConflicts) {
          skippedConflicts++;
          continue;
        }
        const source = parsed.find((p) => p.pin === row.pin && p.dateISO === row.dateISO);
        const derived = deriveScans(source?.scans ?? []);
        if (derived.length === 0) continue;

        const { start, end } = dayRange(row.dateISO);
        await tx.attendance.deleteMany({
          where: { employeeId: row.employeeId, scanDate: { gte: start, lt: end } },
        });
        await tx.attendance.createMany({
          data: derived.map((d) => ({
            employeeId: row.employeeId!,
            scanDate: new Date(`${row.dateISO}T${d.time}`),
            scanType: d.scanType,
            status: row.status,
            lateMinutes: d.scanType === "in" ? row.lateMinutes : 0,
            overtimeMinutes: d.scanType === "out" ? row.overtimeMinutes : 0,
            machineName: IMPORT_MACHINE,
          })),
        });
        created += derived.length;
      }
    },
    { timeout: 30_000 }
  );

  return json({
    rows,
    summary: { ...preview.summary, conflicts },
    committed: true,
    created,
    skippedConflicts,
  });
```

**Step 2: Verifikasi lint.** `npm run lint`

**Step 3: Commit**

```bash
git add app/api/attendance/import/route.ts
git commit -m "feat(api): commit import ber-izin (guard conflict lintas mesin)"
```

---

## Phase 4 — UI: Tombol & Modal Import

### Task 4.1: Tambah state & handler upload/preview di halaman Absensi

**Objective:** Tombol "Import Scanlog" membuka modal; pilih file → kirim `commit=false` → simpan preview di state.

**Files:**
- Modify: `app/(dashboard)/attendance/page.tsx`

**Step 1:** Tambah tipe preview (dekat tipe lain, atas komponen):

```ts
type ImportPreviewRow = {
  pin: string; fileName: string; employeeId: number | null; employeeName: string | null;
  dateISO: string; clockIn: string | null; clockOut: string | null;
  status: string; lateMinutes: number; overtimeMinutes: number;
  isHoliday: boolean; matched: boolean; conflict: boolean; existingSources: string[];
};
type ImportResult = {
  rows: ImportPreviewRow[];
  summary: { total: number; matched: number; unmatched: number; unmatchedPins: string[]; conflicts: number };
  committed: boolean; created?: number; skippedConflicts?: number;
};
```

**Step 2:** Tambah state (dalam komponen, dekat `const [modal, setModal]`):

```tsx
const [importOpen, setImportOpen] = useState(false);
const [importFile, setImportFile] = useState<File | null>(null);
const [importResult, setImportResult] = useState<ImportResult | null>(null);
const [importBusy, setImportBusy] = useState(false);
const [importError, setImportError] = useState("");
const [overwriteConflicts, setOverwriteConflicts] = useState(false);
```

**Step 3:** Tambah handler (dekat `saveManual`). Gunakan `fetch` langsung karena multipart (bukan JSON via `api()`):

```tsx
async function runImport(commit: boolean) {
  if (!importFile) return;
  setImportBusy(true);
  setImportError("");
  try {
    const fd = new FormData();
    fd.append("file", importFile);
    fd.append("commit", commit ? "true" : "false");
    fd.append("overwriteConflicts", overwriteConflicts ? "true" : "false");
    const res = await fetch("/api/attendance/import", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.file?.[0] ?? data?.message ?? "Gagal impor");
    setImportResult(data as ImportResult);
    if (commit) {
      setImportFile(null);
      load();
    }
  } catch (e) {
    setImportError((e as Error).message);
  } finally {
    setImportBusy(false);
  }
}

function closeImport() {
  setImportOpen(false);
  setImportFile(null);
  setImportResult(null);
  setImportError("");
  setOverwriteConflicts(false);
}
```

> **Cek konvensi:** buka `lib/fetcher.ts`. Jika `api()` bisa terima `FormData` tanpa memaksa header JSON, boleh pakai `api()`; kalau tidak, `fetch` langsung (seperti di atas) benar.

**Step 4: Commit**

```bash
git add "app/(dashboard)/attendance/page.tsx"
git commit -m "feat(ui): state & handler import scanlog di halaman absensi"
```

### Task 4.2: Tombol + Modal preview

**Objective:** Tombol di header; modal berisi input file, ringkasan, tabel preview, tombol Konfirmasi.

**Files:**
- Modify: `app/(dashboard)/attendance/page.tsx`

**Step 1:** Tambah tombol di grup header (setelah tombol "+ Manual"):

```tsx
<button onClick={() => setImportOpen(true)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
  Import Scanlog
</button>
```

**Step 2:** Tambah modal (sebelum penutup `</div>` terluar, setelah blok `{modal && (...)}`):

```tsx
{importOpen && (
  <Modal title="Import Scanlog Mesin (HTML)" onClose={closeImport}>
    {importError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{importError}</div>}
    <div className="space-y-3">
      <input
        type="file"
        accept=".html,.htm,text/html"
        className="block w-full text-sm"
        onChange={(e) => { setImportResult(null); setImportFile(e.target.files?.[0] ?? null); }}
      />
      <div className="flex gap-2">
        <button disabled={!importFile || importBusy} onClick={() => runImport(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">
          {importBusy ? "Memproses…" : "Preview"}
        </button>
      </div>

      {importResult && (
        <>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Total {importResult.summary.total} baris · Cocok {importResult.summary.matched} · Tak cocok {importResult.summary.unmatched}
            {importResult.summary.conflicts > 0 && (
              <span className="text-amber-600"> · Bentrok {importResult.summary.conflicts}</span>
            )}
            {importResult.summary.unmatchedPins.length > 0 && (
              <span className="text-red-600"> · PIN tak dikenal: {importResult.summary.unmatchedPins.join(", ")}</span>
            )}
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr><th className="px-2 py-1">Karyawan</th><th className="px-2 py-1">Tanggal</th><th className="px-2 py-1">Masuk</th><th className="px-2 py-1">Pulang</th><th className="px-2 py-1">Status</th></tr>
              </thead>
              <tbody>
                {importResult.rows.map((r, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${!r.matched ? "bg-red-50" : r.conflict ? "bg-amber-50" : ""}`}>
                    <td className="px-2 py-1">{r.employeeName ?? `${r.fileName} (PIN ${r.pin})`}</td>
                    <td className="px-2 py-1">
                      {r.dateISO}
                      {r.isHoliday && <span className="ml-1 rounded bg-indigo-100 px-1 text-[10px] text-indigo-600">libur</span>}
                    </td>
                    <td className="px-2 py-1">{r.clockIn ?? "—"}</td>
                    <td className="px-2 py-1">{r.clockOut ?? "—"}</td>
                    <td className="px-2 py-1">
                      {r.matched ? r.status : "tak cocok"}
                      {r.conflict && <span className="ml-1 text-amber-600" title={`Sudah ada dari: ${r.existingSources.join(", ")}`}>⚠ bentrok</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importResult.committed ? (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Berhasil menyimpan {importResult.created ?? 0} record.
              {(importResult.skippedConflicts ?? 0) > 0 && (
                <> {importResult.skippedConflicts} hari bentrok dilewati (tidak ditimpa).</>
              )}
            </div>
          ) : (
            <>
              {importResult.summary.conflicts > 0 && (
                <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={overwriteConflicts}
                    onChange={(e) => setOverwriteConflicts(e.target.checked)}
                  />
                  <span>Timpa {importResult.summary.conflicts} hari yang sudah punya absensi dari mesin/sumber lain. Tanpa dicentang, hari bentrok akan dilewati.</span>
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={closeImport} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
                <button disabled={importBusy || importResult.summary.matched === 0} onClick={() => runImport(true)} className="btn-primary">
                  {importBusy ? "Menyimpan…" : `Konfirmasi & Simpan (${importResult.summary.matched})`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  </Modal>
)}
```

**Step 3: Verifikasi build/lint.** `npm run lint`

**Step 4: Commit**

```bash
git add "app/(dashboard)/attendance/page.tsx"
git commit -m "feat(ui): modal import scanlog dgn preview & konfirmasi"
```

---

## Phase 5 — Verifikasi End-to-End & Dokumentasi

### Task 5.1: Jalankan seluruh test

Run: `npm test`
Expected: semua test lama + baru PASS.

### Task 5.2: Uji manual di dev

**Steps:**
1. `npm run dev`.
2. Pastikan ada `Employee` dgn `employeeCode` "5" (dan `workSchedule`) untuk melihat baris matched; PIN lain akan unmatched.
3. Buka `/attendance` → "Import Scanlog" → unggah file contoh asli (`/home/faicando/.config/ops/backlog/assets/img-1784322864940-954ry4.html`).
4. Klik **Preview** → verifikasi ringkasan matched/unmatched, badge **libur** pada tanggal Minggu/hari libur custom, & status per baris.
5. Klik **Konfirmasi & Simpan** → verifikasi banner sukses, lalu ganti tanggal di halaman ke `2026-05-02` → record muncul di tabel absensi dgn mesin `import-html`.
6. **Uji conflict:** buat 1 absensi manual (mesin `manual`) untuk karyawan yang sama pada tanggal yang ada di file → Preview ulang → baris tsb harus ditandai **⚠ bentrok** & muncul checkbox timpa. Commit tanpa centang → baris bentrok dilewati (`skippedConflicts`); commit dgn centang → tertimpa jadi `import-html`.
7. **Uji libur:** tambahkan hari libur custom di `/settings` (mis. 2026-05-11) & pastikan `auto_sunday_holiday` aktif → Preview → tanggal tsb ber-badge libur.
8. Cek laporan `/attendance/report` (range 02–30 Mei 2026) → baris teragregasi benar.

### Task 5.3: Catat perilaku di README

**Files:**
- Modify: `README.md`

Tambah paragraf ringkas: cara import HTML scanlog, aturan pairing scan (first=in/last=out; 1 scan pakai heuristik siang), dan bahwa import menimpa data hari yang sama (`machineName=import-html`).

**Commit:**

```bash
git add README.md
git commit -m "docs: cara import HTML scanlog mesin absensi"
```

---

## Tests / Validation Summary

- Unit: `tests/attendance-import-parser.test.ts`, `tests/attendance-import-map.test.ts` (`npm test`).
- Lint/type: `npm run lint`.
- Manual E2E: Task 5.2 dengan file export asli.

## Keputusan User (sudah final)

1. **Hari libur:** Minggu otomatis libur **+** tanggal custom — dipakai ulang dari tabel `Holiday` + setting `auto_sunday_holiday` (sudah ada UI di `/settings`). Import menghitung `isHoliday` dgn rumus sama & meneruskannya ke `computeAttendanceRow`. **Tidak ada UI/route baru.**
2. **Scan istirahat:** belum di-scan mesin → v1 abaikan (in pertama + out terakhir). `deriveScans` sengaja dibuat kecil & terisolasi agar mudah diperluas saat scan istirahat mulai dipakai.
3. **Overwrite:** boleh menimpa, **tetapi bila bentrok** (ada absensi hari sama dari mesin/sumber berbeda) harus ada izin — ditandai di preview & hanya ditimpa bila user mencentang `overwriteConflicts`.

## Risks & Tradeoffs

- **Heuristik 1-scan (noon 12).** Punch tunggal malam dianggap "out". Untuk shift malam bisa salah — `noonHour` sudah jadi parameter; bila perlu, sambungkan ke `Setting`.
- **Overwrite destruktif (non-conflict).** Hari tanpa absensi lain atau yang sumbernya sudah `import-html` ditimpa langsung tanpa konfirmasi tambahan. Preview tetap wajib sebelum commit (sudah).
- **Ukuran file/transaksi.** File sebulan × banyak karyawan = ratusan baris; loop `deleteMany`+`createMany` dalam satu `$transaction` bisa lama → sudah diberi `timeout: 30_000`. Bila masih kurang, pecah per-batch.
- **Parser regex.** Mengandalkan struktur fixed mesin (`dbg_kartu_scanlog`). Aman untuk format ini; bukan parser HTML umum. Jika vendor ubah layout kolom, parser perlu penyesuaian (deteksi via nama kolom header bisa jadi peningkatan).
- **Timezone.** `new Date(\`${dateISO}T${time}\`)` memakai timezone server. Pastikan server homelab pada zona lokal (WIB) agar jam scan konsisten dgn data lain (route manual pakai pola sama, jadi konsisten).
- **Konsistensi status vs laporan.** Status disimpan di `Attendance` untuk halaman list/metrics; `aggregateAttendance` tetap menghitung ulang holiday/late saat baca laporan — jadi walau ada perbedaan minor, laporan tetap akurat.
