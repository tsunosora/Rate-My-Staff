"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";
import { UbinLogo, NAMA_PRODUK } from "@/components/QendaliMark";

type Isi = { nama: string; wajibQr: boolean; isi: string; slot: number; sisaDetik: number; slotDetik: number };

/**
 * Layar QR untuk tablet/TV di lokasi absen. QR-nya berganti tiap beberapa detik, jadi foto QR
 * yang dikirim lewat WhatsApp ke teman di rumah sudah tidak berlaku saat dipindai.
 * Diperbarui tiap 3 detik supaya pergantian slot tidak terlambat lebih dari itu.
 */
export default function LayarQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [isi, setIsi] = useState<Isi | null>(null);
  const [gambar, setGambar] = useState("");
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let hidup = true;
    let slotTerakhir = -1;
    async function muat() {
      try {
        const r = await fetch(`/api/public/absen-layar/${token}`, { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Layar tidak dikenali.");
        if (!hidup) return;
        setIsi(d);
        setGalat("");
        if (d.slot !== slotTerakhir) {
          slotTerakhir = d.slot;
          setGambar(await QRCode.toDataURL(d.isi, { width: 640, margin: 2, errorCorrectionLevel: "M" }));
        }
      } catch (e) {
        if (hidup) setGalat(e instanceof Error ? e.message : "Gagal memuat.");
      }
    }
    muat();
    const t = setInterval(muat, 3000);
    return () => {
      hidup = false;
      clearInterval(t);
    };
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-6 text-slate-900">
      <div className="flex items-center gap-3">
        <UbinLogo besar />
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{NAMA_PRODUK}</div>
          <div className="text-2xl font-bold">{isi ? `Absen di ${isi.nama}` : "Layar absen"}</div>
        </div>
      </div>

      {galat ? (
        <p className="max-w-md text-center text-lg text-red-600">{galat}</p>
      ) : gambar ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gambar} alt="QR absen" className="aspect-square w-[min(80vw,70vh)] max-w-[640px]" />
          <p className="text-center text-xl">
            Buka halaman absen di HP, tekan <b>Absen</b>, lalu pindai QR ini.
          </p>
          {isi && <p className="text-sm text-slate-500">QR berganti tiap {isi.slotDetik} detik.</p>}
        </>
      ) : (
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      )}
    </main>
  );
}
