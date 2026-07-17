# Rate-My-Staff

Sistem HR & Absensi — penilaian karyawan, absensi, lembur, laporan, dan form publik.
Dibangun ulang penuh dengan **Next.js 16 (App Router) + Prisma + MySQL + Auth.js**.

> Repo ini dulu berisi versi lama (Laravel + Vue). Semua kode lama sudah dihapus dan
> diganti versi Next.js ini. Riwayat lama masih tersimpan di git (tag `pre-flatten-laravel`).

## Menjalankan di lokal

**Prasyarat:**
- Node.js 20+
- MySQL berjalan (mis. lewat XAMPP). Database `ratemystaff` sudah dibuat.

**Langkah:**
```bash
# 1. (khusus laptop ini) override prefix npm yang bermasalah
export NPM_CONFIG_PREFIX="$HOME/.npm-global"

# 2. install dependencies (sekali)
npm install

# 3. siapkan database (sekali) — migrasi skema + isi data awal
npm run db:migrate
npm run db:seed

# 4. jalankan
npm run dev
```

Buka **http://localhost:3000**

**Login default:** `admin@ratemystaff.local` / `admin123`

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Mode development (hot reload) |
| `npm run build` && `npm start` | Mode produksi |
| `npm run db:studio` | Prisma Studio (lihat/edit database) |
| `npm run db:seed` | Isi ulang data awal |
| `npm run test` | Unit test (vitest) |

## Konfigurasi

Salin `.env.example` → `.env`, lalu isi:
- `DATABASE_URL` — koneksi MySQL (contoh: `mysql://ratemystaff:pass@127.0.0.1:3306/ratemystaff`)
- `AUTH_SECRET` — generate: `npx auth secret`
- `NEXTAUTH_URL` / `APP_URL` — URL aplikasi

## Struktur

```
app/            Halaman & API (App Router)
  (auth)/       Halaman login
  (dashboard)/  Halaman terproteksi (dashboard, employees, attendance, dll)
  (public)/     Halaman publik token (rate, absence)
  api/          Route handler backend
  iclock/       Penerima push mesin Fingerspot (protokol ADMS)
lib/            Logika bisnis (services, auth, prisma, validators)
components/     Komponen UI
prisma/         Skema database + seed
tests/          Unit test
```

## Deploy

Produksi berjalan di homelab via PM2 + Cloudflare Tunnel (`absensi.volikoprint.com`).
Update: `git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart ratemystaff`
