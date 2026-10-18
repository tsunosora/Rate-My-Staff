"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconDownload, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons";
import { hm, shortDate, soft } from "@/components/portal/ui";
import { FormEntriAdmin, type EntriAdmin, type KaryawanPilihan } from "@/components/timesheet/FormEntriAdmin";

type Angka = { tercatat: number; hadir: number; persen: number | null };
type RekapKaryawan = Angka & {
  employeeId: number;
  nama: string;
  kode: string;
  departemen: string | null;
  jumlahEntri: number;
  hari: (Angka & { tanggal: string })[];
  minggu: (Angka & { awal: string })[];
};
type RekapProyek = {
  proyek: string;
  menit: number;
  jumlahEntri: number;
  karyawan: { employeeId: number; nama: string; menit: number }[];
};
type Rekap = { perKaryawan: RekapKaryawan[]; perProyek: RekapProyek[]; total: Angka };
type Daftar = {
  filter: { dari: string; sampai: string };
  items: (EntriAdmin & { employeeCode: string })[];
  total: number;
  totalMenit: number;
  page: number;
  perPage: number;
  karyawan: KaryawanPilihan[];
  proyek: string[];
};

const TAB = [
  { key: "karyawan", label: "Per karyawan" },
  { key: "proyek", label: "Per proyek" },
  { key: "entri", label: "Daftar entri" },
] as const;
type TabKey = (typeof TAB)[number]["key"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Persen({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <span className="text-subtle">–</span>;
  // Lebih dari jam hadir = ada yang tidak cocok (lupa scan, catat di luar jam kerja), bukan prestasi.
  if (nilai > 110)
    return (
      <span className="badge" style={{ ...soft("var(--warning)", 18), color: "var(--warning)" }} title={`${nilai}% dari jam hadir`}>
        Melebihi jam hadir
      </span>
    );
  const warna = nilai >= 90 ? "var(--success)" : nilai >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <span className="badge tabular" style={{ ...soft(warna, 18), color: warna }}>
      {nilai}%
    </span>
  );
}

export default function TimesheetPage() {
  const [dari, setDari] = useState(() => ymd(new Date(Date.now() - 29 * 86400000)));
  const [sampai, setSampai] = useState(() => ymd(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [proyek, setProyek] = useState("");
  const [tab, setTab] = useState<TabKey>("karyawan");
  const [page, setPage] = useState(1);
  const [daftar, setDaftar] = useState<Daftar | null>(null);
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [buka, setBuka] = useState<number | null>(null);
  const [form, setForm] = useState<{ entri: EntriAdmin | null } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => {
    const q = new URLSearchParams({ dari, sampai });
    if (employeeId) q.set("employee_id", employeeId);
    if (proyek === "__kosong__") q.set("tanpa_proyek", "1");
    else if (proyek) q.set("proyek", proyek);
    return q.toString();
  }, [dari, sampai, employeeId, proyek]);

  const ambil = useCallback(
    () =>
      Promise.all([
        api<Daftar>(`/api/timesheet?${query}&page=${page}`),
        api<Rekap>(`/api/timesheet/rekap?${query}`),
      ]),
    [query, page]
  );
  const terapkan = useCallback(([d, r]: [Daftar, Rekap]) => {
    setError("");
    setDaftar(d);
    setRekap(r);
  }, []);
  const muat = useCallback(
    () =>
      ambil()
        .then(terapkan)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat timesheet.")),
    [ambil, terapkan]
  );
  const load = muat;

  useEffect(() => {
    muat();
  }, [muat]);

  async function hapus(e: EntriAdmin) {
    if (!confirm(`Hapus catatan ${e.employeeName} ${shortDate(e.tanggal)} ${e.mulai}–${e.selesai}?`)) return;
    try {
      await api(`/api/timesheet/${e.id}`, { method: "DELETE" });
      setNotice("Catatan dihapus.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  const halamanTerakhir = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.perPage)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Timesheet</h1>
          <p className="mt-0.5 text-sm text-muted">
            Pekerjaan yang dicatat karyawan per jam, dibandingkan dengan jam hadir dari absensi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/timesheet/ekspor?${query}`} className="btn-ghost h-10">
            <IconDownload className="text-[16px]" /> Ekspor Excel
          </a>
          <button onClick={() => setForm({ entri: null })} className="btn-primary h-10" disabled={!daftar}>
            <IconPlus className="text-[16px]" /> Tambah catatan
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

      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted">Dari</span>
          <input type="date" className="input h-10" value={dari} onChange={(e) => { setDari(e.target.value); setPage(1); }} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted">Sampai</span>
          <input type="date" className="input h-10" value={sampai} onChange={(e) => { setSampai(e.target.value); setPage(1); }} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted">Karyawan</span>
          <select className="input h-10 w-auto" value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}>
            <option value="">Semua karyawan</option>
            {daftar?.karyawan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted">Proyek</span>
          <select className="input h-10 w-auto" value={proyek} onChange={(e) => { setProyek(e.target.value); setPage(1); }}>
            <option value="">Semua proyek</option>
            <option value="__kosong__">Tanpa proyek</option>
            {daftar?.proyek.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {rekap && (
          <div className="ml-auto text-right text-xs text-muted">
            Tercatat <b className="text-fg">{hm(rekap.total.tercatat)}</b> dari hadir {hm(rekap.total.hadir)}{" "}
            <Persen nilai={rekap.total.persen} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
                : "btn-ghost"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!rekap || !daftar ? (
        <div className="glass h-48 animate-pulse rounded-2xl" />
      ) : tab === "karyawan" ? (
        rekap.perKaryawan.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Belum ada catatan atau absensi di rentang ini.</div>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3 text-right">Tercatat</th>
                  <th className="px-4 py-3 text-right">Hadir</th>
                  <th className="px-4 py-3 text-right">Tercatat dari hadir</th>
                  <th className="px-4 py-3 text-right">Entri</th>
                </tr>
              </thead>
              <tbody>
                {rekap.perKaryawan.map((r) => (
                  <RowKaryawan key={r.employeeId} r={r} buka={buka === r.employeeId} onToggle={() => setBuka(buka === r.employeeId ? null : r.employeeId)} />
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-subtle">
              Jam hadir dari pasangan scan masuk–pulang. Hari tanpa scan pulang tidak dihitung hadirnya. Saringan proyek tidak
              memengaruhi tabel ini.
            </p>
          </div>
        )
      ) : tab === "proyek" ? (
        rekap.perProyek.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Belum ada catatan di rentang ini.</div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rekap.perProyek.map((p) => (
              <li key={p.proyek || "__kosong__"} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display font-bold text-fg">{p.proyek || "Tanpa proyek"}</h2>
                  <span className="tabular font-display text-lg font-extrabold text-fg">{hm(p.menit)}</span>
                </div>
                <p className="text-xs text-subtle">{p.jumlahEntri} entri · {p.karyawan.length} orang</p>
                <ul className="mt-3 space-y-1.5">
                  {p.karyawan.map((k) => (
                    <li key={k.employeeId} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted">{k.nama}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((k.menit / p.menit) * 100)}%` }} />
                      </span>
                      <span className="tabular w-16 text-right text-fg">{hm(k.menit)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )
      ) : daftar.items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Tidak ada catatan pada saringan ini.</div>
      ) : (
        <div className="space-y-3">
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Jam</th>
                  <th className="px-4 py-3">Proyek</th>
                  <th className="px-4 py-3">Kegiatan</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {daftar.items.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{shortDate(e.tanggal)}</td>
                    <td className="px-4 py-3 text-fg">
                      {e.employeeName}
                      {e.sumber === "admin" && <span className="ml-1 text-xs text-subtle">(owner)</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular text-fg">
                      {e.mulai}–{e.selesai} <span className="text-xs text-subtle">{hm(e.menit)}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{e.proyek || "–"}</td>
                    <td className="px-4 py-3 text-muted">
                      {e.kegiatan}
                      {e.catatan && <p className="text-xs text-subtle">{e.catatan}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => setForm({ entri: e })} className="btn-ghost h-8 w-8 p-0" aria-label="Sunting">
                        <IconPencil className="text-[14px]" />
                      </button>
                      <button onClick={() => hapus(e)} className="btn-ghost ml-1 h-8 w-8 p-0 text-danger" aria-label="Hapus">
                        <IconTrash className="text-[14px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {daftar.total} entri · total {hm(daftar.totalMenit)}
            </span>
            {halamanTerakhir > 1 && (
              <div className="flex items-center gap-2">
                <button className="btn-ghost h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </button>
                <span>
                  {page} / {halamanTerakhir}
                </span>
                <button className="btn-ghost h-8" disabled={page >= halamanTerakhir} onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {form && daftar && (
        <FormEntriAdmin
          entri={form.entri}
          karyawan={daftar.karyawan}
          proyek={daftar.proyek}
          onClose={() => setForm(null)}
          onSaved={async (pesan) => {
            setForm(null);
            setNotice(pesan);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RowKaryawan({ r, buka, onToggle }: { r: RekapKaryawan; buka: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-border hover:bg-surface-2" onClick={onToggle}>
        <td className="px-4 py-3">
          <span className="font-medium text-fg">{r.nama}</span>
          <span className="ml-2 text-xs text-subtle">{r.departemen ?? r.kode}</span>
        </td>
        <td className="px-4 py-3 text-right tabular text-fg">{hm(r.tercatat)}</td>
        <td className="px-4 py-3 text-right tabular text-muted">{hm(r.hadir)}</td>
        <td className="px-4 py-3 text-right">
          <Persen nilai={r.persen} />
        </td>
        <td className="px-4 py-3 text-right tabular text-muted">{r.jumlahEntri}</td>
      </tr>
      {buka && (
        <tr className="border-b border-border bg-surface-2">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-muted">Per minggu (mulai Senin)</h3>
                <ul className="space-y-1 text-xs">
                  {r.minggu.map((m) => (
                    <li key={m.awal} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{shortDate(m.awal)}</span>
                      <span className="tabular text-fg">
                        {hm(m.tercatat)} / {hm(m.hadir)} <Persen nilai={m.persen} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-muted">Per hari</h3>
                <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">
                  {r.hari
                    .slice()
                    .reverse()
                    .map((h) => (
                      <li key={h.tanggal} className="flex items-center justify-between gap-2">
                        <span className="text-muted">{shortDate(h.tanggal)}</span>
                        <span className="tabular text-fg">
                          {hm(h.tercatat)} / {hm(h.hadir)} <Persen nilai={h.persen} />
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
