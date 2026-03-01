# Employee Assessment Admin Dashboard

A comprehensive web-based employee performance assessment system built with Laravel 10, Vue.js 3, and Tailwind CSS. This application allows companies to evaluate and manage employee performance with features including role-based access control, import/export functionality, PDF/Excel report generation, and mobile-responsive design.

## Features

### Core Features
- **User Authentication & Role-Based Access Control** - Secure login with roles (Admin, Evaluator, HR, Owner)
- **Employee Management** - Full CRUD operations for employee records with photo uploads
- **Assessment Templates** - Three pre-configured templates (Customer Service, Operator, Designer) with weighted indicators
- **Single & Bulk Assessment Entry** - Flexible scoring interface with real-time calculations
- **Import/Export Wizard** - Support for CSV, Excel, and JSON formats with column mapping
- **Report Generation** - PDF and Excel exports with multiple report types
- **Historical Analytics** - Chart.js integration for performance tracking over time
- **Email Notifications** - Configurable SMTP settings for automated notifications
- **Mobile Responsive** - Optimized for desktop and mobile devices

### User Roles & Permissions
- **Admin** - Full access to all features including user management
- **Evaluator** - Can create and manage assessments
- **HR** - Can view reports, export data, and manage employees
- **Owner** - Full access with additional system settings

## Tech Stack

### Backend
- **PHP 8.1+** with Laravel 10
- **MySQL 5.7+** for database
- **Laravel Fortify** for authentication
- **Spatie Laravel Permission** for RBAC
- **Maatwebsite Excel** for import/export
- **Barryvdh Laravel DomPDF** for PDF generation

### Frontend
- **Vue.js 3** with Composition API
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **Axios** for HTTP requests
- **Font Awesome** for icons

## Installation

### Prerequisites
- PHP 8.1 or higher
- Composer
- MySQL 5.7 or higher
- Node.js & NPM (optional, for asset building)

### Step 1: Clone and Install Dependencies
```bash
cd employee-assessment
composer install
```

### Step 2: Environment Configuration
```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` file with your database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=employee_assessment
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Step 3: Database Setup
```bash
php artisan migrate
php artisan db:seed
```

### Step 4: Storage Link
```bash
php artisan storage:link
```

### Step 5: Configure Queue (Optional)
For background processing of imports/exports, configure your queue driver in `.env`:
```env
QUEUE_CONNECTION=database
```

Run the queue worker:
```bash
php artisan queue:work
```

## Default Login Credentials

After seeding, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@voliko.com | password |
| Evaluator | evaluator@voliko.com | password |
| HR | hr@voliko.com | password |
| Owner | owner@voliko.com | password |

## Directory Structure

```
employee-assessment/
├── app/
│   ├── Http/
│   │   └── Controllers/    # Application controllers
│   ├── Models/             # Eloquent models
│   ├── Repositories/       # Repository pattern implementation
│   ├── Services/           # Business logic services
│   └── ...
├── config/                 # Configuration files
├── database/
│   ├── migrations/         # Database migrations
│   └── seeders/            # Database seeders
├── resources/
│   └── views/              # Blade templates
├── routes/
│   ├── web.php             # Web routes
│   └── api.php             # API routes
└── public/                 # Public assets
```

## Assessment Templates

### 1. Customer Service Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 15% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Komunikasi | Komunikasi verbal | 15% |
| Komunikasi | Komunikasi tertulis | 10% |
| Pelayanan | Sikap pelayanan | 20% |
| Pelayanan | Penyelesaian masalah | 20% |
| Kerjasama | Kerjasama tim | 10% |

### 2. Operator Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 15% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Teknis | Penguasaan mesin | 25% |
| Teknis | Kualitas produksi | 20% |
| Produktivitas | Target harian | 20% |
| Kerjasama | Kerjasama tim | 10% |

### 3. Designer Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 10% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Kreativitas | Ide dan konsep | 20% |
| Kreativitas | Inovasi desain | 15% |
| Teknis | Penguasaan tools | 20% |
| Teknis | Kualitas desain | 15% |
| Kerjasama | Kerjasama tim | 10% |

## Scoring System

Scores are entered on a scale of 1-5 for each indicator:
- 1 = Sangat Kurang
- 2 = Kurang
- 3 = Cukup
- 4 = Baik
- 5 = Sangat Baik

The weighted score is calculated as: `(Score × Weight) / 100`

### Grade Classification
- **Sangat Baik**: 4.50 - 5.00
- **Baik**: 3.50 - 4.49
- **Cukup**: 2.50 - 3.49
- **Kurang**: 1.50 - 2.49
- **Sangat Kurang**: 1.00 - 1.49

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /password/reset` - Request password reset

### Employees
- `GET /employees` - List all employees
- `POST /employees` - Create new employee
- `GET /employees/{id}` - Get employee details
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Delete employee

### Assessments
- `GET /assessments` - List all assessments
- `POST /assessments` - Create new assessment
- `POST /assessments/bulk` - Bulk create assessments
- `GET /assessments/{id}` - Get assessment details
- `GET /assessments/{id}/pdf` - Download assessment PDF

### Reports
- `GET /reports/employee/{id}` - Employee report
- `GET /reports/mass` - Mass assessment report
- `GET /reports/detailed` - Detailed report

### Import/Export
- `POST /import/employees` - Import employees
- `POST /import/assessments` - Import assessments
- `GET /export/template/{type}` - Download template

## Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

Key mobile optimizations:
- Collapsible sidebar navigation
- Card-based layouts for data tables
- Touch-friendly controls (minimum 48px tap targets)
- Horizontal scrolling for wide tables
- Optimized form inputs

## Security Features

- CSRF protection on all forms
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention via Eloquent ORM
- XSS protection with output escaping
- HTTPS enforcement ready
- Secure session management

## Deployment

### Shared Hosting Deployment

1. Upload all files to your hosting (excluding `node_modules` and `vendor` if using FTP)
2. Run `composer install` on the server (if SSH access available)
3. Configure `.env` with production database credentials
4. Set `APP_ENV=production` and `APP_DEBUG=false`
5. Configure your web server to point to the `public` directory
6. Run migrations: `php artisan migrate`
7. Set proper permissions:
   ```bash
   chmod -R 755 storage
   chmod -R 755 bootstrap/cache
   ```

### Apache Configuration (.htaccess)
The included `.htaccess` file handles:
- URL rewriting to `public/index.php`
- GZIP compression
- Browser caching
- Security headers

## Troubleshooting

### Common Issues

**Issue**: 500 Internal Server Error
- Check file permissions on `storage` and `bootstrap/cache`
- Verify `.env` file exists and is readable
- Check Laravel logs in `storage/logs`

**Issue**: CSS/JS not loading
- Ensure `APP_URL` in `.env` matches your domain
- Check that `public` directory is web root
- Clear cache: `php artisan cache:clear`

**Issue**: File upload fails
- Check `upload_max_filesize` in PHP settings
- Verify `storage/app/public` is writable
- Ensure symlink exists: `php artisan storage:link`

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact your system administrator or development team.

---

**Voliko Employee Assessment System** - Built with Laravel & Vue.js

---

# Dokumentasi Sistem RateMyStaff (HR & Attendance System)

**RateMyStaff** adalah aplikasi manajemen SDM (Sumber Daya Manusia) dan Sistem Kehadiran (Attendance System) berbasis web yang dirancang khusus untuk memonitor kedisiplinan, mengelola ketidakhadiran, menghitung lembur secara dinamis, dan memberikan laporan analitik kehadiran yang komprehensif.

Berikut adalah dokumentasi lengkap dari seluruh fitur yang tersedia di dalam aplikasi.

---

## 1. Modul Dashboard (Beranda)
Halaman pertama yang dilihat oleh Admin atau HR, memberikan ringkasan (Overview) harian:
*   **Today's Overview**: Menampilkan total karyawan yang Present (Hadir), Late (Terlambat), Absent (Tidak Hadir), dan Total Karyawan Aktif pada hari itu.
*   **Attendance Summary**: Grafik batang/pie chart rekap kehadiran bulan berjalan.
*   **Recent Latecomers**: Daftar 5 karyawan terakhir yang datang terlambat beserta durasi keterlambatannya (dalam menit) untuk penindakan instan.

## 2. Modul Employee Management (Data Karyawan)
Sistem penyimpanan data profil karyawan perusahaan.
*   **CRUD Karyawan**: Menambah, mengedit, dan menghapus (soft-delete) data karyawan.
*   **Organisasi**: Menghubungkan karyawan dengan **Department** (Departemen), **Position** (Jabatan), dan **Work Schedule** (Jadwal Kerja khusus).
*   **Status Karyawan (Is Active)**: Kemampuan menonaktifkan karyawan yang sudah *Resign*. Karyawan Resign tidak akan dihitung di Dashboard atau Report, namun historinya tetap tersimpan.
*   **Smart Identifier**: Setiap karyawan memiliki `employee_code` unik dan NIP untuk mempermudah sinkronisasi dengan Mesin Absen (Fingerspot).

## 3. Modul Attendance Management (Manajemen Kehadiran)
Inti dari mesin pemrosesan waktu kerja karyawan. Aplikasi ini memisahkan raw data dari mesin dengan data yang sudah diverifikasi HR.

### A. Excel Import Engine (Upload Data Fingerspot)
Fitur parser pintar untuk membaca file Excel (XLS/XLSX/HTML/CSV) yang di-export dari mesin absen Fingerspot (atau merek lain):
*   **Auto Data Clean-up**: Membersihkan karakter aneh, blank spaces, dan format korup bawaan mesin.
*   **Smart Name Matching**: Mencocokkan nama di mesin yang sering salah eja (typo) ke database Karyawan menggunakan *Loose Name Matching* dan NIP/PIN.
*   **Employee Mapping**: Jika ada nama baru dari mesin yang tidak dikenal, HR dapat melakukan "Mapping" (mencocokkan ke karyawan yang ada) atau "Create New".

### B. Smart Scan Analyzer (Deteksi Anomali)
Saat meng-import, mesin penganalisa akan mendeteksi:
*   **Double Scan**: Jika karyawan scan 2x dalam waktu berdekatan (< 60 menit), sistem akan membuang salah satunya.
*   **Lupa Scan (Missing Scan)**: Jika karyawan hanya ada Jam Masuk tapi tidak ada Jam Pulang, sistem memberikan notifikasi *Warning*.
*   **Bulk Resolution System**: Saat ada *Missing Scan*, HR bisa langsung memilih secara massal (Bulk) apa alasannya:
    *   *Set as Long Shift* (Langsung terhitung kerja ekstra panjang).
    *   *Set as Lupa Scan* (Otomatis mendeteksi apakah yang lupa itu scan masuk atau pulang berdasarkan Work Schedule).

### C. Manual Attendance (Input Manual)
Bagi karyawan yang dinas luar atau lupa bawa ID Card, HR bisa memasukkan Jam Masuk dan Pulang secara spesifik ke kalender karyawan lewat UI.

### D. Leave Request (Form Izin Publik)
Alih-alih HR menginput satu-satu ketidakhadiran:
*   HR dapat meng-klik **"Generate Leave Link"**.
*   Sistem membuat URL publik (token unik) yang aktif 24 jam.
*   Link ini disebar ke grup WhatsApp karyawan. Karyawan yang sakit/izin/cuti bisa membuka link tersebut di HP mereka tanpa perlu login, lalu mengisi Form Izin.
*   Data izin langsung masuk ke kalender absen sistem.

---

## 4. Modul Smart Overtime Engine (Mesin Lembur)
Sistem RateMyStaff memiliki kalkulator hitungan rupiah lembur yang sangat *Customizable* (bisa dikustomisasi bebas tiap perusahaan).

*   **Overtime Categories**: Anda bisa membuat sebanyak mungkin Kategori Lembur di menu *Settings*. Contoh:
    *   *Lembur Longshif* (Tipe: Flat Rp 30.000)
    *   *Lembur Cetak* (Tipe: Hourly / Per-Jam Rp 5.000)
    *   *Lembur Libur* (Tipe: Flat Rp 50.000)
*   **Auto-Detection**: 
    1. Jika nama Shift mengandung kata "Long Shif", sistem otomatis memanggil Kategori "Long Shift" dan mengisi angkanya.
    2. Jika hari tersebut adalah hari Minggu (dan di-*setting* Hari Libur), sistem langsung memosisikan rekapan ke "Lembur Libur".
*   **HR Verification Workflow**: Lembur tidak mentah-mentah disahkan oleh mesin. HR bisa mengklik "Edit" pada hari tersebut, lalu merubah/menyesuaikan *Approved Category* dan *Approved Minutes* yang disepakati.

---

## 5. Modul Reporting & Analytics (Laporan Akhir)
Hasil dari pengolahan data absen, izin, dan lembur untuk eksekusi Payroll (Penggajian).

### A. Detailed Attendance Report (Tampilan Web)
*   Tabel filterable berdasarkan Tanggal, Department, Status (Present/Late/Absent/Long Shift), dan spesifik 1 Karyawan.
*   Status warna-warni yang deskriptif.

### B. Export Laporan PDF & Excel (Reguler)
*   **Generate PDF**: Dokumen A4 Landscape siap cetak berisi Analisis Kedisiplinan Karyawan (Top 5 Paling Rajin, Top 5 Paling Sering Terlambat/Bolos, Rekap Total Telat).
*   **Generate Excel**: Rekapan Spreadsheet matriks per baris yang memudahkan copy-paste untuk tim Finance.

### C. Export Slip Lembur Khusus (Excel)
Tiruan persis dari *Mockup Excel Payroll* manual perusahaan HR:
*   Berisi matriks absen harian 1 Karyawan khusus selama sebulan.
*   Kolom-kolom Kategori Lembur (Misal: LONG SHIF, CETAK, LIBUR) ter-*generate* dinamis di header secara horizontal.
*   Otomatis mencentang angka "1" di bawah kolom yang tepat ketika Auto-Detect / Verifikasi menyala.
*   **Rekapitulasi Gaji (Footer)**: Secara matematis menghitung Total Hari Lembur dikali Rate (Rp) masing-masing kategori, menghasilkan **Grand Total Rupiah** yang wajib dibayarkan ke karyawan bulan itu.

---

## 6. Modul Settings (Pengaturan Inti)
Aplikasi bersifat fleksibel dan parameternya dapat diubah oleh Administrator.

*   **Work Schedules (Jam Kerja)**: Tempat mendefinisikan Jadwal (Contoh: *Shift Pagi* jam 08:00 - 16:00). Anda dapat mengatur Toleransi Keterlambatan (*Late Tolerance*), misal 15 menit. Jika datang 08:10, tidak dianggap telat (0 menit).
*   **Departments & Roles**: Pengaturan klasifikasi Divisi.
*   **Holidays**: Penandaan tanggal merah massal di kalender.
*   **General Settings**: Pengaturan format jam dan parameter Auto-Sunday Holiday.

---
*Dokumen ini merupakan referensi teknis dan konseptual dari Sistem RateMyStaff.*
