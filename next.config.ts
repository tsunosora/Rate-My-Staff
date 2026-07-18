import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Repo ini punya dua lockfile (Laravel lama di root + web-next). Kunci root
  // workspace ke folder ini supaya Turbopack tidak salah infer root.
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),

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
    ];
  },
};

export default nextConfig;
