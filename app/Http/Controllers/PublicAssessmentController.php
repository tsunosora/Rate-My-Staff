<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Employee;
use Illuminate\Http\Request;

class PublicAssessmentController extends Controller
{
    /**
     * Show the public assessment form for a specific employee.
     * Returns JSON data for the Vue frontend.
     */
    public function getEmployeeInfo($publicToken)
    {
        $employee = Employee::where('public_token', $publicToken)->active()->with('position')->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee not found or inactive.'], 404);
        }

        return response()->json([
            'id' => $employee->id,
            'full_name' => $employee->full_name,
            'position' => $employee->position ? $employee->position->name : 'Staff',
            'photo_url' => $employee->photo_url,
        ]);
    }

    /**
     * Store the public assessment.
     */
    public function store(Request $request, $publicToken)
    {
        $employee = Employee::where('public_token', $publicToken)->active()->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee not found or inactive.'], 404);
        }

        $request->validate([
            'rater_name' => 'required|string|max:100',
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:1000',
        ]);

        $template = \App\Models\AssessmentTemplate::first();
        if (!$template) {
            return response()->json(['message' => 'System configuration error: No assessment templates found. Please create one in Admin Panel.'], 500);
        }

        // We use template_id = 1 as a fallback or create a generic empty structure
        // Since it's a simple 1-5 rating, we'll store it directly to total_score

        $assessment = new Assessment();
        $assessment->employee_id = $employee->id;
        $assessment->template_id = $template->id; // Updated this line
        $assessment->evaluator_id = null; // Anonymous evaluator
        $assessment->is_public = true; // Mark as public feedback
        $assessment->rater_name = $request->rater_name;
        $assessment->assessment_date = now()->format('Y-m-d');
        $assessment->total_score = $request->rating; // Directly using the 1-5 star rating
        $assessment->evaluator_notes = $request->feedback;
        $assessment->status = 'completed';

        // Force calculation of grade based on simple 1-5 value
        $assessment->grade = $this->determinePublicGrade($request->rating);
        $assessment->recommendation = 'Public feedback received.';

        $assessment->save();

        return response()->json([
            'message' => 'Assessment submitted successfully. Thank you for your feedback!'
        ], 201);
    }

    private function determinePublicGrade($rating)
    {
        if ($rating >= 4.5)
            return 'Sangat Baik';
        if ($rating >= 3.5)
            return 'Baik';
        if ($rating >= 2.5)
            return 'Cukup';
        if ($rating >= 1.5)
            return 'Kurang';
        return 'Sangat Kurang';
    }
}
