import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Kunci root workspace Turbopack ke folder ini supaya tidak salah infer root
  // bila ada lockfile lain di folder induk.
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),

  // Mesin Fingerspot (mode Web) mem-POST ke "/" dgn header request_code.
  // Rewrite INTERNAL ke penerima realtime (berlaku semua method, tak loop keluar).
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "header", key: "request_code" }],
          destination: "/api/fingerspot/realtime",
        },
      ],
    };
  },

  // Header keamanan + larangan indeks untuk SEMUA respons (halaman & API).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // Dihormati hanya di HTTPS (diabaikan di HTTP) — aman untuk homelab TLS.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      // Pengecualian SEMPIT untuk absen lewat HP: halaman karyawan butuh lokasi + kamera (pindai
      // QR), pengaturan owner butuh lokasi ("Lokasi saya"). Tanpa ini peramban MENOLAK keduanya
      // ("disabled by permissions policy") dan tiap absen gagal "Lokasi tidak terbaca". Next memakai
      // header yang ditulis TERAKHIR untuk kunci yang sama, jadi entri ini harus tetap di bawah.
      {
        source: "/absen/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), browsing-topics=()" },
        ],
      },
      {
        source: "/settings/absen-hp",
        headers: [
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
