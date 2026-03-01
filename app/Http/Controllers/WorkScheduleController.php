<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\WorkSchedule;

class WorkScheduleController extends Controller
{
    public function index()
    {
        $schedules = WorkSchedule::latest()->get();
        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'break_start_time' => 'nullable|date_format:H:i',
            'break_end_time' => 'nullable|date_format:H:i',
            'daily_wage' => 'numeric|min:0',
            'monthly_wage' => 'numeric|min:0',
            'weekly_wage' => 'numeric|min:0',
            'holiday_wage' => 'numeric|min:0',
            'overtime_wage_per_hour' => 'numeric|min:0',
            'is_holiday' => 'boolean',
            'late_tolerance_minutes' => 'nullable|integer|min:0'
        ]);

        $schedule = WorkSchedule::create($validated);

        return response()->json([
            'message' => 'Work schedule created successfully.',
            'data' => $schedule
        ]);
    }

    public function show(WorkSchedule $workSchedule)
    {
        return response()->json(['data' => $workSchedule]);
    }

    public function update(Request $request, WorkSchedule $workSchedule)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'break_start_time' => 'nullable|date_format:H:i',
            'break_end_time' => 'nullable|date_format:H:i',
            'daily_wage' => 'numeric|min:0',
            'monthly_wage' => 'numeric|min:0',
            'weekly_wage' => 'numeric|min:0',
            'holiday_wage' => 'numeric|min:0',
            'overtime_wage_per_hour' => 'numeric|min:0',
            'is_holiday' => 'boolean',
            'late_tolerance_minutes' => 'nullable|integer|min:0'
        ]);

        $workSchedule->update($validated);

        return response()->json([
            'message' => 'Work schedule updated successfully.',
            'data' => $workSchedule
        ]);
    }

    public function destroy(WorkSchedule $workSchedule)
    {
        // Check if attached to employees
        if ($workSchedule->employees()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete schedule because it is linked to employees.'
            ], 400);
        }

        $workSchedule->delete();
        return response()->json(['message' => 'Work schedule deleted successfully.']);
    }
}
