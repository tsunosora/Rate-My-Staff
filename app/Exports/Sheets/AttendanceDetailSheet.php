<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceDetailSheet implements FromArray, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle
{
    protected $reportData;

    public function __construct(array $reportData)
    {
        $this->reportData = $reportData;
    }

    public function array(): array
    {
        return $this->reportData;
    }

    public function title(): string
    {
        return 'Data Detail';
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Nama Karyawan',
            'Departemen',
            'Sift',
            'Jam Masuk',
            'Jam Keluar',
            'Terlambat (Menit)',
            'Lembur (Menit)',
            'Keterangan Lembur',
            'Status'
        ];
    }

    public function map($row): array
    {
        return [
            $row['date'],
            $row['employee_name'],
            $row['department'],
            $row['shift'],
            $row['clock_in'],
            $row['clock_out'],
            $row['late_minutes'] > 0 ? $row['late_minutes'] : '-',
            $row['overtime_minutes'] > 0 ? $row['overtime_minutes'] : '-',
            $row['overtime_reason'] ?? '-',
            $row['status']
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF4A5568']]],
        ];
    }
}
