import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Repo ini punya dua lockfile (Laravel lama di root + web-next). Kunci root
  // workspace ke folder ini supaya Turbopack tidak salah infer root.
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
