<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class MasterDataController extends Controller
{
    public function departments()
    {
        return response()->json(\App\Models\Department::withCount('employees')->get());
    }

    public function storeDepartment(Request $request)
    {
        $validated = $request->validate(['name' => 'required|string|unique:departments,name']);
        $department = \App\Models\Department::create($validated);
        return response()->json($department, 201);
    }

    public function updateDepartment(Request $request, $id)
    {
        $department = \App\Models\Department::findOrFail($id);
        $validated = $request->validate(['name' => 'required|string|unique:departments,name,' . $department->id]);
        $department->update($validated);
        return response()->json($department);
    }

    public function destroyDepartment($id)
    {
        \App\Models\Department::destroy($id);
        return response()->json(['message' => 'Department deleted']);
    }

    // Positions
    public function positions()
    {
        return response()->json(\App\Models\Position::with('department')->withCount('employees')->get());
    }

    public function storePosition(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'department_id' => 'required|exists:departments,id'
        ]);
        $position = \App\Models\Position::create($validated);
        return response()->json($position->load('department'), 201);
    }

    public function updatePosition(Request $request, $id)
    {
        $position = \App\Models\Position::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string',
            'department_id' => 'required|exists:departments,id'
        ]);
        $position->update($validated);
        return response()->json($position->load('department'));
    }

    public function destroyPosition($id)
    {
        \App\Models\Position::destroy($id);
        return response()->json(['message' => 'Position deleted']);
    }
}
