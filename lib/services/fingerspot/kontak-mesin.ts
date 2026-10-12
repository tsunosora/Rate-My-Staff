// Alamat & IP yang dipakai mesin saat menghubungi server — bahan "Info Mesin".
//
// Host diambil dari header Host, BUKAN dari req.url: di belakang Cloudflare Tunnel, Next
// menyusun req.url sebagai localhost:<port>, sementara tunnel meneruskan Host asli.
// IP: cf-connecting-ip dulu (dipasang Cloudflare, tidak bisa dikarang pengirim), lalu entri
// TERAKHIR x-forwarded-for — entri pertama itu apa pun yang dikirim pemanggil.

export type KontakMesin = { host: string | null; ip: string | null };

export function kontakDari(headers: Headers): KontakMesin {
  const mentah = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  const host = mentah.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").slice(0, 255) || null;
  const xff = (headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = (headers.get("cf-connecting-ip") ?? xff[xff.length - 1] ?? "").trim().slice(0, 64) || null;
  return { host, ip };
}

/** Host dari APP_URL = alamat utama instalasi ini; null kalau APP_URL kosong/rusak. */
export function alamatUtama(appUrl = process.env.APP_URL): string | null {
  try {
    return appUrl ? new URL(appUrl).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * "utama"  = mesin memakai alamat utama (APP_URL);
 * "lain"   = alamat lain yang masih melayani (mis. alamat lama sebelum pindah);
 * "lokal"  = langsung ke IP/localhost (mesin LAN atau uji);
 * null     = belum tercatat.
 */
export function jenisAlamat(host: string | null, utama: string | null): "utama" | "lain" | "lokal" | null {
  if (!host) return null;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3}|\[?[0-9a-f:]+\]?)$/i.test(host)) return "lokal";
  if (utama && host === utama) return "utama";
  return "lain";
}
