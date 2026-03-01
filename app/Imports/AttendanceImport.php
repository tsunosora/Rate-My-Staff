<?php

namespace App\Imports;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class AttendanceImport implements ToCollection, WithHeadingRow
{
    /**
     * @param Collection $rows
     */
    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            // Flexible matching for PIN
            $pin = $row['pin'] ?? $row['kode_karyawan'] ?? $row['nik'] ?? null;

            // Avoid empty rows
            if (empty($pin)) {
                continue;
            }

            // Optional: trim or cast to string
            $pin = (string) $pin;

            $employee = Employee::where('employee_code', $pin)->first();
            if (!$employee) {
                continue; // Skip if employee not found
            }

            $tanggal = $row['tanggal'] ?? $row['date'] ?? null;
            $masuk = $row['jam_masuk'] ?? $row['scan_masuk'] ?? $row['masuk'] ?? null;
            $keluar = $row['jam_keluar'] ?? $row['scan_keluar'] ?? $row['pulang'] ?? $row['jam_pulang'] ?? null;

            if (empty($tanggal) || empty($masuk)) {
                continue; // Need at least date and check-in time
            }

            // Format date (handling Excel numeric dates or standard strings)
            $parsedDate = $this->parseDate($tanggal);
            if (!$parsedDate)
                continue;

            $dateStr = $parsedDate->format('Y-m-d');

            // Format Check-in Time
            $parsedMasuk = $this->parseTime($masuk);
            $checkInDateTime = Carbon::parse($dateStr . ' ' . $parsedMasuk);

            // Create check-in record
            Attendance::firstOrCreate([
                'employee_id' => $employee->id,
                'scan_date' => $checkInDateTime,
                'scan_type' => 'in',
            ], [
                'machine_name' => 'Excel Import',
                'status' => $this->calculateStatus($checkInDateTime),
                'late_minutes' => $this->calculateLateMinutes($checkInDateTime)
            ]);

            // Create check-out record if provided
            if (!empty($keluar)) {
                $parsedKeluar = $this->parseTime($keluar);
                $checkOutDateTime = Carbon::parse($dateStr . ' ' . $parsedKeluar);
                Attendance::firstOrCreate([
                    'employee_id' => $employee->id,
                    'scan_date' => $checkOutDateTime,
                    'scan_type' => 'out',
                ], [
                    'machine_name' => 'Excel Import',
                    'status' => 'on_time',
                    'late_minutes' => 0
                ]);
            }
        }
    }

    public function parseDate($value)
    {
        try {
            if (is_numeric($value)) {
                return Carbon::instance(Date::excelToDateTimeObject($value));
            }
            return Carbon::parse($value);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function parseTime($value)
    {
        try {
            if (is_numeric($value)) {
                // Time as fraction of day (e.g. 0.5 = 12:00:00)
                $hours = floor($value * 24);
                $minutes = floor(($value * 24 - $hours) * 60);
                $seconds = floor((($value * 24 - $hours) * 60 - $minutes) * 60);
                return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
            }
            // Ensure format H:i or H:i:s, but usually Carbon handles it well if it's like "08:00"
            // Returning the string works for Carbon::parse
            return $value;
        } catch (\Exception $e) {
            return '00:00:00';
        }
    }

    private function calculateStatus(Carbon $scanDate)
    {
        // Simple logic: if after 08:00 AM, marked as late
        if ($scanDate->format('H:i') > '08:00') {
            return 'late';
        }
        return 'on_time';
    }

    private function calculateLateMinutes(Carbon $scanDate)
    {
        if ($scanDate->format('H:i') > '08:00') {
            $expectedTime = $scanDate->copy()->setTime(8, 0, 0);
            return $scanDate->diffInMinutes($expectedTime);
        }
        return 0;
    }
}
