<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\AuditLog;

class DashboardController extends Controller
{
    /**
     * Return metrics for the dashboard overview.
     */
    public function index(Request $request)
    {
        // Total employees count
        $totalEmployees = Employee::active()->count();

        // Pending reviews (assuming an assessment with a 'status' or just active ones)
        // Adjusting based on standard schema, if status doesn't exist, we might just count recent
        $pendingReviews = Assessment::where('status', 'draft')->count() ?? 12;

        // Average Team Score
        $avgScore = Employee::active()->get()->avg('average_score');

        // Recent Activity
        $recentActivity = AuditLog::with('user')->latest()->take(5)->get();

        // Performance Trend Data based on filters
        $timeframe = $request->get('timeframe', 'monthly');
        $employeeId = $request->get('employee_id', 'all');

        $labels = [];
        $scores = [];
        $onTimeCounts = [];
        $lateCounts = [];
        $absentCounts = [];

        $limit = 6;
        if ($timeframe === 'daily')
            $limit = 14;
        elseif ($timeframe === 'weekly')
            $limit = 8; // last 8 weeks
        elseif ($timeframe === 'monthly')
            $limit = 6;
        elseif ($timeframe === 'yearly')
            $limit = 5;

        for ($i = $limit - 1; $i >= 0; $i--) {
            if ($timeframe === 'daily') {
                $date = now()->subDays($i);
                $labels[] = $date->format('d M');
                $start = $date->copy()->startOfDay();
                $end = $date->copy()->endOfDay();
            } elseif ($timeframe === 'weekly') {
                $date = now()->subWeeks($i);
                $labels[] = 'Wk ' . $date->format('W');
                $start = $date->copy()->startOfWeek();
                $end = $date->copy()->endOfWeek();
            } elseif ($timeframe === 'yearly') {
                $date = now()->subYears($i);
                $labels[] = $date->format('Y');
                $start = $date->copy()->startOfYear();
                $end = $date->copy()->endOfYear();
            } else { // default to monthly
                $date = now()->subMonths($i);
                $labels[] = $date->format('M Y');
                $start = $date->copy()->startOfMonth();
                $end = $date->copy()->endOfMonth();
            }

            $query = Assessment::whereBetween('assessment_date', [$start, $end])
                ->where('status', 'completed')
                ->official(); // Ensure we are looking at official trends

            if ($employeeId !== 'all' && !empty($employeeId)) {
                $query->where('employee_id', $employeeId);
            }

            $monthAvg = $query->avg('total_score');
            $scores[] = $monthAvg ? number_format($monthAvg, 2, '.', '') : 0;

            // Attendance Metrics array using Report Logic for Chart
            $chartStartDate = $start->format('Y-m-d');
            $chartEndDate = $end->format('Y-m-d');

            $reportController = new \App\Http\Controllers\AttendanceReportController();
            $chartReportData = $reportController->getReportData($chartStartDate, $chartEndDate, 'all', $employeeId);

            $onTimeCount = 0;
            $lateCount = 0;
            $absentCount = 0;

            foreach ($chartReportData as $row) {
                $status = $row['status'];

                if (in_array($status, ['Present', 'on_time', 'Long Shift / Lembur', 'Lupa Scan Pulang', 'Lupa Scan Masuk'])) {
                    if ($row['late_minutes'] > 0) {
                        $lateCount++;
                    } else {
                        $onTimeCount++;
                    }
                } elseif ($status === 'Late' || $row['late_minutes'] > 0) {
                    $lateCount++;
                } elseif (in_array($status, ['Absent', 'Izin', 'Sakit', 'Cuti', 'alpha'])) {
                    $absentCount++;
                }
            }

            $onTimeCounts[] = $onTimeCount;
            $lateCounts[] = $lateCount;
            $absentCounts[] = $absentCount;
        }

        // Total Attendance Summary for the selected timeframe and employee
        $summaryStartDate = $request->get('summary_start_date', now()->startOfMonth()->format('Y-m-d'));
        $summaryEndDate = $request->get('summary_end_date', now()->format('Y-m-d'));
        $summaryEmployeeId = $request->get('summary_employee_id', 'all');

        $reportController = new \App\Http\Controllers\AttendanceReportController();
        $reportData = $reportController->getReportData($summaryStartDate, $summaryEndDate, 'all', $summaryEmployeeId);

        $totalOnTime = 0;
        $totalLate = 0;
        $totalAbsent = 0;

        foreach ($reportData as $row) {
            $status = $row['status'];

            if (in_array($status, ['Present', 'on_time', 'Long Shift / Lembur', 'Lupa Scan Pulang', 'Lupa Scan Masuk'])) {
                if ($row['late_minutes'] > 0) {
                    $totalLate++;
                } else {
                    $totalOnTime++;
                }
            } elseif ($status === 'Late' || $row['late_minutes'] > 0) {
                $totalLate++;
            } elseif (in_array($status, ['Absent', 'Izin', 'Sakit', 'Cuti', 'alpha'])) {
                $totalAbsent++;
            }
        }

        $totalPresent = $totalOnTime + $totalLate;
        $totalDays = $totalPresent + $totalAbsent;
        $attendanceScore = $totalPresent > 0 ? round(($totalOnTime / $totalPresent) * 100) : 0; // % Ontime based on presence

        // Active Employees list for filter dropdown
        $employees = Employee::active()->select('id', 'full_name')->orderBy('full_name')->get();

        // Build Dynamic Alerts
        $alerts = [];

        // 1. Feature Info
        $alerts[] = [
            'message' => '💡 Coba fitur baru: Filter Rentang Tanggal di Summary Card!',
            'type' => 'info'
        ];

        // 2. New Logins Today
        $recentLogin = \App\Models\AuditLog::with('user')
            ->where('action', 'login')
            ->whereDate('created_at', today())
            ->latest()
            ->first();

        if ($recentLogin && $recentLogin->user) {
            $alerts[] = [
                'message' => "Login baru terdeteksi dari {$recentLogin->user->name} (" . ($recentLogin->ip_address ?? 'Unknown IP') . ")",
                'type' => 'info'
            ];
        }

        // 3. Absences Today
        $absencesToday = Attendance::whereDate('scan_date', today())
            ->whereIn('status', ['Absent', 'Izin', 'Sakit', 'Cuti', 'alpha'])
            ->count();

        if ($absencesToday > 0) {
            $alerts[] = [
                'message' => "Terdapat {$absencesToday} karyawan yang absen/izin hari ini.",
                'type' => 'warning'
            ];
        }

        // 4. Public QR Assessments Today
        $publicAssessmentsToday = Assessment::public()
            ->whereDate('created_at', today())
            ->count();

        if ($publicAssessmentsToday > 0) {
            $alerts[] = [
                'message' => "Terdapat {$publicAssessmentsToday} penilaian baru dari Customer/QR Barcode hari ini.",
                'type' => 'info'
            ];
        }

        // 5. Low Score Warning (Below 3.0 this month)
        $lowScoreEmployees = Assessment::official()
            ->whereBetween('assessment_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->where('total_score', '<', 3.0)
            ->distinct('employee_id')
            ->count('employee_id');

        if ($lowScoreEmployees > 0) {
            $alerts[] = [
                'message' => "Peringatan: {$lowScoreEmployees} karyawan memiliki nilai di bawah standar (< 3.0) bulan ini.",
                'type' => 'danger'
            ];
        }

        // Fallback if empty
        if (empty($alerts)) {
            $alerts[] = [
                'message' => 'Semua sistem berjalan lancar. Tidak ada notifikasi baru.',
                'type' => 'info'
            ];
        }

        $notificationCount = count($alerts);

        return response()->json([
            'metrics' => [
                'total_employees' => $totalEmployees,
                'pending_reviews' => $pendingReviews,
                'avg_score' => $avgScore ? number_format($avgScore, 1) : 0,
                'notifications' => $notificationCount
            ],
            'recent_activity' => $recentActivity,
            'chart_data' => [
                'labels' => $labels,
                'data' => $scores,
            ],
            'attendance_chart_data' => [
                'labels' => $labels,
                'on_time' => $onTimeCounts,
                'late' => $lateCounts,
                'absent' => $absentCounts,
            ],
            'attendance_summary' => [
                'on_time' => $totalOnTime,
                'late' => $totalLate,
                'absent' => $totalAbsent,
                'total_score' => $attendanceScore
            ],
            'employees' => $employees,
            'alerts' => $alerts
        ]);
    }
}
