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

Tautan saja tidak cukup untuk membuka data. Halaman dikunci **PIN 4–8 angka**:

- **Kali pertama dibuka**, karyawan membuat PIN-nya sendiri (isi + ulangi).
- PIN disimpan sebagai **hash bcrypt**; tak pernah dikirim balik ke browser, dan kolom
  `portalPin` di-`omit` dari semua endpoint karyawan.
- PIN yang mudah ditebak ditolak (angka sama semua, berurutan naik/turun).
- **Lupa PIN** → admin/owner menekan *Buatkan PIN acak* (PIN tampil **sekali**, catat &
  kirim ke karyawan) atau *Hapus PIN* (karyawan membuat PIN baru saat membuka tautan lagi).
- Karyawan bisa mengganti PIN sendiri dari dalam portal (wajib menyebut PIN lama).
- Salah PIN dibatasi **5 kali per 15 menit** per IP+tautan (`lib/rate-limit.ts`).

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

## 3. Titik sambung data PosPro (belum tersambung)

Penilaian kinerja saat ini bersumber dari dalam RateMyStaff saja: `Assessment` (template +
indikator berbobot) dan `Attendance`. PosPro (`/home/homelab/pos/pospro`, NestJS + Prisma +
MySQL) menyimpan data operasional yang bisa jadi **indikator objektif** per karyawan:

| Data di PosPro | Calon indikator |
|---|---|
| `CsRatingResponse` (rating pelanggan, punya `staffId`) | Kepuasan pelanggan per staf |
| `Transaction` (per kasir/`User`) | Jumlah & nilai transaksi, rata-rata nota |
| `ShiftReport` | Selisih kas saat tutup shift |
| `ProductionJob` / `JerseyWorkOrder` | Beban & ketepatan waktu order produksi |
| `ClickLog` / `MachineReject` | Volume cetak & tingkat reject mesin |
| `BonusTarget` / `BonusAdjustment` | Pencapaian target |
| Task board / piket | Kedisiplinan tugas rutin |

Yang perlu disiapkan saat integrasi dikerjakan:

1. **Pemetaan identitas** — `Employee.id` (RateMyStaff) ↔ `User.id` (PosPro). Paling aman
   lewat kolom pemetaan baru di `Employee`, bukan pencocokan nama.
2. **Cara ambil data** — dua pilihan:
   - **API PosPro**: tambah endpoint ringkas (`GET /reports/staff-kpi?from&to`) + token servis.
     Menjaga RateMyStaff tak bergantung pada skema internal PosPro. *(Disarankan.)*
   - **Baca DB langsung**: koneksi Prisma kedua (read-only) ke database PosPro. Lebih cepat
     dibuat, tapi RateMyStaff jadi ikut patah kalau skema PosPro berubah.
3. **Tempat menaruhnya** — KPI eksternal masuk sebagai indikator tambahan di
   `lib/services/portal/overview.ts` (kartu baru di tab Ringkasan/Penilaian), dan sebagai
   sumber skor otomatis untuk `AssessmentIndicator` bila ingin ikut menghitung grade.

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
| `tests/leave-range.test.ts`, `tests/portal-session.test.ts` | Unit test logika murni |
