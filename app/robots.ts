import type { MetadataRoute } from "next";

// Aplikasi internal — larang semua crawler mengindeks halaman apa pun.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
