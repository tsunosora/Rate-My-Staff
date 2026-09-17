// HARNESS UJI kelayakan perintah server → mesin (Fingerspot realtime).
// Node murni (muat .env sendiri). Jalankan dari root repo.
//
// Pakai:
//   node scripts/fp-cmd-test.mjs queue-get <PIN> [devId]   # antre GET_USER_INFO (AMAN, read-only)
//   node scripts/fp-cmd-test.mjs status                     # lihat antrian + kontak mesin terbaru
//   node scripts/fp-cmd-test.mjs clear                      # kosongkan antrian
//
// Alur uji: `queue-get <PIN>` → tunggu mesin polling `receive_cmd` (route mengirim perintah) →
// mesin balas data user via `send_cmd_result`/`realtime_enroll_data` (tercatat di FingerspotRawLog) →
// `status` menampilkannya. Ini MEMBUKTIKAN: (a) mesin memang polling, (b) format perintah kita
// diterima, (c) kita dapat format enroll_data asli untuk SET yang aman nanti. NOL risiko (cuma baca).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

function loadEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* .env tak ada */ }
}

const QUEUE_FILE = process.env.FP_CMD_QUEUE_FILE || path.join(process.cwd(), "data", "fp-commands.json");
const DEFAULT_DEV = "C2630451070F2923"; // SN Mesin Utama kantor (override lewat argumen)

function readQueue() {
  try {
    if (!existsSync(QUEUE_FILE)) return [];
    const raw = readFileSync(QUEUE_FILE, "utf8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeQueue(cmds) {
  mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  writeFileSync(QUEUE_FILE, JSON.stringify(cmds, null, 2));
}

async function showRecentContacts() {
  loadEnv(["DATABASE_URL"]);
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.fingerspotRawLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
    console.log(`\n=== 25 kontak mesin terakhir (FingerspotRawLog) ===`);
    for (const r of rows.reverse()) {
      const rb = r.rawBody || {};
      const rc = rb.request_code ?? "?";
      const tid = rb.trans_id ?? "-";
      let extra = "";
      const d = rb.data || {};
      if (d.user_id) extra += ` user_id=${d.user_id}`;
      if (d.user_name) extra += ` name="${d.user_name}"`;
      if (d.status !== undefined) extra += ` status=${d.status}`;
      if (d.returnCode !== undefined) extra += ` returnCode=${d.returnCode}`;
      if (d.io_time) extra += ` io_time=${d.io_time}`;
      const keys = Object.keys(d).join(",");
      console.log(
        `${new Date(r.createdAt).toISOString()}  ${String(rc).padEnd(20)} trans_id=${String(tid).padEnd(6)} sn=${r.snMachine ?? "-"}${extra}${extra ? "" : `  keys[${keys}]`}`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

const [cmd, arg1, arg2] = process.argv.slice(2);

if (cmd === "queue-get") {
  if (!arg1) { console.error("PIN wajib: node scripts/fp-cmd-test.mjs queue-get <PIN> [devId]"); process.exit(1); }
  const devId = arg2 || DEFAULT_DEV;
  const cmds = readQueue().filter((c) => c.status === "pending" && c.cmdCode === "GET_USER_INFO"); // buang GET pending lama
  cmds.push({
    id: `test-${Date.now()}`,
    devId,
    cmdCode: "GET_USER_INFO",
    body: { user_id: String(arg1) },
    status: "pending",
    createdAt: new Date().toISOString(),
    note: "uji kelayakan tulis-balik: baca data user (read-only)",
  });
  writeQueue(cmds);
  console.log(`✓ Antre GET_USER_INFO user_id=${arg1} → devId=${devId}`);
  console.log(`  File: ${QUEUE_FILE}`);
  console.log(`  Mesin akan mengambilnya saat polling receive_cmd berikutnya.`);
  console.log(`  Pantau hasil: node scripts/fp-cmd-test.mjs status`);
} else if (cmd === "clear") {
  writeQueue([]);
  console.log(`✓ Antrian dikosongkan: ${QUEUE_FILE}`);
} else if (cmd === "status") {
  const cmds = readQueue();
  console.log(`=== Antrian perintah (${QUEUE_FILE}) ===`);
  if (cmds.length === 0) console.log("(kosong)");
  for (const c of cmds) {
    console.log(`  [${c.status}] ${c.cmdCode} ${JSON.stringify(c.body)} dev=${c.devId} id=${c.id}${c.sentAt ? ` sent=${c.sentAt}` : ""}`);
  }
  await showRecentContacts();
} else {
  console.log("Perintah: queue-get <PIN> [devId] | status | clear");
  process.exit(1);
}
