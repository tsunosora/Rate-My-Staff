// Klien TCP langsung ke mesin absensi Fingerspot Revo W-230N (keluarga Realand ZDC2911)
// lewat IP:port (default 5005). Menarik general-log TANPA aplikasi/DLL bawaan Fingerspot.
//
// READ-ONLY: hanya membaca log; tidak pernah menghapus/menulis apa pun ke mesin.
//
// Protokol (hasil reverse-engineering — lihat memory fingerspot-revo-w230n-tcp-protocol):
//   Frame perintah 16 byte: 55 aa | 01(DN) | cmd | p1(u32 LE) | p2(u32 LE) | chunk(u16 LE) | seq(u16 LE)
//   Respons: ack 10 byte (aa 55 01 01 <status u32 LE> <seq u16>), lalu bila ada data:
//            55 aa + payload(chunk) + 4 byte tail.
//   Urutan: handshake 0x80 + 3×0x13 → 0xb4 (jumlah record di status) → 0xa4 per halaman 1024 byte.
//   Baca #1 membawa jumlah record di p2; baca berikutnya membawa indeks halaman (idx<<16).
//
// Record general-log = 48 byte:
//   [0..31] PIN ASCII (null-padded) → dicocokkan ke Employee.machinePin
//   [35] detik
//   [36..37] u16 LE: bit2-8 = tahun-1900, bit12-15 = bulan
//   [38..39] u16 LE: bit0-4 = hari, bit5-9 = jam, bit10-15 = menit
//   [40..43] u32 BE: action (1 = in, 2 = out) — hanya indikatif; in/out final dihitung mapper
import net from "node:net";
import type { RawScan } from "./mapper";

const REC = 48;
const UREC = 36; // ukuran record daftar user (enroll) — hanya PIN + info sidik jari, TANPA nama
const CHUNK = 1024;
const MARKER_CMD = [0x55, 0xaa];
const MARKER_ACK = [0xaa, 0x55];

export type DeviceRecord = {
  pin: string;
  scanAt: Date;
  action: number;
};

export type PullResult = {
  count: number;
  records: DeviceRecord[];
};

export type PullOptions = {
  ip: string;
  port?: number;
  timeoutMs?: number;
  /** Bila true: hanya handshake + jumlah record, tanpa menarik isi log (untuk tes koneksi). */
  countOnly?: boolean;
};

const hx = (s: string) => Buffer.from(s.replace(/\s/g, ""), "hex");

function cmd(code: number, p1: number, p2: number, chunk: number, seq: number): Buffer {
  const b = Buffer.alloc(16);
  b[0] = MARKER_CMD[0];
  b[1] = MARKER_CMD[1];
  b[2] = 0x01;
  b[3] = code;
  b.writeUInt32LE(p1 >>> 0, 4);
  b.writeUInt32LE(p2 >>> 0, 8);
  b.writeUInt16LE(chunk & 0xffff, 12);
  b.writeUInt16LE(seq & 0xffff, 14);
  return b;
}

/** Perintah handshake persis seperti SDK. Nonce 0x80 diisi acak (mesin mensyaratkan nonzero). */
function handshakePackets(): { packet: Buffer; dataLen: number }[] {
  const connect = hx("55aa0180 00000000 0000ffff 0000 0000");
  connect.writeUInt16LE(1 + Math.floor(Math.random() * 0xfffe), 8);
  return [
    { packet: connect, dataLen: 0 },
    { packet: hx("55aa0113 00000000 00000000 3000 0000"), dataLen: 0x30 },
    { packet: hx("55aa0113 01000000 00000000 0004 0000"), dataLen: 0x400 },
    { packet: hx("55aa0113 00000000 00000000 3000 0000"), dataLen: 0x30 },
  ];
}

/** Dekode satu blok mentah (kelipatan 48 byte) menjadi record. Fungsi murni — mudah diuji. */
export function decodeRecords(all: Buffer): DeviceRecord[] {
  const out: DeviceRecord[] = [];
  for (let i = 0; i + REC <= all.length; i += REC) {
    const r = all.subarray(i, i + REC);
    const pin = r.toString("latin1", 0, 32).replace(/\0+$/, "").trim();
    const u = r.readUInt16LE(36);
    const w = r.readUInt16LE(38);
    const year = 1900 + ((u >> 2) & 0x7f);
    const month = u >> 12;
    const day = w & 31;
    const hour = (w >> 5) & 31;
    const minute = w >> 10;
    const second = r[35];
    // Buang baris kosong / rusak (PIN kosong atau tanggal tak masuk akal).
    if (!pin) continue;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) continue;
    const scanAt = new Date(year, month - 1, day, hour, minute, second);
    out.push({ pin, scanAt, action: r.readUInt32BE(40) });
  }
  return out;
}

/** Ubah record device → bentuk RawScan yang dimengerti mapScanlogs. */
export function toRawScans(records: DeviceRecord[]): RawScan[] {
  return records.map((r) => ({ pin: r.pin, scanAt: r.scanAt }));
}

/** Dekode blok daftar user (kelipatan 36 byte) → daftar PIN. Fungsi murni. */
export function decodeUserPins(all: Buffer): string[] {
  const out: string[] = [];
  for (let i = 0; i + UREC <= all.length; i += UREC) {
    const pin = all.toString("latin1", i, i + 24).replace(/\0+$/, "").trim();
    if (pin) out.push(pin);
  }
  return out;
}

/**
 * Tarik DAFTAR USER (PIN yang terdaftar) dari mesin.
 * CATATAN: mesin Revo W-230N hanya menyimpan PIN + sidik jari, TIDAK menyimpan nama.
 * Jadi hasilnya hanya daftar PIN — nama harus diisi di app / dari sumber lain.
 */
export function pullDeviceUsers(opts: PullOptions): Promise<{ pins: string[] }> {
  const { ip, port = 5005, timeoutMs = 15000 } = opts;
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, ip);
    sock.setTimeout(timeoutMs);

    let buf = Buffer.alloc(0);
    let seq = 0;
    let hi = 0;
    let phase: "hs" | "countA" | "countB" | "read" | "done" = "hs";
    let countA = 0;
    let total = 0;
    let off = 0;
    let chunk = 0;
    const hs = handshakePackets();
    const data: Buffer[] = [];
    let settled = false;

    const finish = (fn: () => void) => { if (settled) return; settled = true; sock.end(); fn(); };
    const fail = (msg: string) => finish(() => { sock.destroy(); reject(new Error(msg)); });

    const sendHS = () => { seq++; const p = Buffer.from(hs[hi].packet); p.writeUInt16LE(seq & 0xffff, 14); hi++; sock.write(p); };
    const sendCountA = () => { seq++; sock.write(cmd(0xb4, 2, 0xffff0000, 0, seq)); };
    const sendCountB = () => { seq++; sock.write(cmd(0xb4, 1, (0xffff0000 | countA) >>> 0, 0, seq)); };
    const sendRead = () => {
      seq++;
      const totalBytes = total * UREC;
      chunk = Math.min(CHUNK, totalBytes - off);
      const idx = Math.floor(off / CHUNK);
      const p2 = idx === 0 ? totalBytes : (idx << 16) >>> 0;
      sock.write(cmd(0x97, totalBytes, p2, chunk, seq));
    };

    sock.on("connect", () => sendHS());
    sock.on("timeout", () => fail(`Timeout menghubungi mesin ${ip}:${port} (fase ${phase}).`));
    sock.on("error", (e) => fail(`Tidak bisa terhubung ke mesin ${ip}:${port}: ${e.message}`));

    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 10 && buf[0] === MARKER_ACK[0] && buf[1] === MARKER_ACK[1]) {
        const status = buf.readUInt32LE(4);
        const clen = phase === "hs" ? (hs[hi - 1]?.dataLen ?? 0) : phase === "read" ? chunk : 0;
        const need = clen > 0 ? 10 + 2 + clen + 4 : 10;
        if (buf.length < need) break;
        if (clen > 0) {
          if (buf[10] !== MARKER_CMD[0] || buf[11] !== MARKER_CMD[1]) return fail(`Bingkai data user tak valid (fase ${phase}).`);
          if (phase === "read") { data.push(Buffer.from(buf.subarray(12, 12 + clen))); off += clen; }
        }
        buf = buf.subarray(need);

        if (phase === "hs") { if (hi < hs.length) sendHS(); else { phase = "countA"; sendCountA(); } continue; }
        if (phase === "countA") { countA = status; phase = "countB"; sendCountB(); continue; }
        if (phase === "countB") {
          total = countA + status;
          if (total === 0) { phase = "done"; return finish(() => resolve({ pins: [] })); }
          phase = "read";
          sendRead();
          continue;
        }
        if (phase === "read") {
          if (off >= total * UREC) { phase = "done"; return finish(() => resolve({ pins: decodeUserPins(Buffer.concat(data)) })); }
          sendRead();
          continue;
        }
      }
    });
  });
}

/**
 * Terhubung ke mesin via TCP, tarik seluruh general-log, dekode.
 * Menolak (reject) dengan pesan jelas bila jaringan/port tak terjangkau.
 */
export function pullDeviceLogs(opts: PullOptions): Promise<PullResult> {
  const { ip, port = 5005, timeoutMs = 15000, countOnly = false } = opts;
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, ip);
    sock.setTimeout(timeoutMs);

    let buf = Buffer.alloc(0);
    let seq = 0;
    let hi = 0;
    let phase: "hs" | "count" | "read" | "done" = "hs";
    let total = 0;
    let off = 0;
    let count = 0;
    let readIdx = -1;
    let chunk = 0;
    const hs = handshakePackets();
    const data: Buffer[] = [];
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      sock.end();
      fn();
    };
    const fail = (msg: string) => finish(() => { sock.destroy(); reject(new Error(msg)); });

    const sendHS = () => { seq++; const p = Buffer.from(hs[hi].packet); p.writeUInt16LE(seq & 0xffff, 14); hi++; sock.write(p); };
    const sendCount = () => { seq++; sock.write(cmd(0xb4, 8, 0xffff0000, 0, seq)); };
    const sendRead = () => {
      seq++;
      readIdx++;
      chunk = Math.min(CHUNK, total - off);
      const p2 = readIdx === 0 ? count : (readIdx << 16) >>> 0;
      sock.write(cmd(0xa4, 0, p2, chunk, seq));
    };

    sock.on("connect", () => sendHS());
    sock.on("timeout", () => fail(`Timeout menghubungi mesin ${ip}:${port} (fase ${phase}).`));
    sock.on("error", (e) => fail(`Tidak bisa terhubung ke mesin ${ip}:${port}: ${e.message}`));

    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 10 && buf[0] === MARKER_ACK[0] && buf[1] === MARKER_ACK[1]) {
        const status = buf.readUInt32LE(4);
        const clen =
          phase === "hs" ? (hs[hi - 1]?.dataLen ?? 0) : phase === "read" ? chunk : 0;
        const need = clen > 0 ? 10 + 2 + clen + 4 : 10;
        if (buf.length < need) break;
        if (clen > 0) {
          if (buf[10] !== MARKER_CMD[0] || buf[11] !== MARKER_CMD[1]) return fail(`Bingkai data tak valid dari mesin (fase ${phase}).`);
          if (phase === "read") { data.push(Buffer.from(buf.subarray(12, 12 + clen))); off += clen; }
        }
        buf = buf.subarray(need);

        if (phase === "hs") {
          if (hi < hs.length) sendHS();
          else { phase = "count"; sendCount(); }
          continue;
        }
        if (phase === "count") {
          count = status;
          total = status * REC;
          if (countOnly || total === 0) { phase = "done"; return finish(() => resolve({ count, records: [] })); }
          phase = "read";
          sendRead();
          continue;
        }
        if (phase === "read") {
          if (off >= total) { phase = "done"; return finish(() => resolve({ count, records: decodeRecords(Buffer.concat(data)) })); }
          sendRead();
          continue;
        }
      }
    });
  });
}
