/**
 * Mesin hitung upah tukang — MURNI (tanpa basis data), supaya tiap jalur tarif bisa diuji.
 *
 * Aturan tarif per baris rekap yang DISETUJUI, yang pertama ada menang:
 *   1. proyek     — ProyekKerja.upahHarian kalau baris punya proyek dan nilainya terisi.
 *   2. kota_divisi — TarifKotaDivisi aktif yang cocok (tanpa beda huruf besar), HANYA kalau baris
 *                   TIDAK punya proyek dan kota & divisi dua-duanya terisi.
 *   3. karyawan   — Employee.upahHarian.
 *   4. kosong     — 0, dan baris ditandai "tarif belum diatur".
 * Tarif lembur diambil dari sumber yang terpilih; kalau kosong di sana, jatuh ke
 * Employee.upahLemburPerJam. Nilai 0 dianggap KOSONG (kolom lembur kota×divisi tidak bisa null,
 * bawaannya 0 — kalau 0 dihitung "tarif nol", lembur tukang di kota itu diam-diam tidak dibayar).
 *
 * Upah baris = faktor status (hadir 1, setengah 0,5, absen 0) × upah harian
 *            + lemburJam × lemburPerJam   (lembur tetap dibayar walau absen, sama dengan Event)
 *            + upahKhusus                 (hanya hadir/setengah)
 * dibulatkan ke rupiah utuh PER BARIS, supaya jumlah di slip = jumlah baris-barisnya.
 * Total periode = Σ baris disetujui + bonus + tunjangan − potongan − kasbon.
 */

export type StatusRekap = "hadir" | "setengah" | "absen";
export type SumberTarif = "proyek" | "kota_divisi" | "karyawan" | "kosong";
export type JenisPenyesuaian = "bonus" | "tunjangan" | "potongan" | "kasbon";

export const FAKTOR_STATUS: Record<StatusRekap, number> = { hadir: 1, setengah: 0.5, absen: 0 };
export const JENIS_PENYESUAIAN: readonly JenisPenyesuaian[] = ["bonus", "tunjangan", "potongan", "kasbon"];
export const PENYESUAIAN_MENGURANGI: ReadonlySet<JenisPenyesuaian> = new Set(["potongan", "kasbon"]);

export type TarifKaryawan = { upahHarian: number | null; upahLemburPerJam: number | null };
export type TarifProyek = { id: number; nama: string; upahHarian: number | null; lemburPerJam: number | null };
export type TarifKotaDivisiAktif = { kota: string; divisi: string; upahHarian: number; lemburPerJam: number | null };

export type BarisMasuk = {
  id: number;
  tanggal: string; // YYYY-MM-DD
  status: string;
  lemburJam: number;
  kota: string | null;
  divisi: string | null;
  proyekId: number | null;
  upahKhusus: number | null;
  upahKhususCatatan?: string | null;
  pembayaranId?: number | null;
};

export type BarisHitung = {
  id: number;
  tanggal: string;
  status: StatusRekap;
  lemburJam: number;
  kota: string | null;
  divisi: string | null;
  proyekId: number | null;
  proyek: string | null;
  sumberTarif: SumberTarif;
  sumberLembur: Exclude<SumberTarif, "kosong"> | "kosong";
  upahHarian: number;
  lemburPerJam: number;
  upahPokok: number;
  upahLembur: number;
  upahKhusus: number;
  upahKhususCatatan: string | null;
  upah: number;
  tarifKosong: boolean;
  pembayaranId: number | null;
};

export type PenyesuaianMasuk = {
  id: number;
  tanggal: string;
  jenis: string;
  jumlah: number;
  catatan: string | null;
  pembayaranId?: number | null;
};

export type HitunganPeriode = {
  dari: string;
  sampai: string;
  baris: BarisHitung[];
  penyesuaian: (PenyesuaianMasuk & { jenis: JenisPenyesuaian; nilai: number })[];
  ringkas: {
    hadir: number;
    setengah: number;
    absen: number;
    lemburJam: number;
    upahPokok: number;
    upahLembur: number;
    upahKhusus: number;
    penyesuaian: number;
    total: number;
    tarifKosong: number;
  };
};

/** Angka rupiah yang "terisi": positif dan terhingga. null/0/negatif = kosong. */
function terisi(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export const normal = (s: string | null | undefined) => (s ?? "").trim().toLocaleLowerCase("id-ID");

export function statusRekap(s: string): StatusRekap {
  return s === "hadir" || s === "setengah" ? s : "absen";
}

/** Rupiah utuh — setengah dibulatkan ke atas (Math.round), sama di semua tempat. */
export const bulatRupiah = (n: number) => Math.round(n);

export type HasilTarif = {
  sumberTarif: SumberTarif;
  upahHarian: number;
  sumberLembur: SumberTarif;
  lemburPerJam: number;
};

/** Pilih tarif satu baris. Lihat aturan di kepala berkas. */
export function resolusiTarif(
  baris: Pick<BarisMasuk, "kota" | "divisi" | "proyekId">,
  karyawan: TarifKaryawan,
  proyek: Map<number, TarifProyek> | ReadonlyMap<number, TarifProyek>,
  kotaDivisi: readonly TarifKotaDivisiAktif[],
): HasilTarif {
  let sumber: SumberTarif = "kosong";
  let harian = 0;
  let lemburSumber: number | null = null;

  const p = baris.proyekId != null ? proyek.get(baris.proyekId) : undefined;
  if (p && terisi(p.upahHarian)) {
    sumber = "proyek";
    harian = p.upahHarian;
    lemburSumber = p.lemburPerJam;
  } else if (baris.proyekId == null && normal(baris.kota) && normal(baris.divisi)) {
    const t = kotaDivisi.find((x) => normal(x.kota) === normal(baris.kota) && normal(x.divisi) === normal(baris.divisi));
    if (t && terisi(t.upahHarian)) {
      sumber = "kota_divisi";
      harian = t.upahHarian;
      lemburSumber = t.lemburPerJam;
    }
  }
  if (sumber === "kosong" && terisi(karyawan.upahHarian)) {
    sumber = "karyawan";
    harian = karyawan.upahHarian;
    lemburSumber = karyawan.upahLemburPerJam;
  }

  let sumberLembur: SumberTarif = "kosong";
  let lembur = 0;
  if (sumber !== "kosong" && terisi(lemburSumber)) {
    sumberLembur = sumber;
    lembur = lemburSumber;
  } else if (terisi(karyawan.upahLemburPerJam)) {
    sumberLembur = "karyawan";
    lembur = karyawan.upahLemburPerJam;
  }
  return { sumberTarif: sumber, upahHarian: harian, sumberLembur, lemburPerJam: lembur };
}

/** Hitung satu baris rekap (yang sudah disetujui). */
export function hitungBaris(
  b: BarisMasuk,
  karyawan: TarifKaryawan,
  proyek: Map<number, TarifProyek> | ReadonlyMap<number, TarifProyek>,
  kotaDivisi: readonly TarifKotaDivisiAktif[],
): BarisHitung {
  const status = statusRekap(b.status);
  const lemburJam = Math.max(0, Number(b.lemburJam) || 0);
  const t = resolusiTarif(b, karyawan, proyek, kotaDivisi);
  const upahPokok = FAKTOR_STATUS[status] * t.upahHarian;
  const upahLembur = lemburJam * t.lemburPerJam;
  const khusus = status !== "absen" && terisi(b.upahKhusus) ? b.upahKhusus : 0;
  const tarifKosong = (status !== "absen" && t.sumberTarif === "kosong") || (lemburJam > 0 && t.sumberLembur === "kosong");
  return {
    id: b.id,
    tanggal: b.tanggal,
    status,
    lemburJam,
    kota: b.kota,
    divisi: b.divisi,
    proyekId: b.proyekId,
    proyek: b.proyekId != null ? proyek.get(b.proyekId)?.nama ?? null : null,
    sumberTarif: t.sumberTarif,
    sumberLembur: t.sumberLembur,
    upahHarian: t.upahHarian,
    lemburPerJam: t.lemburPerJam,
    upahPokok: bulatRupiah(upahPokok),
    upahLembur: bulatRupiah(upahLembur),
    upahKhusus: bulatRupiah(khusus),
    upahKhususCatatan: khusus ? b.upahKhususCatatan ?? null : null,
    // Satu pembulatan per baris dari jumlah mentahnya — bukan jumlah dari tiga yang sudah dibulatkan,
    // supaya 0,5 + 0,5 tidak jadi 2.
    upah: bulatRupiah(upahPokok + upahLembur + khusus),
    tarifKosong,
    pembayaranId: b.pembayaranId ?? null,
  };
}

export function jenisPenyesuaian(s: string): JenisPenyesuaian | null {
  return (JENIS_PENYESUAIAN as readonly string[]).includes(s) ? (s as JenisPenyesuaian) : null;
}

/** Nilai bertanda satu penyesuaian (potongan & kasbon negatif). */
export function nilaiPenyesuaian(jenis: JenisPenyesuaian, jumlah: number): number {
  const n = bulatRupiah(Math.abs(Number(jumlah) || 0));
  return PENYESUAIAN_MENGURANGI.has(jenis) ? -n : n;
}

/**
 * Hitung satu orang satu periode. `beku` = baris yang sudah DIBAYAR, diambil dari salinan
 * hitungan saat dibayar: tarif boleh berubah sesudahnya, tapi yang sudah dibayar tidak ikut berubah.
 */
export function hitungPeriode(input: {
  dari: string;
  sampai: string;
  baris: readonly BarisMasuk[];
  penyesuaian: readonly PenyesuaianMasuk[];
  karyawan: TarifKaryawan;
  proyek: Map<number, TarifProyek> | ReadonlyMap<number, TarifProyek>;
  kotaDivisi: readonly TarifKotaDivisiAktif[];
  beku?: ReadonlyMap<number, BarisHitung>;
}): HitunganPeriode {
  const baris = [...input.baris]
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : a.id - b.id))
    .map((b) => {
      const lama = b.pembayaranId != null ? input.beku?.get(b.id) : undefined;
      return lama ? { ...lama, pembayaranId: b.pembayaranId ?? null } : hitungBaris(b, input.karyawan, input.proyek, input.kotaDivisi);
    });
  const penyesuaian = input.penyesuaian
    .map((p) => {
      const jenis = jenisPenyesuaian(p.jenis);
      return jenis ? { ...p, jenis, nilai: nilaiPenyesuaian(jenis, p.jumlah), pembayaranId: p.pembayaranId ?? null } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : a.id - b.id));

  return hitungUlangRingkas({ dari: input.dari, sampai: input.sampai, baris, penyesuaian, ringkas: RINGKAS_NOL });
}

/** Bagian yang BELUM dibayar dari satu hitungan — yang akan dibayar oleh "Tandai dibayar". */
export function bagianBelumDibayar(h: HitunganPeriode): HitunganPeriode {
  return hitungUlangRingkas({
    ...h,
    baris: h.baris.filter((b) => b.pembayaranId == null),
    penyesuaian: h.penyesuaian.filter((p) => p.pembayaranId == null),
  });
}

const RINGKAS_NOL: HitunganPeriode["ringkas"] = { hadir: 0, setengah: 0, absen: 0, lemburJam: 0, upahPokok: 0, upahLembur: 0, upahKhusus: 0, penyesuaian: 0, total: 0, tarifKosong: 0 };

function hitungUlangRingkas(h: HitunganPeriode): HitunganPeriode {
  const r = { ...RINGKAS_NOL };
  for (const b of h.baris) {
    r[b.status] += 1;
    r.lemburJam += b.lemburJam;
    r.upahPokok += b.upahPokok;
    r.upahLembur += b.upahLembur;
    r.upahKhusus += b.upahKhusus;
    r.total += b.upah;
    if (b.tarifKosong) r.tarifKosong += 1;
  }
  for (const p of h.penyesuaian) {
    r.penyesuaian += p.nilai;
    r.total += p.nilai;
  }
  r.lemburJam = Math.round(r.lemburJam * 100) / 100;
  return { ...h, ringkas: r };
}

export type StatusBayar = "kosong" | "belum" | "sebagian" | "lunas";

/** Belum dibayar / sebagian / lunas. "kosong" = tidak ada baris maupun penyesuaian sama sekali. */
export function statusBayar(h: Pick<HitunganPeriode, "baris" | "penyesuaian">): StatusBayar {
  const semua = [...h.baris.map((b) => b.pembayaranId), ...h.penyesuaian.map((p) => p.pembayaranId)];
  if (semua.length === 0) return "kosong";
  const dibayar = semua.filter((x) => x != null).length;
  if (dibayar === 0) return "belum";
  return dibayar === semua.length ? "lunas" : "sebagian";
}
