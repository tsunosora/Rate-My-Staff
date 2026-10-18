"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconCopy } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";
import { seninDari, tambahHari } from "@/lib/services/jadwal-shift/aturan";
import { ModalSel } from "@/components/jadwal-shift/ModalSel";
import { ModalMassal, type IsiMassal } from "@/components/jadwal-shift/ModalMassal";
import {
  hariIni,
  jamJadwal,
  labelTanggal,
  NAMA_HARI,
  warnaJadwal,
  type DataKisi,
  type JadwalKerja,
  type KaryawanKisi,
  type Pilihan,
  type SelRoster,
} from "@/components/jadwal-shift/jenis";

type Mode = "minggu" | "bulan";
type Departemen = { id: number; name: string };
type HasilSimpan = { disimpan: number; dihapus: number; dihitungUlang: number; kosong?: boolean };

function rentangDari(mode: Mode, acuan: string): { dari: string; sampai: string } {
  if (mode === "minggu") {
    const dari = seninDari(acuan);
    return { dari, sampai: tambahHari(dari, 6) };
  }
  const [y, m] = acuan.split("-").map(Number);
  const akhir = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { dari: `${y}-${mm}-01`, sampai: `${y}-${mm}-${String(akhir).padStart(2, "0")}` };
}

function geserAcuan(mode: Mode, acuan: string, arah: 1 | -1): string {
  if (mode === "minggu") return tambahHari(acuan, 7 * arah);
  const [y, m] = acuan.split("-").map(Number);
  const d = new Date(y, m - 1 + arah, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function judulRentang(mode: Mode, dari: string, sampai: string): string {
  if (mode === "bulan") {
    const d = new Date(`${dari}T00:00:00`);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }
  return `${labelTanggal(dari)} – ${labelTanggal(sampai)} ${sampai.slice(0, 4)}`;
}

export default function JadwalShiftPage() {
  const [mode, setMode] = useState<Mode>("minggu");
  const [acuan, setAcuan] = useState(hariIni());
  const [deptId, setDeptId] = useState("");
  const [depts, setDepts] = useState<Departemen[]>([]);
  const [data, setData] = useState<DataKisi | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pilihan, setTerpilih] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<{ k: KaryawanKisi; tanggal: string } | null>(null);
  const [massal, setMassal] = useState(false);
  const [salin, setSalin] = useState(false);
  const [salinTimpa, setSalinTimpa] = useState(true);

  const { dari, sampai } = rentangDari(mode, acuan);
  const today = hariIni();

  const [versi, setVersi] = useState(0);
  const load = useCallback(() => setVersi((v) => v + 1), []);
  const urlKisi = `/api/jadwal-shift?${new URLSearchParams({ dari, sampai, ...(deptId ? { departmentId: deptId } : {}) })}`;

  useEffect(() => {
    let batal = false;
    api<DataKisi>(urlKisi)
      .then((d) => {
        if (batal) return;
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat jadwal.");
      });
    return () => {
      batal = true;
    };
  }, [urlKisi, versi]);

  useEffect(() => {
    api<Departemen[]>("/api/departments")
      .then((d) => setDepts(d))
      .catch(() => setDepts([]));
  }, []);

  // Pilihan karyawan yang tidak tampil lagi (mis. ganti departemen) tidak ikut dihitung.
  const terpilih = useMemo(() => {
    if (!data) return new Set<number>();
    const ada = new Set(data.karyawan.map((k) => k.id));
    return new Set([...pilihan].filter((id) => ada.has(id)));
  }, [data, pilihan]);

  const jadwalById = useMemo(() => new Map((data?.jadwal ?? []).map((j) => [j.id, j])), [data]);
  const rosterByKey = useMemo(
    () => new Map((data?.sel ?? []).map((s) => [`${s.employeeId}|${s.tanggal}`, s])),
    [data]
  );

  async function simpan(body: unknown, url = "/api/jadwal-shift", method = "PUT"): Promise<HasilSimpan | null> {
    setBusy(true);
    setError("");
    try {
      const r = await api<HasilSimpan>(url, { method, body: JSON.stringify(body) });
      load();
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan jadwal.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function pilihSel(p: Pilihan, catatan: string | null) {
    if (!sel) return;
    const r = await simpan({
      sel: [{ employeeId: sel.k.id, tanggal: sel.tanggal, workScheduleId: p.workScheduleId, libur: p.libur, catatan }],
    });
    if (r) {
      setNotice(
        r.dihapus > 0 && r.disimpan === 0
          ? `${sel.k.fullName} ${labelTanggal(sel.tanggal)} kembali ke jadwal tetap.`
          : `Jadwal ${sel.k.fullName} ${labelTanggal(sel.tanggal)} disimpan.`
      );
      setSel(null);
    }
  }

  async function terapkanMassal(isi: IsiMassal) {
    const r = await simpan({ massal: isi });
    if (r) {
      setNotice(`${r.disimpan} sel diisi${r.dihapus ? `, ${r.dihapus} dikembalikan ke jadwal tetap` : ""}.`);
      setMassal(false);
    }
  }

  async function salinMingguLalu() {
    const senin = seninDari(acuan);
    const r = await simpan(
      {
        dariSumber: tambahHari(senin, -7),
        sampaiSumber: tambahHari(senin, -1),
        dariTujuan: senin,
        ...(terpilih.size ? { employeeIds: [...terpilih] } : {}),
        ...(deptId ? { departmentId: Number(deptId) } : {}),
        timpa: salinTimpa,
      },
      "/api/jadwal-shift/salin",
      "POST"
    );
    if (r) {
      setNotice(
        r.kosong
          ? "Minggu lalu tidak punya jadwal khusus — tidak ada yang disalin."
          : `Minggu lalu disalin: ${r.disimpan} sel${r.dihapus ? `, ${r.dihapus} dikembalikan ke jadwal tetap` : ""}.`
      );
      setSalin(false);
    }
  }

  const semuaTerpilih = !!data && data.karyawan.length > 0 && terpilih.size === data.karyawan.length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Jadwal Shift</h1>
          <p className="mt-0.5 text-sm text-muted">
            Atur shift per tanggal. Sel yang diatur di sini mengalahkan jadwal tetap karyawan untuk hari itu, dan
            dipakai untuk menghitung telat &amp; lembur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "minggu" && (
            <button className="btn-ghost h-10" disabled={busy || !data} onClick={() => setSalin(true)}>
              <IconCopy className="text-[16px]" /> Salin minggu lalu
            </button>
          )}
          <button className="btn-primary h-10" disabled={busy || !data || data.karyawan.length === 0} onClick={() => setMassal(true)}>
            Isi massal{terpilih.size ? ` (${terpilih.size})` : ""}
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="shrink-0 text-[16px]" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="shrink-0 text-[16px]" /> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-border-strong p-0.5">
          {(["minggu", "bulan"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                mode === m ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg"
              }`}
            >
              {m === "minggu" ? "Minggu" : "Bulan"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Sebelumnya" className="btn-ghost h-9 w-9 !px-0" onClick={() => setAcuan(geserAcuan(mode, acuan, -1))}>
            <IconChevronLeft className="text-[16px]" />
          </button>
          <button className="btn-ghost h-9" onClick={() => setAcuan(hariIni())}>
            Hari ini
          </button>
          <button aria-label="Berikutnya" className="btn-ghost h-9 w-9 !px-0" onClick={() => setAcuan(geserAcuan(mode, acuan, 1))}>
            <IconChevronRight className="text-[16px]" />
          </button>
        </div>
        <span className="text-sm font-medium text-fg">{judulRentang(mode, dari, sampai)}</span>
        <select className="input ml-auto !w-auto min-w-40" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
          <option value="">Semua departemen</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <Legenda jadwal={data?.jadwal ?? []} />

      {!data ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : data.karyawan.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Tidak ada karyawan aktif pada filter ini.</div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-40 border-b border-border bg-[var(--solid)] px-3 py-2 text-left font-medium text-subtle">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua karyawan"
                        checked={semuaTerpilih}
                        onChange={(e) => setTerpilih(new Set(e.target.checked ? data.karyawan.map((k) => k.id) : []))}
                      />
                      Karyawan
                    </label>
                  </th>
                  {data.tanggal.map((t) => {
                    const libur = t.liburNasional || t.mingguLibur;
                    return (
                      <th
                        key={t.tanggal}
                        title={t.liburNasional ?? (t.mingguLibur ? "Minggu (libur otomatis)" : undefined)}
                        className={`min-w-[5.5rem] border-b border-l border-border px-1.5 py-2 text-center font-medium ${
                          libur ? "text-danger" : "text-subtle"
                        } ${t.tanggal === today ? "bg-surface-2" : ""}`}
                      >
                        <span className="block">{NAMA_HARI[t.hari]}</span>
                        <span className="block tabular text-fg">{labelTanggal(t.tanggal)}</span>
                        {t.liburNasional && (
                          <span className="block max-w-[5.5rem] truncate text-[10px] font-normal">{t.liburNasional}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.karyawan.map((k) => (
                  <tr key={k.id}>
                    <td className="sticky left-0 z-10 border-b border-border bg-[var(--solid)] px-3 py-1.5">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={terpilih.has(k.id)}
                          onChange={(e) => {
                            const n = new Set(terpilih);
                            if (e.target.checked) n.add(k.id);
                            else n.delete(k.id);
                            setTerpilih(n);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block max-w-36 truncate text-sm font-medium text-fg">{k.fullName}</span>
                          <span className="block max-w-36 truncate text-[11px] text-subtle">
                            {k.department ?? "—"} · tetap: {k.workScheduleId ? jadwalById.get(k.workScheduleId)?.name ?? "?" : "tanpa"}
                          </span>
                        </span>
                      </label>
                    </td>
                    {data.tanggal.map((t) => (
                      <td
                        key={t.tanggal}
                        className={`border-b border-l border-border p-1 ${t.tanggal === today ? "bg-surface-2" : ""}`}
                      >
                        <Sel
                          karyawan={k}
                          tanggal={t}
                          roster={rosterByKey.get(`${k.id}|${t.tanggal}`) ?? null}
                          jadwal={data.jadwal}
                          jadwalById={jadwalById}
                          onKlik={() => setSel({ k, tanggal: t.tanggal })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sel && data && (
        <ModalSel
          nama={sel.k.fullName}
          tanggal={sel.tanggal}
          jadwal={data.jadwal}
          jadwalTetap={sel.k.workScheduleId ? jadwalById.get(sel.k.workScheduleId) ?? null : null}
          sekarang={(() => {
            const r = rosterByKey.get(`${sel.k.id}|${sel.tanggal}`);
            return r ? { workScheduleId: r.workScheduleId, libur: r.libur } : null;
          })()}
          catatanAwal={rosterByKey.get(`${sel.k.id}|${sel.tanggal}`)?.catatan ?? null}
          sibuk={busy}
          onTutup={() => setSel(null)}
          onPilih={pilihSel}
        />
      )}

      {massal && data && (
        <ModalMassal
          karyawan={data.karyawan}
          terpilihAwal={[...terpilih]}
          jadwal={data.jadwal}
          dariAwal={dari}
          sampaiAwal={sampai}
          sibuk={busy}
          onTutup={() => setMassal(false)}
          onSimpan={terapkanMassal}
        />
      )}

      {salin && (
        <Modal title="Salin minggu lalu" onClose={() => setSalin(false)}>
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Jadwal khusus{" "}
              <span className="font-medium text-fg">
                {labelTanggal(tambahHari(seninDari(acuan), -7))} – {labelTanggal(tambahHari(seninDari(acuan), -1))}
              </span>{" "}
              disalin ke{" "}
              <span className="font-medium text-fg">
                {labelTanggal(seninDari(acuan))} – {labelTanggal(tambahHari(seninDari(acuan), 6))}
              </span>{" "}
              untuk {terpilih.size ? `${terpilih.size} karyawan terpilih` : "semua karyawan yang tampil"}.
            </p>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={!salinTimpa} onChange={(e) => setSalinTimpa(!e.target.checked)} />
              <span>
                Hanya isi tanggal yang masih memakai jadwal tetap
                <span className="block text-xs text-subtle">
                  Tanpa centang, minggu ini dibuat persis sama dengan minggu lalu (jadwal khusus yang sudah ada di minggu
                  ini ditimpa).
                </span>
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setSalin(false)}>
                Batal
              </button>
              <button className="btn-primary" disabled={busy} onClick={salinMingguLalu}>
                {busy ? "Menyalin…" : "Salin"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Sel({
  karyawan,
  tanggal,
  roster,
  jadwal,
  jadwalById,
  onKlik,
}: {
  karyawan: KaryawanKisi;
  tanggal: { tanggal: string; liburNasional: string | null; mingguLibur: boolean };
  roster: SelRoster | null;
  jadwal: JadwalKerja[];
  jadwalById: Map<number, JadwalKerja>;
  onKlik: () => void;
}) {
  const liburUmum = Boolean(tanggal.liburNasional || tanggal.mingguLibur);
  const rosterBermakna = roster && (roster.libur || roster.workScheduleId != null);
  const libur = Boolean(rosterBermakna && roster.libur);
  const wsId = rosterBermakna && roster.workScheduleId != null ? roster.workScheduleId : karyawan.workScheduleId;
  const ws = wsId != null ? jadwalById.get(wsId) : undefined;
  const bawaan = !rosterBermakna;

  let label: string;
  let sub = "";
  let warna: string;
  if (libur) {
    label = "Libur";
    warna = "var(--warning)";
  } else if (ws) {
    label = ws.name;
    sub = jamJadwal(ws);
    warna = warnaJadwal(jadwal, ws.id);
  } else {
    label = "—";
    warna = "var(--fg-subtle)";
  }

  const judul = [
    libur ? "Libur (khusus karyawan ini)" : ws ? `${ws.name}${sub ? ` ${sub}` : ""}` : "Tanpa jadwal",
    bawaan ? "jadwal tetap" : "diatur khusus",
    liburUmum ? `hari libur: ${tanggal.liburNasional ?? "Minggu"}` : "",
    roster?.catatan ? `catatan: ${roster.catatan}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      onClick={onKlik}
      title={judul}
      aria-label={`${karyawan.fullName} ${labelTanggal(tanggal.tanggal)}: ${judul}`}
      className={`block h-11 w-full min-w-[5rem] rounded-lg px-1.5 text-left transition hover:ring-2 hover:ring-primary/50 ${
        bawaan ? "border border-dashed border-border-strong opacity-70" : "border border-transparent"
      }`}
      style={bawaan ? undefined : { background: `color-mix(in oklab, ${warna} 18%, transparent)` }}
    >
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: warna }} />
        <span className={`truncate font-medium ${bawaan ? "text-muted" : "text-fg"}`}>{label}</span>
        {roster?.catatan && <span className="shrink-0 text-[10px] text-subtle">✎</span>}
      </span>
      <span className={`block truncate text-[10px] tabular ${liburUmum && !libur ? "text-danger" : "text-subtle"}`}>
        {liburUmum && !libur ? "hari libur" : sub || (bawaan ? "tetap" : "")}
      </span>
    </button>
  );
}

function Legenda({ jadwal }: { jadwal: JadwalKerja[] }) {
  if (jadwal.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {jadwal
        .filter((j) => !j.dihapus)
        .map((j) => (
          <span key={j.id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: warnaJadwal(jadwal, j.id) }} />
            {j.name}
            {jamJadwal(j) && <span className="text-subtle tabular">{jamJadwal(j)}</span>}
          </span>
        ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Libur karyawan
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-dashed border-border-strong" /> Jadwal tetap (belum diatur khusus)
      </span>
      <span className="inline-flex items-center gap-1.5 text-danger">Tanggal merah = libur nasional / Minggu</span>
    </div>
  );
}
