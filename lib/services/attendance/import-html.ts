export type ParsedScanRow = {
  pin: string;
  name: string;
  dateISO: string; // YYYY-MM-DD
  scans: string[]; // ["HH:MM:SS", ...] hanya yang terisi, urut sesuai kolom
};

/** Indeks kolom yang dipakai saat mengurai baris data. */
export type ScanlogLayout = { pinIdx: number; nameIdx: number; dateIdx: number };

/** Hasil analisa lengkap — dipakai untuk parsing sekaligus diagnosa error. */
export type ScanlogAnalysis = {
  rows: ParsedScanRow[];
  trCount: number; // jumlah <TR> di dokumen
  headerFound: boolean; // apakah baris header (PIN/Tanggal) terdeteksi
  headerCells: string[]; // isi baris header, untuk pesan diagnosa
  layout: ScanlogLayout; // indeks kolom hasil deteksi / fallback
  sampleDataCells: string[] | null; // contoh baris yang gagal di-parse (diagnosa)
};

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/;
// Terima pemisah "-" atau "/". Dua urutan didukung:
//  DD-MM-YYYY (format utama mesin) & YYYY-MM-DD (tak ambigu, jaga-jaga).
const DMY_RE = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
const YMD_RE = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;

/** Posisi kolom lama (dipakai bila baris header tak dikenali). */
const FALLBACK_LAYOUT: ScanlogLayout = { pinIdx: 0, nameIdx: 2, dateIdx: 6 };

/** Ubah sel tanggal → ISO YYYY-MM-DD; null bila format tak dikenal. */
function toISO(cell: string): string | null {
  const dmy = DMY_RE.exec(cell);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = YMD_RE.exec(cell);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return null;
}

/** Ambil teks bersih dari satu sel <TD>: buang tag & decode &nbsp; → "". */
function cellText(tdInner: string): string {
  const noTags = tdInner.replace(/<[^>]+>/g, "");
  const decoded = noTags.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
  return decoded.trim();
}

/** Pecah satu baris <TR> menjadi teks tiap sel <TD>. */
function rowCells(tr: string): string[] {
  return (tr.match(/<TD[\s\S]*?<\/TD>/gi) ?? []).map((td) =>
    cellText(td.replace(/^<TD[^>]*>/i, "").replace(/<\/TD>$/i, ""))
  );
}

/**
 * Cari baris header & tentukan indeks kolom berdasarkan NAMA kolom
 * ("PIN", "Nama", "Tanggal") — tahan terhadap kolom yang bergeser.
 * Bila tak ada header dikenali, kembalikan posisi kolom lama (fallback).
 */
function detectLayout(allCells: string[][]): {
  layout: ScanlogLayout;
  headerFound: boolean;
  headerCells: string[];
} {
  for (const cells of allCells) {
    const pinIdx = cells.findIndex((c) => /^PIN$/i.test(c));
    const dateIdx = cells.findIndex((c) => /^Tanggal$/i.test(c));
    if (pinIdx === -1 || dateIdx === -1) continue;
    const nameIdx = cells.findIndex((c) => /^Nama$/i.test(c));
    return {
      layout: { pinIdx, nameIdx: nameIdx === -1 ? FALLBACK_LAYOUT.nameIdx : nameIdx, dateIdx },
      headerFound: true,
      headerCells: cells,
    };
  }
  return { layout: FALLBACK_LAYOUT, headerFound: false, headerCells: [] };
}

/** Urai HTML export mesin (dbg_kartu_scanlog) + kumpulkan info diagnosa. */
export function analyzeScanlog(html: string): ScanlogAnalysis {
  const trs = html.match(/<TR[\s\S]*?<\/TR>/gi) ?? [];
  const allCells = trs.map(rowCells);
  const { layout, headerFound, headerCells } = detectLayout(allCells);

  const rows: ParsedScanRow[] = [];
  let sampleDataCells: string[] | null = null;

  for (const cells of allCells) {
    // Butuh minimal kolom sampai Tanggal + 1 kolom scan. Header "Band" (2 sel)
    // & baris tak lengkap ter-skip di sini.
    if (cells.length <= layout.dateIdx + 1) continue;

    const pin = cells[layout.pinIdx] ?? "";
    const dateISO = toISO(cells[layout.dateIdx] ?? "");
    if (!pin || !dateISO) {
      // Simpan 1 contoh baris (cukup panjang, bukan header) untuk pesan error.
      if (!sampleDataCells && !/^PIN$/i.test(pin)) sampleDataCells = cells;
      continue; // baris "Header" (PIN/NIP/…) ter-skip di sini
    }

    // Kolom scan = semua sel setelah Tanggal; non-waktu (sel kosong) tersaring.
    const scans = cells.slice(layout.dateIdx + 1).filter((c) => TIME_RE.test(c));
    rows.push({ pin, name: cells[layout.nameIdx] ?? "", dateISO, scans });
  }

  return { rows, trCount: trs.length, headerFound, headerCells, layout, sampleDataCells };
}

/** Urai HTML export mesin (dbg_kartu_scanlog) → baris data terstruktur. */
export function parseScanlogHtml(html: string): ParsedScanRow[] {
  return analyzeScanlog(html).rows;
}

/** Pesan diagnosa saat 0 baris ter-parse — menerangkan penyebab spesifik. */
export function describeScanlogFailure(a: ScanlogAnalysis): string {
  if (a.trCount === 0)
    return "File tidak berisi tabel HTML. Pastikan ini file ekspor 'dbg_kartu_scanlog' dari mesin (bukan Excel/PDF/CSV).";
  if (!a.headerFound)
    return "Baris header (kolom 'PIN' & 'Tanggal') tidak ditemukan. Pastikan file adalah ekspor scanlog mesin yang benar dan belum diedit.";
  if (a.sampleDataCells)
    return (
      `Header terbaca (kolom: ${a.headerCells.join(", ")}), tetapi tidak ada baris ` +
      `tanggal yang valid. Contoh baris terdeteksi: [${a.sampleDataCells.join(" | ")}]. ` +
      `Kolom tanggal harus berformat DD-MM-YYYY atau YYYY-MM-DD.`
    );
  return `Header terbaca tetapi tidak ada baris data (total ${a.trCount} baris tabel).`;
}
