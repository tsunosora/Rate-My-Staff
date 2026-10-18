"use client";

import { useCallback, useEffect, useState } from "react";
import { IconAlert, IconCheck, IconDownload } from "@/components/ui/icons";

/**
 * Bagian "pendaftaran dari mesin" di Direktori.
 * - Mesin mode CLOUD: tidak ada tombol tarik — mesin mengirim sendiri data pendaftaran begitu
 *   karyawan didaftarkan di mesin. Yang tampil keterangan + pendaftaran terakhir.
 * - Mesin mode LAN: tombol "Sinkron dari Mesin" (tarik PIN + nama lewat IP).
 * - Selalu: daftar PIN yang scan tapi belum punya karyawan (tanda pengiriman dari mesin pernah
 *   gagal), dengan isian nama untuk membuatnya.
 */

type Keadaan = {
  cara: "lan" | "cloud" | "kosong";
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

  async function tarik() {
    setSibuk(true);
    setPesan(null);
    try {
      const r = await minta<{ total: number; created: number; renamed: number }>("/api/employees/device-sync", { method: "POST", body: "{}" });
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
          <span className="flex items-start gap-2 text-muted">
            <IconCheck className="mt-0.5 shrink-0 text-[16px] text-success" />
            <span>
              Mesin absensi memakai mode cloud: karyawan yang didaftarkan di mesin <b className="text-fg">masuk ke sini dengan sendirinya</b>, tidak perlu ditarik.
              {k.pendaftaranTerakhir && (
                <> Pendaftaran terakhir {tgl(k.pendaftaranTerakhir.at)}{k.pendaftaranTerakhir.mesin ? ` · ${k.pendaftaranTerakhir.mesin}` : ""}.</>
              )}
            </span>
          </span>
        ) : (
          <>
            <span className="text-muted">Mesin mode LAN: tarik PIN &amp; nama karyawan dari mesin lewat jaringan toko.</span>
            <button onClick={tarik} disabled={sibuk} className="btn-ghost h-10 disabled:opacity-60">
              <IconDownload className="text-[17px]" /> {sibuk ? "Sinkron…" : "Sinkron dari Mesin"}
            </button>
          </>
        )}
      </div>

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
