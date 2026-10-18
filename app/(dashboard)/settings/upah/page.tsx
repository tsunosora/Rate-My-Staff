"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { KotakPesan, type Pesan } from "@/components/upah-tarif/umum";
import { TarifKotaDivisi, type Tarif } from "@/components/upah-tarif/TarifKotaDivisi";
import { ProyekKerja, type Proyek } from "@/components/upah-tarif/ProyekKerja";

export default function TarifUpahPage() {
  const [tarif, setTarif] = useState<Tarif[]>([]);
  const [proyek, setProyek] = useState<Proyek[]>([]);
  const [pesan, setPesan] = useState<Pesan>(null);

  const muat = useCallback(async () => {
    const [t, p] = await Promise.all([api<Tarif[]>("/api/upah/tarif"), api<Proyek[]>("/api/upah/proyek")]);
    setTarif(t);
    setProyek(p);
  }, []);

  useEffect(() => {
    // Lewat Promise supaya setState terjadi sesudah render, bukan di badan efek.
    Promise.resolve()
      .then(muat)
      .catch((e: unknown) => setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal memuat." }));
  }, [muat]);

  async function kirim(url: string, method: string, body?: unknown, sukses?: string): Promise<boolean> {
    setPesan(null);
    try {
      await api(url, { method, body: body ? JSON.stringify(body) : undefined });
      if (sukses) setPesan({ ok: true, teks: sukses });
      await muat();
      return true;
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal menyimpan." });
      await muat().catch(() => {});
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Tarif Upah</h1>
        <p className="mt-0.5 max-w-3xl text-sm text-muted">
          Upah tukang dihitung dari catatan harian yang sudah disetujui. Untuk tiap hari, tarif yang dipakai:
        </p>
        <ol className="mt-2 grid max-w-3xl gap-1.5 text-sm text-muted sm:grid-cols-3">
          <li className="rounded-xl border border-border px-3 py-2">
            <b className="text-fg">1. Proyek</b> — kalau hari itu di proyek yang punya upah khusus.
          </li>
          <li className="rounded-xl border border-border px-3 py-2">
            <b className="text-fg">2. Kota × divisi</b> — kalau tanpa proyek, dan kota & divisinya terisi.
          </li>
          <li className="rounded-xl border border-border px-3 py-2">
            <b className="text-fg">3. Tarif karyawan</b> — diatur di Direktori, form karyawan.
          </li>
        </ol>
        <p className="mt-2 max-w-3xl text-xs text-subtle">
          Hadir dibayar penuh, ½ hari separuh, absen tidak dibayar. Lembur dibayar per jam. Tarif yang diubah berlaku untuk upah
          yang belum dibayar.
        </p>
      </div>

      <KotakPesan pesan={pesan} />

      <TarifKotaDivisi daftar={tarif} kirim={kirim} />
      <ProyekKerja daftar={proyek} kirim={kirim} />
    </div>
  );
}
