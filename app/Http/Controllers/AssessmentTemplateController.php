<?php

namespace App\Http\Controllers;

use App\Models\AssessmentTemplate;
use App\Models\AssessmentIndicator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssessmentTemplateController extends Controller
{
    /**
     * Display a listing of the templates with their indicator count and total weight.
     */
    public function index()
    {
        $templates = AssessmentTemplate::with('indicators')->latest()->get();
        // Since getTotalWeightAttribute is an accessor, it will be included if we append it, 
        // or the frontend can calculate it from the indicators list.
        $templates->each->append('total_weight');
        return response()->json($templates);
    }

    /**
     * Store a newly created template in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'department_type' => 'required|string|max:100', // e.g., 'All', 'IT', 'Sales'
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $template = AssessmentTemplate::create($validated);

        return response()->json([
            'message' => 'Template created successfully',
            'template' => $template
        ], 201);
    }

    /**
     * Display the specified template with its indicators.
     */
    public function show(AssessmentTemplate $assessmentTemplate)
    {
        $assessmentTemplate->load('indicators');
        $assessmentTemplate->append('total_weight');
        return response()->json($assessmentTemplate);
    }

    /**
     * Update the specified template in storage.
     */
    public function update(Request $request, AssessmentTemplate $assessmentTemplate)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'department_type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $assessmentTemplate->update($validated);

        return response()->json([
            'message' => 'Template updated successfully',
            'template' => $assessmentTemplate
        ]);
    }

    /**
     * Remove the specified template from storage.
     */
    public function destroy(AssessmentTemplate $assessmentTemplate)
    {
        if ($assessmentTemplate->assessments()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete template because it is already used in assessments. Consider deactivating it instead.'
            ], 400);
        }

        $assessmentTemplate->delete();
        return response()->json(['message' => 'Template deleted successfully']);
    }

    // --- Indicator Management ---

    /**
     * Add a new indicator to a template.
     */
    public function storeIndicator(Request $request, AssessmentTemplate $assessmentTemplate)
    {
        $validated = $request->validate([
            'category' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'weight' => 'required|numeric|min:0|max:100',
            'sort_order' => 'required|integer|min:0',
        ]);

        $indicator = $assessmentTemplate->indicators()->create($validated);

        return response()->json([
            'message' => 'Indicator added successfully',
            'indicator' => $indicator
        ], 201);
    }

    /**
     * Update an existing indicator.
     */
    public function updateIndicator(Request $request, AssessmentIndicator $indicator)
    {
        $validated = $request->validate([
            'category' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'weight' => 'required|numeric|min:0|max:100',
            'sort_order' => 'required|integer|min:0',
        ]);

        $indicator->update($validated);

        return response()->json([
            'message' => 'Indicator updated successfully',
            'indicator' => $indicator
        ]);
    }

    /**
     * Delete an indicator.
     */
    public function destroyIndicator(AssessmentIndicator $indicator)
    {
        if ($indicator->scores()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete indicator because it has existing scores.'
            ], 400);
        }

        $indicator->delete();
        return response()->json(['message' => 'Indicator deleted successfully']);
    }
}
