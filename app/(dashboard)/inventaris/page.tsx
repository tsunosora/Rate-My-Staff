"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconPlus, IconPencil } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";
import { KATEGORI_INVENTARIS, LABEL_KATEGORI, type KategoriInventaris } from "@/lib/services/inventaris";

type Pemegang = { peminjamanId: number; employeeId: number; nama: string; jumlah: number; sejak: string; catatan: string | null };
type Barang = {
  id: number;
  nama: string;
  kategori: KategoriInventaris;
  keterangan: string | null;
  jumlah: number;
  dipegang: number;
  tersedia: number;
  rusakHilang: number;
  pemegang: Pemegang[];
};
type Payload = { items: Barang[]; ringkasan: { barang: number; dipegang: number; tersedia: number; rusakHilang: number } };
type Karyawan = { id: number; fullName: string };

type Dialog =
  | { jenis: "barang"; barang: Barang | null }
  | { jenis: "pinjam"; barang: Barang }
  | { jenis: "kembali"; barang: Barang; p: Pemegang };

/** Semua karyawan aktif (API karyawan berhalaman 20). */
async function muatKaryawan(): Promise<Karyawan[]> {
  const out: Karyawan[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await api<{ data: Karyawan[]; total: number }>(`/api/employees?is_active=true&page=${page}`);
    out.push(...r.data.map((k) => ({ id: k.id, fullName: k.fullName })));
    if (out.length >= r.total || r.data.length === 0) break;
  }
  return out;
}

export default function InventarisPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [karyawan, setKaryawan] = useState<Karyawan[] | null>(null);

  const load = useCallback(
    () =>
      api<Payload>("/api/inventaris").then(
        (d) => {
          setData(d);
          setError("");
        },
        (e) => setError(e instanceof Error ? e.message : "Gagal memuat data.")
      ),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (dialog?.jenis === "pinjam" && !karyawan) muatKaryawan().then(setKaryawan).catch(() => setKaryawan([]));
  }, [dialog, karyawan]);

  async function selesai(pesan: string) {
    setDialog(null);
    setNotice(pesan);
    await load();
  }

  const r = data?.ringkasan;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Inventaris Kantor</h1>
          <p className="mt-0.5 text-sm text-muted">
            Barang yang dipinjamkan ke karyawan: seragam, laptop, kunci, kartu ID.
          </p>
        </div>
        <button onClick={() => setDialog({ jenis: "barang", barang: null })} className="btn-primary h-10">
          <IconPlus className="text-[16px]" /> Tambah barang
        </button>
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
        <div className="grid grid-cols-3 gap-3">
          <Angka label="Dipegang" value={r.dipegang} />
          <Angka label="Tersedia" value={r.tersedia} />
          <Angka label="Rusak/hilang" value={r.rusakHilang} danger={r.rusakHilang > 0} />
        </div>
      )}

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">
          Belum ada barang. Tambahkan seragam, laptop, kunci, atau kartu ID yang dipegang karyawan.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((b) => (
            <li key={b.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-fg">
                    {b.nama}
                    <span className="ml-2 text-xs font-normal text-subtle">{LABEL_KATEGORI[b.kategori] ?? b.kategori}</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {b.dipegang} dipegang · {b.tersedia} tersedia · {b.rusakHilang} rusak/hilang · total {b.jumlah}
                  </p>
                  {b.keterangan && <p className="mt-1 text-xs text-subtle">{b.keterangan}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setDialog({ jenis: "barang", barang: b })} className="btn-ghost h-9 text-xs">
                    <IconPencil className="text-[15px]" /> Ubah
                  </button>
                  <button
                    onClick={() => setDialog({ jenis: "pinjam", barang: b })}
                    disabled={b.tersedia === 0}
                    className="btn-primary h-9 text-xs disabled:opacity-50"
                  >
                    Serahkan ke karyawan
                  </button>
                </div>
              </div>
              {b.pemegang.length > 0 && (
                <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                  {b.pemegang.map((p) => (
                    <li key={p.peminjamanId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="text-fg">
                        {p.nama} <span className="text-subtle">· {p.jumlah} unit · sejak {new Date(p.sejak).toLocaleDateString("id-ID")}</span>
                      </span>
                      <button onClick={() => setDialog({ jenis: "kembali", barang: b, p })} className="btn-ghost h-8 text-xs">
                        Catat kembali
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {dialog?.jenis === "barang" && (
        <FormBarang barang={dialog.barang} onClose={() => setDialog(null)} onDone={selesai} />
      )}
      {dialog?.jenis === "pinjam" && (
        <FormPinjam barang={dialog.barang} karyawan={karyawan} onClose={() => setDialog(null)} onDone={selesai} />
      )}
      {dialog?.jenis === "kembali" && (
        <FormKembali barang={dialog.barang} p={dialog.p} onClose={() => setDialog(null)} onDone={selesai} />
      )}
    </div>
  );
}

function Angka({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`font-display text-2xl font-bold ${danger ? "text-danger" : "text-fg"}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function useKirim(onDone: (pesan: string) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function kirim(url: string, method: string, body: unknown, pesan: string) {
    setBusy(true);
    setErr("");
    try {
      await api(url, { method, body: JSON.stringify(body) });
      await onDone(pesan);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, err, kirim };
}

function FormBarang({ barang, onClose, onDone }: { barang: Barang | null; onClose: () => void; onDone: (p: string) => Promise<void> }) {
  const [nama, setNama] = useState(barang?.nama ?? "");
  const [kategori, setKategori] = useState<KategoriInventaris>(barang?.kategori ?? "seragam");
  const [keterangan, setKeterangan] = useState(barang?.keterangan ?? "");
  const [jumlah, setJumlah] = useState(String(barang?.jumlah ?? 1));
  const [rusak, setRusak] = useState(String(barang?.rusakHilang ?? 0));
  const { busy, err, kirim } = useKirim(onDone);

  function simpan() {
    const body = { nama, kategori, keterangan: keterangan || null, jumlah: Number(jumlah), ...(barang ? { rusakHilang: Number(rusak) } : {}) };
    if (barang) kirim(`/api/inventaris/${barang.id}`, "PUT", body, `${nama} disimpan`);
    else kirim("/api/inventaris", "POST", body, `${nama} ditambahkan`);
  }

  return (
    <Modal title={barang ? "Ubah barang" : "Tambah barang"} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Nama barang</span>
          <input className="input" value={nama} maxLength={150} onChange={(e) => setNama(e.target.value)} placeholder="mis. Kaos seragam" />
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Kategori</span>
          <select className="input" value={kategori} onChange={(e) => setKategori(e.target.value as KategoriInventaris)}>
            {KATEGORI_INVENTARIS.map((k) => (
              <option key={k} value={k}>
                {LABEL_KATEGORI[k]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="font-medium text-muted">Jumlah unit dimiliki</span>
            <input className="input" type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          </label>
          {barang && (
            <label className="block space-y-1.5">
              <span className="font-medium text-muted">Rusak/hilang</span>
              <input className="input" type="number" min={0} value={rusak} onChange={(e) => setRusak(e.target.value)} />
            </label>
          )}
        </div>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Keterangan (opsional)</span>
          <input className="input" value={keterangan} maxLength={500} onChange={(e) => setKeterangan(e.target.value)} placeholder="mis. Ukuran M habis" />
        </label>
        {err && <p className="text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost h-10">Batal</button>
          <button onClick={simpan} disabled={busy || !nama.trim()} className="btn-primary h-10">
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FormPinjam({
  barang,
  karyawan,
  onClose,
  onDone,
}: {
  barang: Barang;
  karyawan: Karyawan[] | null;
  onClose: () => void;
  onDone: (p: string) => Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [catatan, setCatatan] = useState("");
  const { busy, err, kirim } = useKirim(onDone);
  const nama = karyawan?.find((k) => String(k.id) === employeeId)?.fullName ?? "";

  return (
    <Modal title={`Serahkan ${barang.nama}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">{barang.tersedia} unit tersedia.</p>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Karyawan</span>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!karyawan}>
            <option value="">{karyawan ? "Pilih karyawan" : "Memuat…"}</option>
            {karyawan?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Jumlah</span>
          <input className="input" type="number" min={1} max={barang.tersedia} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Catatan (opsional)</span>
          <input className="input" value={catatan} maxLength={255} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. ukuran L" />
        </label>
        {err && <p className="text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost h-10">Batal</button>
          <button
            onClick={() =>
              kirim(
                `/api/inventaris/${barang.id}/pinjam`,
                "POST",
                { employeeId: Number(employeeId), jumlah: Number(jumlah), catatan: catatan || null },
                `${barang.nama} diserahkan ke ${nama}`
              )
            }
            disabled={busy || !employeeId}
            className="btn-primary h-10"
          >
            {busy ? "Menyimpan…" : "Serahkan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FormKembali({ barang, p, onClose, onDone }: { barang: Barang; p: Pemegang; onClose: () => void; onDone: (p: string) => Promise<void> }) {
  const [kondisi, setKondisi] = useState<"baik" | "rusak" | "hilang">("baik");
  const [catatan, setCatatan] = useState("");
  const { busy, err, kirim } = useKirim(onDone);
  return (
    <Modal title="Catat barang kembali" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          <b className="text-fg">{p.nama}</b> mengembalikan {p.jumlah} unit {barang.nama}.
        </p>
        <div className="flex gap-2">
          {(["baik", "rusak", "hilang"] as const).map((k) => (
            <button key={k} onClick={() => setKondisi(k)} className={`h-9 rounded-xl px-3 text-xs ${kondisi === k ? "btn-primary" : "btn-ghost"}`}>
              {k === "baik" ? "Kondisi baik" : k === "rusak" ? "Rusak" : "Hilang"}
            </button>
          ))}
        </div>
        {kondisi !== "baik" && <p className="text-xs text-subtle">Unitnya pindah ke hitungan rusak/hilang dan tidak tersedia lagi.</p>}
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Catatan (opsional)</span>
          <input className="input" value={catatan} maxLength={255} onChange={(e) => setCatatan(e.target.value)} />
        </label>
        {err && <p className="text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost h-10">Batal</button>
          <button
            onClick={() =>
              kirim(
                `/api/inventaris/${barang.id}/kembali`,
                "POST",
                { peminjamanId: p.peminjamanId, kondisi, catatan: catatan || null },
                `${barang.nama} dari ${p.nama} dicatat kembali`
              )
            }
            disabled={busy}
            className="btn-primary h-10"
          >
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
