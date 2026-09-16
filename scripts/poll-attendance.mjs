// Scheduler tarik absensi otomatis: memanggil endpoint cron app tiap N menit.
// Dijalankan sebagai proses PM2 terpisah (lihat ecosystem.config.cjs).
// Tak mengakses DB langsung — cukup HTTP ke app sendiri, jadi tak ada masalah
// resolusi path alias TypeScript.
//
// Env:
//   CRON_SECRET       wajib — sama dengan yang dipakai app (header x-cron-secret)
//   POLL_URL          default http://127.0.0.1:3007/api/fingerspot/cron-pull
//   POLL_INTERVAL_MS  default 900000 (15 menit)

import { readFileSync } from "node:fs";

// Fallback: muat .env sendiri (PM2/node tak selalu memuatnya) tanpa dependensi.
function loadEnvFallback(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env tak ada — abaikan */
  }
}
loadEnvFallback(["CRON_SECRET", "POLL_URL", "POLL_INTERVAL_MS"]);

const URL = process.env.POLL_URL || "http://127.0.0.1:3007/api/fingerspot/cron-pull";
const INTERVAL = Number(process.env.POLL_INTERVAL_MS) || 15 * 60 * 1000;
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("[poller] CRON_SECRET belum diset — berhenti.");
  process.exit(1);
}

async function tick() {
  const ts = new Date().toISOString();
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-cron-secret": SECRET },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[poller] ${ts} HTTP ${res.status}:`, data.message ?? "");
    } else if (data.skipped) {
      console.log(`[poller] ${ts} dilewati (tarik otomatis mati).`);
    } else {
      console.log(`[poller] ${ts} OK — ${data.synced ?? 0} scan baru dari ${data.total ?? 0} record.`);
    }
  } catch (e) {
    console.error(`[poller] ${ts} error:`, e.message);
  }
}

console.log(`[poller] mulai — interval ${INTERVAL / 60000} menit → ${URL}`);
tick();
setInterval(tick, INTERVAL);
