// ANTRIAN PERINTAH server → mesin (HARNESS UJI kelayakan tulis-balik).
//
// Protokol realtime Fingerspot dua arah: mesin rutin polling `receive_cmd`
// ("ada perintah buat aku?"). Bila ada perintah pending untuk SN itu, server balas
// header response_code:"CMD" + cmd_code + trans_id + body ber-frame; mesin eksekusi
// lalu lapor via `send_cmd_result` (otomatis tercatat di FingerspotRawLog).
//
// Penyimpanan: file JSON sederhana (bukan DB) — sengaja ringan untuk fase UJI.
// INERT SECARA DEFAULT: kalau file antrian tidak ada / kosong, semua fungsi baca
// mengembalikan kosong → perilaku route realtime persis seperti sebelumnya.
//
// Format body perintah = 4-byte LE panjang JSON + JSON UTF-8 (+ blob biner opsional),
// identik dengan arah terima yang sudah kita tangani (formatCommandBody referensi).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type QueuedCommand = {
  id: string; // dipakai sebagai trans_id ke mesin
  devId: string; // SN mesin target ("*" = mesin mana pun)
  cmdCode: string; // mis. "GET_USER_INFO" | "SET_USER_INFO"
  body: Record<string, unknown>;
  status: "pending" | "sent" | "done";
  createdAt: string;
  sentAt?: string;
  note?: string;
};

/** Lokasi file antrian. Sama untuk route (app) & script tes bila cwd sama (root repo). */
export function queueFilePath(): string {
  return process.env.FP_CMD_QUEUE_FILE || path.join(process.cwd(), "data", "fp-commands.json");
}

export function readQueue(): QueuedCommand[] {
  try {
    const f = queueFilePath();
    if (!existsSync(f)) return [];
    const raw = readFileSync(f, "utf8").trim();
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as QueuedCommand[]) : [];
  } catch {
    return []; // korup/terkunci → jangan pernah ganggu jalur realtime
  }
}

export function writeQueue(cmds: QueuedCommand[]): void {
  const f = queueFilePath();
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(cmds, null, 2));
}

/** 4-byte LE panjang JSON + JSON UTF-8 (+ blob). Sama dgn formatCommandBody referensi. */
export function frameCommandBody(bodyValue: unknown, blobs: Buffer[] = []): Buffer {
  const json = Buffer.from(JSON.stringify(bodyValue), "utf8");
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32LE(json.length, 0);
  const parts: Buffer[] = [prefix, json];
  for (const blob of blobs) {
    const len = Buffer.alloc(4);
    len.writeUInt32LE(blob.length, 0);
    parts.push(len, blob);
  }
  return Buffer.concat(parts);
}

/**
 * Ambil 1 perintah pending untuk devId & tandai "sent". Null bila tak ada / fitur nonaktif.
 * Dipanggil route realtime saat request_code === "receive_cmd".
 */
export function dequeueCommandForDevice(devId: string): QueuedCommand | null {
  const cmds = readQueue();
  if (cmds.length === 0) return null;
  const idx = cmds.findIndex((c) => c.status === "pending" && (c.devId === devId || c.devId === "*"));
  if (idx === -1) return null;
  cmds[idx].status = "sent";
  cmds[idx].sentAt = new Date().toISOString();
  writeQueue(cmds);
  return cmds[idx];
}
