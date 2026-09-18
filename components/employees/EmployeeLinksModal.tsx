"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconCopy, IconTrash } from "@/components/ui/icons";

type Tab = "portal" | "rate";

function soft(color: string, pct = 16): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} ${pct}%, transparent)` };
}

/**
 * Tautan & QR milik satu karyawan:
 * - Portal karyawan (/me/[token]) — halaman pribadi, dikunci PIN.
 * - Rating tamu (/rate/[token])   — form bintang untuk pelanggan.
 */
export function EmployeeLinksModal({
  employeeId,
  employeeName,
  publicToken,
  portalPinSetAt,
  onClose,
  onChanged,
}: {
  employeeId: number;
  employeeName: string;
  publicToken: string;
  portalPinSetAt: string | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("portal");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = tab === "portal" ? `/me/${publicToken}` : `/rate/${publicToken}`;
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Browser menolak akses clipboard — salin manual dari kotak di bawah.");
    }
  }

  async function resetPin() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api<{ pin: string }>(`/api/employees/${employeeId}/portal-pin`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNewPin(res.pin);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function clearPin() {
    setBusy(true);
    setError("");
    setNewPin("");
    try {
      await api(`/api/employees/${employeeId}/portal-pin`, { method: "DELETE" });
      setNotice("PIN dihapus. Karyawan akan diminta membuat PIN baru saat membuka tautannya.");
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Tautan — ${employeeName}`} onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-xl border border-border p-1">
        {(
          [
            { key: "portal", label: "Portal Karyawan" },
            { key: "rate", label: "Rating Tamu" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setNewPin(""); setNotice(""); setError(""); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-surface-2 text-primary" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted">
        {tab === "portal"
          ? "Halaman pribadi karyawan: absensi, penilaian, estimasi lembur, dan pengajuan izin. Dikunci PIN — kirim tautan ini ke karyawan yang bersangkutan saja."
          : "Form penilaian bintang untuk pelanggan/tamu. Aman ditempel di meja atau nota."}
      </p>

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-4">
          <QRCodeCanvas value={url} size={200} />
        </div>
        <div className="flex w-full items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-surface px-3 py-2 text-xs text-muted">
            {path}
          </code>
          <button onClick={copy} className="btn-ghost h-9 shrink-0 text-xs" aria-label="Salin tautan">
            {copied ? <IconCheck className="text-[15px]" /> : <IconCopy className="text-[15px]" />}
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
      </div>

      {tab === "portal" && (
        <div className="mt-5 border-t border-border pt-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
              <IconAlert className="text-[16px] shrink-0" /> {error}
            </div>
          )}
          {notice && (
            <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-success" style={soft("var(--success)")}>
              <IconCheck className="text-[16px] shrink-0" /> {notice}
            </div>
          )}

          {newPin ? (
            <div className="rounded-xl border p-3" style={{ ...soft("var(--warning)", 10), borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)" }}>
              <p className="text-xs text-muted">PIN baru — catat sekarang, tidak bisa dilihat lagi:</p>
              <p className="tabular mt-1 font-display text-3xl font-extrabold tracking-[0.3em] text-fg">
                {newPin}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Status PIN:{" "}
              {portalPinSetAt ? (
                <b className="text-fg">sudah dibuat ({new Date(portalPinSetAt).toLocaleDateString("id-ID")})</b>
              ) : (
                <b className="text-warning">belum dibuat — karyawan membuatnya sendiri saat pertama membuka tautan</b>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={resetPin} disabled={busy} className="btn-ghost h-9 text-xs">
              {busy ? "Memproses…" : "Buatkan PIN acak"}
            </button>
            {portalPinSetAt && (
              <button onClick={clearPin} disabled={busy} className="btn-ghost h-9 text-xs">
                <IconTrash className="text-[15px]" /> Hapus PIN
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
