"use client";

import type { ComponentType, SVGProps } from "react";

/** Warna lembut dari token CSS (dipakai chip/ikon berlatar). */
export function soft(color: string, pct = 16): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} ${pct}%, transparent)` };
}

export function rupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

/** 210 -> "3j 30m". */
export function hm(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}j ${m}m`;
  if (h) return `${h}j`;
  return `${m}m`;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-04-08" -> "Rab, 08 Apr". */
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = DAY_NAMES[new Date(y, m - 1, d).getDay()].slice(0, 3);
  return `${dow}, ${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]}`;
}

/** "2026-04-08" -> "8 April 2026". */
export function longDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const full = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${d} ${full[m - 1]} ${y}`;
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-sm font-bold text-fg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "var(--primary)",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        {Icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ ...soft(tone), color: tone }}>
            <Icon className="text-[15px]" />
          </span>
        )}
      </div>
      <div className="tabular mt-2 font-display text-2xl font-extrabold text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
    </div>
  );
}

/** Label + warna untuk status baris absensi harian. */
export const STATUS_META: Record<string, { label: string; color: string }> = {
  on_time: { label: "Tepat waktu", color: "var(--success)" },
  late: { label: "Terlambat", color: "var(--warning)" },
  longshift: { label: "Longshift", color: "var(--info)" },
  undertime: { label: "Kurang jam", color: "var(--warning)" },
  absent: { label: "Tanpa keterangan", color: "var(--danger)" },
  holiday: { label: "Libur", color: "var(--fg-subtle)" },
  Izin: { label: "Izin", color: "var(--info)" },
  Sakit: { label: "Sakit", color: "var(--info)" },
  Cuti: { label: "Cuti", color: "var(--info)" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: "var(--fg-subtle)" };
  return (
    <span className="badge" style={{ ...soft(meta.color, 18), color: meta.color }}>
      {meta.label}
    </span>
  );
}

/** Label + warna status pengajuan izin. */
export const LEAVE_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu persetujuan", color: "var(--warning)" },
  approved: { label: "Disetujui", color: "var(--success)" },
  rejected: { label: "Ditolak", color: "var(--danger)" },
  cancelled: { label: "Dibatalkan", color: "var(--fg-subtle)" },
  // Dipakai juga untuk status penukaran poin.
  delivered: { label: "Sudah diserahkan", color: "var(--success)" },
};

export function LeaveStatusBadge({ status }: { status: string }) {
  const meta = LEAVE_STATUS_META[status] ?? { label: status, color: "var(--fg-subtle)" };
  return (
    <span className="badge" style={{ ...soft(meta.color, 18), color: meta.color }}>
      {meta.label}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-subtle">{children}</p>;
}
