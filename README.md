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

## Import Scanlog Mesin (HTML)

Halaman **Absensi → Import Scanlog** menerima file HTML export mesin (`dbg_kartu_scanlog`,
kolom PIN / Nama / Tanggal / Scan 1–4). Alurnya: unggah → **Preview** (tanpa menyimpan) →
**Konfirmasi & Simpan**.

- **Pencocokan:** PIN mesin dicocokkan ke field **PIN Mesin Absensi** (`machinePin`) di data
  karyawan. Isi PIN ini dulu di **Karyawan → Edit** agar baris tidak "tak cocok". Field yang sama
  juga dipakai integrasi push Fingerspot.
- **Pairing scan:** jam masuk diambil dari scan dekat awal shift (08:00 / 13:00), jam pulang dari
  scan dekat akhir shift (16:00 / 21:00). Bila hanya ada satu scan, diklasifikasikan masuk/pulang
  berdasarkan kedekatannya ke awal vs akhir shift — mis. scan tunggal 13:00 = **masuk** (shift
  siang), scan tunggal 21:00 = **pulang** (masuk dikosongkan, bukan diisi jam yang sama).
  (Scan istirahat belum dipakai.)
- **Dobel-scan:** bila ada beberapa scan berdekatan di event yang sama (mis. absen jam 8 dua kali,
  atau jam 9 malam dua kali), digabung jadi satu dan diambil yang **paling terlambat**.
- **Absensi tidak komplit:** baris yang cuma punya masuk atau cuma pulang otomatis memunculkan
  modal *Lengkapi manual* (lintas tanggal) tepat setelah import — dan juga ditandai banner di
  halaman **Absensi**. Jam yang hilang **diisi otomatis sesuai shift** (mis. hanya pulang 16:00 →
  saran masuk 08:00; hanya pulang 21:00 → saran masuk 13:00; dan sebaliknya), tinggal diperiksa
  lalu Simpan.
- **Edit absen:** tiap baris di halaman **Absensi** dan **Laporan Absensi** punya tombol *Edit* untuk
  mengoreksi jam masuk/pulang (mis. salah isi, atau ternyata longshift) — status/telat/lembur/shift
  dihitung ulang otomatis.
- **Hari libur:** tanggal Minggu (bila setting *Minggu otomatis libur* aktif) & tanggal libur
  custom di **Pengaturan → Hari Libur** ditandai otomatis.
- **Menimpa:** import menimpa data hari yang sama (`machineName=import-html`). Jika hari itu sudah
  punya absensi dari sumber lain (mesin push/manual), baris ditandai **bentrok** dan hanya
  ditimpa bila kotak konfirmasi dicentang; jika tidak, hari bentrok dilewati.

## Shift otomatis & longshift

Status kehadiran (telat/lembur/longshift) dihitung **otomatis dari jam scan** memakai jam toko &
shift di **Pengaturan → Jam Toko & Shift** — bukan jadwal per-karyawan. Default: toko 08:00–21:00,
shift pagi 08:00–16:00, shift siang 13:00–21:00.

- **Deteksi shift:** ditentukan dari jam masuk (dekat jam buka = pagi, dekat jam mulai siang = siang).
- **Longshift:** masuk pagi lalu pulang saat toko tutup (≥ ambang, default 20:00) = bekerja buka
  sampai tutup.
- **Lembur:** menit kerja melebihi jam pulang shift (pagi lewat 16:00; siang/longshift lewat 21:00).
- **Telat:** menit lewat jam mulai shift di atas toleransi (default 15 menit).

Logika ini dipakai konsisten di import scanlog, input manual, dan laporan absensi.

## Deploy

Produksi berjalan di homelab via PM2 + Cloudflare Tunnel (`absensi.volikoprint.com`).
Update: `git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart ratemystaff`
