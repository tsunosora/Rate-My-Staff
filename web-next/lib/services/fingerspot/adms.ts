// Protokol ADMS (ZKTeco/Fingerspot "Server/Cloud" push over HTTP).
// Mesin menghubungi:
//   GET  /iclock/cdata?SN=<sn>&options=all       -> handshake (server balas config)
//   POST /iclock/cdata?SN=<sn>&table=ATTLOG      -> data absensi (body tab-separated)
//   GET  /iclock/getrequest?SN=<sn>              -> poll perintah (balas "OK")
//   POST /iclock/devicecmd?SN=<sn>               -> hasil perintah (balas "OK")

export type AttlogRecord = {
  pin: string;
  time: string; // "YYYY-MM-DD HH:MM:SS"
  status: string;
  verify?: string;
};

/**
 * Parse body ATTLOG: tiap baris = field dipisah TAB.
 * Format umum: PIN \t YYYY-MM-DD HH:MM:SS \t status \t verify \t workcode ...
 */
export function parseAttlog(body: string): AttlogRecord[] {
  const out: AttlogRecord[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const f = line.split("\t");
    if (f.length < 2) continue;
    const pin = f[0]?.trim();
    const time = f[1]?.trim();
    if (!pin || !time) continue;
    out.push({ pin, time, status: (f[2] ?? "").trim(), verify: (f[3] ?? "").trim() });
  }
  return out;
}

/** Response handshake yang diterima firmware ZK/Fingerspot. */
export function handshakeResponse(sn: string): string {
  const stamp = "9999";
  return [
    `GET OPTION FROM: ${sn}`,
    `Stamp=${stamp}`,
    `OpStamp=0`,
    `ErrorDelay=30`,
    `Delay=30`,
    `TransTimes=00:00;14:00`,
    `TransInterval=1`,
    `TransFlag=1111000000`,
    `TimeZone=7`,
    `Realtime=1`,
    `Encrypt=0`,
    "",
  ].join("\n");
}
