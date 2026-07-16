# Fingerspot Direct-IP Attendance Pull — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Menambahkan kemampuan menarik data scan absensi **langsung dari mesin Fingerspot melalui alamat IP mesin di jaringan lokal (LAN)**, sebagai alternatif dari integrasi Cloud API (`api.fingerspot.io`) yang sudah ada.

**Architecture:** Mesin Fingerspot seri Revo berbasis hardware ZKTeco dan mengekspos protokol biner ZK melalui **UDP/TCP port 4370**. Kita membangun `FingerspotDeviceService` baru yang terhubung ke `IP:4370`, menarik log absensi, menormalkannya ke bentuk yang sama dengan cloud, lalu memakai kembali logika mapping → tabel `attendances` yang sudah ada. Logika pemrosesan scanlog di-*refactor* keluar agar dipakai bersama oleh jalur cloud maupun jalur device.

**Tech Stack:** Laravel 11, PHP 8.2, service `App\Services\FingerspotService` (sudah ada, cloud), library PHP protokol ZK (device), Vue 3 (`resources/js/Pages/Attendance/Index.vue`), PHPUnit + Mockery.

---

## ⚠️ Konteks & Realitas Jaringan (BACA DULU — menentukan kelayakan)

Ini bukan detail sepele; ini penentu apakah fitur bisa jalan di lingkungan produksi:

1. **Yang sudah ada = Cloud, bukan device.** `app/Services/FingerspotService.php` menarik data via HTTP ke `https://api.fingerspot.io` (butuh `fingerspot_cloud_id` + `fingerspot_api_key` di tabel `settings`). File `api_guide.pdf` di repo adalah panduan **Cloud API SDK**, bukan protokol device-direct. Jadi tugas ini benar-benar jalur integrasi baru.

2. **Direct-IP hanya jalan bila server bisa "melihat" IP mesin.** Menarik data via IP mesin = koneksi socket ke `IP_mesin:4370`. Ini hanya berhasil jika proses PHP (web server / worker / scheduler) berada di **jaringan yang sama** dengan mesin, atau ada jalur (VPN / port-forward / tunnel) ke sana.
   - Kalau aplikasi di-host di **VPS (mis. Hostinger)** sedangkan mesin absensi ada di **LAN kantor** dengan IP privat (`192.168.x.x`), maka VPS **tidak bisa** menjangkau mesin secara langsung. Opsi: (a) jalankan aplikasi/worker di komputer dalam LAN kantor, (b) VPN site-to-site, (c) port-forward `4370` di router kantor (berisiko keamanan), atau (d) buat "bridge agent" kecil di LAN yang push ke server.
   - **→ Ini OPEN QUESTION #1 di bawah dan HARUS dikonfirmasi ke user sebelum Phase 2.**

3. **Konfirmasi protokol untuk unit spesifik.** Mayoritas Fingerspot Revo mendukung ZK/4370, tapi sebagian firmware hanya mendukung mode **Push/ADMS** (mesin yang meng-*upload* ke server, bukan ditarik). Phase 0 (spike) memvalidasi ini sebelum menulis kode produksi.

---

## Current Context / Assumptions

- Tabel `attendances` (`app/Models/Attendance.php`) fillable: `employee_id, scan_date, scan_type, machine_name, sn_machine, status, late_minutes, overtime_*`. Cast `scan_date => datetime`.
- Mapping mesin→karyawan: **PIN mesin dicocokkan dengan `employees.employee_code`** (lihat `FingerspotService::processScanlogs`).
- Konfigurasi disimpan via model `App\Models\Setting` (`Setting::get/set($key)`), key-value string.
- UI sync manual ada di `resources/js/Pages/Attendance/Index.vue`; endpoint `POST /api/attendances/sync` → `AttendanceController@sync`.
- **Asumsi kerja (konfirmasi via Open Questions):** server yang menjalankan pull berada satu LAN dengan mesin; mesin adalah Revo ZK-compatible port 4370; satu mesin dulu (multi-mesin = fase lanjutan).

## Proposed Approach

1. **Spike dulu** (Phase 0): buktikan koneksi & tarik 1 batch log dari IP mesin nyata sebelum menulis kode produksi. Jangan lewati — menghindari membangun di atas asumsi protokol yang salah.
2. **Refactor** logika `processScanlogs` menjadi normalizer bersama (`AttendanceScanlogMapper`) yang menerima array log ter-normalisasi (`pin, scan_date, machine_name, sn_machine`) → dipakai cloud & device. DRY.
3. **Bangun** `FingerspotDeviceService` (connect via IP → getAttendance → normalize → mapper).
4. **Ekspos** endpoint test-connection + pull, tambah field setting IP/port/SN, dan tombol di UI.
5. **Verifikasi** dengan unit test (Mockery, tanpa hardware) + uji manual ke mesin nyata.

---

## Phase 0 — Spike: Validasi Konektivitas & Protokol (WAJIB, sebelum kode produksi)

> Gunakan skill `spike`. Tujuan: bukti bahwa server bisa connect ke `IP:4370` dan menarik log. Kode spike dibuang setelah divalidasi.

### Task 0.1: Cek reachability jaringan ke mesin

**Objective:** Pastikan host yang menjalankan Laravel bisa menjangkau IP + port mesin.

**Step 1:** Dari mesin yang akan menjalankan pull, jalankan (ganti IP sesuai mesin):
```bash
ping -c 3 192.168.1.201
nc -vz -w 3 192.168.1.201 4370   # TCP probe; port 4370 = protokol ZK
```
**Expected:** ping membalas & port 4370 `open`/`succeeded`. Jika `timeout`/`refused` → **STOP**, selesaikan Open Question #1 (jaringan) dulu; fitur tidak bisa lanjut tanpa ini.

**Step 2:** Catat di plan ini hasilnya (IP, reachable ya/tidak, latency). Jika tidak reachable, eskalasi ke user.

### Task 0.2: Spike tarik log via library ZK (script sekali pakai)

**Objective:** Buktikan library bisa menarik data absensi nyata.

**Files:**
- Create (sementara, dibuang): `spikes/zk_pull_spike.php`

**Step 1:** Pasang kandidat library ZK (pilih satu yang maintained; verifikasi terhadap Revo):
```bash
composer require rats/zkteco
# Alternatif bila tak cocok: coding-libs/zkteco  atau  jmrashed/zkteco-laravel
```

**Step 2:** Tulis `spikes/zk_pull_spike.php`:
```php
<?php
require __DIR__ . '/../vendor/autoload.php';

use Rats\Zkteco\Lib\ZKTeco;

$ip = $argv[1] ?? '192.168.1.201';
$zk = new ZKTeco($ip, 4370);

if (!$zk->connect()) {
    fwrite(STDERR, "FAIL: tidak bisa connect ke {$ip}:4370\n");
    exit(1);
}

echo "Connected. Serial: " . ($zk->serialNumber() ?: 'n/a') . PHP_EOL;
$logs = $zk->getAttendance();       // ← struktur record yang HARUS kita catat
echo "Total records: " . count($logs) . PHP_EOL;
echo json_encode(array_slice($logs, 0, 3), JSON_PRETTY_PRINT) . PHP_EOL;

$zk->disconnect();
```

**Step 3:** Jalankan & catat bentuk record:
```bash
php spikes/zk_pull_spike.php 192.168.1.201
```
**Expected:** tercetak jumlah record + contoh. **Catat kunci array persisnya** (mis. `uid`, `id`/`pin`, `state`, `timestamp`, `type`) — ini menentukan normalizer di Phase 2/3. Beda library/firmware bisa beda nama field.

**Step 4:** Hapus spike setelah dipahami: `git rm -r --cached spikes/ 2>/dev/null; rm -rf spikes/`. Simpan temuan (nama field, format timestamp) sebagai catatan di bawah Open Questions.

**Gate:** Lanjut ke Phase 1 hanya jika Task 0.2 berhasil menarik record nyata.

---

## Phase 1 — Dependency & Konfigurasi Device

### Task 1.1: Kunci pilihan library ZK di composer

**Objective:** Jadikan library dari spike sebagai dependensi resmi.

**Files:**
- Modify: `composer.json` (bagian `require`)

**Step 1:** Pastikan library hasil spike terpasang & ter-commit di `composer.json`/`composer.lock` (mis. `"rats/zkteco": "^1.0"`).

**Step 2:** Verifikasi autoload:
```bash
composer dump-autoload
php artisan tinker --execute="echo class_exists(\Rats\Zkteco\Lib\ZKTeco::class) ? 'OK' : 'MISSING';"
```
**Expected:** `OK`.

**Step 3:** Commit.
```bash
git add composer.json composer.lock
git commit -m "chore: add ZK protocol library for direct-IP Fingerspot pull"
```

### Task 1.2: Definisikan key setting untuk device (IP/port/SN/timeout)

**Objective:** Sediakan sumber konfigurasi mesin lewat model `Setting` yang sudah ada (konsisten dengan `fingerspot_cloud_id`).

**Files:**
- Modify: `app/Http/Controllers/SettingController.php` (method `index` & `store`)

**Step 1:** Di `index()`, tambahkan blok `attendance` (atau blok baru `fingerspot_device`) yang mengembalikan:
```php
'fingerspot_device' => [
    'enabled'  => Setting::get('fp_device_enabled', 'false') === 'true',
    'ip'       => Setting::get('fp_device_ip', ''),
    'port'     => (int) Setting::get('fp_device_port', '4370'),
    'sn'       => Setting::get('fp_device_sn', ''),
    'name'     => Setting::get('fp_device_name', 'Mesin Utama'),
],
```

**Step 2:** Di `store()`, simpan dengan validasi:
```php
$validated = $request->validate([
    'fingerspot_device.ip'   => 'nullable|ip',
    'fingerspot_device.port' => 'nullable|integer|min:1|max:65535',
    'fingerspot_device.sn'   => 'nullable|string|max:100',
    'fingerspot_device.name' => 'nullable|string|max:100',
    'fingerspot_device.enabled' => 'nullable|boolean',
]);
if ($request->has('fingerspot_device')) {
    Setting::set('fp_device_enabled', $request->input('fingerspot_device.enabled') ? 'true' : 'false');
    Setting::set('fp_device_ip',   (string) $request->input('fingerspot_device.ip', ''));
    Setting::set('fp_device_port', (string) $request->input('fingerspot_device.port', '4370'));
    Setting::set('fp_device_sn',   (string) $request->input('fingerspot_device.sn', ''));
    Setting::set('fp_device_name', (string) $request->input('fingerspot_device.name', 'Mesin Utama'));
}
```

**Step 3:** Uji cepat:
```bash
php artisan tinker --execute="\App\Models\Setting::set('fp_device_ip','192.168.1.201'); echo \App\Models\Setting::get('fp_device_ip');"
```
**Expected:** `192.168.1.201`.

**Step 4:** Commit.
```bash
git add app/Http/Controllers/SettingController.php
git commit -m "feat: add Fingerspot device (IP) settings persistence"
```

---

## Phase 2 — Refactor: Normalizer Scanlog Bersama (DRY)

> Tujuan: satu tempat mengubah baris scanlog ter-normalisasi menjadi baris `attendances`, dipakai cloud & device. Hindari duplikasi logika mapping PIN→employee, penentuan in/out, late.

### Task 2.1: Tulis test untuk `AttendanceScanlogMapper`

**Objective:** Kunci perilaku mapping sebelum ekstraksi.

**Files:**
- Create: `tests/Unit/AttendanceScanlogMapperTest.php`

**Step 1:** Tulis test:
```php
<?php
namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Attendance;
use App\Services\AttendanceScanlogMapper;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AttendanceScanlogMapperTest extends TestCase
{
    use RefreshDatabase;

    public function test_maps_pin_to_employee_and_creates_attendance(): void
    {
        $emp = Employee::factory()->create(['employee_code' => '1001']);

        $logs = [[
            'pin' => '1001',
            'scan_date' => '2026-07-14 08:20:00',
            'machine_name' => 'Mesin Utama',
            'sn_machine' => 'ABC123',
        ]];

        $result = (new AttendanceScanlogMapper())->sync($logs);

        $this->assertSame(1, $result['synced']);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $emp->id,
            'scan_type'   => 'in',
            'sn_machine'  => 'ABC123',
        ]);
    }

    public function test_skips_unknown_pin_and_duplicate(): void
    {
        Employee::factory()->create(['employee_code' => '1001']);
        $logs = [
            ['pin' => '9999', 'scan_date' => '2026-07-14 08:00:00'],           // unknown → skip
            ['pin' => '1001', 'scan_date' => '2026-07-14 08:00:00'],           // ok
            ['pin' => '1001', 'scan_date' => '2026-07-14 08:00:00'],           // duplicate → skip
        ];
        $result = (new AttendanceScanlogMapper())->sync($logs);
        $this->assertSame(1, $result['synced']);
    }
}
```

**Step 2:** Jalankan → gagal (class belum ada).
```bash
php artisan test --filter=AttendanceScanlogMapperTest
```
**Expected:** FAIL — `Class "App\Services\AttendanceScanlogMapper" not found`.
> Jika `Employee::factory()` belum ada, buat `database/factories/EmployeeFactory.php` minimal (field wajib + `employee_code`) sebagai sub-langkah.

### Task 2.2: Ekstrak `AttendanceScanlogMapper` dari `FingerspotService`

**Objective:** Pindahkan `processScanlogs()` menjadi service mandiri yang reusable.

**Files:**
- Create: `app/Services/AttendanceScanlogMapper.php`
- Modify: `app/Services/FingerspotService.php:95-173`

**Step 1:** Buat `AttendanceScanlogMapper` dengan method publik `sync(array $normalizedLogs): array`, isinya **persis** logika `FingerspotService::processScanlogs` yang ada sekarang (preload `employee_code=>id`, tentukan in/out via jam, late 15 menit, cek duplikat `employee_id+scan_date`, `Attendance::create`, hitung `synced`). Terima input yang sudah ternormalisasi ke kunci `pin, scan_date (Y-m-d H:i:s), machine_name, sn_machine`.

**Step 2:** Di `FingerspotService`, ganti `processScanlogs()` menjadi delegasi:
```php
protected function processScanlogs($scanlogs)
{
    // Cloud API mengirim scan_date "Y-m-d H:i" → tambahkan detik agar konsisten
    $normalized = array_map(function ($log) {
        if (isset($log['scan_date']) && strlen($log['scan_date']) === 16) {
            $log['scan_date'] .= ':00';
        }
        return $log;
    }, is_array($scanlogs) ? $scanlogs : []);

    return app(\App\Services\AttendanceScanlogMapper::class)->sync($normalized);
}
```
> Catatan: normalisasi detik yang tadinya di dalam loop (`$log['scan_date'] . ':00'`) dipindah ke pemanggil karena mapper kini menerima `Y-m-d H:i:s` lengkap.

**Step 3:** Jalankan test.
```bash
php artisan test --filter=AttendanceScanlogMapperTest
```
**Expected:** PASS.

**Step 4:** Regresi cepat jalur cloud (pastikan tak ada yang rusak):
```bash
php artisan test
```
**Expected:** hijau (atau minimal tak ada regresi baru terkait attendance).

**Step 5:** Commit.
```bash
git add app/Services/AttendanceScanlogMapper.php app/Services/FingerspotService.php tests/Unit/AttendanceScanlogMapperTest.php
git commit -m "refactor: extract AttendanceScanlogMapper shared by cloud & device sync"
```

---

## Phase 3 — `FingerspotDeviceService` (tarik via IP)

### Task 3.1: Test service device dengan koneksi ZK di-mock

**Objective:** Uji normalisasi record device → mapper tanpa hardware (Mockery).

**Files:**
- Create: `tests/Unit/FingerspotDeviceServiceTest.php`

**Step 1:** Tulis test yang menyuntik double koneksi ZK. Desain `FingerspotDeviceService` agar objek ZK bisa di-*inject* (constructor menerima closure/factory `fn($ip,$port) => ZKTeco`), sehingga bisa di-mock:
```php
<?php
namespace Tests\Unit;

use Tests\TestCase;
use Mockery;
use App\Models\Employee;
use App\Services\FingerspotDeviceService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FingerspotDeviceServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_pulls_and_maps_device_attendance(): void
    {
        Employee::factory()->create(['employee_code' => '1001']);

        $zk = Mockery::mock();
        $zk->shouldReceive('connect')->once()->andReturnTrue();
        $zk->shouldReceive('serialNumber')->andReturn('SN-DEVICE-1');
        $zk->shouldReceive('getAttendance')->once()->andReturn([
            // Bentuk record SESUAIKAN dengan temuan spike Task 0.2:
            ['uid' => 1, 'id' => '1001', 'state' => 1, 'timestamp' => '2026-07-14 08:05:00', 'type' => 0],
        ]);
        $zk->shouldReceive('disconnect')->once();

        $svc = new FingerspotDeviceService(fn($ip, $port) => $zk);
        $result = $svc->pull('192.168.1.201', 4370, 'Mesin Utama');

        $this->assertSame(1, $result['synced']);
        $this->assertDatabaseHas('attendances', ['sn_machine' => 'SN-DEVICE-1']);
    }

    public function test_throws_when_connect_fails(): void
    {
        $zk = Mockery::mock();
        $zk->shouldReceive('connect')->once()->andReturnFalse();
        $svc = new FingerspotDeviceService(fn($ip, $port) => $zk);

        $this->expectException(\RuntimeException::class);
        $svc->pull('192.168.1.201', 4370, 'Mesin Utama');
    }

    protected function tearDown(): void { Mockery::close(); parent::tearDown(); }
}
```

**Step 2:** Jalankan → gagal (class belum ada).
```bash
php artisan test --filter=FingerspotDeviceServiceTest
```
**Expected:** FAIL — class not found.

### Task 3.2: Implementasi `FingerspotDeviceService`

**Objective:** Connect ke IP mesin, tarik log, normalisasi ke kunci mapper, delegasikan ke `AttendanceScanlogMapper`.

**Files:**
- Create: `app/Services/FingerspotDeviceService.php`

**Step 1:** Implementasi (sesuaikan nama field `getAttendance()` dgn temuan spike):
```php
<?php
namespace App\Services;

use Rats\Zkteco\Lib\ZKTeco;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class FingerspotDeviceService
{
    /** @var callable fn(string $ip, int $port): object ZK client */
    protected $factory;

    public function __construct(?callable $factory = null)
    {
        $this->factory = $factory ?? fn($ip, $port) => new ZKTeco($ip, $port);
    }

    /** Connect ke mesin via IP, tarik & simpan scanlog. */
    public function pull(string $ip, int $port = 4370, string $machineName = 'Mesin Utama'): array
    {
        $zk = ($this->factory)($ip, $port);

        if (!$zk->connect()) {
            throw new \RuntimeException("Gagal terhubung ke mesin {$ip}:{$port}. Cek jaringan/port 4370.");
        }

        try {
            $sn = method_exists($zk, 'serialNumber') ? ($zk->serialNumber() ?: 'Unknown SN') : 'Unknown SN';
            $raw = $zk->getAttendance() ?: [];
            $normalized = $this->normalize($raw, $machineName, $sn);
        } finally {
            $zk->disconnect();
        }

        Log::info("Fingerspot device pull {$ip}: " . count($normalized) . " records normalized.");
        return app(AttendanceScanlogMapper::class)->sync($normalized);
    }

    /** Ubah record mentah ZK → kunci yang dimengerti mapper. */
    protected function normalize(array $raw, string $machineName, string $sn): array
    {
        $out = [];
        foreach ($raw as $r) {
            $pin = (string) ($r['id'] ?? $r['pin'] ?? $r['user_id'] ?? '');
            $ts  = $r['timestamp'] ?? $r['scan_date'] ?? null;
            if ($pin === '' || !$ts) continue;

            $out[] = [
                'pin' => $pin,
                'scan_date' => Carbon::parse($ts)->format('Y-m-d H:i:s'),
                'machine_name' => $machineName,
                'sn_machine' => $sn,
            ];
        }
        return $out;
    }
}
```

**Step 2:** Jalankan test.
```bash
php artisan test --filter=FingerspotDeviceServiceTest
```
**Expected:** PASS (2 test).

**Step 3:** Commit.
```bash
git add app/Services/FingerspotDeviceService.php tests/Unit/FingerspotDeviceServiceTest.php
git commit -m "feat: FingerspotDeviceService pulls scanlogs directly from machine IP"
```

---

## Phase 4 — Endpoint API (test connection + pull)

### Task 4.1: Controller method `deviceTestConnection` & `deviceSync`

**Objective:** Ekspos aksi ke frontend memakai setting device.

**Files:**
- Modify: `app/Http/Controllers/AttendanceController.php` (tambah 2 method + use)
- Modify: `routes/web.php` (setelah baris 119)

**Step 1:** Tambah method di `AttendanceController`:
```php
use App\Services\FingerspotDeviceService;
use App\Models\Setting;

/** Uji koneksi ke mesin via IP tanpa menyimpan data. */
public function deviceTestConnection(FingerspotDeviceService $device)
{
    $ip = Setting::get('fp_device_ip');
    $port = (int) Setting::get('fp_device_port', '4370');
    if (!$ip) {
        return response()->json(['ok' => false, 'message' => 'IP mesin belum diatur di Pengaturan.'], 422);
    }
    try {
        // pull() ringan; untuk test murni bisa buat method connectOnly() bila perlu.
        $result = $device->pull($ip, $port, Setting::get('fp_device_name', 'Mesin Utama'));
        return response()->json(['ok' => true, 'message' => "Terhubung. {$result['synced']} record baru tersimpan."]);
    } catch (\Throwable $e) {
        return response()->json(['ok' => false, 'message' => $e->getMessage()], 502);
    }
}

/** Tarik data scan dari mesin via IP dan simpan. */
public function deviceSync(FingerspotDeviceService $device)
{
    $ip = Setting::get('fp_device_ip');
    $port = (int) Setting::get('fp_device_port', '4370');
    if (!$ip) {
        return response()->json(['message' => 'IP mesin belum diatur.'], 422);
    }
    try {
        $result = $device->pull($ip, $port, Setting::get('fp_device_name', 'Mesin Utama'));
        return response()->json($result);
    } catch (\Throwable $e) {
        return response()->json(['message' => 'Gagal tarik data: ' . $e->getMessage()], 502);
    }
}
```

**Step 2:** Tambah route (dalam grup ter-autentikasi yang sama dengan `attendances/sync`):
```php
Route::post('/api/attendances/device/test', [\App\Http\Controllers\AttendanceController::class, 'deviceTestConnection']);
Route::post('/api/attendances/device/sync', [\App\Http\Controllers\AttendanceController::class, 'deviceSync']);
```

**Step 3:** Verifikasi route terdaftar.
```bash
php artisan route:list | grep "attendances/device"
```
**Expected:** dua baris `device/test` & `device/sync`.

**Step 4:** Commit.
```bash
git add app/Http/Controllers/AttendanceController.php routes/web.php
git commit -m "feat: API endpoints to test & sync attendance from device IP"
```

---

## Phase 5 — UI: Konfigurasi IP & Tombol Tarik dari Mesin

### Task 5.1: Field IP mesin di halaman Settings

**Objective:** Admin bisa mengisi IP/port/nama mesin.

**Files:**
- Modify: `resources/js/Pages/Setting/*` (komponen settings; cari yang me-render blok `attendance`)

**Step 1:** Tambah section "Mesin Absensi (Direct IP)" dengan input `ip`, `port` (default 4370), `name`, toggle `enabled`, terikat ke objek `fingerspot_device` yang dikembalikan `SettingController@index`, dan dikirim saat submit ke `POST /api/settings`.

**Step 2:** Tambah tombol "Test Koneksi" → `axios.post('/api/attendances/device/test')`, tampilkan `message`.

**Step 3:** Build & cek tak ada error.
```bash
npm run build
```
**Expected:** build sukses.

### Task 5.2: Tombol "Tarik dari Mesin" di halaman Attendance

**Objective:** Trigger pull device dari UI absensi (mendampingi sync cloud yang sudah ada).

**Files:**
- Modify: `resources/js/Pages/Attendance/Index.vue`

**Step 1:** Tambah tombol "Tarik dari Mesin (IP)" → `axios.post('/api/attendances/device/sync')`, tampilkan jumlah `synced`, lalu refresh daftar absensi. Tampilkan hanya jika `fingerspot_device.enabled`.

**Step 2:** Build.
```bash
npm run build
```
**Expected:** build sukses.

**Step 3:** Commit.
```bash
git add resources/js/Pages
git commit -m "feat(ui): configure device IP and pull attendance from machine"
```

---

## Phase 6 — Sinkronisasi Terjadwal & Ketahanan (opsional, setelah manual terbukti)

### Task 6.1: Artisan command + schedule

**Objective:** Otomatis tarik berkala (hanya berguna bila server 1 LAN dgn mesin / ada tunnel).

**Files:**
- Create: `app/Console/Commands/PullFingerspotDevice.php`
- Modify: `routes/console.php` (atau `app/Console/Kernel.php` sesuai struktur Laravel 11)

**Step 1:** Command `php artisan fingerspot:pull-device` memanggil `FingerspotDeviceService::pull()` dengan setting; hormati `fp_device_enabled`; log hasil.

**Step 2:** Jadwalkan (mis. tiap 15 menit) di scheduler; jangan aktif jika `fp_device_enabled=false`.

**Step 3:** Uji manual.
```bash
php artisan fingerspot:pull-device
```
**Expected:** log jumlah record; jika mesin tak terjangkau → pesan error jelas, exit non-zero, tanpa crash.

**Step 4:** Commit.

---

## Files Likely to Change (ringkasan)

| Aksi | Path |
|------|------|
| Create | `app/Services/AttendanceScanlogMapper.php` |
| Create | `app/Services/FingerspotDeviceService.php` |
| Create | `tests/Unit/AttendanceScanlogMapperTest.php` |
| Create | `tests/Unit/FingerspotDeviceServiceTest.php` |
| Create | `app/Console/Commands/PullFingerspotDevice.php` (Phase 6) |
| Modify | `app/Services/FingerspotService.php` (delegasi ke mapper) |
| Modify | `app/Http/Controllers/AttendanceController.php` (device endpoints) |
| Modify | `app/Http/Controllers/SettingController.php` (setting device) |
| Modify | `routes/web.php` (2 route device) |
| Modify | `resources/js/Pages/Attendance/Index.vue`, `resources/js/Pages/Setting/*` |
| Modify | `composer.json` / `composer.lock` (library ZK) |
| Maybe | `database/factories/EmployeeFactory.php` (untuk test) |

## Tests / Validation

- Unit: `php artisan test --filter=AttendanceScanlogMapperTest`
- Unit: `php artisan test --filter=FingerspotDeviceServiceTest`
- Regresi penuh: `php artisan test`
- Route: `php artisan route:list | grep attendances/device`
- **Uji hardware nyata (wajib sebelum "selesai"):** dari server yang 1 LAN dgn mesin, klik "Test Koneksi" & "Tarik dari Mesin", verifikasi baris muncul di tabel `attendances` dengan `sn_machine` benar dan PIN terpetakan ke karyawan.

## Risks, Tradeoffs, Open Questions

**Risiko**
- **Jangkauan jaringan (terbesar):** server di VPS tak bisa menjangkau IP privat mesin. Mitigasi: jalankan pull di host LAN, VPN, atau bridge-agent. Cloud API (existing) tetap jadi fallback yang bekerja tanpa syarat jaringan ini.
- **Kompatibilitas protokol/firmware:** sebagian Revo hanya mode Push/ADMS. Divalidasi di Phase 0.
- **Ketidakcocokan nama field library** dgn `getAttendance()` → dikunci lewat temuan spike + `normalize()`.
- **Keamanan:** port-forward 4370 ke internet berisiko; hindari, utamakan VPN/host lokal.
- **Beban mesin:** `getAttendance()` menarik SEMUA log tiap kali; idempotensi dijaga oleh cek duplikat (`employee_id + scan_date`). Pertimbangkan `clearAttendance()` HANYA bila user setuju (menghapus log di mesin — berbahaya, jangan default).
- **Logika in/out & late** masih heuristik jam-12 & shift 08:00 hardcoded (warisan cloud). Di luar scope tugas ini; catat sebagai utang teknis (idealnya pakai `WorkSchedule`).

**Open Questions (konfirmasi ke user sebelum Phase 2)**
1. **Di mana aplikasi/worker berjalan relatif terhadap mesin?** Satu LAN, atau VPS terpisah? (Menentukan apakah direct-IP mungkin tanpa VPN/bridge.)
2. **Merek/seri & firmware mesin** — pastikan Revo ZK-compatible port 4370, bukan Push-only.
3. **IP statis?** Mesin sebaiknya ber-IP statis/DHCP-reservation agar setting stabil.
4. **Satu atau banyak mesin?** Plan ini mengasumsikan satu; multi-mesin = perluasan setting menjadi tabel `devices`.
5. **Direct-IP menggantikan atau mendampingi Cloud API** yang sudah ada?

**Catatan hasil Spike (isi setelah Phase 0):**
- Reachable ke `IP:4370`: ______
- Serial number terbaca: ______
- Bentuk record `getAttendance()` (kunci array): ______
- Format timestamp: ______
