<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Employee;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Get summary data for the reports overview.
     */
    public function index(Request $request)
    {
        $query = Assessment::with(['employee', 'template'])->official();
        $this->applyFilters($query, $request);

        $assessments = $query->latest('assessment_date')->get();

        // Calculate summary statistics
        $totalAssessments = $assessments->count();
        $averageScore = $totalAssessments > 0 ? $assessments->avg('total_score') : 0;

        $highPerformers = $assessments->where('total_score', '>=', 4.0)->count();
        $needsImprovement = $assessments->where('total_score', '<', 3.0)->count();

        // Group by department for chart data
        $departmentScores = $assessments->groupBy(function ($item) {
            return ($item->employee && $item->employee->department) ? $item->employee->department->name : 'Unknown';
        })->map(function ($group) {
            return [
                'count' => $group->count(),
                'average' => round($group->avg('total_score'), 2)
            ];
        });

        // All assessments list (no limit)
        $recentList = $assessments->map(function ($assessment) {
            return [
                'id' => $assessment->id,
                'employee_id' => $assessment->employee_id,
                'employee_name' => $assessment->employee ? $assessment->employee->full_name : 'Unknown',
                'department' => ($assessment->employee && $assessment->employee->department) ? $assessment->employee->department->name : 'Unknown',
                'template_name' => $assessment->template ? $assessment->template->name : 'Unknown',
                'period' => $assessment->period,
                'score' => $assessment->total_score,
                'date' => $assessment->assessment_date,
            ];
        });

        // Fetch dropdown options for frontend
        $availablePeriods = Assessment::select('period')->distinct()->whereNotNull('period')->pluck('period');
        $availableDepartments = \App\Models\Department::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'summary' => [
                'total_assessments' => $totalAssessments,
                'average_score' => round($averageScore, 2),
                'high_performers' => $highPerformers,
                'needs_improvement' => $needsImprovement,
            ],
            'department_scores' => $departmentScores,
            'recent_assessments' => $recentList,
            'available_periods' => $availablePeriods,
            'available_departments' => $availableDepartments,
        ]);
    }

    /**
     * Get detailed assessment report for a specific employee.
     */
    public function employeeReport($employeeId)
    {
        $employee = Employee::with(['assessments.template', 'assessments.scores.indicator'])
            ->findOrFail($employeeId);

        return response()->json($employee);
    }

    /**
     * Export Reports to Excel
     */
    public function exportExcel(Request $request)
    {
        $query = Assessment::with(['employee.department', 'employee.position', 'template'])->official();
        $this->applyFilters($query, $request);

        $assessments = $query->latest('assessment_date')->get();

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ReportExport($assessments), 'reports.xlsx');
    }

    /**
     * Export Reports to PDF
     */
    public function exportPdf(Request $request)
    {
        $period = $request->get('period', 'all');
        $department = $request->get('department', 'all');
        $category = $request->get('performance_category', 'all');
        $search = $request->get('search', '');

        $query = Assessment::with(['employee.department', 'employee.position', 'template'])->official();
        $this->applyFilters($query, $request);

        $assessments = $query->latest('assessment_date')->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.reports', compact('assessments', 'period', 'department', 'category', 'search'));
        return $pdf->download('reports.pdf');
    }

    /**
     * Get a single assessment details for preview.
     */
    public function showAssessment($id)
    {
        $assessment = Assessment::with([
            'employee.department',
            'employee.position',
            'template',
            'scores.indicator',
            'evaluator'
        ])->findOrFail($id);

        // Load recent public feedbacks for this employee
        if ($assessment->employee) {
            $assessment->public_feedbacks = Assessment::public()
                ->where('employee_id', $assessment->employee_id)
                ->latest('assessment_date')
                ->take(5)
                ->get(['assessment_date', 'rater_name', 'total_score', 'evaluator_notes']);
        }

        return response()->json($assessment);
    }

    /**
     * Apply common filters to the assessment query.
     */
    private function applyFilters($query, Request $request)
    {
        $period = $request->get('period', 'all');
        $department = $request->get('department', 'all');
        $category = $request->get('performance_category', 'all');
        $search = $request->get('search');

        if ($period !== 'all') {
            $query->where('period', $period);
        }

        if ($department !== 'all') {
            $query->whereHas('employee', function ($q) use ($department) {
                $q->where('department_id', $department);
            });
        }

        if ($category !== 'all') {
            if ($category === 'high_performer') {
                $query->where('total_score', '>=', 4.0);
            } elseif ($category === 'average') {
                $query->whereBetween('total_score', [3.0, 3.99]);
            } elseif ($category === 'needs_improvement') {
                $query->where('total_score', '<', 3.0);
            }
        }

        if (!empty($search)) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('full_name', 'like', '%' . $search . '%');
            });
        }

        return $query;
    }
}
