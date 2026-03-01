<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use App\Exports\Sheets\AbsenceAnalysisSheet;
use App\Exports\Sheets\AttendanceDetailSheet;

class AttendanceMergedExport implements WithMultipleSheets
{
    use Exportable;

    protected $reportData;
    protected $analysisData;

    public function __construct(array $reportData, $startDate, $endDate)
    {
        $this->reportData = $reportData;

        // Let's parse reportData down into Analysis Data since we already have the raw rows
        $this->analysisData = $this->aggregateAnalysis($reportData);
    }

    public function sheets(): array
    {
        return [
            new \App\Exports\Sheets\AttendanceSummarySheet($this->reportData),
            new AbsenceAnalysisSheet($this->analysisData),
            new AttendanceDetailSheet($this->reportData),
        ];
    }

    private function aggregateAnalysis(array $reportData)
    {
        $analysis = [];

        foreach ($reportData as $row) {
            $empId = $row['employee_id'];
            if (!isset($analysis[$empId])) {
                $analysis[$empId] = [
                    'employee_name' => $row['employee_name'],
                    'department' => $row['department'],
                    'izin' => 0,
                    'sakit' => 0,
                    'cuti' => 0,
                    'absent' => 0,
                    'late_count' => 0,
                    'total_late_minutes' => 0,
                    'total_overtime_minutes' => 0,
                    'total_score' => 0
                ];
            }

            if ($row['status'] === 'Izin')
                $analysis[$empId]['izin']++;
            elseif ($row['status'] === 'Sakit')
                $analysis[$empId]['sakit']++;
            elseif ($row['status'] === 'Cuti')
                $analysis[$empId]['cuti']++;
            elseif ($row['status'] === 'Absent')
                $analysis[$empId]['absent']++;

            if ($row['late_minutes'] > 0) {
                $analysis[$empId]['late_count']++;
                $analysis[$empId]['total_late_minutes'] += $row['late_minutes'];
            }
            if ($row['overtime_minutes'] > 0) {
                $analysis[$empId]['total_overtime_minutes'] += $row['overtime_minutes'];
            }
        }

        foreach ($analysis as $empId => &$data) {
            $data['total_score'] = ($data['absent'] * 3) + ($data['sakit'] * 2) + ($data['izin'] * 2) + $data['cuti'];
        }

        $analysisArray = array_values($analysis);
        usort($analysisArray, function ($a, $b) {
            if ($b['total_score'] === $a['total_score']) {
                return $b['late_count'] <=> $a['late_count'];
            }
            return $b['total_score'] <=> $a['total_score'];
        });

        return $analysisArray;
    }
}
