"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconX, IconTrash, IconPlus, IconClock } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { LeaveStatusBadge, hm, longDate, soft } from "@/components/portal/ui";
import { MAKS_MUNDUR_ADMIN } from "@/lib/services/lembur/aturan";
import { IsianLembur, badanLembur, nilaiAwalLembur, type NilaiLembur } from "@/components/lembur/IsianLembur";

type Row = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  tanggal: string;
  mulai: string | null;
  selesai: string | null;
  menit: number;
  menitDisetujui: number | null;
  alasan: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  sumber: string;
  catatanKeputusan: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  createdAt: string;
  penerapan: "diterapkan" | "belum_ada_scan_pulang" | "berbeda" | null;
};

type Payload = {
  items: Row[];
  total: number;
  page: number;
  perPage: number;
  pending: number;
  karyawan?: { id: number; fullName: string }[];
};

type Hasil = { status: string; peringatan: string | null; penerapan?: string };

const FILTERS = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "", label: "Semua" },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  portal: "halaman karyawan",
  link: "form tautan",
  admin: "dicatat owner",
};

function bulanIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Aksi = "approve" | "reject" | "cancel";

export default function LemburPage() {
  const [filter, setFilter] = useState<string>("pending");
  const [bulan, setBulan] = useState<string>("");
  const [data, setData] = useState<Payload | null>(null);
  const [karyawan, setKaryawan] = useState<{ id: number; fullName: string }[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warn, setWarn] = useState("");
  const [decide, setDecide] = useState<{ row: Row; action: Aksi } | null>(null);
  const [note, setNote] = useState("");
  const [menitSetuju, setMenitSetuju] = useState("");
  const [busy, setBusy] = useState(false);
  const [catat, setCatat] = useState(false);
  const [catatEmp, setCatatEmp] = useState("");
  const [catatNilai, setCatatNilai] = useState<NilaiLembur>(nilaiAwalLembur);
  const [catatSetujui, setCatatSetujui] = useState(true);

  const ambil = useCallback(() => {
    const q = new URLSearchParams();
    if (filter) q.set("status", filter);
    if (bulan) q.set("bulan", bulan);
    q.set("with_employees", "1");
    return api<Payload>(`/api/overtime-requests?${q.toString()}`);
  }, [filter, bulan]);

  const terima = useCallback((r: Payload) => {
    setData(r);
    if (r.karyawan) setKaryawan(r.karyawan);
  }, []);

  useEffect(() => {
    let hidup = true;
    ambil()
      .then((r) => hidup && terima(r))
      .catch((e) => hidup && setError(e instanceof Error ? e.message : "Gagal memuat data."));
    return () => {
      hidup = false;
    };
  }, [ambil, terima]);

  async function load() {
    try {
      terima(await ambil());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    }
  }

  function tampilkanHasil(utama: string, h: Hasil) {
    setNotice(utama);
    setWarn(h.peringatan ?? "");
  }

  async function submitDecision() {
    if (!decide) return;
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { action: decide.action, note: note || null };
      if (decide.action === "approve" && menitSetuju) body.menitDisetujui = Number(menitSetuju);
      const res = await api<Hasil>(`/api/overtime-requests/${decide.row.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const utama =
        decide.action === "approve"
          ? res.penerapan === "diterapkan"
            ? "Lembur disetujui dan masuk ke absensi."
            : "Lembur disetujui."
          : decide.action === "reject"
            ? "Pengajuan ditolak."
            : "Pengajuan dibatalkan.";
      tampilkanHasil(utama, res);
      setDecide(null);
      setNote("");
      setMenitSetuju("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(false);
    }
  }

  async function terapkanUlang(row: Row) {
    setError("");
    try {
      const res = await api<Hasil>(`/api/overtime-requests/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reapply" }),
      });
      tampilkanHasil(res.penerapan === "diterapkan" ? "Menit lembur ditulis ulang ke absensi." : "Belum bisa diterapkan.", res);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menerapkan ulang.");
    }
  }

  async function submitCatat() {
    if (!catatEmp) return setError("Pilih karyawannya dulu.");
    if (!catatNilai.alasan.trim()) return setError("Tulis alasan atau pekerjaannya.");
    setBusy(true);
    setError("");
    try {
      const res = await api<Hasil>("/api/overtime-requests", {
        method: "POST",
        body: JSON.stringify({ employeeId: Number(catatEmp), setujui: catatSetujui, ...badanLembur(catatNilai) }),
      });
      tampilkanHasil(catatSetujui ? "Lembur dicatat dan disetujui." : "Lembur dicatat, menunggu persetujuan.", res);
      setCatat(false);
      setCatatEmp("");
      setCatatNilai(nilaiAwalLembur());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat lembur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Lembur</h1>
          <p className="mt-0.5 text-sm text-muted">
            Pengajuan lembur karyawan. Menit yang disetujui ditulis ke absensi pulang di tanggal itu.
          </p>
        </div>
        <button onClick={() => { setCatat(true); setError(""); }} className="btn-primary h-10">
          <IconPlus className="text-[16px]" /> Catat lembur
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> {notice}
        </div>
      )}
      {warn && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-warning" style={soft("var(--warning)")}>
          <IconAlert className="text-[16px] shrink-0" /> {warn}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              filter === f.key
                ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
                : "btn-ghost"
            }`}
          >
            {f.label}
            {f.key === "pending" && data && data.pending > 0 && (
              <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs font-semibold text-amber-700 shadow-sm">{data.pending}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-muted" htmlFor="saring-bulan">Bulan</label>
          <input
            id="saring-bulan"
            type="month"
            className="input h-10 w-40"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
          />
          {bulan ? (
            <button onClick={() => setBulan("")} className="btn-ghost h-10 text-xs">Semua bulan</button>
          ) : (
            <button onClick={() => setBulan(bulanIni())} className="btn-ghost h-10 text-xs">Bulan ini</button>
          )}
        </div>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">
          Tidak ada pengajuan lembur pada saringan ini.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-fg">
                    {r.employeeName}
                    <span className="ml-2 text-xs font-normal text-subtle">{r.employeeCode}</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    <b className="text-fg">{hm(r.menit)}</b>
                    {r.mulai && r.selesai && ` (${r.mulai}–${r.selesai})`} · {longDate(r.tanggal)}
                    {r.department && ` · ${r.department}`}
                  </p>
                  {r.status === "approved" && r.menitDisetujui !== null && r.menitDisetujui !== r.menit && (
                    <p className="mt-0.5 text-xs text-muted">Disetujui {hm(r.menitDisetujui)}</p>
                  )}
                </div>
                <LeaveStatusBadge status={r.status} />
              </div>

              <p className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">{r.alasan}</p>

              {r.status === "approved" && r.penerapan === "belum_ada_scan_pulang" && (
                <p className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs text-warning" style={soft("var(--warning)")}>
                  <IconClock className="mt-0.5 shrink-0 text-[14px]" />
                  Belum ada scan pulang; menit lembur tercatat di pengajuan, belum masuk struk.
                </p>
              )}
              {r.status === "approved" && r.penerapan === "berbeda" && (
                <p className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs text-warning" style={soft("var(--warning)")}>
                  <IconAlert className="mt-0.5 shrink-0 text-[14px]" />
                  Menit lembur di absensi pulang berbeda dari yang disetujui (diubah manual atau scan pulang baru masuk).
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                <span>Diajukan {new Date(r.createdAt).toLocaleString("id-ID")}</span>
                <span>via {SOURCE_LABEL[r.sumber] ?? r.sumber}</span>
                {r.decidedBy && <span>Diputus oleh {r.decidedBy}</span>}
              </div>

              {r.catatanKeputusan && (
                <p className="mt-2 text-xs text-muted">
                  <b className="text-fg">Catatan:</b> {r.catatanKeputusan}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "pending" && (
                  <>
                    <button
                      onClick={() => { setDecide({ row: r, action: "approve" }); setNote(""); setMenitSetuju(String(r.menit)); }}
                      className="btn-primary h-9 text-xs"
                    >
                      <IconCheck className="text-[15px]" /> Setujui
                    </button>
                    <button
                      onClick={() => { setDecide({ row: r, action: "reject" }); setNote(""); }}
                      className="btn-ghost h-9 text-xs"
                    >
                      <IconX className="text-[15px]" /> Tolak
                    </button>
                  </>
                )}
                {r.status === "approved" && r.penerapan !== "diterapkan" && (
                  <button onClick={() => terapkanUlang(r)} className="btn-ghost h-9 text-xs">
                    <IconCheck className="text-[15px]" /> Terapkan ulang
                  </button>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => { setDecide({ row: r, action: "cancel" }); setNote(""); }}
                    className="btn-ghost h-9 text-xs"
                  >
                    <IconTrash className="text-[15px]" /> Batalkan persetujuan
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {decide && (
        <Modal
          title={
            decide.action === "approve"
              ? "Setujui lembur"
              : decide.action === "reject"
                ? "Tolak lembur"
                : "Batalkan persetujuan"
          }
          onClose={() => setDecide(null)}
        >
          <p className="text-sm text-muted">
            <b className="text-fg">{decide.row.employeeName}</b> — {hm(decide.row.menit)},{" "}
            {longDate(decide.row.tanggal)}.
          </p>

          {decide.action === "approve" && (
            <label className="mt-4 block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Menit yang disetujui</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={960}
                className="input h-11"
                value={menitSetuju}
                onChange={(e) => setMenitSetuju(e.target.value)}
              />
              <span className="block text-xs text-subtle">
                Diajukan {decide.row.menit} menit. Ubah kalau yang disetujui lebih sedikit.
              </span>
            </label>
          )}

          <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            {decide.action === "approve" &&
              "Menit ini ditulis ke lembur disetujui di baris scan pulang tanggal itu. Kalau scan pulangnya belum ada, persetujuan tetap tersimpan dan bisa diterapkan ulang nanti."}
            {decide.action === "reject" && "Absensi tidak diubah. Karyawan melihat status “Ditolak” di halamannya."}
            {decide.action === "cancel" &&
              "Menit lembur yang ditulis persetujuan ini ditarik dari absensi. Kalau sudah Anda ubah manual di halaman Absensi, angka itu dibiarkan."}
          </p>

          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Catatan untuk karyawan (opsional)</span>
            <textarea className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDecide(null)} className="btn-ghost h-10">Batal</button>
            <button onClick={submitDecision} disabled={busy} className="btn-primary h-10">
              {busy ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </Modal>
      )}

      {catat && (
        <Modal title="Catat lembur" onClose={() => setCatat(false)}>
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
                <IconAlert className="text-[16px] shrink-0" /> {error}
              </div>
            )}
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Karyawan *</span>
              <select className="input h-11" value={catatEmp} onChange={(e) => setCatatEmp(e.target.value)}>
                <option value="">— pilih —</option>
                {karyawan.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </label>
            <IsianLembur nilai={catatNilai} onChange={setCatatNilai} maksMundur={MAKS_MUNDUR_ADMIN} />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={catatSetujui} onChange={(e) => setCatatSetujui(e.target.checked)} />
              Langsung setujui
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setCatat(false)} className="btn-ghost h-10">Batal</button>
            <button onClick={submitCatat} disabled={busy} className="btn-primary h-10">
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
