<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AbsenceAnalysisSheet implements FromCollection, WithTitle, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function collection()
    {
        return collect($this->data);
    }

    public function title(): string
    {
        return 'Rekap Analisis Ketidakhadiran';
    }

    public function headings(): array
    {
        return [
            'Nama Karyawan',
            'Departemen',
            'Total Izin',
            'Total Sakit',
            'Total Cuti',
            'Total Alpha (Absent)',
            'Sering Terlambat (Kali)',
            'Total Terlambat (Menit)',
            'Total Lembur (Menit)'
        ];
    }

    public function map($row): array
    {
        return [
            $row['employee_name'],
            $row['department'] ?? '-',
            $row['izin'],
            $row['sakit'],
            $row['cuti'],
            $row['absent'],
            $row['late_count'],
            $row['total_late_minutes'],
            $row['total_overtime_minutes'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
