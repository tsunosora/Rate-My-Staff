"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconAlert, IconCheck, IconClock, IconPlus, IconTrash, IconUpload } from "@/components/ui/icons";
import { Card, Empty, hm, soft } from "./ui";

type Hasil = "tertarik" | "deal" | "follow_up" | "tidak_tertarik" | "lainnya";

type Item = {
  id: number;
  namaKlien: string;
  alamat: string | null;
  tujuan: string | null;
  masukAt: string;
  keluarAt: string | null;
  durasiMenit: number | null;
  jarakM: number | null;
  hasil: Hasil | null;
  catatan: string | null;
  status: "berjalan" | "selesai" | "tidak_selesai";
};

type Keadaan = { sebagaiOwner: boolean; terbuka: Item | null; items: Item[]; saran: string[] };

const HASIL: { key: Hasil; label: string; warna: string }[] = [
  { key: "deal", label: "Deal", warna: "var(--success)" },
  { key: "tertarik", label: "Tertarik", warna: "var(--info)" },
  { key: "follow_up", label: "Perlu follow up", warna: "var(--warning)" },
  { key: "tidak_tertarik", label: "Tidak tertarik", warna: "var(--danger)" },
  { key: "lainnya", label: "Lainnya", warna: "var(--fg-subtle)" },
];
const LABEL_HASIL = Object.fromEntries(HASIL.map((h) => [h.key, h])) as Record<Hasil, (typeof HASIL)[number]>;

const AKURASI_MAKS_M = 150;
const FOTO_MAKS = 6 * 1024 * 1024;

/** Kirim & baca jawaban; pesan galat dari `alasan` (rute kunjungan) atau `message` (penjaga sesi). */
async function panggil<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { alasan?: string; message?: string };
  if (!res.ok) throw new Error(body.alasan || body.message || `Permintaan gagal (${res.status})`);
  return body as T;
}

/** Pesan yang bisa dipahami untuk tiap cara GPS gagal. */
function pesanLokasi(e: unknown): string {
  const kode = (e as GeolocationPositionError | null)?.code;
  if (kode === 1) {
    return "Izin lokasi ditolak. Buka pengaturan situs di peramban (ikon gembok di samping alamat), izinkan Lokasi, lalu coba lagi.";
  }
  if (kode === 3) return "Lokasi terlalu lama terbaca. Pastikan GPS menyala, coba di luar ruangan, lalu ulangi.";
  return "Lokasi HP tidak terbaca. Nyalakan GPS lalu coba lagi.";
}

function bacaLokasi(): Promise<{ lat: number; lng: number; akurasi: number }> {
  return new Promise((ok, gagal) => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      gagal(new Error("Lokasi cuma bisa dibaca lewat alamat https. Buka halaman ini dari tautan resminya."));
      return;
    }
    if (!("geolocation" in navigator)) {
      gagal(new Error("HP ini tidak bisa membaca lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }),
      (e) => gagal(new Error(pesanLokasi(e))),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/** Foto dikecilkan di HP (sisi terpanjang 1280 px, JPEG) supaya cepat terkirim di sinyal lemah. */
async function kecilkan(berkas: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(berkas);
    const skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * skala);
    c.height = Math.round(bmp.height * skala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok, gagal) => c.toBlob((b) => (b ? ok(b) : gagal(new Error("foto"))), "image/jpeg", 0.8));
  } catch {
    return berkas; // peramban lama: kirim apa adanya, server tetap memeriksa isinya
  }
}

const jam = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const tanggal = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const jarakTeks = (m: number | null) =>
  m === null ? "" : m >= 1000 ? `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${m} m`;
const samaHari = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function Pesan({ ok, teks }: { ok: boolean; teks: string }) {
  const warna = ok ? "var(--success)" : "var(--danger)";
  return (
    <div className={`mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${ok ? "text-success" : "text-danger"}`} style={soft(warna)}>
      {ok ? <IconCheck className="mt-0.5 shrink-0 text-[16px]" /> : <IconAlert className="mt-0.5 shrink-0 text-[16px]" />}
      <span>{teks}</span>
    </div>
  );
}

function BadgeHasil({ hasil }: { hasil: Hasil | null }) {
  if (!hasil) return null;
  const h = LABEL_HASIL[hasil];
  if (!h) return null;
  return (
    <span className="badge" style={{ ...soft(h.warna, 18), color: h.warna }}>
      {h.label}
    </span>
  );
}

/** Kunjungan klien (sales/teknisi lapangan): mulai di lokasi klien, selesai dengan hasilnya. */
export function KunjunganPanel({ token, ownerQuery = "" }: { token: string; ownerQuery?: string }) {
  const [data, setData] = useState<Keadaan | null>(null);
  const [gagalMuat, setGagalMuat] = useState("");
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [langkah, setLangkah] = useState<"" | "lokasi" | "kirim">("");
  const [rentang, setRentang] = useState<"hari" | "bulan">("hari");

  // Isian mulai
  const [namaKlien, setNamaKlien] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [pratinjau, setPratinjau] = useState("");
  const fotoInput = useRef<HTMLInputElement>(null);

  // Isian selesai
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [catatan, setCatatan] = useState("");

  const [sekarang, setSekarang] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setSekarang(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const muat = useCallback(async () => {
    const r = await panggil<Keadaan>(`/api/public/portal/${token}/kunjungan?v=1${ownerQuery}`);
    setData(r);
    setGagalMuat("");
  }, [token, ownerQuery]);

  useEffect(() => {
    let batal = false;
    panggil<Keadaan>(`/api/public/portal/${token}/kunjungan?v=1${ownerQuery}`)
      .then((r) => {
        if (!batal) setData(r);
      })
      .catch((e) => {
        if (!batal) setGagalMuat(e instanceof Error ? e.message : "Gagal memuat kunjungan.");
      });
    return () => {
      batal = true;
    };
  }, [token, ownerQuery]);

  useEffect(() => () => {
    if (pratinjau) URL.revokeObjectURL(pratinjau);
  }, [pratinjau]);

  async function fotoDipilih(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    e.target.value = "";
    if (!berkas) return;
    if (!berkas.type.startsWith("image/")) return setPesan({ ok: false, teks: "Berkas itu bukan foto." });
    const kecil = await kecilkan(berkas);
    if (kecil.size > FOTO_MAKS) return setPesan({ ok: false, teks: "Foto terlalu besar (maks. 6 MB)." });
    setPesan(null);
    setFoto(kecil);
    setPratinjau(URL.createObjectURL(kecil));
  }

  function buangFoto() {
    setFoto(null);
    setPratinjau("");
  }

  async function mulai() {
    setPesan(null);
    if (namaKlien.trim().length < 2) return setPesan({ ok: false, teks: "Tulis nama klien yang dikunjungi." });
    try {
      setLangkah("lokasi");
      const lok = await bacaLokasi();
      if (lok.akurasi > AKURASI_MAKS_M) {
        throw new Error(`Sinyal lokasi kurang akurat (±${Math.round(lok.akurasi)} m). Coba dekat jendela atau di luar ruangan, lalu ulangi.`);
      }
      setLangkah("kirim");
      const fd = new FormData();
      fd.set("namaKlien", namaKlien.trim());
      fd.set("alamat", alamat.trim());
      fd.set("tujuan", tujuan.trim());
      fd.set("lat", String(lok.lat));
      fd.set("lng", String(lok.lng));
      fd.set("akurasi", String(lok.akurasi));
      if (foto) fd.set("foto", foto, "kunjungan.jpg");
      await panggil(`/api/public/portal/${token}/kunjungan`, { method: "POST", body: fd });
      setPesan({ ok: true, teks: `Kunjungan ke ${namaKlien.trim()} dimulai. Tekan "Selesai" saat meninggalkan lokasi.` });
      setNamaKlien("");
      setAlamat("");
      setTujuan("");
      buangFoto();
      await muat();
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal memulai kunjungan." });
      await muat().catch(() => {});
    } finally {
      setLangkah("");
    }
  }

  async function selesai(k: Item) {
    setPesan(null);
    if (!hasil) return setPesan({ ok: false, teks: "Pilih hasil kunjungannya dulu." });
    try {
      setLangkah("lokasi");
      const lok = await bacaLokasi();
      if (lok.akurasi > AKURASI_MAKS_M) {
        throw new Error(`Sinyal lokasi kurang akurat (±${Math.round(lok.akurasi)} m). Coba dekat jendela atau di luar ruangan, lalu ulangi.`);
      }
      setLangkah("kirim");
      const r = await panggil<{ durasiMenit: number | null }>(`/api/public/portal/${token}/kunjungan/${k.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasil, catatan: catatan.trim() || null, lat: lok.lat, lng: lok.lng, akurasi: lok.akurasi }),
      });
      setPesan({ ok: true, teks: `Kunjungan ke ${k.namaKlien} selesai${r.durasiMenit !== null ? ` (${hm(r.durasiMenit)})` : ""}.` });
      setHasil(null);
      setCatatan("");
      await muat();
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal menyelesaikan kunjungan." });
      await muat().catch(() => {});
    } finally {
      setLangkah("");
    }
  }

  const tampil = useMemo(
    () => (data?.items ?? []).filter((k) => (rentang === "hari" ? samaHari(k.masukAt) : true)),
    [data, rentang],
  );
  const ringkas = useMemo(() => {
    const selesaiSaja = tampil.filter((k) => k.durasiMenit !== null);
    return {
      jumlah: tampil.length,
      menit: selesaiSaja.reduce((n, k) => n + (k.durasiMenit ?? 0), 0),
      deal: tampil.filter((k) => k.hasil === "deal").length,
    };
  }, [tampil]);

  if (gagalMuat) {
    return (
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
        <IconAlert className="shrink-0 text-[16px]" /> {gagalMuat}
      </div>
    );
  }
  if (!data) return <div className="glass h-40 animate-pulse rounded-2xl" />;

  const sibuk = langkah !== "";
  const labelSibuk = langkah === "lokasi" ? "Membaca lokasi…" : "Mengirim…";
  const t = data.terbuka;

  return (
    <div className="space-y-4">
      {data.sebagaiOwner && (
        <div className="rounded-2xl px-4 py-3 text-sm text-muted" style={soft("var(--info)")}>
          Anda melihat sebagai owner. Mulai & selesai kunjungan cuma bisa dilakukan karyawannya dari HP-nya.
        </div>
      )}

      {t ? (
        <Card title="Kunjungan sedang berjalan">
          {pesan && <Pesan {...pesan} />}
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="font-display font-bold text-fg">{t.namaKlien}</div>
            {t.alamat && <div className="mt-0.5 text-sm text-muted">{t.alamat}</div>}
            {t.tujuan && <div className="mt-0.5 text-sm text-muted">Tujuan: {t.tujuan}</div>}
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
              <IconClock className="text-[14px]" /> Mulai {jam(t.masukAt)} · sudah{" "}
              {hm(Math.max(0, sekarang - new Date(t.masukAt).getTime()) / 60000)}
            </div>
          </div>

          {!data.sebagaiOwner && (
            <div className="mt-4 space-y-3">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-muted">Hasil kunjungan *</span>
                <div className="grid grid-cols-2 gap-2">
                  {HASIL.map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => setHasil(h.key)}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                        hasil === h.key ? "border-primary bg-primary/15 text-primary" : "border-border-strong text-muted hover:bg-surface-2"
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Catatan hasil</span>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={2000}
                  placeholder="Contoh: minta penawaran 20 unit, dihubungi lagi Senin."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </label>
              <button onClick={() => selesai(t)} disabled={sibuk} className="btn-primary h-11 w-full">
                {sibuk ? labelSibuk : "Selesai kunjungan"}
              </button>
              <p className="text-center text-xs text-subtle">Lokasi HP dicatat lagi saat Anda menekan Selesai.</p>
            </div>
          )}
        </Card>
      ) : (
        !data.sebagaiOwner && (
          <Card title="Mulai kunjungan">
            {pesan && <Pesan {...pesan} />}
            <div className="space-y-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Nama klien *</span>
                <input
                  className="input h-11"
                  list={`saran-klien-${token}`}
                  maxLength={150}
                  autoComplete="off"
                  placeholder="Contoh: Toko Maju Jaya"
                  value={namaKlien}
                  onChange={(e) => setNamaKlien(e.target.value)}
                />
                <datalist id={`saran-klien-${token}`}>
                  {data.saran.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Alamat (opsional)</span>
                <input className="input h-11" maxLength={255} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Tujuan (opsional)</span>
                <input
                  className="input h-11"
                  maxLength={255}
                  placeholder="Contoh: presentasi produk, servis rutin"
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value)}
                />
              </label>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-muted">Foto lokasi (disarankan)</span>
                {pratinjau ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pratinjau} alt="Pratinjau foto kunjungan" className="h-20 w-20 rounded-xl object-cover" />
                    <button type="button" onClick={buangFoto} className="btn-ghost h-9 text-xs">
                      <IconTrash className="text-[15px]" /> Hapus foto
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fotoInput.current?.click()} className="btn-ghost h-11 w-full text-sm">
                    <IconUpload className="text-[16px]" /> Ambil foto
                  </button>
                )}
                <input
                  ref={fotoInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={fotoDipilih}
                />
              </div>

              <button onClick={mulai} disabled={sibuk} className="btn-primary h-11 w-full">
                <IconPlus className="text-[16px]" /> {sibuk ? labelSibuk : "Mulai kunjungan"}
              </button>
              <p className="text-center text-xs text-subtle">
                Lokasi HP dicatat saat mulai dan saat selesai. Izinkan akses lokasi bila diminta.
              </p>
            </div>
          </Card>
        )
      )}

      <Card
        title="Riwayat kunjungan"
        action={
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["hari", "bulan"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRentang(r)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${rentang === r ? "bg-surface text-fg shadow" : "text-muted"}`}
              >
                {r === "hari" ? "Hari ini" : "Bulan ini"}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2">
            <div className="tabular font-display text-lg font-bold text-fg">{ringkas.jumlah}</div>
            <div className="text-xs text-subtle">kunjungan</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-2">
            <div className="tabular font-display text-lg font-bold text-fg">{hm(ringkas.menit)}</div>
            <div className="text-xs text-subtle">total durasi</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-2">
            <div className="tabular font-display text-lg font-bold text-fg">{ringkas.deal}</div>
            <div className="text-xs text-subtle">deal</div>
          </div>
        </div>

        {tampil.length === 0 ? (
          <Empty>{rentang === "hari" ? "Belum ada kunjungan hari ini." : "Belum ada kunjungan bulan ini."}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {tampil.map((k) => (
              <li key={k.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-fg">{k.namaKlien}</div>
                    <div className="mt-0.5 text-xs text-subtle">
                      {rentang === "bulan" && `${tanggal(k.masukAt)} · `}
                      {jam(k.masukAt)}
                      {k.keluarAt ? `–${jam(k.keluarAt)}` : ""}
                      {k.durasiMenit !== null && ` · ${hm(k.durasiMenit)}`}
                      {k.jarakM !== null && ` · berpindah ${jarakTeks(k.jarakM)}`}
                    </div>
                  </div>
                  {k.status === "selesai" ? (
                    <BadgeHasil hasil={k.hasil} />
                  ) : k.status === "berjalan" ? (
                    <span className="badge" style={{ ...soft("var(--info)", 18), color: "var(--info)" }}>
                      Berjalan
                    </span>
                  ) : (
                    <span className="badge" style={{ ...soft("var(--danger)", 18), color: "var(--danger)" }}>
                      Tidak diselesaikan
                    </span>
                  )}
                </div>
                {k.catatan && <p className="mt-1.5 text-sm text-muted">{k.catatan}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
