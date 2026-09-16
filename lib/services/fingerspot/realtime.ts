// Penerima protokol "realtime" Fingerspot (RealSvr) — dipakai mesin Revo saat mode Web.
// Mesin POST ke "/" dengan header request_code (realtime_glog / realtime_enroll_data /
// receive_cmd / send_cmd_result), body = [4-byte LE panjang JSON][JSON UTF-8][blob biner...].
// Server WAJIB balas: HTTP 200, body kosong, header response_code:"OK" + trans_id di-echo,
// kalau tidak mesin akan mengulang terus (tanda seru cloud).

/** Ekstrak objek JSON pertama yang seimbang dari buffer (abaikan 4-byte prefix & blob biner). */
export function extractJson(input: Uint8Array): Record<string, unknown> | null {
  const buf = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const text = buf.toString("latin1");
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(Buffer.from(text.slice(start, i + 1), "latin1").toString("utf8"));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** "YYYYMMDDHHMMSS" (waktu lokal mesin) → Date lokal. Null bila tak valid. */
export function parseIoTime(io: unknown): Date | null {
  const s = String(io ?? "");
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m.map(Number) as unknown as number[];
  const dt = new Date(y, mo - 1, d, h, mi, sec);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
