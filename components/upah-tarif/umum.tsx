"use client";

import { IconAlert, IconCheck } from "@/components/ui/icons";

export type Kirim = (url: string, method: string, body?: unknown, sukses?: string) => Promise<boolean>;
export type Pesan = { ok: boolean; teks: string } | null;

export function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}

export const rupiah = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `Rp ${n.toLocaleString("id-ID")}`;

/** Isian rupiah dari form → angka / null (kosong). */
export const angkaAtauNull = (s: string) => (s.trim() === "" ? null : Number(s));

export function KotakPesan({ pesan }: { pesan: Pesan }) {
  if (!pesan) return null;
  return (
    <p
      role={pesan.ok ? "status" : "alert"}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
      style={soft(pesan.ok ? "var(--success)" : "var(--danger)")}
    >
      {pesan.ok ? <IconCheck /> : <IconAlert />} {pesan.teks}
    </p>
  );
}

export function Isian({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1.5 text-sm ${className ?? ""}`}>
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Kotak isian rupiah: angka bulat ≥ 0. */
export function IsianRupiah({
  value, onChange, placeholder, label,
}: { value: string; onChange: (v: string) => void; placeholder?: string; label: string }) {
  return (
    <input
      className="input"
      inputMode="numeric"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
    />
  );
}
