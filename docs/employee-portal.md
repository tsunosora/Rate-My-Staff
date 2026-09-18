# Portal Karyawan & Persetujuan Izin

Dua fitur yang saling terkait:

1. **Portal karyawan** `/me/[token]` — halaman pribadi tiap karyawan (absensi, penilaian,
   estimasi lembur, masukan tamu).
2. **Pengajuan izin dengan persetujuan owner** — izin/sakit/cuti tidak lagi langsung
   mengubah absensi; owner memutuskan dulu di **Absensi → Izin & Cuti**.

---

## 1. Portal karyawan

### Cara karyawan membukanya

Tautan & QR-nya ada di **Direktori → tombol QR → tab "Portal Karyawan"**. Tautannya memakai
`publicToken` yang sudah dimiliki tiap karyawan (token yang sama dipakai QR rating tamu,
tapi jalurnya berbeda: `/me/...` vs `/rate/...`).

Kirim tautan itu ke karyawan yang bersangkutan saja — mis. lewat WhatsApp, atau cetak QR-nya.

### PIN

Tautan saja tidak cukup untuk membuka data. Halaman dikunci **PIN**, dan ada **dua PIN
yang diterima**:

| PIN | Asal | Dipakai siapa |
|---|---|---|
| **PIN portal** | dibuat sendiri di halaman ini, 4–8 angka | semua karyawan |
| **PIN PosPro** | `Designer.pin` di PosPro (PIN piket/desainer) | karyawan yang sudah dipetakan ke akun PosPro **dan** punya PIN di sana |

Saat masuk, PIN portal dicoba lebih dulu; bila tak cocok, baru ditanyakan ke PosPro
(`POST /integrations/staff-pin/verify`, hanya menjawab benar/salah — nilai PIN tak pernah
keluar dari PosPro). Kalau PosPro sedang mati, PIN portal tetap jalan.

Layar yang muncul: **"Masuk"** bila karyawan punya salah satu PIN; **"Buat PIN"** hanya bila
belum punya keduanya.

- **Kali pertama dibuka** (tanpa PIN PosPro), karyawan membuat PIN-nya sendiri (isi + ulangi).
- PIN disimpan sebagai **hash bcrypt**; tak pernah dikirim balik ke browser, dan kolom
  `portalPin` di-`omit` dari semua endpoint karyawan.
- PIN yang mudah ditebak ditolak (angka sama semua, berurutan naik/turun).
- **Lupa PIN** → admin/owner menekan *Buatkan PIN acak* (PIN tampil **sekali**, catat &
  kirim ke karyawan) atau *Hapus PIN* (karyawan membuat PIN baru saat membuka tautan lagi).
- Karyawan bisa mengganti PIN sendiri dari dalam portal (wajib menyebut PIN lama).
- Salah PIN dibatasi **5 kali per 15 menit** per IP+tautan (`lib/rate-limit.ts`) — berlaku
  untuk kedua jenis PIN.

> ⚠️ **Aturan kekuatan PIN tidak berlaku untuk PIN PosPro.** PIN portal menolak angka
> berurutan/sama semua, tapi PIN PosPro dibuat di PosPro sehingga lolos apa adanya. Kalau
> PIN PosPro seseorang lemah (mis. 4 angka berurutan), kelemahan itu ikut terbawa ke sini.
> Perkuat dari **PosPro → Pengaturan → Desainer**; sekali ubah, berlaku di kedua aplikasi.

### Sesi

Cookie `rms_portal`, httpOnly, **berlaku 8 jam**, ditandatangani HMAC dengan `AUTH_SECRET`
(`lib/services/portal/session.ts`). Isinya `employeeId.sidikJariToken.kedaluwarsa.tandaTangan`
— tanpa tabel sesi. Konsekuensinya:

- Cookie tak bisa dipalsukan atau diperpanjang sendiri dari sisi klien.
- Cookie karyawan A otomatis ditolak di tautan karyawan B.
- Mengganti `AUTH_SECRET` atau memutar `publicToken` karyawan langsung mematikan sesi lama.

### Isi halaman

| Tab | Isi |
|---|---|
| **Ringkasan** | % kehadiran, jumlah telat, total lembur, skor terakhir, donat kehadiran, estimasi lembur (struk) |
| **Absensi** | Rincian harian: jam masuk/pulang, telat, lembur, status, alasan ketidakhadiran |
| **Penilaian** | Skor + grade, rincian per indikator & bobot, catatan penilai / rencana pengembangan / rekomendasi, riwayat skor, masukan tamu dari QR rating |
| **Izin** | Form pengajuan + riwayat beserta statusnya |

Periode dipilih per bulan (tombol ◀ ▶ atau pemilih bulan). Nominal rupiah yang tampil
adalah **estimasi lembur dari data absensi**, bukan slip gaji — ada peringatannya di kartu.

---

## 2. Alur pengajuan izin

```
Karyawan                         Sistem                        Owner / HR / Admin
   │                                │                                  │
   ├─ /me/[token] → tab Izin ──────►│                                  │
   │  (atau form tautan /absence)   │                                  │
   │                                ├─ LeaveRequest: pending           │
   │                                ├─ notifikasi ────────────────────►│
   │                                │            Absensi → Izin & Cuti │
   │                                │◄──── Setujui / Tolak ────────────┤
   │                                │                                  │
   │                    disetujui → tulis Attendance (per hari)        │
   │                    ditolak   → absensi tidak disentuh             │
   │◄─ status terlihat di portal ───┤                                  │
```

### Aturan yang dijaga

- **Absensi hanya berubah setelah disetujui.** Sebelum itu tabel `Attendance` tidak tersentuh
  sama sekali (perilaku lama yang langsung `deleteMany` sudah dihapus).
- **Scan mesin tidak pernah ditimpa.** Saat menyetujui, tanggal yang sudah punya scan
  masuk/pulang **dilewati** dan dilaporkan ke owner ("2 hari tercatat · 1 hari dilewati
  karena sudah ada absensi").
- **Baris hasil persetujuan ditandai** `machineName = "leave-approval"`. Bila owner
  membatalkan persetujuan, hanya baris bertanda itu yang ditarik kembali.
- **Satu hari satu pengajuan.** Pengajuan baru yang beririsan dengan pengajuan
  `pending`/`approved` milik karyawan yang sama ditolak (409).
- **Rentang tanggal** (`lib/services/leave/range.ts`): maksimal 31 hari per pengajuan,
  mundur paling jauh 30 hari (agar sakit kemarin tetap bisa dilaporkan), maju maksimal 1 tahun.
- Karyawan boleh **membatalkan sendiri** selama statusnya masih `pending`.

### Form tautan publik (`/absence/[token]`)

Masih ada dan tetap berlaku 24 jam, tapi sekarang **menghasilkan pengajuan `pending`**
(kolom `source = "link"`), bukan langsung mencatat ketidakhadiran. Berguna untuk karyawan
yang belum sempat memakai portal pribadinya.

---

## 3. Integrasi KPI dari PosPro

Penilaian kinerja kini punya dua sumber: penilaian manual di RateMyStaff (`Assessment`)
dan **KPI operasional dari PosPro** (aplikasi kasir, repo `/home/homelab/pos/pospro`).

### Jalur data

```
RateMyStaff                                   PosPro (NestJS, :3001)
  portal /me/[token]  ──┐
  Direktori → Edit     ─┤  GET /integrations/staff-list   ← daftar akun (dropdown pemetaan)
                        └► GET /integrations/staff-kpi    ← KPI per userId, rentang tanggal
                             header: x-api-key
```

Keduanya berjalan di mesin yang sama, jadi panggilannya lewat `127.0.0.1` — tidak keluar internet.

### Konfigurasi

| Sisi | Variabel | Isi |
|---|---|---|
| PosPro | `STAFF_KPI_API_KEY` | kunci acak; **kosong = integrasi mati** (semua request ditolak) |
| RateMyStaff | `POSPRO_API_URL` | `http://127.0.0.1:3001` |
| RateMyStaff | `POSPRO_API_KEY` | harus sama persis dengan `STAFF_KPI_API_KEY` |

Buat kunci baru: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

### Pemetaan karyawan ↔ akun PosPro

**Direktori → Edit karyawan → "Akun PosPro"**. Tanpa pemetaan ini, KPI tidak muncul untuk
karyawan tersebut. Tersimpan di `Employee.posproUserId` (unik — satu akun PosPro hanya
boleh dipetakan ke satu karyawan).

### KPI yang ditarik

| KPI | Sumber di PosPro | Cara mengenali orangnya |
|---|---|---|
| Rating pelanggan | `CsRatingResponse` | `assignedCsId` → FK `User` — **andal** |
| Tugas & piket | `TaskItem` (`assigneeId`, `status`, `dueDate`, `completedAt`) | FK `User` — **andal** |
| Penjualan | `Transaction` status `PAID` | **nama kasir** (`checkoutCashierName`, jatuh ke `cashierName`) — lihat catatan di bawah |

- **Penjualan dicocokkan lewat nama**, karena tabel transaksi PosPro tidak menyimpan id user.
  Pencocokan memakai nama yang dinormalisasi (huruf kecil, spasi dirapikan), dan kredit
  diberikan ke **penutup transaksi**, bukan pembuat nota.
  Nama kasir yang tak cocok dengan satu pun akun dikembalikan di `unmatchedCashierNames`
  supaya ketahuan ada penjualan yang belum terhitung.
- **Terlambat** pada tugas = selesai melewati tenggat, atau belum selesai padahal tenggat lewat.
  Tugas tanpa tenggat tidak pernah dihitung terlambat.
- **Puas** pada rating = jawaban "ya", atau bintang 4–5.

### Kalau PosPro mati

Portal karyawan **tetap tampil**; bagian KPI hilang begitu saja. Semua kegagalan
(integrasi belum diisi, PosPro tak bisa dihubungi, HTTP bukan 2xx, batas waktu 6 detik)
menghasilkan `null`, dicatat ke log server, dan tidak pernah menggagalkan halaman.

### Berkas di sisi PosPro

| Berkas | Isi |
|---|---|
| `backend/src/auth/api-key.guard.ts` | Guard `x-api-key`, banding waktu-konstan; env kosong = tolak |
| `backend/src/integrations/staff-kpi.controller.ts` | `GET /integrations/staff-list`, `GET /integrations/staff-kpi`, `GET /integrations/staff-pin`, `POST /integrations/staff-pin/verify` |
| `backend/src/integrations/staff-pin.service.ts` | Verifikasi PIN desainer (jawab benar/salah saja) |
| `backend/src/integrations/staff-kpi.service.ts` | Query Prisma + penggabungan per user |
| `backend/src/integrations/staff-kpi.aggregate.ts` | Agregasi murni (tanpa Prisma) |
| `backend/src/integrations/staff-kpi.aggregate.spec.ts` | Unit test agregasi (jest) |

---

## Berkas terkait

| Berkas | Isi |
|---|---|
| `app/(public)/me/[token]/page.tsx` | Halaman portal |
| `components/portal/*` | Layar PIN, panel ringkasan/absensi/penilaian/izin |
| `app/api/public/portal/[token]/*` | API portal (state, sesi/PIN, overview, izin) |
| `app/(dashboard)/leave-requests/page.tsx` | Halaman persetujuan owner |
| `app/api/leave-requests/*` | Daftar & keputusan izin |
| `app/api/employees/[id]/portal-pin/route.ts` | Admin set/hapus PIN |
| `lib/services/portal/*` | Sesi HMAC, aturan PIN, guard, agregasi data portal |
| `lib/services/leave/*` | Aturan rentang tanggal, irisan, penerapan ke absensi |
| `lib/services/pospro/client.ts` | Klien integrasi PosPro (gagal = null, bukan error) |
| `app/api/pospro/staff-list/route.ts` | Proksi daftar akun PosPro untuk dropdown pemetaan |
| `components/portal/PosproPanel.tsx` | Kartu KPI operasional di tab Penilaian |
| `tests/leave-range.test.ts`, `tests/portal-session.test.ts` | Unit test logika murni |
