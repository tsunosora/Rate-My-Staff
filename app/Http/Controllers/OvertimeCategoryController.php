<?php

namespace App\Http\Controllers;

use App\Models\OvertimeCategory;
use Illuminate\Http\Request;

class OvertimeCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $categories = OvertimeCategory::latest()->get();
        return response()->json($categories);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:flat,hourly,hybrid',
            'rate' => 'required|numeric|min:0',
            'company_context' => 'nullable|string|max:255',
        ]);

        $category = OvertimeCategory::create($validated);

        return response()->json([
            'message' => 'Overtime category created successfully',
            'data' => $category
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, OvertimeCategory $overtimeCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:flat,hourly,hybrid',
            'rate' => 'required|numeric|min:0',
            'company_context' => 'nullable|string|max:255',
        ]);

        $overtimeCategory->update($validated);

        return response()->json([
            'message' => 'Overtime category updated successfully',
            'data' => $overtimeCategory
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(OvertimeCategory $overtimeCategory)
    {
        $overtimeCategory->delete();
        return response()->json(['message' => 'Overtime category deleted successfully']);
    }
}
