"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { Card, Empty, LeaveStatusBadge, hm, longDate, soft } from "./ui";
import { IsianLembur, badanLembur, nilaiAwalLembur, type NilaiLembur } from "@/components/lembur/IsianLembur";

type Item = {
  id: number;
  tanggal: string;
  mulai: string | null;
  selesai: string | null;
  menit: number;
  menitDisetujui: number | null;
  alasan: string;
  status: string;
  catatanKeputusan: string | null;
};

/** Ajukan lembur & lihat statusnya (menunggu, disetujui, ditolak). */
export function LemburPanel({ token, ownerQuery = "" }: { token: string; ownerQuery?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [maksMundur, setMaksMundur] = useState(7);
  const [open, setOpen] = useState(false);
  const [nilai, setNilai] = useState<NilaiLembur>(nilaiAwalLembur);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const ambil = useCallback(
    () => api<{ items: Item[]; maksMundur: number }>(`/api/public/portal/${token}/lembur?v=1${ownerQuery}`),
    [token, ownerQuery]
  );

  useEffect(() => {
    let hidup = true;
    ambil()
      .then((r) => {
        if (!hidup) return;
        setItems(r.items);
        setMaksMundur(r.maksMundur);
      })
      .catch(() => hidup && setItems([]));
    return () => {
      hidup = false;
    };
  }, [ambil]);

  async function load() {
    const r = await ambil();
    setItems(r.items);
    setMaksMundur(r.maksMundur);
  }

  async function submit() {
    setError("");
    setOk("");
    if (!nilai.alasan.trim()) return setError("Tulis alasan atau pekerjaannya dulu.");
    setBusy(true);
    try {
      await api(`/api/public/portal/${token}/lembur`, {
        method: "POST",
        body: JSON.stringify(badanLembur(nilai)),
      });
      setOk("Pengajuan lembur terkirim. Menunggu persetujuan owner.");
      setNilai(nilaiAwalLembur());
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
      await api(`/api/public/portal/${token}/lembur/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membatalkan.");
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Pengajuan lembur"
        action={
          <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-9 text-xs">
            {open ? <IconX className="text-[15px]" /> : <IconPlus className="text-[15px]" />} {open ? "Tutup" : "Ajukan"}
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
            <IsianLembur nilai={nilai} onChange={setNilai} maksMundur={maksMundur} />
            <button onClick={submit} disabled={busy} className="btn-primary h-11 w-full">
              {busy ? "Mengirim…" : "Kirim Pengajuan"}
            </button>
            <p className="text-center text-xs text-subtle">
              Lembur baru dihitung di struk setelah owner menyetujui.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Tekan <b className="text-fg">Ajukan</b> untuk mengajukan lembur yang sudah atau sedang Anda
            kerjakan. Pengajuan masuk ke dashboard owner untuk disetujui.
          </p>
        )}
      </Card>

      <Card title="Riwayat lembur">
        {items === null ? (
          <div className="h-20 animate-pulse rounded-xl bg-surface-2" />
        ) : items.length === 0 ? (
          <Empty>Belum pernah mengajukan lembur.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">
                    {longDate(r.tanggal)} · {hm(r.menit)}
                    {r.mulai && r.selesai && ` (${r.mulai}–${r.selesai})`}
                  </span>
                  <LeaveStatusBadge status={r.status} />
                </div>
                {r.status === "approved" && r.menitDisetujui !== null && r.menitDisetujui !== r.menit && (
                  <p className="mt-1 text-xs text-muted">Disetujui {hm(r.menitDisetujui)}.</p>
                )}
                <p className="mt-1 text-sm text-muted">{r.alasan}</p>
                {r.catatanKeputusan && (
                  <p className="mt-1.5 rounded-lg border border-border p-2 text-xs text-muted">
                    <b className="text-fg">Catatan owner:</b> {r.catatanKeputusan}
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
