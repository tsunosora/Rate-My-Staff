"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconPlus, IconTrash, IconUpload, IconX } from "@/components/ui/icons";
import { Card, Empty, longDate, soft } from "./ui";
import {
  PILIHAN_KATEGORI,
  StatusKlaim,
  hariIni,
  kecilkanFoto,
  kirimForm,
  mundur,
  rapikanJumlah,
  rp,
  type Klaim,
} from "@/components/reimbursement/ui";

/** Klaim pengeluaran (reimbursement): ajukan dengan foto nota, lihat status & catatan owner. */
export function ReimbursementPanel({ token, ownerQuery = "" }: { token: string; ownerQuery?: string }) {
  const sebagaiOwner = ownerQuery.includes("owner=1");
  const [items, setItems] = useState<Klaim[] | null>(null);
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni());
  const [kategori, setKategori] = useState<string>("transport");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [lihat, setLihat] = useState<number | null>(null);
  const masukan = useRef<HTMLInputElement>(null);

  const ambil = useCallback(
    () =>
      api<{ items: Klaim[] }>(`/api/public/portal/${token}/reimbursement?v=1${ownerQuery}`).then((r) => r.items),
    [token, ownerQuery]
  );
  const load = useCallback(async () => setItems(await ambil()), [ambil]);

  useEffect(() => {
    let hidup = true;
    ambil().then(
      (r) => hidup && setItems(r),
      () => hidup && setItems([])
    );
    return () => {
      hidup = false;
    };
  }, [ambil]);

  const pratinjau = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => {
    if (pratinjau) URL.revokeObjectURL(pratinjau);
  }, [pratinjau]);

  function pilihFoto(f: File | null) {
    setError("");
    if (f && !f.type.startsWith("image/")) return setError("Pilih berkas gambar (foto nota).");
    setFoto(f);
  }

  async function submit() {
    setError("");
    setOk("");
    if (!jumlah) return setError("Isi jumlah pengeluarannya.");
    if (keterangan.trim().length < 3) return setError("Tulis keterangan singkat (minimal 3 huruf).");
    if (!foto) return setError("Foto notanya dulu.");
    setBusy(true);
    try {
      const gambar = await kecilkanFoto(foto);
      if (gambar.size > 6 * 1024 * 1024) throw new Error("Foto terlalu besar (maks. 6 MB). Coba foto ulang.");
      const form = new FormData();
      form.set("tanggal", tanggal);
      form.set("kategori", kategori);
      form.set("jumlah", jumlah);
      form.set("keterangan", keterangan);
      form.set("foto", gambar, "nota.jpg");
      await kirimForm(`/api/public/portal/${token}/reimbursement`, form);
      setOk("Klaim terkirim. Menunggu persetujuan owner.");
      setJumlah("");
      setKeterangan("");
      setFoto(null);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim klaim.");
    } finally {
      setBusy(false);
    }
  }

  async function batal(id: number) {
    if (!confirm("Batalkan klaim ini? Foto notanya ikut dihapus.")) return;
    setError("");
    try {
      await api(`/api/public/portal/${token}/reimbursement/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membatalkan.");
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Klaim pengeluaran"
        action={
          !sebagaiOwner && (
            <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-9 text-xs">
              {open ? <IconX className="text-[15px]" /> : <IconPlus className="text-[15px]" />} {open ? "Tutup" : "Ajukan"}
            </button>
          )
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

        {sebagaiOwner ? (
          <p className="text-sm text-muted">
            Anda melihat sebagai owner. Klaim diajukan oleh karyawannya sendiri; keputusannya di menu
            Reimbursement di dasbor.
          </p>
        ) : open ? (
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-muted">Kategori</span>
              <div className="grid grid-cols-3 gap-2">
                {PILIHAN_KATEGORI.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setKategori(k.key)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                      kategori === k.key
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border-strong text-muted hover:bg-surface-2"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Tanggal nota *</span>
                <input
                  type="date"
                  className="input h-11"
                  value={tanggal}
                  min={mundur(60)}
                  max={hariIni()}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Jumlah (Rp) *</span>
                <input
                  inputMode="numeric"
                  className="input h-11"
                  placeholder="Contoh: 25.000"
                  value={jumlah}
                  onChange={(e) => setJumlah(rapikanJumlah(e.target.value))}
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Keterangan *</span>
              <textarea
                className="input"
                rows={2}
                maxLength={1000}
                placeholder="Contoh: ojek ke kantor klien untuk antar sampel."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-muted">Foto nota *</span>
              <input
                ref={masukan}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pilihFoto(e.target.files?.[0] ?? null)}
              />
              {pratinjau ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pratinjau} alt="Pratinjau nota" className="h-24 w-24 rounded-xl border border-border object-cover" />
                  <button type="button" onClick={() => masukan.current?.click()} className="btn-ghost h-9 text-xs">
                    Ganti foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => masukan.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-sm text-muted hover:bg-surface-2"
                >
                  <IconUpload className="text-[20px]" />
                  Foto nota / struk
                </button>
              )}
            </div>

            <button onClick={submit} disabled={busy} className="btn-primary h-11 w-full">
              {busy ? "Mengirim…" : "Kirim Klaim"}
            </button>
            <p className="text-center text-xs text-subtle">
              Nota maksimal {60} hari ke belakang. Uang diganti setelah owner menyetujui.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Keluar uang pribadi untuk keperluan kerja? Tekan <b className="text-fg">Ajukan</b>, foto
            notanya, dan owner akan memprosesnya.
          </p>
        )}
      </Card>

      <Card title="Riwayat klaim">
        {items === null ? (
          <div className="h-20 animate-pulse rounded-xl bg-surface-2" />
        ) : items.length === 0 ? (
          <Empty>Belum pernah mengajukan klaim.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">
                    {rp(r.jumlah)} · {r.kategoriLabel}
                  </span>
                  <StatusKlaim status={r.status} />
                </div>
                <p className="mt-0.5 text-xs text-subtle">{longDate(r.tanggal)}</p>
                <p className="mt-1 text-sm text-muted">{r.keterangan}</p>
                {r.jumlahDisetujui !== null && r.jumlahDisetujui !== r.jumlah && (
                  <p className="mt-1 text-xs text-muted">
                    Disetujui <b className="text-fg">{rp(r.jumlahDisetujui)}</b> dari {rp(r.jumlah)}
                  </p>
                )}
                {r.status === "dibayar" && r.dibayarAt && (
                  <p className="mt-1 text-xs text-success">
                    Sudah dibayar {new Date(r.dibayarAt).toLocaleDateString("id-ID")}
                  </p>
                )}
                {r.catatanKeputusan && (
                  <p className="mt-1.5 rounded-lg border border-border p-2 text-xs text-muted">
                    <b className="text-fg">Catatan owner:</b> {r.catatanKeputusan}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  {r.adaFoto && (
                    <button
                      onClick={() => setLihat(lihat === r.id ? null : r.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {lihat === r.id ? "Sembunyikan nota" : "Lihat nota"}
                    </button>
                  )}
                  {r.status === "menunggu" && !sebagaiOwner && (
                    <button
                      onClick={() => batal(r.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                    >
                      <IconTrash className="text-[13px]" /> Batalkan klaim
                    </button>
                  )}
                </div>
                {lihat === r.id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/public/portal/${token}/reimbursement/${r.id}/foto?v=1${ownerQuery}`}
                    alt={`Nota ${r.kategoriLabel} ${longDate(r.tanggal)}`}
                    className="mt-2 max-h-96 w-full rounded-xl border border-border object-contain"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
