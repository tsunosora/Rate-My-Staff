export type ParsedScanRow = {
  pin: string;
  name: string;
  dateISO: string; // YYYY-MM-DD
  scans: string[]; // ["HH:MM:SS", ...] hanya yang terisi, urut sesuai kolom
};

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/;
const DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Ambil teks bersih dari satu sel <TD>: buang tag & decode &nbsp; → "". */
function cellText(tdInner: string): string {
  const noTags = tdInner.replace(/<[^>]+>/g, "");
  const decoded = noTags.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
  return decoded.trim();
}

/** Urai HTML export mesin (dbg_kartu_scanlog) → baris data terstruktur. */
export function parseScanlogHtml(html: string): ParsedScanRow[] {
  const rows: ParsedScanRow[] = [];
  const trMatches = html.match(/<TR[\s\S]*?<\/TR>/gi) ?? [];

  for (const tr of trMatches) {
    const cells = (tr.match(/<TD[\s\S]*?<\/TD>/gi) ?? []).map((td) =>
      cellText(td.replace(/^<TD[^>]*>/i, "").replace(/<\/TD>$/i, ""))
    );
    if (cells.length < 11) continue; // header "Band" (2 sel) & baris tak lengkap ter-skip

    const pin = cells[0];
    const dateCell = cells[6];
    const dm = DATE_RE.exec(dateCell);
    if (!pin || !dm) continue; // baris "Header" (PIN/NIP/…) ter-skip di sini

    const dateISO = `${dm[3]}-${dm[2]}-${dm[1]}`;
    const scans = cells.slice(7, 11).filter((c) => TIME_RE.test(c));

    rows.push({ pin, name: cells[2] ?? "", dateISO, scans });
  }

  return rows;
}
