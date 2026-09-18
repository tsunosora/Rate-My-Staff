"use client";

import { useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { Card, soft } from "./ui";
import { PinStrengthMeter } from "./PinStrengthMeter";

/** Ganti PIN portal dari dalam halaman karyawan (wajib menyebut PIN lama). */
export function ChangePinForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (pin !== confirm) return setError("Konfirmasi PIN tidak sama.");
    setBusy(true);
    try {
      await api(`/api/public/portal/${token}/session`, {
        method: "POST",
        body: JSON.stringify({ currentPin, pin, confirm }),
      });
      setOk(true);
      setTimeout(onDone, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengganti PIN.");
    } finally {
      setBusy(false);
    }
  }

  const digits = (v: string) => v.replace(/\D/g, "");

  return (
    <Card title="Ganti PIN">
      {ok ? (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> PIN berhasil diganti.
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
              <IconAlert className="text-[16px] shrink-0" /> {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">PIN lama</span>
              <input
                className="input h-11"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(digits(e.target.value))}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">PIN baru</span>
              <input
                className="input h-11"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(digits(e.target.value))}
              />
              <PinStrengthMeter pin={pin} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Ulangi PIN baru</span>
              <input
                className="input h-11"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirm}
                onChange={(e) => setConfirm(digits(e.target.value))}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-primary h-10">
              {busy ? "Menyimpan…" : "Simpan PIN"}
            </button>
            <button onClick={onDone} className="btn-ghost h-10">
              Batal
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
