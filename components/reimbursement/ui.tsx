"use client";

import { errorMessageFrom } from "@/lib/fetcher";
import { soft } from "@/components/portal/ui";

/** Satu klaim seperti dikirim API (lib/services/reimbursement/service.ts → serialisasi). */
export type Klaim = {
  id: number;
  employeeId: number;
  tanggal: string;
  kategori: string;
  kategoriLabel: string;
  jumlah: number;
  jumlahDisetujui: number | null;
  keterangan: string;
  adaFoto: boolean;
  status: "menunggu" | "disetujui" | "ditolak" | "dibayar";
  sumber: string;
  catatanKeputusan: string | null;
  decidedAt: string | null;
  dibayarAt: string | null;
  createdAt: string;
};

export const PILIHAN_KATEGORI = [
  { key: "transport", label: "Transport" },
  { key: "makan", label: "Makan" },
  { key: "bensin", label: "Bensin" },
  { key: "parkir", label: "Parkir" },
  { key: "belanja", label: "Belanja" },
  { key: "lainnya", label: "Lainnya" },
] as const;

const META_STATUS: Record<string, { label: string; color: string }> = {
  menunggu: { label: "Menunggu", color: "var(--warning)" },
  disetujui: { label: "Disetujui", color: "var(--info)" },
  ditolak: { label: "Ditolak", color: "var(--danger)" },
  dibayar: { label: "Dibayar", color: "var(--success)" },
};

export function StatusKlaim({ status }: { status: string }) {
  const m = META_STATUS[status] ?? { label: status, color: "var(--fg-subtle)" };
  return (
    <span className="badge" style={{ ...soft(m.color, 18), color: m.color }}>
      {m.label}
    </span>
  );
}

/** 15000 -> "Rp15.000" (desimal ditampilkan kalau ada). */
export function rp(n: number): string {
  return `Rp${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

/** Ketikan jumlah -> tampilan berpemisah ribuan ("15000" -> "15.000"); cuma angka bulat. */
export function rapikanJumlah(v: string): string {
  const digit = v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 11);
  return digit ? Number(digit).toLocaleString("id-ID") : "";
}

export function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" sekian hari ke belakang (batas bawah pemilih tanggal). */
export function mundur(hari: number): string {
  const d = new Date();
  d.setDate(d.getDate() - hari);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Foto nota dikecilkan di peramban (sisi terpanjang 1600 px, JPEG) supaya hemat kuota & cepat
 * terkirim — 1600 px masih cukup untuk membaca angka di struk. Kalau peramban tidak sanggup
 * (format aneh), berkas aslinya dikirim apa adanya dan server yang memeriksanya.
 */
export async function kecilkanFoto(berkas: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(berkas);
    const skala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * skala);
    c.height = Math.round(bmp.height * skala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await new Promise((ok, gagal) =>
      c.toBlob((b) => (b ? ok(b) : gagal(new Error("foto"))), "image/jpeg", 0.82)
    );
  } catch {
    return berkas;
  }
}

/** Kirim multipart (tanpa header JSON dari api()) dan lempar pesan galat terbaik dari server. */
export async function kirimForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessageFrom(body, res.status));
  }
  return res.json();
}
