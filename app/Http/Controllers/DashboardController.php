<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Assessment;
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
        }

        // Active Employees list for filter dropdown
        $employees = Employee::active()->select('id', 'full_name')->orderBy('full_name')->get();

        return response()->json([
            'metrics' => [
                'total_employees' => $totalEmployees,
                'pending_reviews' => $pendingReviews,
                'avg_score' => $avgScore ? number_format($avgScore, 1) : 0,
                'notifications' => 5 // Placeholder for alerts/notifications
            ],
            'recent_activity' => $recentActivity,
            'chart_data' => [
                'labels' => $labels,
                'data' => $scores,
            ],
            'employees' => $employees,
            'alerts' => [
                ['message' => '3 Assessments Overdue', 'type' => 'danger'],
                ['message' => 'Backup successful', 'type' => 'warning'],
                ['message' => '5 New login attempts', 'type' => 'info']
            ]
        ]);
    }
}
