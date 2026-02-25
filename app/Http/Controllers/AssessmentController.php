<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\AssessmentTemplate;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssessmentController extends Controller
{
    /**
     * Get a list of active assessment templates.
     */
    public function getTemplates()
    {
        return response()->json(AssessmentTemplate::active()->get());
    }

    /**
     * Get a list of employees for assessment (with optional filtering).
     */
    public function getEmployees(Request $request)
    {
        $query = Employee::with('department')->active();

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('search')) {
            $query->where('full_name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->get());
    }

    /**
     * Get details for a specific template including its indicators.
     */
    public function getTemplateDetails($id)
    {
        $template = AssessmentTemplate::with('indicators')->findOrFail($id);
        return response()->json($template);
    }

    /**
     * Store a single assessment.
     */
    public function storeSingle(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'template_id' => 'required|exists:assessment_templates,id',
            'period' => 'required|string',
            'status' => 'required|in:draft,completed',
            'evaluator_notes' => 'nullable|string',
            'development_plan' => 'nullable|string',
            'scores' => 'required|array',
            'scores.*.indicator_id' => 'required|exists:assessment_indicators,id',
            'scores.*.score' => 'required|integer|min:1|max:5',
        ]);

        DB::beginTransaction();

        try {
            $assessment = Assessment::create([
                'employee_id' => $validated['employee_id'],
                'evaluator_id' => auth()->id() ?? 1, // Fallback for dev if auth drops
                'template_id' => $validated['template_id'],
                'assessment_date' => now(),
                'period' => $validated['period'],
                'evaluator_notes' => $validated['evaluator_notes'],
                'development_plan' => $validated['development_plan'],
                'status' => $validated['status'],
                // Total score is calculated by the model observers
            ]);

            foreach ($validated['scores'] as $scoreData) {
                $indicator = \App\Models\AssessmentIndicator::find($scoreData['indicator_id']);
                $weightedValue = ($scoreData['score'] * $indicator->weight) / 100;

                $assessment->scores()->create([
                    'indicator_id' => $scoreData['indicator_id'],
                    'score' => $scoreData['score'],
                    'weighted_value' => $weightedValue
                ]);
            }

            // Calculate and save the total score
            if ($validated['status'] === 'completed') {
                $assessment->total_score = $assessment->calculateTotalScore();
                $assessment->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Assessment saved successfully',
                'assessment' => $assessment->load('scores.indicator')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save assessment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update a single assessment.
     */
    public function updateSingle(Request $request, $id)
    {
        $validated = $request->validate([
            'period' => 'required|string',
            'status' => 'required|in:draft,completed',
            'evaluator_notes' => 'nullable|string',
            'development_plan' => 'nullable|string',
            'scores' => 'required|array',
            'scores.*.indicator_id' => 'required|exists:assessment_indicators,id',
            'scores.*.score' => 'required|integer|min:1|max:5',
        ]);

        $assessment = Assessment::findOrFail($id);

        DB::beginTransaction();

        try {
            $assessment->update([
                'period' => $validated['period'],
                'evaluator_notes' => $validated['evaluator_notes'],
                'development_plan' => $validated['development_plan'],
                'status' => $validated['status'],
                // Total score is calculated by the model observers
            ]);

            // Clear old scores
            $assessment->scores()->delete();

            // Insert new scores
            foreach ($validated['scores'] as $scoreData) {
                $indicator = \App\Models\AssessmentIndicator::find($scoreData['indicator_id']);
                $weightedValue = ($scoreData['score'] * $indicator->weight) / 100;

                $assessment->scores()->create([
                    'indicator_id' => $scoreData['indicator_id'],
                    'score' => $scoreData['score'],
                    'weighted_value' => $weightedValue
                ]);
            }

            // Calculate and save the total score
            if ($validated['status'] === 'completed') {
                $assessment->total_score = $assessment->calculateTotalScore();
                $assessment->save(); // observers will calculate grade etc.
            }

            DB::commit();

            return response()->json([
                'message' => 'Assessment updated successfully',
                'assessment' => $assessment->load('scores.indicator')
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update assessment: ' . $e->getMessage()], 500);
        }
    }
}
