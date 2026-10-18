"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconClock, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { Card, Empty, hm, shortDate, soft } from "./ui";

type Entri = {
  id: number;
  tanggal: string;
  mulai: string;
  selesai: string;
  menit: number;
  proyek: string;
  kegiatan: string;
  catatan: string | null;
  sumber: string;
};

type Hari = {
  tanggal: string;
  tercatat: number;
  hadir: number;
  jamMasuk: string | null;
  jamPulang: string | null;
  persen: number | null;
  belumTercatat: number;
};

type Data = {
  hariIni: string;
  batasMundurHari: number;
  batasTanggal: string;
  bisaMenulis: boolean;
  items: Entri[];
  hari: Hari[];
  mingguIni: { awal: string; tercatat: number; hadir: number; persen: number | null };
  proyek: string[];
};

type Form = { tanggal: string; mulai: string; selesai: string; proyek: string; kegiatan: string; catatan: string };

function jamSekarang(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Jam selesai paling akhir pada satu tanggal. "HH:MM" bisa dibandingkan sebagai teks. */
function selesaiTerakhir(items: Entri[], tanggal: string): string | null {
  let t: string | null = null;
  for (const e of items) if (e.tanggal === tanggal && (t === null || e.selesai > t)) t = e.selesai;
  return t;
}

/** Catat pekerjaan per jam (timesheet), dibandingkan dengan jam hadir dari absensi. */
export function TimesheetPanel({ token, ownerQuery = "" }: { token: string; ownerQuery?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const ambil = useCallback(
    () => api<Data>(`/api/public/portal/${token}/timesheet?v=1${ownerQuery}`),
    [token, ownerQuery]
  );
  const load = useCallback(async () => setData(await ambil()), [ambil]);

  useEffect(() => {
    ambil()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat timesheet."));
  }, [ambil]);

  const perHari = useMemo(() => {
    const m = new Map<string, Entri[]>();
    for (const e of data?.items ?? []) m.set(e.tanggal, [...(m.get(e.tanggal) ?? []), e]);
    return m;
  }, [data]);

  if (!data) {
    return error ? (
      <Card>
        <p className="text-sm text-danger">{error}</p>
      </Card>
    ) : (
      <div className="glass h-40 animate-pulse rounded-2xl" />
    );
  }

  const hariIni = data.hari.find((h) => h.tanggal === data.hariIni);
  const bisaUbah = (e: Entri) => data.bisaMenulis && e.sumber !== "admin" && e.tanggal >= data.batasTanggal;

  function bukaBaru(tanggal = data!.hariIni) {
    setError("");
    setOk("");
    setEditId(null);
    const lanjut = selesaiTerakhir(data!.items, tanggal);
    setForm({ tanggal, mulai: lanjut ?? "", selesai: tanggal === data!.hariIni ? jamSekarang() : "", proyek: "", kegiatan: "", catatan: "" });
  }

  function bukaSunting(e: Entri) {
    setError("");
    setOk("");
    setEditId(e.id);
    setForm({ tanggal: e.tanggal, mulai: e.mulai, selesai: e.selesai, proyek: e.proyek, kegiatan: e.kegiatan, catatan: e.catatan ?? "" });
  }

  function lanjutkan() {
    if (!form) return;
    const t = selesaiTerakhir(
      data!.items.filter((e) => e.id !== editId),
      form.tanggal
    );
    if (!t) return setError("Belum ada catatan lain di tanggal ini untuk dilanjutkan.");
    setError("");
    setForm({ ...form, mulai: t, selesai: form.tanggal === data!.hariIni && jamSekarang() > t ? jamSekarang() : form.selesai });
  }

  async function simpan() {
    if (!form) return;
    setError("");
    setOk("");
    if (!form.mulai || !form.selesai) return setError("Isi jam mulai dan selesai.");
    if (form.selesai <= form.mulai) return setError("Jam selesai harus lebih besar dari jam mulai.");
    if (form.kegiatan.trim().length < 2) return setError("Tulis kegiatannya dulu.");
    setBusy(true);
    try {
      const body = JSON.stringify({ ...form, proyek: form.proyek || null, catatan: form.catatan || null });
      if (editId) {
        await api(`/api/public/portal/${token}/timesheet/${editId}`, { method: "PATCH", body });
        setOk("Catatan diperbarui.");
      } else {
        await api(`/api/public/portal/${token}/timesheet`, { method: "POST", body });
        setOk("Pekerjaan tercatat.");
      }
      setForm(null);
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function hapus(e: Entri) {
    if (!confirm(`Hapus catatan ${e.mulai}–${e.selesai} (${e.kegiatan})?`)) return;
    setError("");
    try {
      await api(`/api/public/portal/${token}/timesheet/${e.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  const set = (k: keyof Form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: ev.target.value } : f));

  const durasiForm =
    form && form.mulai && form.selesai && form.selesai > form.mulai
      ? (() => {
          const [a, b] = [form.mulai, form.selesai].map((j) => Number(j.slice(0, 2)) * 60 + Number(j.slice(3, 5)));
          return b - a;
        })()
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Ringkas
          judul="Hari ini"
          tercatat={hariIni?.tercatat ?? 0}
          hadir={hariIni?.hadir ?? 0}
          ket={
            hariIni?.jamMasuk
              ? `Absen ${hariIni.jamMasuk}${hariIni.jamPulang ? `–${hariIni.jamPulang}` : " (belum pulang)"}`
              : "Belum ada scan masuk hari ini"
          }
        />
        <Ringkas judul="Minggu ini" tercatat={data.mingguIni.tercatat} hadir={data.mingguIni.hadir} ket={`Sejak Senin, ${shortDate(data.mingguIni.awal)}`} />
      </div>

      <Card
        title="Catat pekerjaan"
        action={
          data.bisaMenulis && (
            <button onClick={() => (form ? (setForm(null), setEditId(null)) : bukaBaru())} className="btn-ghost h-9 text-xs">
              {form ? <IconX className="text-[15px]" /> : <IconPlus className="text-[15px]" />} {form ? "Tutup" : "Catat"}
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

        {!data.bisaMenulis ? (
          <p className="text-sm text-muted">Anda melihat sebagai owner — catatan hanya bisa diisi karyawannya sendiri.</p>
        ) : form ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Tanggal *</span>
                <input type="date" className="input h-11" value={form.tanggal} min={data.batasTanggal} max={data.hariIni} onChange={set("tanggal")} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Mulai *</span>
                <input type="time" className="input h-11" value={form.mulai} onChange={set("mulai")} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Selesai *</span>
                <input type="time" className="input h-11" value={form.selesai} onChange={set("selesai")} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={lanjutkan} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <IconClock className="text-[13px]" /> Lanjutkan dari jam selesai terakhir
              </button>
              {durasiForm > 0 && <span className="text-xs text-muted">Durasi {hm(durasiForm)}</span>}
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Proyek</span>
              <input
                className="input h-11"
                list="saran-proyek-timesheet"
                maxLength={100}
                placeholder="Contoh: Booth pameran Oktober (boleh kosong)"
                value={form.proyek}
                onChange={set("proyek")}
              />
              <datalist id="saran-proyek-timesheet">
                {data.proyek.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Kegiatan *</span>
              <input className="input h-11" maxLength={255} placeholder="Contoh: desain layout banner" value={form.kegiatan} onChange={set("kegiatan")} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Catatan</span>
              <textarea className="input" rows={2} maxLength={2000} value={form.catatan} onChange={set("catatan")} />
            </label>

            <button onClick={simpan} disabled={busy} className="btn-primary h-11 w-full">
              {busy ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Simpan Catatan"}
            </button>
            <p className="text-center text-xs text-subtle">
              Catatan bisa diubah atau dihapus sampai {data.batasMundurHari} hari ke belakang.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Tekan <b className="text-fg">Catat</b> untuk mencatat pekerjaan yang sudah dikerjakan: jam, proyek, dan kegiatannya.
          </p>
        )}
      </Card>

      <Card title={`Catatan ${data.batasMundurHari} hari terakhir`}>
        {data.items.length === 0 && data.hari.every((h) => h.hadir === 0) ? (
          <Empty>Belum ada catatan pekerjaan.</Empty>
        ) : (
          <ul className="space-y-3">
            {data.hari
              .filter((h) => h.tercatat > 0 || h.hadir > 0)
              .map((h) => {
                const isi = (perHari.get(h.tanggal) ?? []).slice().sort((a, b) => a.mulai.localeCompare(b.mulai));
                return (
                  <li key={h.tanggal} className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{shortDate(h.tanggal)}</span>
                      <span className="text-xs text-muted">
                        Tercatat <b className="text-fg">{hm(h.tercatat)}</b>
                        {h.hadir > 0 && (
                          <>
                            {" "}dari hadir {hm(h.hadir)}
                            {h.belumTercatat > 0 && <span className="text-warning"> · belum dicatat {hm(h.belumTercatat)}</span>}
                          </>
                        )}
                      </span>
                    </div>
                    {isi.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {isi.map((e) => (
                          <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2">
                            <div className="min-w-0">
                              <p className="text-sm text-fg">
                                <span className="tabular font-medium">{e.mulai}–{e.selesai}</span>{" "}
                                <span className="text-muted">({hm(e.menit)})</span> · {e.kegiatan}
                              </p>
                              <p className="text-xs text-subtle">
                                {e.proyek || "Tanpa proyek"}
                                {e.sumber === "admin" && " · dicatat owner"}
                              </p>
                              {e.catatan && <p className="mt-0.5 text-xs text-muted">{e.catatan}</p>}
                            </div>
                            {bisaUbah(e) && (
                              <div className="flex shrink-0 gap-1">
                                <button onClick={() => bukaSunting(e)} className="btn-ghost h-8 w-8 p-0" aria-label="Sunting catatan">
                                  <IconPencil className="text-[14px]" />
                                </button>
                                <button onClick={() => hapus(e)} className="btn-ghost h-8 w-8 p-0 text-danger" aria-label="Hapus catatan">
                                  <IconTrash className="text-[14px]" />
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      data.bisaMenulis && (
                        <button onClick={() => bukaBaru(h.tanggal)} className="mt-2 text-xs font-medium text-primary hover:underline">
                          + Catat pekerjaan tanggal ini
                        </button>
                      )
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Ringkas({ judul, tercatat, hadir, ket }: { judul: string; tercatat: number; hadir: number; ket: string }) {
  const persen = hadir > 0 ? Math.round((tercatat / hadir) * 100) : null;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs font-medium text-muted">{judul}</div>
      <div className="tabular mt-1 font-display text-2xl font-extrabold text-fg">{hm(tercatat)}</div>
      <div className="mt-0.5 text-xs text-subtle">
        {hadir <= 0
          ? "belum ada jam hadir"
          : (persen ?? 0) > 110
            ? `melebihi ${hm(hadir)} jam hadir`
            : `dari ${hm(hadir)} hadir (${persen}%)`}{" "}
        · {ket}
      </div>
      {hadir > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, persen ?? 0)}%` }} />
        </div>
      )}
    </div>
  );
}
