# Struk Absensi Bulanan per Karyawan (Export PDF & Excel) — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Membuat "struk absensi" rekap **bulanan per karyawan** yang meniru gambar acuan — tabel harian (Hari · Tanggal · Masuk · Pulang · Shift · Terlambat · Lembur · LS · LC · LL) + footer subtotal (Lembur Harian / Lembur Libur / Lembur Cetak) dan grand total — lalu bisa **di-export ke PDF dan Excel, per karyawan (satuan) maupun massal**.

**Architecture:** Data harian sudah dihitung oleh `aggregateAttendance` (`lib/services/attendance/aggregate.ts`) via `computeShift`. Kita (1) mengekspos dua field yang sudah dihitung tapi dibuang — `shift` (pagi/siang/longshift) dan `isHoliday` — ke `ReportRow`; (2) menambah **pure builder** `lib/services/attendance/receipt.ts` yang mengubah baris-baris satu bulan-satu karyawan menjadi `ReceiptData` (baris harian + kolom LS/LC/LL + subtotal + grand total) memakai tarif dari `OvertimeCategory`; (3) menambah renderer PDF (`@react-pdf/renderer`) & Excel (`exceljs`) mengikuti pola export yang sudah ada; (4) route API `/api/attendance/receipt/*` (JSON preview + export-pdf + export-excel, satuan & massal); (5) halaman UI `/attendance/receipt`.

**Tech Stack:** Next.js 16 (App Router, route handlers), Prisma/MySQL, `@react-pdf/renderer` (sudah dipakai `lib/services/export/pdf.tsx`), `exceljs` (sudah dipakai `lib/services/export/excel.ts`), Vitest, Tailwind v4 (glassmorphism dark-first).

---

## Current Context / Assumptions

Baca file-file ini sebelum mulai — semua sudah ada dan jadi acuan pola:

- **Sumber data harian:** `lib/services/attendance/aggregate.ts` → `aggregateAttendance(prisma, {startStr,endStr,departmentId,employeeId})` mengembalikan `rows` (per karyawan-tanggal) + `summary`. Saat `employeeId` diisi, `showAllDates=true` sehingga **semua tanggal** dalam rentang ikut muncul (termasuk hari libur kosong) — persis yang dibutuhkan struk.
- **Perhitungan shift:** `lib/services/attendance/shift.ts` → `computeShift(inMin,outMin,cfg)` mengembalikan `{ shift: "pagi"|"siang"|"longshift", status, lateMinutes, overtimeMinutes }`. **`overtimeMinutes` = menit lewat jam tutup shift** (pagi: `morningEnd` 16:00; siang/longshift: `storeClose` 21:00). Konfigurasi via `loadShiftConfig()` (tabel `Setting`, ada default aman).
- **Baris laporan:** `lib/services/attendance/report.ts` → `computeAttendanceRow`/`buildReport`. **Saat ini `ReportRow` membuang `shift` (hanya menyimpan `status`) dan tidak menyimpan `isHoliday`.** Keduanya perlu diekspos untuk struk (kolom Shift & baris libur / kolom LL).
- **Tarif lembur:** model `OvertimeCategory` (`name`, `type`, `rate`) di `prisma/schema.prisma`. Engine `lib/services/overtime/rate-my-staff.ts` sudah memetakan nama: "Lembur Libur" → flat, "Lembur Cetak" → hourly, "Longshift" → base + `LONGSHIFT_EXTRA_PER_HOUR (10000)`. GET `/api/overtime-categories` mengembalikan semua kategori.
- **Pola export PDF:** `lib/services/export/pdf.tsx` (`renderToBuffer(<Doc/>)`) + route `app/api/reports/export-pdf/route.ts` (Content-Type `application/pdf`, `Content-Disposition attachment`).
- **Pola export Excel:** `lib/services/export/excel.ts` (`ExcelJS.Workbook` → `writeBuffer` → `Buffer`) + route `app/api/attendance/report/export-excel/route.ts`.
- **Helper route:** `lib/http.ts` → `route()`, `requireSession()`, `requireManager()`, `json()`, `badRequest()`. Import DB via `@/lib/prisma`.
- **UI absensi:** `app/(dashboard)/attendance/page.tsx`, `app/(dashboard)/attendance/report/page.tsx`, layout+guard `app/(dashboard)/attendance/layout.tsx`. Fetcher `@/lib/fetcher` (`api<T>()`). Ikon `@/components/ui/icons`.
- **Test:** Vitest, `tests/*.test.ts`, alias `@/`. Contoh gaya: `tests/attendance-shift.test.ts`, `tests/attendance-report.test.ts`, `tests/overtime.test.ts`. Jalankan `npm test`.

### Pembacaan gambar acuan (`img-1784373172539-b8rpsu.png`)

Struk bulan April untuk 1 karyawan ("Faisal"):

| Bagian | Isi |
|---|---|
| Kolom | `Hari · Tanggal · [Jam Kerja: Masuk, Pulang] · [Keterangan: Shift, Terlambat, Lembur] · [Jumlah: LS, LC, LL]` |
| Baris Minggu | disorot **merah**, tanpa jam (libur / tidak kerja) |
| Footer | `Lembur Harian: Rp20.000 × 24 = Rp480.000` · `Lembur Libur: Rp70.000 × 4 = Rp280.000` · `Lembur Cetak: Rp10.000 × 3.00 = Rp30.000` · **Jumlah Rp790.000** |

**Pemetaan kolom → sumber & aturan (definisi user):**

- **LS = Longshift.** `=1` bila `shift === "longshift"` dan karyawan hadir (ada Masuk/Pulang) pada hari **bukan libur**. Subtotal footer **"Lembur Harian" = Σ LS × tarif harian** (acuan Rp20.000/hari).
- **LC = Lembur Cetak.** Lembur **per jam** yang dihitung **di atas jam 21:00 / melebihi shift kedua**. Basis = `overtimeMinutes` dari `computeShift` (yang untuk siang/longshift = menit lewat `storeClose` 21:00). `LC(jam) = overtimeMinutes / 60`. Subtotal **"Lembur Cetak" = Σ LC × tarif/jam** (acuan Rp10.000/jam). **Hanya berlaku shift siang/longshift** (lembur shift pagi lewat 16:00 **bukan** cetak).
- **LL = Lembur Libur.** `=1` bila hari **libur** (Minggu/Holiday) tapi karyawan **tetap hadir** (ada Masuk/Pulang). Dihitung 8 jam = 1 hari kerja. Subtotal **"Lembur Libur" = Σ LL × tarif libur** (acuan Rp70.000/hari).
- **Keterangan → Shift** = label shift (`Long`/`Pagi`/`Siang`/`—`). **Terlambat** = `lateMinutes`. **Lembur** = jam lembur mentah tampilan (`overtimeMinutes/60`, 2 desimal) — kolom display, boleh sama dengan basis LC.
- **Grand total** = jumlah tiga subtotal.

> ⚠️ **Data contoh pada gambar tidak 100% konsisten** dengan definisi (mis. LL=1 muncul di 01–04 Apr yang bukan Minggu; kolom Keterangan-Lembur 1.00 vs LC 2.00 di 02 Apr). Ini **dummy visual**. Implementasi **mengikuti definisi user di atas**, bukan angka dummy. Lihat **Open Questions** — konfirmasi sebelum menganggap final.

---

## Proposed Approach (ringkas)

1. Ekspos `shift` + `isHoliday` di `ReportRow` (perubahan kecil, ada test).
2. Pure builder `receipt.ts`: `ReportRow[]` (1 karyawan, 1 bulan) + `RateSet` → `ReceiptData`. **TDD, tanpa DB.**
3. Resolver tarif dari `OvertimeCategory` (+ fallback default). **TDD.**
4. Entry ber-DB `buildEmployeeReceipt` / `buildAllReceipts` (pakai `aggregateAttendance`).
5. Renderer PDF `receipt-pdf.tsx` + Excel `receipt-excel.ts` (satuan & massal).
6. Route API: preview JSON, export-pdf, export-excel (satuan & massal).
7. Halaman UI `/attendance/receipt` (pilih bulan/tahun/karyawan, preview mirip struk, tombol export).
8. Guard/RBAC, penamaan file, verifikasi.

**Prinsip:** builder & perhitungan = **pure functions** yang di-test tanpa DB (DRY: dipakai bareng PDF/Excel/UI). Route tipis. YAGNI: tidak menyimpan struk ke DB (dihitung on-the-fly).

---

## Keputusan (dikonfirmasi user 2026-07-18) & Open Questions sisa

**FINAL (dikonfirmasi):**
1. **Tarif dari `OvertimeCategory`.** Baca `OvertimeCategory.rate` by-nama (Longshift/Harian → daily; Lembur Libur → holiday; Lembur Cetak → cetak), fallback default 20000/70000/10000. → **Perlu memastikan ada kategori "Longshift" atau "Lembur Harian" bertarif per-HARI 20000** (beda dari konstanta `LONGSHIFT_EXTRA_PER_HOUR=10000` per jam). Bila belum ada, seed/informasikan user untuk menambah via halaman kategori lembur.
2. **LC = desimal apa adanya.** `overtimeMinutes/60` → 2 desimal (90 menit = 1.50). **Tidak** dibulatkan ke blok 1 jam. (Task 3 sudah sesuai.)
3. **LL hanya hari libur.** LL=1 hanya bila `isHoliday && worked`. Tidak ada LL di hari kerja biasa. (Task 3 sudah sesuai.)

**Open questions sisa (default aman, tak memblok):**
4. **Ambang "hadir" untuk LS/LL.** Default: ada Masuk **atau** Pulang = hadir (mesin kadang lupa satu sisi; `computeShift` sudah menoleransi).
5. **Massal — cakupan.** Default: ikut filter `department_id` bila ada, else semua karyawan aktif.

---

## Data shapes (acuan lintas task)

```ts
// lib/services/attendance/receipt.ts
export type ReceiptRateSet = {
  daily: number;   // Lembur Harian per longshift-day (default 20000)
  holiday: number; // Lembur Libur per holiday-workday (default 70000)
  cetak: number;   // Lembur Cetak per jam (default 10000)
};

export type ReceiptDayRow = {
  date: string;        // YYYY-MM-DD
  dayName: string;     // "Senin".. (Indonesia)
  isHoliday: boolean;
  clockIn: string | null;
  clockOut: string | null;
  shiftLabel: string;  // "Long" | "Pagi" | "Siang" | "—"
  lateMinutes: number;
  overtimeHours: number; // overtimeMinutes/60, 2 desimal (kolom Keterangan>Lembur)
  ls: number;          // 0 | 1
  lc: number;          // jam (2 desimal)
  ll: number;          // 0 | 1
  worked: boolean;
};

export type ReceiptData = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  year: number;
  month: number;       // 1-12
  monthLabel: string;  // "April 2026"
  rows: ReceiptDayRow[];
  totals: {
    lsCount: number; lcHours: number; llCount: number;
    dailyAmount: number; holidayAmount: number; cetakAmount: number;
    grandTotal: number;
  };
  rates: ReceiptRateSet;
};
```

---

## Step-by-Step Plan

### Task 1: Ekspos `shift` + `isHoliday` di `ReportRow`

**Objective:** `buildReport` mengembalikan `shift` (pagi/siang/longshift/null) dan `isHoliday` per baris, tanpa mengubah perilaku lain.

**Files:**
- Modify: `lib/services/attendance/report.ts`
- Test: `tests/attendance-report.test.ts`

**Step 1 — Test dulu (RED).** Tambah ke `tests/attendance-report.test.ts`:

```ts
test("mode shift mengekspos shift kind & isHoliday", () => {
  const row = computeAttendanceRow({
    employeeId: 1,
    date: "2026-04-01",
    schedule: null,
    isHoliday: false,
    shiftConfig: DEFAULT_SHIFT_CONFIG,
    scans: [
      { scanDate: "2026-04-01T08:00:00", scanType: "in", status: null, absenceReason: null },
      { scanDate: "2026-04-01T21:00:00", scanType: "out", status: null, absenceReason: null },
    ],
  });
  expect(row.shift).toBe("longshift");
  expect(row.isHoliday).toBe(false);
});

test("hari libur tanpa scan → isHoliday true, shift null", () => {
  const row = computeAttendanceRow({
    employeeId: 1, date: "2026-04-06", schedule: null, isHoliday: true,
    shiftConfig: DEFAULT_SHIFT_CONFIG, scans: [],
  });
  expect(row.isHoliday).toBe(true);
  expect(row.shift).toBeNull();
  expect(row.status).toBe("holiday");
});
```

Pastikan import `DEFAULT_SHIFT_CONFIG` ada di file test (tambah bila perlu).

**Step 2 — Run (RED):** `npm test -- attendance-report` → gagal (`shift`/`isHoliday` undefined).

**Step 3 — Implement (GREEN).** Di `lib/services/attendance/report.ts`:

- Tambah ke type `ReportRow`:
  ```ts
  shift: "pagi" | "siang" | "longshift" | null;
  isHoliday: boolean;
  ```
- Import: `import { computeShift, type ShiftConfig, type ShiftKind } from "./shift";`
- Di `base` (dalam `computeAttendanceRow`) tambah: `shift: null,` dan `isHoliday: input.isHoliday || (input.schedule?.isHoliday ?? false),`.
- Pada cabang `if (input.shiftConfig) { const sc = computeShift(...); return { ...base, ..., shift: sc.shift }; }` — sertakan `shift: sc.shift` (dan `isHoliday` sudah dari `base`).
- Semua `return { ...base, ... }` lain otomatis mewarisi `shift: null` + `isHoliday` dari `base`. Verifikasi cabang absence & holiday tetap benar.

**Step 4 — Run (GREEN):** `npm test -- attendance-report` → semua lulus. Jalankan `npm test` penuh untuk pastikan tak ada regresi pada `aggregate`/import.

**Step 5 — Commit:**
```bash
git add lib/services/attendance/report.ts tests/attendance-report.test.ts
git commit -m "feat(attendance): ekspos shift kind & isHoliday di ReportRow"
```

---

### Task 2: Teruskan `shift` + `isHoliday` melalui `aggregateAttendance`

**Objective:** `AttendanceReportResult.rows` menyertakan `shift` & `isHoliday` (tipe ikut otomatis karena spread `ReportRow`), tanpa memecah konsumer lama.

**Files:**
- Modify: `lib/services/attendance/aggregate.ts` (baris ~118-122, `.map`)
- Test: `tests/attendance-aggregate.test.ts` (buat baru, opsional bila mudah men-stub Prisma) — **atau** andалkan test builder di Task 4. Karena `aggregate` butuh `PrismaClient`, cukup verifikasi manual + type-check; **tidak wajib unit test DB di sini**.

**Step 1 — Implement.** `buildReport(days)` sudah menghasilkan baris ber-`shift`/`isHoliday` (dari Task 1). Pastikan `.map` di `aggregate.ts` tidak menghapusnya — ia hanya menambah `fullName`/`department` via spread `...r`, jadi **sudah ikut**. Tak ada perubahan kode wajib; **tambahkan komentar** menegaskan `shift`/`isHoliday` tersedia untuk struk.

**Step 2 — Verify:** `npx tsc --noEmit` bersih. `npm test` hijau.

**Step 3 — Commit** (jika ada perubahan komentar):
```bash
git add lib/services/attendance/aggregate.ts
git commit -m "chore(attendance): tegaskan shift/isHoliday mengalir ke hasil agregasi"
```

---

### Task 3: Pure builder `buildReceipt` (inti — TDD tanpa DB)

**Objective:** Fungsi murni mengubah baris satu bulan-satu karyawan → `ReceiptData` dengan LS/LC/LL + subtotal + grand total.

**Files:**
- Create: `lib/services/attendance/receipt.ts`
- Test: `tests/attendance-receipt.test.ts`

**Step 1 — Test dulu (RED).** `tests/attendance-receipt.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildReceipt, type ReceiptInput } from "@/lib/services/attendance/receipt";

const rates = { daily: 20000, holiday: 70000, cetak: 10000 };
const base = {
  employeeId: 1, employeeName: "Faisal", employeeCode: "EMP001",
  department: "Toko", year: 2026, month: 4, rates,
};
const mk = (over: Partial<ReceiptInput["rows"][number]>) => ({
  date: "2026-04-01", shift: null, isHoliday: false, clockIn: null, clockOut: null,
  lateMinutes: 0, overtimeMinutes: 0, status: "absent", ...over,
});

describe("buildReceipt", () => {
  test("longshift hari kerja → LS=1, LC dari overtime, Lembur Harian", () => {
    const d = buildReceipt({ ...base, rows: [
      mk({ date: "2026-04-01", shift: "longshift", clockIn: "08:00", clockOut: "22:00", overtimeMinutes: 60, status: "longshift" }),
    ] });
    const row = d.rows[0];
    expect(row.ls).toBe(1);
    expect(row.lc).toBe(1);      // 60m = 1.00 jam
    expect(row.ll).toBe(0);
    expect(row.shiftLabel).toBe("Long");
    expect(row.dayName).toBe("Rabu"); // 2026-04-01 = Rabu
    expect(d.totals.lsCount).toBe(1);
    expect(d.totals.dailyAmount).toBe(20000);
    expect(d.totals.cetakAmount).toBe(10000); // 1 jam * 10000
  });

  test("hari libur tetap masuk → LL=1, Lembur Libur", () => {
    const d = buildReceipt({ ...base, rows: [
      mk({ date: "2026-04-05", isHoliday: true, shift: "siang", clockIn: "13:00", clockOut: "21:00", status: "on_time" }),
    ] });
    expect(d.rows[0].ll).toBe(1);
    expect(d.rows[0].ls).toBe(0); // libur tidak dihitung LS
    expect(d.totals.llCount).toBe(1);
    expect(d.totals.holidayAmount).toBe(70000);
  });

  test("shift pagi lembur lewat 16:00 → BUKAN LC (cetak hanya siang/longshift)", () => {
    const d = buildReceipt({ ...base, rows: [
      mk({ date: "2026-04-02", shift: "pagi", clockIn: "08:00", clockOut: "17:00", overtimeMinutes: 60, status: "on_time" }),
    ] });
    expect(d.rows[0].lc).toBe(0);
    expect(d.totals.cetakAmount).toBe(0);
  });

  test("hari libur kosong → baris tetap ada, semua 0", () => {
    const d = buildReceipt({ ...base, rows: [ mk({ date: "2026-04-06", isHoliday: true, status: "holiday" }) ] });
    expect(d.rows[0].worked).toBe(false);
    expect(d.rows[0].ll).toBe(0);
    expect(d.totals.grandTotal).toBe(0);
  });

  test("grand total = jumlah tiga subtotal", () => {
    const d = buildReceipt({ ...base, rows: [
      mk({ date: "2026-04-01", shift: "longshift", clockIn: "08:00", clockOut: "22:00", overtimeMinutes: 120, status: "longshift" }),
      mk({ date: "2026-04-05", isHoliday: true, shift: "siang", clockIn: "13:00", clockOut: "21:00", status: "on_time" }),
    ] });
    expect(d.totals.grandTotal).toBe(
      d.totals.dailyAmount + d.totals.holidayAmount + d.totals.cetakAmount
    );
    expect(d.monthLabel).toBe("April 2026");
  });
});
```

**Step 2 — Run (RED):** `npm test -- attendance-receipt` → gagal (modul belum ada).

**Step 3 — Implement (GREEN).** `lib/services/attendance/receipt.ts`:

```ts
import type { ReportRow } from "./report";

export type ReceiptRateSet = { daily: number; holiday: number; cetak: number };

export type ReceiptInputRow = Pick<
  ReportRow,
  "date" | "shift" | "isHoliday" | "clockIn" | "clockOut" | "lateMinutes" | "overtimeMinutes" | "status"
>;

export type ReceiptInput = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  year: number;   // mis. 2026
  month: number;  // 1-12
  rates: ReceiptRateSet;
  rows: ReceiptInputRow[];
};

export type ReceiptDayRow = {
  date: string; dayName: string; isHoliday: boolean;
  clockIn: string | null; clockOut: string | null;
  shiftLabel: string; lateMinutes: number; overtimeHours: number;
  ls: number; lc: number; ll: number; worked: boolean;
};

export type ReceiptData = {
  employeeId: number; employeeName: string; employeeCode: string; department: string | null;
  year: number; month: number; monthLabel: string;
  rows: ReceiptDayRow[];
  totals: {
    lsCount: number; lcHours: number; llCount: number;
    dailyAmount: number; holidayAmount: number; cetakAmount: number; grandTotal: number;
  };
  rates: ReceiptRateSet;
};

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const SHIFT_LABEL: Record<string, string> = { longshift: "Long", pagi: "Pagi", siang: "Siang" };

/** Bulatkan menit lembur ke jam, 2 desimal. */
function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function buildReceipt(input: ReceiptInput): ReceiptData {
  const rows: ReceiptDayRow[] = input.rows.map((r) => {
    const worked = Boolean(r.clockIn || r.clockOut);
    const otHours = r.overtimeMinutes > 0 ? toHours(r.overtimeMinutes) : 0;
    // LS: longshift di hari kerja & hadir.
    const ls = worked && !r.isHoliday && r.shift === "longshift" ? 1 : 0;
    // LL: hari libur tapi tetap hadir.
    const ll = worked && r.isHoliday ? 1 : 0;
    // LC: lembur per jam hanya shift siang/longshift (lembur lewat 21:00), tidak di hari libur (sudah dihitung LL).
    const lc = worked && !r.isHoliday && (r.shift === "siang" || r.shift === "longshift") ? otHours : 0;
    const [y, m, d] = r.date.split("-").map(Number);
    const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    return {
      date: r.date, dayName, isHoliday: r.isHoliday,
      clockIn: r.clockIn, clockOut: r.clockOut,
      shiftLabel: r.shift ? SHIFT_LABEL[r.shift] ?? "—" : "—",
      lateMinutes: r.lateMinutes, overtimeHours: otHours,
      ls, lc, ll, worked,
    };
  });

  const lsCount = rows.reduce((s, r) => s + r.ls, 0);
  const llCount = rows.reduce((s, r) => s + r.ll, 0);
  const lcHours = Math.round(rows.reduce((s, r) => s + r.lc, 0) * 100) / 100;
  const dailyAmount = lsCount * input.rates.daily;
  const holidayAmount = llCount * input.rates.holiday;
  const cetakAmount = Math.round(lcHours * input.rates.cetak);
  const grandTotal = dailyAmount + holidayAmount + cetakAmount;

  return {
    employeeId: input.employeeId, employeeName: input.employeeName,
    employeeCode: input.employeeCode, department: input.department,
    year: input.year, month: input.month,
    monthLabel: `${MONTHS[input.month - 1]} ${input.year}`,
    rows,
    totals: { lsCount, lcHours, llCount, dailyAmount, holidayAmount, cetakAmount, grandTotal },
    rates: input.rates,
  };
}
```

**Step 4 — Run (GREEN):** `npm test -- attendance-receipt` → semua lulus.

**Step 5 — Commit:**
```bash
git add lib/services/attendance/receipt.ts tests/attendance-receipt.test.ts
git commit -m "feat(attendance): pure builder struk bulanan (LS/LC/LL + subtotal)"
```

---

### Task 4: Resolver tarif dari `OvertimeCategory`

**Objective:** Fungsi murni memetakan daftar `OvertimeCategory` → `ReceiptRateSet` dengan fallback default (20000/70000/10000).

**Files:**
- Create: `lib/services/attendance/receipt-rates.ts`
- Test: `tests/attendance-receipt.test.ts` (tambah `describe` baru)

**Step 1 — Test (RED).** Tambah:

```ts
import { resolveReceiptRates, DEFAULT_RECEIPT_RATES } from "@/lib/services/attendance/receipt-rates";

describe("resolveReceiptRates", () => {
  test("map by-nama (case-insensitive contains)", () => {
    const r = resolveReceiptRates([
      { name: "Longshift", rate: 20000 },
      { name: "Lembur Libur", rate: 70000 },
      { name: "Lembur Cetak", rate: 10000 },
    ]);
    expect(r).toEqual({ daily: 20000, holiday: 70000, cetak: 10000 });
  });
  test("fallback default bila kategori tidak lengkap", () => {
    expect(resolveReceiptRates([])).toEqual(DEFAULT_RECEIPT_RATES);
  });
});
```

**Step 2 — Run (RED):** `npm test -- attendance-receipt` → gagal (modul belum ada).

**Step 3 — Implement (GREEN).** `lib/services/attendance/receipt-rates.ts`:

```ts
import type { ReceiptRateSet } from "./receipt";

export const DEFAULT_RECEIPT_RATES: ReceiptRateSet = { daily: 20000, holiday: 70000, cetak: 10000 };

export type CategoryLike = { name: string; rate: number | { toString(): string } };

function num(v: CategoryLike["rate"]): number {
  return typeof v === "number" ? v : Number(v.toString());
}

/**
 * Petakan OvertimeCategory → tarif struk (by-nama, case-insensitive contains):
 * - "longshift" atau "harian" → daily (Lembur Harian per longshift-day)
 * - "libur"                   → holiday (Lembur Libur)
 * - "cetak"                   → cetak (Lembur Cetak per jam)
 * Sisanya diabaikan; yang kosong pakai DEFAULT_RECEIPT_RATES.
 */
export function resolveReceiptRates(categories: CategoryLike[]): ReceiptRateSet {
  const out: ReceiptRateSet = { ...DEFAULT_RECEIPT_RATES };
  for (const c of categories) {
    const n = c.name.toLowerCase();
    if (n.includes("libur")) out.holiday = num(c.rate);
    else if (n.includes("cetak")) out.cetak = num(c.rate);
    else if (n.includes("longshift") || n.includes("harian")) out.daily = num(c.rate);
  }
  return out;
}
```

**Step 4 — Run (GREEN):** `npm test -- attendance-receipt` → lulus.

**Step 5 — Commit:**
```bash
git add lib/services/attendance/receipt-rates.ts tests/attendance-receipt.test.ts
git commit -m "feat(attendance): resolver tarif struk dari OvertimeCategory + default"
```

---

### Task 5: Entry ber-DB `buildEmployeeReceipt` / `buildAllReceipts`

**Objective:** Fungsi yang mengambil data via `aggregateAttendance` + `OvertimeCategory`, lalu memanggil `buildReceipt` untuk satu / banyak karyawan.

**Files:**
- Create: `lib/services/attendance/receipt-source.ts`
- (Tanpa unit test DB — diverifikasi lewat route + manual. Pure logic sudah teruji di Task 3-4.)

**Step 1 — Implement.** `lib/services/attendance/receipt-source.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { aggregateAttendance } from "./aggregate";
import { buildReceipt, type ReceiptData } from "./receipt";
import { resolveReceiptRates } from "./receipt-rates";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // hari terakhir bulan
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startStr: ymd(start), endStr: ymd(end) };
}

async function loadRates(prisma: PrismaClient) {
  const cats = await prisma.overtimeCategory.findMany();
  return resolveReceiptRates(cats.map((c) => ({ name: c.name, rate: c.rate })));
}

/** Struk 1 karyawan untuk 1 bulan. */
export async function buildEmployeeReceipt(
  prisma: PrismaClient, employeeId: number, year: number, month: number
): Promise<ReceiptData | null> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId }, include: { department: true },
  });
  if (!emp) return null;
  const { startStr, endStr } = monthRange(year, month);
  const [{ rows }, rates] = await Promise.all([
    aggregateAttendance(prisma, { startStr, endStr, employeeId: String(employeeId) }),
    loadRates(prisma),
  ]);
  return buildReceipt({
    employeeId: emp.id, employeeName: emp.fullName, employeeCode: emp.employeeCode,
    department: emp.department?.name ?? null, year, month, rates,
    rows: rows.map((r) => ({
      date: r.date, shift: r.shift, isHoliday: r.isHoliday,
      clockIn: r.clockIn, clockOut: r.clockOut,
      lateMinutes: r.lateMinutes, overtimeMinutes: r.overtimeMinutes, status: r.status,
    })),
  });
}

/** Struk semua karyawan aktif (opsional filter departemen) untuk 1 bulan. */
export async function buildAllReceipts(
  prisma: PrismaClient, year: number, month: number, departmentId?: number | null
): Promise<ReceiptData[]> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true, ...(departmentId ? { departmentId } : {}) },
    orderBy: { fullName: "asc" }, select: { id: true },
  });
  const out: ReceiptData[] = [];
  for (const e of employees) {
    const r = await buildEmployeeReceipt(prisma, e.id, year, month);
    if (r) out.push(r);
  }
  return out;
}
```

> **Catatan efisiensi (YAGNI dulu):** `buildAllReceipts` memanggil `aggregateAttendance` per karyawan agar `showAllDates` aktif (butuh `employeeId`). Untuk skala toko (<~50 karyawan) ini cukup. Bila kelak lambat, refactor `aggregateAttendance` agar bisa "semua tanggal untuk semua karyawan". Catat sebagai TODO, jangan optimasi sekarang.

**Step 2 — Verify:** `npx tsc --noEmit` bersih.

**Step 3 — Commit:**
```bash
git add lib/services/attendance/receipt-source.ts
git commit -m "feat(attendance): sumber data struk (satuan & massal) via aggregate + tarif"
```

---

### Task 6: Renderer Excel struk (`buildReceiptExcel`)

**Objective:** Workbook Excel — satu sheet per karyawan (massal) atau satu sheet (satuan) — meniru layout struk + baris footer subtotal.

**Files:**
- Create: `lib/services/export/receipt-excel.ts`
- Test: `tests/receipt-export.test.ts` (smoke: buffer non-kosong, tak lempar)

**Step 1 — Test (RED).** `tests/receipt-export.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

const sample: ReceiptData = {
  employeeId: 1, employeeName: "Faisal", employeeCode: "EMP001", department: "Toko",
  year: 2026, month: 4, monthLabel: "April 2026",
  rows: [{
    date: "2026-04-01", dayName: "Rabu", isHoliday: false, clockIn: "08:00", clockOut: "22:00",
    shiftLabel: "Long", lateMinutes: 0, overtimeHours: 1, ls: 1, lc: 1, ll: 0, worked: true,
  }],
  totals: { lsCount: 1, lcHours: 1, llCount: 0, dailyAmount: 20000, holidayAmount: 0, cetakAmount: 10000, grandTotal: 30000 },
  rates: { daily: 20000, holiday: 70000, cetak: 10000 },
};

describe("buildReceiptExcel", () => {
  test("satuan → buffer valid", async () => {
    const buf = await buildReceiptExcel([sample]);
    expect(buf.length).toBeGreaterThan(0);
  });
  test("massal → tidak lempar untuk banyak karyawan", async () => {
    const buf = await buildReceiptExcel([sample, { ...sample, employeeId: 2, employeeName: "Budi" }]);
    expect(buf.length).toBeGreaterThan(0);
  });
});
```

**Step 2 — Run (RED):** `npm test -- receipt-export` → gagal.

**Step 3 — Implement (GREEN).** `lib/services/export/receipt-excel.ts` — pola ikut `excel.ts`. Kunci: satu worksheet per `ReceiptData`, header dua baris (grup Jam Kerja/Keterangan/Jumlah), baris data, lalu blok footer subtotal. Warnai baris libur merah (`fgColor FFFFC7CE`). Nama sheet ≤31 char & unik (pakai `employeeCode`/index). Format Rupiah via `numFmt` `#,##0` atau helper `Rp`.

Struktur minimal:
```ts
import ExcelJS from "exceljs";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function addSheet(wb: ExcelJS.Workbook, data: ReceiptData, idx: number) {
  const safe = `${data.employeeCode || data.employeeId}`.slice(0, 20);
  const ws = wb.addWorksheet(`${safe}-${idx + 1}`.slice(0, 31));
  ws.addRow([data.employeeName]);            // judul
  ws.addRow([`${data.department ?? "-"} · ${data.monthLabel}`]);
  ws.addRow([]);
  const head = ws.addRow(["Hari","Tanggal","Masuk","Pulang","Shift","Terlambat","Lembur","LS","LC","LL"]);
  head.font = { bold: true };
  head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }));
  for (const r of data.rows) {
    const row = ws.addRow([
      r.dayName, r.date, r.clockIn ?? "", r.clockOut ?? "", r.shiftLabel,
      r.lateMinutes || 0, r.overtimeHours || "", r.ls || "", r.lc || "", r.ll || "",
    ]);
    if (r.isHoliday && !r.worked)
      row.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } }));
  }
  ws.addRow([]);
  ws.addRow(["Lembur Harian", rp(data.rates.daily), data.totals.lsCount, rp(data.totals.dailyAmount)]);
  ws.addRow(["Lembur Libur", rp(data.rates.holiday), data.totals.llCount, rp(data.totals.holidayAmount)]);
  ws.addRow(["Lembur Cetak", rp(data.rates.cetak), data.totals.lcHours, rp(data.totals.cetakAmount)]);
  const tot = ws.addRow(["Jumlah", "", "", rp(data.totals.grandTotal)]);
  tot.font = { bold: true };
  ws.columns.forEach((c) => (c.width = 12));
}

export async function buildReceiptExcel(receipts: ReceiptData[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  receipts.forEach((r, i) => addSheet(wb, r, i));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
```

**Step 4 — Run (GREEN):** `npm test -- receipt-export`.

**Step 5 — Commit:**
```bash
git add lib/services/export/receipt-excel.ts tests/receipt-export.test.ts
git commit -m "feat(export): Excel struk absensi (satuan & massal, footer subtotal)"
```

---

### Task 7: Renderer PDF struk (`buildReceiptPdf`)

**Objective:** PDF meniru gambar — judul karyawan, tabel harian (baris libur merah), footer subtotal + grand total. Massal = satu dokumen banyak `Page` (satu per karyawan).

**Files:**
- Create: `lib/services/export/receipt-pdf.tsx`
- Test: tambah ke `tests/receipt-export.test.ts`

**Step 1 — Test (RED).** Tambah:
```ts
import { buildReceiptPdf } from "@/lib/services/export/receipt-pdf";
test("PDF struk → buffer valid", async () => {
  const buf = await buildReceiptPdf([sample], "2026-07-18 18:00");
  expect(buf.length).toBeGreaterThan(0);
});
```

**Step 2 — Run (RED):** gagal.

**Step 3 — Implement (GREEN).** `lib/services/export/receipt-pdf.tsx` — pola ikut `pdf.tsx` (`Document`/`Page`/`View`/`Text`/`StyleSheet`/`renderToBuffer`). Satu `Page size="A4"` per `ReceiptData`. Kolom lebar: Hari 10%, Tanggal 10%, Masuk 10%, Pulang 10%, Shift 10%, Telat 9%, Lembur 9%, LS 7%, LC 8%, LL 7%. Baris libur (`isHoliday && !worked`) `backgroundColor: "#fecaca"`. Footer: tiga baris subtotal + `Jumlah` grand total (bold, `n.toLocaleString("id-ID")`). Gunakan `fontFamily: "Helvetica"` (built-in, tak perlu font eksternal). Key unik per Page & per row.

**Step 4 — Run (GREEN):** `npm test -- receipt-export`.

**Step 5 — Commit:**
```bash
git add lib/services/export/receipt-pdf.tsx tests/receipt-export.test.ts
git commit -m "feat(export): PDF struk absensi (satuan & massal, mirror layout)"
```

---

### Task 8: Route API — preview JSON

**Objective:** `GET /api/attendance/receipt?employee_id=&year=&month=` → `ReceiptData` (untuk UI preview).

**Files:**
- Create: `app/api/attendance/receipt/route.ts`

**Step 1 — Implement.**
```ts
import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { buildEmployeeReceipt } from "@/lib/services/attendance/receipt-source";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const employeeId = Number(sp.get("employee_id"));
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  if (!employeeId || month < 1 || month > 12) return badRequest({ message: "employee_id & month wajib" });
  const data = await buildEmployeeReceipt(prisma, employeeId, year, month);
  if (!data) return notFound("Karyawan tidak ditemukan");
  return json(data);
});
```

**Step 2 — Verify:** `npx tsc --noEmit`. (Uji manual di Task 11.)

**Step 3 — Commit:**
```bash
git add app/api/attendance/receipt/route.ts
git commit -m "feat(api): preview JSON struk absensi per karyawan"
```

---

### Task 9: Route API — export Excel (satuan & massal)

**Objective:** `GET /api/attendance/receipt/export-excel?year=&month=[&employee_id=][&department_id=]` → `.xlsx`. Ada `employee_id` = satuan; tanpa = massal.

**Files:**
- Create: `app/api/attendance/receipt/export-excel/route.ts`

**Step 1 — Implement.**
```ts
import { prisma } from "@/lib/prisma";
import { requireSession, route, notFound } from "@/lib/http";
import { buildEmployeeReceipt, buildAllReceipts } from "@/lib/services/attendance/receipt-source";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  const employeeId = sp.get("employee_id");
  const departmentId = sp.get("department_id");

  const receipts = employeeId
    ? [await buildEmployeeReceipt(prisma, Number(employeeId), year, month)].filter(Boolean)
    : await buildAllReceipts(prisma, year, month, departmentId ? Number(departmentId) : null);
  if (receipts.length === 0) return notFound("Tidak ada data");

  const buffer = await buildReceiptExcel(receipts as NonNullable<typeof receipts[number]>[]);
  const name = employeeId ? `struk-${employeeId}-${year}-${month}` : `struk-massal-${year}-${month}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
});
```

**Step 2 — Verify:** `npx tsc --noEmit`.

**Step 3 — Commit:**
```bash
git add app/api/attendance/receipt/export-excel/route.ts
git commit -m "feat(api): export Excel struk (satuan & massal)"
```

---

### Task 10: Route API — export PDF (satuan & massal)

**Objective:** `GET /api/attendance/receipt/export-pdf?...` → `application/pdf` (mirror Task 9, pakai `buildReceiptPdf`).

**Files:**
- Create: `app/api/attendance/receipt/export-pdf/route.ts`

**Step 1 — Implement.** Sama seperti Task 9 tapi:
```ts
import { buildReceiptPdf } from "@/lib/services/export/receipt-pdf";
// ...
const generatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
const buffer = await buildReceiptPdf(receipts as ..., generatedAt);
return new Response(new Uint8Array(buffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${name}.pdf"`,
  },
});
```

**Step 2 — Verify:** `npx tsc --noEmit`.

**Step 3 — Commit:**
```bash
git add app/api/attendance/receipt/export-pdf/route.ts
git commit -m "feat(api): export PDF struk (satuan & massal)"
```

---

### Task 11: Halaman UI `/attendance/receipt`

**Objective:** Halaman client memilih bulan/tahun/karyawan (+departemen untuk massal), menampilkan **preview** struk mirip gambar, dengan tombol **Export PDF** & **Export Excel** (satuan bila karyawan dipilih; massal bila tidak).

**Files:**
- Create: `app/(dashboard)/attendance/receipt/page.tsx`
- Modify (opsional): navigasi/tab absensi bila ada komponen tab bersama (cek `app/(dashboard)/attendance/layout.tsx` & `report/page.tsx` — tambah link "Struk" bila ada baris tab).

**Step 1 — Implement.** Ikuti gaya `attendance/report/page.tsx`:
- State: `year`, `month` (1-12), `employeeId`, `departmentId`.
- Ambil daftar karyawan & departemen (`/api/assessments/employees`, `/api/departments`) seperti report page.
- Bila `employeeId` terisi → `api<ReceiptData>('/api/attendance/receipt?employee_id=&year=&month=')` untuk preview; render tabel: kolom Hari/Tanggal/Masuk/Pulang/Shift/Terlambat/Lembur/LS/LC/LL. Baris `isHoliday && !worked` beri kelas latar merah lembut (`style softChip('var(--danger)')` atau `bg-danger/10`). Footer: tiga baris subtotal + grand total besar (mirip gambar).
- Bila tidak ada `employeeId` → sembunyikan preview, tampilkan info "Pilih karyawan untuk pratinjau, atau export massal".
- Tombol export: bangun URL query (`year`,`month`, + `employee_id` bila ada, else `department_id` bila ada). `<a href={pdfUrl} className="btn-ghost">Export PDF</a>` & `<a href={xlsxUrl} className="btn-ghost">Export Excel</a>` (pola `report/page.tsx` baris ~163).
- Format Rupiah: `n.toLocaleString('id-ID')`.

**Step 2 — Verify manual (jalankan app):**
```bash
npm run dev
```
Buka `/attendance/receipt`, pilih karyawan + bulan → preview muncul, angka LS/LC/LL & subtotal masuk akal. Klik Export PDF & Excel (satuan) → file terunduh & terbuka benar. Kosongkan karyawan → Export massal → file berisi banyak karyawan/sheet/halaman.

**Step 3 — Commit:**
```bash
git add app/(dashboard)/attendance/receipt/page.tsx app/(dashboard)/attendance/layout.tsx
git commit -m "feat(ui): halaman struk absensi + preview & tombol export PDF/Excel"
```

---

### Task 12: RBAC / guard & finishing

**Objective:** Pastikan akses konsisten dengan halaman absensi lain, penamaan file benar, tak ada regresi.

**Files:**
- Cek: `app/(dashboard)/attendance/layout.tsx` (guard layout — jangan taruh guard di proxy, sesuai memori Security & RBAC). Halaman baru berada di bawah layout ini sehingga terlindungi otomatis.
- Route export sudah `requireSession()`. Bila kebijakan mengharuskan hanya manajemen bisa export, ganti ke `requireManager()` (konfirmasi — default: `requireSession`).

**Step 1 — Verify menyeluruh:**
```bash
npm test            # semua unit hijau (report, receipt, receipt-export)
npx tsc --noEmit    # tak ada error tipe
npm run lint        # bersih
npm run build       # build produksi sukses (prisma generate + next build)
```

**Step 2 — Commit akhir (bila ada penyesuaian):**
```bash
git add -A
git commit -m "chore(attendance): finishing struk absensi (guard, lint, build)"
```

---

## Files Likely to Change / Create

**Create:**
- `lib/services/attendance/receipt.ts` — pure builder LS/LC/LL + subtotal
- `lib/services/attendance/receipt-rates.ts` — resolver tarif dari OvertimeCategory
- `lib/services/attendance/receipt-source.ts` — entry ber-DB (satuan & massal)
- `lib/services/export/receipt-excel.ts` — Excel struk
- `lib/services/export/receipt-pdf.tsx` — PDF struk
- `app/api/attendance/receipt/route.ts` — preview JSON
- `app/api/attendance/receipt/export-excel/route.ts`
- `app/api/attendance/receipt/export-pdf/route.ts`
- `app/(dashboard)/attendance/receipt/page.tsx` — UI
- `tests/attendance-receipt.test.ts`, `tests/receipt-export.test.ts`

**Modify:**
- `lib/services/attendance/report.ts` — tambah `shift` + `isHoliday` ke `ReportRow`
- `lib/services/attendance/aggregate.ts` — komentar (field mengalir otomatis)
- `tests/attendance-report.test.ts` — test field baru
- (opsional) `app/(dashboard)/attendance/layout.tsx` — link tab "Struk"

## Tests / Validation

- **Unit (Vitest):** `report` (field baru), `receipt` (LS/LC/LL/subtotal/grandtotal, edge: libur kosong, pagi bukan-LC), `receipt-rates` (mapping + fallback), `receipt-export` (smoke PDF/Excel buffer). Perintah: `npm test`.
- **Type:** `npx tsc --noEmit`. **Lint:** `npm run lint`. **Build:** `npm run build`.
- **Manual E2E:** `npm run dev` → `/attendance/receipt`: preview 1 karyawan cocok dengan halaman Laporan Absensi; export PDF/Excel satuan & massal terunduh dan terbuka; baris Minggu/libur merah; footer subtotal & grand total benar.

## Risks, Tradeoffs, Open Questions

- **Aturan bisnis LS/LC/LL & tarif belum 100% terkonfirmasi** — lihat **Open Questions**. Implementasi memakai default ter-parametrisasi; mudah disetel setelah user menjawab. Data dummy di gambar **tidak** dijadikan sumber kebenaran.
- **Performa massal:** `buildAllReceipts` memanggil `aggregateAttendance` per karyawan (perlu `showAllDates`). Aman untuk skala toko; catat TODO refactor bila lambat. **Jangan** optimasi prematur (YAGNI).
- **Font PDF:** pakai Helvetica built-in `@react-pdf/renderer` (tanpa font eksternal) agar tak menambah dependensi/aset.
- **Zona waktu:** `aggregateAttendance` memakai konstruksi `Date` lokal server; struk bulanan memakai batas bulan lokal — konsisten dengan report page yang sudah ada. Pastikan server TZ = Asia/Jakarta di deploy (PM2/homelab).
- **Nama sheet Excel** dibatasi 31 char & harus unik → pakai `employeeCode`+index.
```
