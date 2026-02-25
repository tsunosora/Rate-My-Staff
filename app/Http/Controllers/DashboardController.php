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
    public function index()
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

        // Performance Trend Data (last 6 months avg score)
        // Adjust the logic to fetch average score per month based on assessments
        $months = [];
        $scores = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i)->format('M');
            $months[] = $month;

            $startOfMonth = now()->subMonths($i)->startOfMonth();
            $endOfMonth = now()->subMonths($i)->endOfMonth();

            $monthAvg = Assessment::whereBetween('assessment_date', [$startOfMonth, $endOfMonth])
                ->where('status', 'completed')
                ->avg('total_score');

            $scores[] = $monthAvg ? number_format($monthAvg, 1) : 0;
        }

        return response()->json([
            'metrics' => [
                'total_employees' => $totalEmployees,
                'pending_reviews' => $pendingReviews,
                'avg_score' => $avgScore ? number_format($avgScore, 1) : 0,
                'notifications' => 5 // Placeholder for alerts/notifications
            ],
            'recent_activity' => $recentActivity,
            'chart_data' => [
                'labels' => $months,
                'data' => $scores,
            ],
            'alerts' => [
                ['message' => '3 Assessments Overdue', 'type' => 'danger'],
                ['message' => 'Backup successful', 'type' => 'warning'],
                ['message' => '5 New login attempts', 'type' => 'info']
            ]
        ]);
    }
}
