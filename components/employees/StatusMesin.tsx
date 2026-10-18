"use client";

import { useCallback, useEffect, useState } from "react";
import { IconAlert, IconCheck, IconDownload } from "@/components/ui/icons";

/**
 * Bagian "pendaftaran dari mesin" di Direktori.
 * - Mesin mode CLOUD: tombol "Tarik dari mesin". Mesin cloud tidak bisa dijangkau lewat IP, jadi
 *   server mengantre perintah baca yang diambil mesin saat mengecek perintah (~20 detik), lalu
 *   membuat karyawan yang belum ada. Kemajuannya dipantau di sini. (Mesin di lapangan berhenti
 *   mengirim sendiri data pendaftaran sejak 30 Sep 2026 — itu sebabnya tombol ini ada.)
 * - Mesin mode LAN: tombol "Sinkron dari Mesin" (tarik PIN + nama lewat IP).
 * - Selalu: daftar PIN yang scan tapi belum punya karyawan (tanda pengiriman dari mesin pernah
 *   gagal), dengan isian nama untuk membuatnya.
 */

type Tarikan = {
  mesin: string;
  status: "berjalan" | "selesai" | "gagal";
  mulai: string;
  pinDiMesin: number | null;
  belumAda: number;
  dibuat: number;
  catatan: string | null;
};

type Keadaan = {
  cara: "lan" | "cloud" | "kosong";
  tarikan?: Tarikan[];
  pendaftaranTerakhir: { at: string; mesin: string | null } | null;
  pinTanpaKaryawan: { machineId: number; mesin: string; pin: string; scan: number; terakhir: string }[];
};

async function minta<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? "Permintaan gagal");
  return body as T;
}

const tgl = (s: string) =>
  new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function StatusMesin({ onBerubah }: { onBerubah: () => void }) {
  const [k, setK] = useState<Keadaan | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; galat: boolean } | null>(null);
  const [nama, setNama] = useState<Record<string, string>>({});

  const ambil = useCallback(async () => {
    try {
      return await minta<Keadaan>("/api/employees/device-sync");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let hidup = true;
    ambil().then((d) => { if (hidup) setK(d); });
    return () => { hidup = false; };
  }, [ambil]);

  // Selama ada tarikan berjalan, pantau tiap 4 detik. Begitu selesai, muat ulang daftar karyawan.
  const berjalan = (k?.tarikan ?? []).some((t) => t.status === "berjalan");
  useEffect(() => {
    if (!berjalan) return;
    const id = setInterval(async () => {
      const d = await ambil();
      if (!d) return;
      setK(d);
      if (!(d.tarikan ?? []).some((t) => t.status === "berjalan")) onBerubah();
    }, 4000);
    return () => clearInterval(id);
  }, [berjalan, ambil, onBerubah]);

  async function tarik() {
    setSibuk(true);
    setPesan(null);
    try {
      const r = await minta<{ cloud?: boolean; diantre?: string[]; sedangJalan?: string[]; total: number; created: number; renamed: number }>(
        "/api/employees/device-sync",
        { method: "POST", body: "{}" },
      );
      if (r.cloud) {
        setK(await ambil());
        if ((r.diantre ?? []).length === 0) setPesan({ teks: "Tarikan sebelumnya masih berjalan. Tunggu sebentar.", galat: false });
        return;
      }
      setPesan({ teks: `Dari ${r.total} user di mesin: ${r.created} karyawan baru, ${r.renamed} nama diperbarui.`, galat: false });
      onBerubah();
      setK(await ambil());
    } catch (e) {
      setPesan({ teks: (e as Error).message, galat: true });
    } finally {
      setSibuk(false);
    }
  }

  async function buat(p: Keadaan["pinTanpaKaryawan"][number]) {
    const kunci = `${p.machineId}|${p.pin}`;
    setSibuk(true);
    setPesan(null);
    try {
      const r = await minta<{ scanDimasukkan: number }>("/api/employees/device-sync/pin", {
        method: "POST",
        body: JSON.stringify({ machineId: p.machineId, pin: p.pin, nama: (nama[kunci] ?? "").trim() }),
      });
      setPesan({ teks: `${nama[kunci]} dibuat untuk PIN ${p.pin} (${p.mesin}); ${r.scanDimasukkan} scan lama masuk ke absensi.`, galat: false });
      onBerubah();
      setK(await ambil());
    } catch (e) {
      setPesan({ teks: (e as Error).message, galat: true });
    } finally {
      setSibuk(false);
    }
  }

  if (!k || k.cara === "kosong") return null;

  return (
    <div className="space-y-3">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
        {k.cara === "cloud" ? (
          <>
            <span className="text-muted">
              Karyawan baru yang didaftarkan di mesin belum muncul? Tarik daftarnya dari mesin.
              {k.pendaftaranTerakhir && (
                <span className="block text-xs">
                  Kiriman pendaftaran terakhir dari mesin: {tgl(k.pendaftaranTerakhir.at)}{k.pendaftaranTerakhir.mesin ? ` · ${k.pendaftaranTerakhir.mesin}` : ""}.
                </span>
              )}
            </span>
            <button onClick={tarik} disabled={sibuk || berjalan} className="btn-ghost h-10 disabled:opacity-60">
              <IconDownload className="text-[17px]" /> {berjalan ? "Menarik…" : "Tarik dari mesin"}
            </button>
          </>
        ) : (
          <>
            <span className="text-muted">Mesin mode LAN: tarik PIN &amp; nama karyawan dari mesin lewat jaringan toko.</span>
            <button onClick={tarik} disabled={sibuk} className="btn-ghost h-10 disabled:opacity-60">
              <IconDownload className="text-[17px]" /> {sibuk ? "Sinkron…" : "Sinkron dari Mesin"}
            </button>
          </>
        )}
      </div>

      {k.cara === "cloud" && (k.tarikan ?? []).length > 0 && (
        <ul className="glass space-y-1.5 rounded-2xl px-4 py-3 text-sm">
          {(k.tarikan ?? []).map((t) => (
            <li key={t.mesin + t.mulai} className="flex items-start gap-2">
              {t.status === "gagal" ? (
                <IconAlert className="mt-0.5 shrink-0 text-[16px] text-danger" />
              ) : t.status === "selesai" ? (
                <IconCheck className="mt-0.5 shrink-0 text-[16px] text-success" />
              ) : (
                <span className="mt-1.5 inline-block size-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
              )}
              <span className={t.status === "gagal" ? "text-danger" : "text-fg"}>
                <b>{t.mesin}</b>: {kalimatTarikan(t)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pesan && (
        <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <span className={pesan.galat ? "text-danger" : "text-fg"}>{pesan.teks}</span>
          <button onClick={() => setPesan(null)} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">Tutup</button>
        </div>
      )}

      {k.pinTanpaKaryawan.length > 0 && (
        <div className="glass space-y-3 rounded-2xl p-4">
          <div className="flex items-start gap-2 text-sm">
            <IconAlert className="mt-0.5 shrink-0 text-[16px] text-warning" />
            <div>
              <div className="font-semibold text-fg">PIN mesin yang belum punya karyawan ({k.pinTanpaKaryawan.length})</div>
              <div className="text-muted">
                Ada yang scan di mesin dengan PIN ini, tapi datanya belum ada di Direktori — biasanya data pendaftaran dari mesin
                gagal terkirim. Isi namanya untuk membuat karyawannya; scan lamanya ikut masuk ke absensi.
              </div>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {k.pinTanpaKaryawan.map((p) => {
              const kunci = `${p.machineId}|${p.pin}`;
              return (
                <li key={kunci} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="min-w-40 text-fg">
                    PIN <b className="font-mono">{p.pin}</b> · {p.mesin}
                    <span className="block text-xs text-muted">{p.scan} scan · terakhir {tgl(p.terakhir)}</span>
                  </span>
                  <input
                    className="input h-9 min-w-48 flex-1"
                    placeholder="Nama karyawan"
                    value={nama[kunci] ?? ""}
                    onChange={(e) => setNama((n) => ({ ...n, [kunci]: e.target.value }))}
                  />
                  <button
                    className="btn-primary h-9 px-3 text-sm disabled:opacity-60"
                    disabled={sibuk || (nama[kunci] ?? "").trim().length < 2}
                    onClick={() => buat(p)}
                  >
                    Buat karyawan
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function kalimatTarikan(t: Tarikan): string {
  if (t.status === "gagal") return t.catatan ?? "Tarikan gagal.";
  if (t.pinDiMesin === null) return "menunggu mesin mengambil perintah (mesin mengecek tiap ±20 detik)…";
  if (t.status === "berjalan") return `${t.pinDiMesin} PIN di mesin, mengambil data ${t.belumAda} orang yang belum ada…`;
  if (t.belumAda === 0) return `${t.pinDiMesin} PIN di mesin, semuanya sudah ada di Direktori.`;
  const gagal = t.belumAda - t.dibuat;
  return `${t.pinDiMesin} PIN di mesin, ${t.dibuat} karyawan baru dibuat${gagal > 0 ? `, ${gagal} tidak bisa dibuat (cek batas karyawan di langganan)` : ""}.`;
}
