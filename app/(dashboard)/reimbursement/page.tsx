"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconDownload, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { longDate, soft } from "@/components/portal/ui";
import { StatusKlaim, rapikanJumlah, rp, type Klaim } from "@/components/reimbursement/ui";
import { CatatKlaim, type Karyawan } from "@/components/reimbursement/CatatKlaim";

type Baris = Klaim & {
  employeeName: string;
  employeeCode: string;
  department: string | null;
  decidedBy: string | null;
};

type Ringkasan = Record<Klaim["status"], { jumlahKlaim: number; total: number }>;

type Payload = {
  items: Baris[];
  total: number;
  page: number;
  perPage: number;
  menunggu: number;
  ringkasan: Ringkasan;
  karyawan: Karyawan[];
};

type Aksi = "setujui" | "tolak" | "bayar" | "buka";

const FILTER = [
  { key: "menunggu", label: "Menunggu" },
  { key: "disetujui", label: "Disetujui" },
  { key: "dibayar", label: "Dibayar" },
  { key: "ditolak", label: "Ditolak" },
  { key: "", label: "Semua" },
] as const;

const SUMBER: Record<string, string> = { portal: "halaman karyawan", admin: "dicatat owner" };

const JUDUL_AKSI: Record<Aksi, string> = {
  setujui: "Setujui klaim",
  tolak: "Tolak klaim",
  bayar: "Tandai sudah dibayar",
  buka: "Batalkan keputusan",
};

function bulanIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReimbursementPage() {
  const [status, setStatus] = useState<string>("menunggu");
  const [bulan, setBulan] = useState<string>("");
  const [karyawanId, setKaryawanId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [putus, setPutus] = useState<{ row: Baris; aksi: Aksi } | null>(null);
  const [jumlahSetuju, setJumlahSetuju] = useState("");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [foto, setFoto] = useState<Baris | null>(null);
  const [catat, setCatat] = useState(false);

  const query = useCallback(
    (extra: Record<string, string> = {}) => {
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      if (bulan) q.set("bulan", bulan);
      if (karyawanId) q.set("employee_id", karyawanId);
      for (const [k, v] of Object.entries(extra)) q.set(k, v);
      return q.toString();
    },
    [status, bulan, karyawanId]
  );

  const ambil = useCallback(
    () => api<Payload>(`/api/reimbursements?${query({ page: String(page) })}`),
    [query, page]
  );
  const gagalMuat = (e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat data.");
  const load = useCallback(async () => {
    try {
      setData(await ambil());
    } catch (e) {
      gagalMuat(e);
    }
  }, [ambil]);

  useEffect(() => {
    let hidup = true;
    ambil().then(
      (d) => hidup && setData(d),
      (e) => hidup && gagalMuat(e)
    );
    return () => {
      hidup = false;
    };
  }, [ambil]);

  function bukaPutus(row: Baris, aksi: Aksi) {
    setPutus({ row, aksi });
    setCatatan("");
    setJumlahSetuju(rapikanJumlah(String(Math.round(row.jumlah))));
  }

  async function kirimPutus() {
    if (!putus) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/reimbursements/${putus.row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          aksi: putus.aksi,
          catatan: catatan || null,
          jumlahDisetujui: putus.aksi === "setujui" && jumlahSetuju ? jumlahSetuju : null,
        }),
      });
      const pesan: Record<Aksi, string> = {
        setujui: "Klaim disetujui",
        tolak: "Klaim ditolak",
        bayar: "Klaim ditandai sudah dibayar",
        buka: "Keputusan dibatalkan, klaim kembali menunggu",
      };
      setNotice(`${pesan[putus.aksi]} — ${putus.row.employeeName}.`);
      setPutus(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(false);
    }
  }

  const halaman = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const r = data?.ringkasan;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Reimbursement</h1>
          <p className="mt-0.5 text-sm text-muted">
            Klaim pengeluaran karyawan beserta foto notanya. Setujui, lalu tandai dibayar setelah uangnya diganti.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/reimbursements/ekspor?${query({ bulan: bulan || bulanIni() })}`}
            className="btn-ghost h-10 text-sm"
          >
            <IconDownload className="text-[16px]" /> Ekspor Excel {bulan ? "" : "bulan ini"}
          </a>
          <button onClick={() => setCatat(true)} className="btn-primary h-10 text-sm" disabled={!data}>
            <IconPlus className="text-[16px]" /> Catat klaim
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {error}
        </div>
      )}

      {r && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["menunggu", "Menunggu", "var(--warning)"],
              ["disetujui", "Disetujui, belum dibayar", "var(--info)"],
              ["dibayar", "Sudah dibayar", "var(--success)"],
              ["ditolak", "Ditolak", "var(--danger)"],
            ] as const
          ).map(([k, label, warna]) => (
            <div key={k} className="glass rounded-2xl p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 font-display text-lg font-bold" style={{ color: warna }}>
                {rp(r[k].total)}
              </p>
              <p className="text-xs text-subtle">{r[k].jumlahKlaim} klaim</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTER.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setStatus(f.key);
              setPage(1);
            }}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              status === f.key
                ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
                : "btn-ghost"
            }`}
          >
            {f.label}
            {f.key === "menunggu" && data && data.menunggu > 0 && (
              <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-xs text-warning">{data.menunggu}</span>
            )}
          </button>
        ))}
        <input
          type="month"
          aria-label="Bulan"
          className="input h-10 w-auto"
          value={bulan}
          onChange={(e) => {
            setBulan(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Karyawan"
          className="input h-10 w-auto"
          value={karyawanId}
          onChange={(e) => {
            setKaryawanId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua karyawan</option>
          {data?.karyawan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.fullName}
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Tidak ada klaim pada saringan ini.</div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((row) => (
            <li key={row.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-fg">
                    {row.employeeName}
                    <span className="ml-2 text-xs font-normal text-subtle">{row.employeeCode}</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    <b className="text-fg">{rp(row.jumlah)}</b> · {row.kategoriLabel} · {longDate(row.tanggal)}
                    {row.department && ` · ${row.department}`}
                  </p>
                  {row.jumlahDisetujui !== null && row.jumlahDisetujui !== row.jumlah && (
                    <p className="mt-0.5 text-xs text-info">Disetujui {rp(row.jumlahDisetujui)}</p>
                  )}
                </div>
                <StatusKlaim status={row.status} />
              </div>

              <p className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">{row.keterangan}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                <span>Diajukan {new Date(row.createdAt).toLocaleString("id-ID")}</span>
                <span>via {SUMBER[row.sumber] ?? row.sumber}</span>
                {row.decidedBy && <span>Diputus oleh {row.decidedBy}</span>}
                {row.dibayarAt && <span>Dibayar {new Date(row.dibayarAt).toLocaleDateString("id-ID")}</span>}
                {row.adaFoto ? (
                  <button onClick={() => setFoto(row)} className="font-medium text-primary hover:underline">
                    Lihat nota
                  </button>
                ) : (
                  <span>tanpa foto nota</span>
                )}
              </div>

              {row.catatanKeputusan && (
                <p className="mt-2 text-xs text-muted">
                  <b className="text-fg">Catatan:</b> {row.catatanKeputusan}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "menunggu" && (
                  <>
                    <button onClick={() => bukaPutus(row, "setujui")} className="btn-primary h-9 text-xs">
                      <IconCheck className="text-[15px]" /> Setujui
                    </button>
                    <button onClick={() => bukaPutus(row, "tolak")} className="btn-ghost h-9 text-xs">
                      <IconX className="text-[15px]" /> Tolak
                    </button>
                  </>
                )}
                {row.status === "disetujui" && (
                  <button onClick={() => bukaPutus(row, "bayar")} className="btn-primary h-9 text-xs">
                    <IconCheck className="text-[15px]" /> Tandai dibayar
                  </button>
                )}
                {(row.status === "disetujui" || row.status === "ditolak") && (
                  <button onClick={() => bukaPutus(row, "buka")} className="btn-ghost h-9 text-xs">
                    <IconTrash className="text-[15px]" /> Batalkan keputusan
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && halaman > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button className="btn-ghost h-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </button>
          <span className="text-muted">
            {page} / {halaman}
          </span>
          <button className="btn-ghost h-9" disabled={page >= halaman} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </button>
        </div>
      )}

      {putus && (
        <Modal title={JUDUL_AKSI[putus.aksi]} onClose={() => setPutus(null)}>
          <p className="text-sm text-muted">
            <b className="text-fg">{putus.row.employeeName}</b> — {putus.row.kategoriLabel}, {rp(putus.row.jumlah)},{" "}
            {longDate(putus.row.tanggal)}.
          </p>

          {putus.aksi === "setujui" && (
            <label className="mt-4 block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Jumlah disetujui (Rp)</span>
              <input
                inputMode="numeric"
                className="input h-11"
                value={jumlahSetuju}
                onChange={(e) => setJumlahSetuju(rapikanJumlah(e.target.value))}
              />
              <span className="block text-xs text-subtle">Boleh lebih kecil dari yang diajukan, tidak boleh lebih besar.</span>
            </label>
          )}
          {putus.aksi === "bayar" && (
            <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              Tandai setelah uang {rp(putus.row.jumlahDisetujui ?? putus.row.jumlah)} benar-benar diserahkan ke
              karyawan. Klaim yang sudah dibayar tidak bisa dibatalkan lagi.
            </p>
          )}
          {putus.aksi === "buka" && (
            <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              Klaim kembali ke status “Menunggu” dan catatan keputusan sebelumnya dihapus.
            </p>
          )}

          {(putus.aksi === "setujui" || putus.aksi === "tolak") && (
            <label className="mt-4 block space-y-1.5 text-sm">
              <span className="font-medium text-muted">
                {putus.aksi === "tolak" ? "Alasan penolakan (wajib, dibaca karyawan)" : "Catatan untuk karyawan (opsional)"}
              </span>
              <textarea className="input" rows={3} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </label>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPutus(null)} className="btn-ghost h-10">
              Batal
            </button>
            <button
              onClick={kirimPutus}
              disabled={busy || (putus.aksi === "tolak" && !catatan.trim())}
              className="btn-primary h-10"
            >
              {busy ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </Modal>
      )}

      {foto && (
        <Modal title={`Nota — ${foto.employeeName}`} onClose={() => setFoto(null)} size="xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/reimbursements/${foto.id}/foto`}
            alt={`Nota ${foto.kategoriLabel} ${longDate(foto.tanggal)}`}
            className="max-h-[70vh] w-full rounded-xl border border-border object-contain"
          />
          <p className="mt-2 text-xs text-subtle">
            {rp(foto.jumlah)} · {foto.kategoriLabel} · {longDate(foto.tanggal)}
          </p>
        </Modal>
      )}

      {catat && data && (
        <CatatKlaim
          karyawan={data.karyawan}
          onClose={() => setCatat(false)}
          onSaved={async () => {
            setCatat(false);
            setNotice("Klaim tercatat sebagai menunggu.");
            await load();
          }}
        />
      )}
    </div>
  );
}
