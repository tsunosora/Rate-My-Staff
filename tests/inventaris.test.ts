// Inventaris kantor & ringkasan penilaian untuk aplikasi HP Owner.
import { describe, expect, test } from "vitest";
import {
  cekJumlahBaru,
  hitungBarang,
  inventarisCreateSchema,
  kembaliSchema,
  ringkasInventaris,
} from "@/lib/services/inventaris";
import { rentangBulan, ringkasPenilaian, type BarisPenilaian } from "@/lib/services/assessment-summary";
import { ATURAN_API, ATURAN_HALAMAN, fiturUntuk } from "@/lib/lisensi/aturan-jalur";

describe("hitungBarang", () => {
  test("dipegang hanya dari peminjaman yang belum kembali", () => {
    const h = hitungBarang({
      jumlah: 46,
      rusakHilang: 2,
      peminjaman: [
        { jumlah: 30, dikembalikanPada: null },
        { jumlah: 2, dikembalikanPada: null },
        { jumlah: 5, dikembalikanPada: new Date() },
      ],
    });
    expect(h).toEqual({ dipegang: 32, rusakHilang: 2, tersedia: 12 });
  });

  test("tersedia tidak pernah negatif", () => {
    expect(hitungBarang({ jumlah: 1, rusakHilang: 1, peminjaman: [{ jumlah: 1, dikembalikanPada: null }] }).tersedia).toBe(0);
  });

  test("ringkasan menjumlah semua barang", () => {
    expect(
      ringkasInventaris([
        { dipegang: 4, tersedia: 1, rusakHilang: 0 },
        { dipegang: 0, tersedia: 0, rusakHilang: 3 },
      ])
    ).toEqual({ barang: 2, dipegang: 4, tersedia: 1, rusakHilang: 3 });
  });
});

describe("validasi", () => {
  test("jumlah baru tidak boleh di bawah dipegang + rusak", () => {
    expect(cekJumlahBaru(5, 1, 4)).toBeNull();
    expect(cekJumlahBaru(4, 1, 4)).toMatch(/minimal 5/);
  });

  test("kategori asing ditolak, bawaan lainnya", () => {
    expect(inventarisCreateSchema.safeParse({ nama: "Kaos", jumlah: 3, kategori: "mobil" }).success).toBe(false);
    const ok = inventarisCreateSchema.parse({ nama: " Kaos ", jumlah: "3" });
    expect(ok).toMatchObject({ nama: "Kaos", jumlah: 3, kategori: "lainnya" });
  });

  test("kondisi kembali bawaan baik", () => {
    expect(kembaliSchema.parse({ peminjamanId: 1 }).kondisi).toBe("baik");
  });
});

describe("ringkasPenilaian", () => {
  const b = (id: number, employeeId: number, status: BarisPenilaian["status"], grade: string | null): BarisPenilaian => ({
    id,
    employeeId,
    fullName: `K${employeeId}`,
    department: null,
    totalScore: 4,
    grade,
    status,
    assessmentDate: "2026-09-10T00:00:00.000Z",
    evaluator: null,
  });

  test("status dari semua, grade tanpa draft, karyawan = penilaian terakhir", () => {
    const r = ringkasPenilaian([b(3, 1, "completed", "Baik"), b(2, 1, "draft", "Cukup"), b(1, 2, "approved", "Sangat Baik")]);
    expect(r.status).toEqual({ draft: 1, completed: 1, approved: 1 });
    expect(r.grades).toEqual({ Baik: 1, "Sangat Baik": 1 });
    expect(r.employees.map((e) => e.id)).toEqual([3, 1]);
  });

  test("rentang bulan; parameter aneh = bulan ini", () => {
    const r = rentangBulan("2026", "12");
    expect(r.mulai.getMonth()).toBe(11);
    expect(r.akhir.getFullYear()).toBe(2027);
    const now = new Date(2026, 9, 17);
    expect(rentangBulan("x", "13", now)).toMatchObject({ year: 2026, month: 10 });
  });
});

describe("jalur baru dipetakan ke fitur", () => {
  test("inventaris ikut hr.employees, rating tamu ikut hr.guest_rating", () => {
    expect(fiturUntuk("/api/inventaris/3/pinjam", ATURAN_API)).toBe("hr.employees");
    expect(fiturUntuk("/inventaris", ATURAN_HALAMAN)).toBe("hr.employees");
    expect(fiturUntuk("/api/reports/guest-rating", ATURAN_API)).toBe("hr.guest_rating");
    expect(fiturUntuk("/api/assessments/ringkasan", ATURAN_API)).toBe("hr.assessment");
  });
});
