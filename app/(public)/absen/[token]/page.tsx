"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api } from "@/lib/fetcher";
import { PinGate } from "@/components/portal/PinGate";
import { NamaMerek, UbinLogo } from "@/components/QendaliMark";
import { IconAlert, IconCheck, IconClock } from "@/components/ui/icons";
import type { PortalState } from "@/components/portal/types";

type Absen = {
  aktif: boolean;
  hpTerkunci: boolean;
  lokasi: { id: number; nama: string; radiusM: number; wajibQr: boolean }[];
  hariIni: { id: number; jam: string; jenis: string | null; lewat: "hp" | "mesin" }[];
};
type Keadaan = PortalState & { absen?: Absen };
type Tolak = { ok: false; kode: string; alasan: string; perluQr?: boolean };
type Terima = { ok: true; jenis: string | null; jam: string; lokasi: string; jarakM: number; qr: boolean; hpBaruDikunci: boolean };

const KUNCI_PERANGKAT = "qe-absen-hp-perangkat";

/** Id acak HP ini; server cuma menyimpan sidiknya. Hilang kalau data peramban dihapus. */
function idPerangkat(): string {
  try {
    let id = localStorage.getItem(KUNCI_PERANGKAT);
    if (!id) {
      id = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
      localStorage.setItem(KUNCI_PERANGKAT, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Foto dikecilkan di HP (sisi terpanjang 1280 px, JPEG) supaya cepat terkirim di sinyal lemah. */
async function kecilkan(berkas: File): Promise<Blob> {
  const bmp = await createImageBitmap(berkas);
  const skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * skala);
  c.height = Math.round(bmp.height * skala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, gagal) => c.toBlob((b) => (b ? ok(b) : gagal(new Error("foto"))), "image/jpeg", 0.8));
}

function bacaLokasi(): Promise<GeolocationPosition> {
  return new Promise((ok, gagal) =>
    navigator.geolocation.getCurrentPosition(ok, gagal, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }),
  );
}

const jamDari = (t: string) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export default function AbsenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [keadaan, setKeadaan] = useState<Keadaan | null>(null);
  const [tidakSah, setTidakSah] = useState(false);
  const [langkah, setLangkah] = useState<"diam" | "lokasi" | "foto" | "kirim" | "qr">("diam");
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);
  const tertunda = useRef<{ foto: Blob; pos: GeolocationPosition } | null>(null);

  const muat = useCallback(async () => {
    try {
      setKeadaan(await api<Keadaan>(`/api/public/absen/${token}`));
    } catch {
      setTidakSah(true);
    }
  }, [token]);
  useEffect(() => {
    muat();
  }, [muat]);

  // Kamera dibuka LANGSUNG di dalam ketukan, lokasi dibaca SESUDAH foto diambil. Urutannya penting:
  // peramban hanya mengizinkan membuka kamera/pemilih berkas sesaat setelah ketukan, jadi kalau GPS
  // dibaca dulu dan butuh beberapa detik, kamera diam-diam tidak terbuka dan tombolnya macet.
  function mulai() {
    setPesan(null);
    if (!("geolocation" in navigator)) return setPesan({ ok: false, teks: "HP ini tidak bisa membaca lokasi." });
    tertunda.current = null;
    setLangkah("foto");
    fotoInput.current?.click();
  }

  async function fotoDipilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return setLangkah("diam");
    let foto: Blob;
    try {
      foto = await kecilkan(f);
    } catch {
      setLangkah("diam");
      return setPesan({ ok: false, teks: "Foto tidak terbaca. Coba ambil ulang." });
    }
    setLangkah("lokasi");
    try {
      tertunda.current = { foto, pos: await bacaLokasi() };
    } catch {
      setLangkah("diam");
      return setPesan({ ok: false, teks: "Lokasi tidak terbaca. Nyalakan GPS dan izinkan akses lokasi untuk halaman ini, lalu coba lagi." });
    }
    await kirim(null);
  }

  async function kirim(qr: string | null) {
    const t = tertunda.current;
    if (!t) return;
    setLangkah("kirim");
    const fd = new FormData();
    fd.set("foto", t.foto, "foto.jpg");
    fd.set("lat", String(t.pos.coords.latitude));
    fd.set("lng", String(t.pos.coords.longitude));
    fd.set("akurasi", String(t.pos.coords.accuracy));
    fd.set("perangkat", idPerangkat());
    if (qr) fd.set("qr", qr);
    try {
      const r = await fetch(`/api/public/absen/${token}/absen`, { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as Terima | Tolak;
      if (d.ok) {
        tertunda.current = null;
        setLangkah("diam");
        setPesan({
          ok: true,
          teks: `Absen ${d.jenis === "out" ? "pulang" : "masuk"} tercatat jam ${jamDari(d.jam)} di ${d.lokasi}.` +
            (d.hpBaruDikunci ? " HP ini sekarang terdaftar untuk Anda." : ""),
        });
        await muat();
      } else if ("perluQr" in d && d.perluQr) {
        setPesan({ ok: false, teks: d.alasan });
        setLangkah("qr");
      } else {
        tertunda.current = null;
        setLangkah("diam");
        setPesan({ ok: false, teks: (d as Tolak).alasan || "Absen gagal. Coba lagi." });
      }
    } catch {
      setLangkah("diam");
      setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." });
    }
  }

  if (tidakSah) {
    return (
      <Tengah>
        <p className="text-center text-muted">Tautan tidak valid atau karyawan sudah tidak aktif.</p>
      </Tengah>
    );
  }
  if (!keadaan) {
    return (
      <Tengah>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-strong border-t-primary" />
      </Tengah>
    );
  }
  if (!keadaan.authenticated) {
    return (
      <Tengah>
        <PinGate
          token={token}
          employee={keadaan.employee}
          pinSet={keadaan.pinSet}
          posproPin={keadaan.posproPin}
          jalurSesi={`/api/public/absen/${token}/session`}
          onSuccess={muat}
        />
      </Tengah>
    );
  }

  const a = keadaan.absen;
  const sibuk = langkah === "lokasi" || langkah === "kirim";
  const sudahMasuk = (a?.hariIni.length ?? 0) % 2 === 1;

  return (
    <main className="ambient relative min-h-screen bg-bg">
      <div className="relative z-10 mx-auto max-w-md space-y-4 p-4">
        <div className="flex items-center gap-2.5">
          <UbinLogo />
          <NamaMerek className="text-lg" />
        </div>

        <section className="glass-2 rounded-3xl p-5 text-center shadow-xl">
          <div className="text-sm text-muted">Halo,</div>
          <div className="font-display text-2xl font-bold text-fg">{keadaan.employee.fullName}</div>
          <div className="mt-1 text-sm text-subtle">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </div>

          {keadaan.asManager ? (
            <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={soft("var(--warning)")}>
              Anda membuka sebagai owner — absen hanya bisa dilakukan karyawannya sendiri.
            </p>
          ) : !a?.aktif ? (
            <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={soft("var(--warning)")}>
              Absen lewat HP belum dinyalakan untuk Anda. Hubungi owner.
            </p>
          ) : (
            <button
              onClick={mulai}
              disabled={sibuk}
              className="btn-primary mt-5 h-16 w-full text-lg disabled:opacity-60"
            >
              {langkah === "lokasi" ? "Membaca lokasi…" : langkah === "foto" ? "Ambil foto wajah…" : langkah === "kirim" ? "Mengirim…" : sudahMasuk ? "Absen Pulang" : "Absen Masuk"}
            </button>
          )}

          <input ref={fotoInput} type="file" accept="image/*" capture="user" className="hidden" onChange={fotoDipilih} />

          {pesan && (
            <p className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-left text-sm" style={soft(pesan.ok ? "var(--success)" : "var(--danger)")}>
              {pesan.ok ? <IconCheck className="mt-0.5 shrink-0" /> : <IconAlert className="mt-0.5 shrink-0" />}
              <span>{pesan.teks}</span>
            </p>
          )}
        </section>

        {langkah === "qr" && (
          <PemindaiQr
            onDapat={(teks) => kirim(teks)}
            onBatal={() => {
              tertunda.current = null;
              setLangkah("diam");
            }}
          />
        )}

        <section className="glass rounded-2xl p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <IconClock /> Absen hari ini
          </h2>
          {a && a.hariIni.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {a.hariIni.map((h) => (
                <li key={h.id} className="flex justify-between">
                  <span className="text-fg">{h.jenis === "out" ? "Pulang" : "Masuk"} · {jamDari(h.jam)}</span>
                  <span className="text-subtle">{h.lewat === "hp" ? "lewat HP" : "mesin"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">Belum ada absen hari ini.</p>
          )}
        </section>

        {a?.aktif && (
          <p className="px-1 text-xs leading-relaxed text-subtle">
            Absen diterima kalau Anda berada di{" "}
            {a.lokasi.length ? a.lokasi.map((l) => `${l.nama} (${l.radiusM} m)`).join(", ") : "lokasi kerja"}, berfoto, dan memakai
            HP yang sama dengan absen pertama Anda.
          </p>
        )}
      </div>
    </main>
  );
}

/** Pemindai QR pakai kamera belakang — dipanggil kalau lokasinya mewajibkan QR. */
function PemindaiQr({ onDapat, onBatal }: { onDapat: (teks: string) => void; onBatal: () => void }) {
  // Pemanggilnya mengirim fungsi baru tiap render; lewat ref supaya kamera tidak dimatikan-nyalakan ulang.
  const dapatRef = useRef(onDapat);
  useEffect(() => {
    dapatRef.current = onDapat;
  });
  const video = useRef<HTMLVideoElement>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let aliran: MediaStream | null = null;
    let jalan = true;
    const kanvas = document.createElement("canvas");
    (async () => {
      try {
        aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        // Dicopot selagi menunggu izin kamera (mis. Batal ditekan cepat): matikan alirannya di sini,
        // kalau tidak lampu kamera HP tetap menyala karena pembersihnya sudah lewat.
        const v = video.current;
        if (!jalan || !v) {
          aliran.getTracks().forEach((t) => t.stop());
          return;
        }
        v.srcObject = aliran;
        // play() bisa ditolak (dipotong muat ulang, kebijakan putar otomatis) padahal kameranya
        // menyala — bingkainya tetap terbaca untuk dipindai, jadi itu bukan alasan menampilkan galat.
        await v.play().catch(() => {});
        const pindai = () => {
          if (!jalan) return;
          if (v.videoWidth) {
            kanvas.width = v.videoWidth;
            kanvas.height = v.videoHeight;
            const ctx = kanvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0);
            const kode = jsQR(ctx.getImageData(0, 0, kanvas.width, kanvas.height).data, kanvas.width, kanvas.height);
            if (kode?.data?.startsWith("QE1.")) {
              jalan = false;
              dapatRef.current(kode.data);
              return;
            }
          }
          requestAnimationFrame(pindai);
        };
        pindai();
      } catch {
        if (jalan) setGalat("Kamera tidak bisa dibuka. Izinkan akses kamera untuk halaman ini.");
      }
    })();
    return () => {
      jalan = false;
      aliran?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <section className="glass-2 rounded-3xl p-4 text-center shadow-xl">
      <div className="mb-2 text-sm font-semibold text-fg">Arahkan kamera ke QR di layar toko</div>
      {galat ? (
        <p className="text-sm text-danger">{galat}</p>
      ) : (
        <video ref={video} playsInline muted className="aspect-square w-full rounded-2xl bg-black object-cover" />
      )}
      <button className="btn-ghost mt-3 h-10 w-full" onClick={onBatal}>Batal</button>
    </section>
  );
}

function Tengah({ children }: { children: React.ReactNode }) {
  return (
    <main className="ambient relative flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}

function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}
