"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconClock } from "@/components/ui/icons";

type Info = {
  id: number;
  nama: string;
  sn: string;
  mode: string;
  lanIp: string | null;
  lanPort: number | null;
  terakhirKontak: string | null;
  detikSejakKontak: number | null;
  alamat: string | null;
  jenisAlamat: "utama" | "lain" | "lokal" | null;
  alamatUtama: string | null;
  ipPublik: string | null;
  kontakSejam: number;
  karyawanTerdaftar: number;
  scanTerakhir: null | { pin: string | null; nama: string | null; jamMesin: string | null; diterima: string };
};

const SEGAR_MS = 5000;

function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}

function lama(detik: number): string {
  if (detik < 60) return `${detik} detik lalu`;
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

/**
 * Info Mesin: yang dilihat server dari kontak mesin itu sendiri. Diperbarui sendiri tiap 5 detik
 * selama terbuka, supaya bisa dipakai sambil menyetel mesinnya — kalau alamat yang diketik di
 * mesin salah, "kontak terakhir" berhenti bergerak di sini.
 */
export function MachineInfoModal({ machineId, onClose }: { machineId: number; onClose: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setInfo(await api<Info>(`/api/machines/${machineId}/info`));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat info mesin.");
    }
  }, [machineId]);

  useEffect(() => {
    load();
    const t = setInterval(load, SEGAR_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Modal title={info ? `Info Mesin — ${info.nama}` : "Info Mesin"} onClose={onClose}>
      {err && <p className="mb-3 rounded-xl px-3 py-2 text-sm" style={soft("var(--danger)")}>{err}</p>}
      {!info ? (
        !err && <p className="text-sm text-muted">Memuat…</p>
      ) : (
        <div className="space-y-4">
          <StatusKoneksi info={info} />
          {info.mode !== "lan" && <StatusAlamat info={info} />}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Baris label="Nomor seri (SN)" nilai={<span className="font-mono">{info.sn}</span>} />
            <Baris label="Mode" nilai={info.mode === "lan" ? `LAN — server menarik dari ${info.lanIp ?? "?"}:${info.lanPort ?? 5005}` : "Cloud — mesin mengirim sendiri ke server"} />
            {info.mode !== "lan" && <Baris label="IP publik mesin" nilai={info.ipPublik ?? "belum tercatat"} />}
            <Baris
              label="Kontak 1 jam terakhir"
              nilai={info.mode === "lan" ? "—" : `${info.kontakSejam.toLocaleString("id-ID")} kali`}
            />
            <Baris label="Karyawan terdaftar" nilai={`${info.karyawanTerdaftar} orang (lewat Kelola PIN)`} />
            <Baris
              label="Scan terakhir masuk"
              nilai={
                info.scanTerakhir ? (
                  <span>
                    PIN {info.scanTerakhir.pin ?? "?"}
                    {info.scanTerakhir.nama ? ` · ${info.scanTerakhir.nama}` : " · belum dipetakan ke karyawan"}
                    <span className="block text-xs text-subtle">
                      jam di mesin {info.scanTerakhir.jamMesin ?? "?"} · diterima server{" "}
                      {new Date(info.scanTerakhir.diterima).toLocaleString("id-ID")}
                    </span>
                  </span>
                ) : (
                  "belum ada scan yang tercatat"
                )
              }
            />
          </dl>

          <p className="flex items-start gap-2 text-xs text-subtle">
            <IconClock className="mt-0.5 shrink-0 text-[13px]" />
            Diperbarui otomatis tiap 5 detik selama jendela ini terbuka. Cara paling meyakinkan:
            minta satu orang scan di mesin ini, lalu lihat &quot;Scan terakhir masuk&quot; berubah.
          </p>
        </div>
      )}
    </Modal>
  );
}

function StatusKoneksi({ info }: { info: Info }) {
  const d = info.detikSejakKontak;
  let warna = "var(--success)";
  let judul = "Tersambung";
  let ket = d === null ? "" : `Kontak terakhir ${lama(d)}.`;
  if (d === null) {
    warna = "var(--danger)";
    judul = "Belum pernah menghubungi server";
    ket = "Periksa alamat server di menu Cloud Server/ADMS mesin.";
  } else if (d > 600) {
    warna = "var(--danger)";
    judul = "Tidak terhubung";
    ket = `Kontak terakhir ${lama(d)}. Periksa listrik, internet toko, dan alamat server di mesin.`;
  } else if (d > 90) {
    warna = "var(--warning)";
    judul = "Mungkin terputus";
    ket = `Kontak terakhir ${lama(d)} — biasanya mesin menghubungi beberapa detik sekali.`;
  }
  if (info.mode === "lan") {
    // Mode LAN: server yang menarik, jadi jeda panjang di antara tarikan itu wajar.
    warna = d === null ? "var(--danger)" : "var(--primary)";
    judul = d === null ? "Belum pernah ditarik" : "Tarikan terakhir";
    ket = d === null ? "Tekan Test Koneksi untuk mencoba." : `${lama(d)} — mode LAN tidak terhubung terus-menerus.`;
  }
  const Ikon = warna === "var(--success)" ? IconCheck : IconAlert;
  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-3" style={soft(warna)}>
      <Ikon className="mt-0.5 shrink-0 text-[18px]" />
      <div>
        <div className="font-semibold">{judul}</div>
        {ket && <div className="text-sm opacity-90">{ket}</div>}
      </div>
    </div>
  );
}

function StatusAlamat({ info }: { info: Info }) {
  if (!info.alamat) {
    return (
      <p className="rounded-xl px-3 py-2 text-sm" style={soft("var(--fg-muted)", 10)}>
        Alamat yang dipakai mesin belum tercatat — muncul sendiri begitu mesin menghubungi server lagi
        (beberapa detik).
      </p>
    );
  }
  if (info.jenisAlamat === "utama") {
    return (
      <p className="rounded-xl px-3 py-2 text-sm" style={soft("var(--success)")}>
        Mesin memakai alamat utama <b className="font-mono">{info.alamat}</b>.
      </p>
    );
  }
  if (info.jenisAlamat === "lokal") {
    return (
      <p className="rounded-xl px-3 py-2 text-sm" style={soft("var(--primary)")}>
        Mesin menghubungi server langsung lewat <b className="font-mono">{info.alamat}</b> (jaringan lokal).
      </p>
    );
  }
  return (
    <p className="rounded-xl px-3 py-2 text-sm" style={soft("var(--warning)")}>
      Mesin masih memakai alamat <b className="font-mono">{info.alamat}</b>
      {info.alamatUtama ? (
        <>
          . Ganti alamat server di mesin ke <b className="font-mono">{info.alamatUtama}</b> — data tetap
          masuk selama alamat ini masih hidup.
        </>
      ) : (
        "."
      )}
    </p>
  );
}

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="text-fg">{nilai}</dd>
    </>
  );
}
