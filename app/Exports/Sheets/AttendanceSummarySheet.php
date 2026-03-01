<?php

namespace App\Exports\Sheets;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;

class AttendanceSummarySheet implements FromView, WithTitle
{
    protected $reportData;

    public function __construct(array $reportData)
    {
        $this->reportData = $reportData;
    }

    public function view(): View
    {
        return view('exports.attendance_summary', [
            'stats' => $this->calculateStats($this->reportData),
        ]);
    }

    public function title(): string
    {
        return 'Ringkasan'; // "Summary" in Indonesian
    }

    private function calculateStats(array $data): array
    {
        $stats = [
            'total_records' => count($data),
            'shift_averages' => [],
            'top_late' => [],
            'top_ontime' => [],
            'top_overtime' => [],
        ];

        if (empty($data))
            return $stats;

        $shiftData = [];

        foreach ($data as $row) {
            $shift = $row['shift']; // Exact name from system
            $empName = $row['employee_name'];

            if (!isset($employeeStats[$empName])) {
                $employeeStats[$empName] = [
                    'name' => $empName,
                    'late_count' => 0,
                    'ontime_count' => 0,
                    'overtime_total_mins' => 0,
                    'absence_score' => 0,
                    'department' => $row['department']
                ];
            }

            // Tally absences
            if (in_array($row['status'], ['Izin', 'Sakit', 'Cuti', 'Absent'])) {
                $employeeStats[$empName]['absence_score']++;
            }

            // Tally statuses (Ensure late_minutes counts them as late even if status says otherwise)
            if ($row['status'] === 'Late' || $row['late_minutes'] > 0) {
                $employeeStats[$empName]['late_count']++;
            } elseif (in_array($row['status'], ['Present', 'on_time']) && $row['late_minutes'] == 0) {
                $employeeStats[$empName]['ontime_count']++;
            }

            if ($row['overtime_minutes'] > 0) {
                $employeeStats[$empName]['overtime_total_mins'] += $row['overtime_minutes'];
            }

            // Gather times for averages based on dynamic shifts
            if (!in_array($shift, ['No Shift', '-'])) {
                if (!isset($shiftData[$shift])) {
                    $shiftData[$shift] = ['in' => [], 'out' => []];
                }
                if ($row['clock_in'] !== '-')
                    $shiftData[$shift]['in'][] = $this->timeToMinutes($row['clock_in']);
                if ($row['clock_out'] !== '-')
                    $shiftData[$shift]['out'][] = $this->timeToMinutes($row['clock_out']);
            }
        }

        foreach ($shiftData as $shiftName => $times) {
            $stats['shift_averages'][$shiftName] = [
                'in' => $this->averageTime($times['in']),
                'out' => $this->averageTime($times['out'])
            ];
        }

        // Sort for Top 5 Late
        $topLate = $employeeStats;
        usort($topLate, fn($a, $b) => $b['late_count'] <=> $a['late_count']);
        $stats['top_late'] = array_slice(array_filter($topLate, fn($e) => $e['late_count'] > 0), 0, 5);

        // Sort for Top 5 On Time
        $topOntime = $employeeStats;
        usort($topOntime, fn($a, $b) => $b['ontime_count'] <=> $a['ontime_count']);
        $stats['top_ontime'] = array_slice(array_filter($topOntime, fn($e) => $e['ontime_count'] > 0), 0, 5);

        // Sort for Top 5 Overtime
        $topOvertime = $employeeStats;
        usort($topOvertime, fn($a, $b) => $b['overtime_total_mins'] <=> $a['overtime_total_mins']);
        $stats['top_overtime'] = array_slice(array_filter($topOvertime, fn($e) => $e['overtime_total_mins'] > 0), 0, 5);

        // Sort for Top 5 Absences
        $topAbsence = $employeeStats;
        usort($topAbsence, fn($a, $b) => $b['absence_score'] <=> $a['absence_score']);
        $stats['top_absence'] = array_slice(array_filter($topAbsence, fn($e) => $e['absence_score'] > 0), 0, 5);

        return $stats;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        if (count($parts) < 2)
            return 0;
        return ((int) $parts[0] * 60) + (int) $parts[1];
    }

    private function averageTime(array $minutesArr): string
    {
        if (empty($minutesArr))
            return '-';
        $avg = array_sum($minutesArr) / count($minutesArr);
        $hours = floor($avg / 60);
        $mins = round($avg - ($hours * 60));
        return sprintf('%02d:%02d', $hours, $mins);
    }
}
