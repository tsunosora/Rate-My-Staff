"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconPlus, IconTrash } from "@/components/ui/icons";
import { Card, Empty, LeaveStatusBadge, longDate, soft } from "./ui";
import type { LeaveRequestItem } from "./types";

const TYPES = ["Izin", "Sakit", "Cuti"] as const;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ajukan izin/sakit/cuti & lihat statusnya (menunggu, disetujui, ditolak). */
export function LeavePanel({ token }: { token: string }) {
  const [items, setItems] = useState<LeaveRequestItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("Izin");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ items: LeaveRequestItem[] }>(`/api/public/portal/${token}/leave`);
    setItems(r.items);
  }, [token]);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function submit() {
    setError("");
    setOk("");
    if (!reason.trim()) return setError("Tulis alasannya dulu.");
    setBusy(true);
    try {
      await api(`/api/public/portal/${token}/leave`, {
        method: "POST",
        body: JSON.stringify({ type, startDate, endDate: endDate || null, reason }),
      });
      setOk("Pengajuan terkirim. Menunggu persetujuan owner.");
      setReason("");
      setEndDate("");
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim pengajuan.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: number) {
    setError("");
    try {
      await api(`/api/public/portal/${token}/leave/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membatalkan.");
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Pengajuan izin"
        action={
          <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-9 text-xs">
            <IconPlus className="text-[15px]" /> {open ? "Tutup" : "Ajukan"}
          </button>
        }
      >
        {ok && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-success" style={soft("var(--success)")}>
            <IconCheck className="text-[16px] shrink-0" /> {ok}
          </div>
        )}
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
            <IconAlert className="text-[16px] shrink-0" /> {error}
          </div>
        )}

        {open ? (
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-muted">Jenis</span>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                      type === t
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border-strong text-muted hover:bg-surface-2"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Tanggal mulai *</span>
                <input
                  type="date"
                  className="input h-11"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Sampai (opsional)</span>
                <input
                  type="date"
                  className="input h-11"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Alasan *</span>
              <textarea
                className="input"
                rows={3}
                maxLength={1000}
                placeholder="Contoh: demam, perlu istirahat satu hari."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>

            <button onClick={submit} disabled={busy} className="btn-primary h-11 w-full">
              {busy ? "Mengirim…" : "Kirim Pengajuan"}
            </button>
            <p className="text-center text-xs text-subtle">
              Absensi Anda baru berubah setelah owner menyetujui pengajuan ini.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Tekan <b className="text-fg">Ajukan</b> untuk mengirim izin, sakit, atau cuti. Pengajuan
            masuk ke dashboard owner untuk disetujui.
          </p>
        )}
      </Card>

      <Card title="Riwayat pengajuan">
        {items === null ? (
          <div className="h-20 animate-pulse rounded-xl bg-surface-2" />
        ) : items.length === 0 ? (
          <Empty>Belum pernah mengajukan izin.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">
                    {r.type} · {longDate(r.startDate)}
                    {r.days > 1 && ` – ${longDate(r.endDate)} (${r.days} hari)`}
                  </span>
                  <LeaveStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{r.reason}</p>
                {r.decisionNote && (
                  <p className="mt-1.5 rounded-lg border border-border p-2 text-xs text-muted">
                    <b className="text-fg">Catatan owner:</b> {r.decisionNote}
                  </p>
                )}
                {r.status === "pending" && (
                  <button
                    onClick={() => cancel(r.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                  >
                    <IconTrash className="text-[13px]" /> Batalkan pengajuan
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
