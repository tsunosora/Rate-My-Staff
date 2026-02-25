<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the employees.
     */
    public function index(Request $request)
    {
        $query = Employee::with(['latestAssessment', 'department', 'position']);

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        // Return paginated results for SPA
        return response()->json($query->latest()->paginate(10));
    }

    /**
     * Store a newly created employee in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'nickname' => 'required|string|max:50',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'join_date' => 'required|date',
            'salary' => 'required|numeric|min:0',
        ]);

        $baseCode = 'EMP-' . strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $request->nickname ?? \Str::words($request->full_name, 1, '')));

        // Ensure uniqueness
        $count = Employee::where('employee_code', 'like', $baseCode . '-%')->count();
        $uniqueCode = $baseCode . '-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);

        $validated['employee_code'] = $uniqueCode;

        $employee = Employee::create($validated);

        return response()->json([
            'message' => 'Employee created successfully',
            'data' => $employee
        ], 201);
    }

    /**
     * Display the specified employee.
     */
    public function show(Employee $employee)
    {
        $employee->load(['assessments.template', 'department', 'position']);
        return response()->json($employee);
    }

    /**
     * Update the specified employee in storage.
     */
    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'employee_code' => 'required|string|unique:employees,employee_code,' . $employee->id,
            'full_name' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:50',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'join_date' => 'required|date',
            'salary' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $employee->update($validated);

        return response()->json([
            'message' => 'Employee updated successfully',
            'data' => $employee
        ]);
    }

    /**
     * Remove the specified employee from storage.
     */
    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(['message' => 'Employee deleted successfully']);
    }

    /**
     * Export Employees as PDF
     */
    public function exportPdf(Request $request)
    {
        $query = Employee::with(['latestAssessment', 'department', 'position']);

        if ($request->filled('search')) {
            $query->search($request->search);
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $employees = $query->latest()->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.employees', compact('employees'));
        return $pdf->download('employees_report.pdf');
    }

    /**
     * Import Employees from CSV file
     */
    public function importCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $path = $request->file('file')->getRealPath();
        $records = array_map('str_getcsv', file($path));

        if (count($records) < 2) {
            return response()->json(['message' => 'File is empty or missing headers.'], 400);
        }

        $header = array_map('trim', array_shift($records)); // Get columns
        $count = 0;

        foreach ($records as $record) {
            if (count($header) !== count($record))
                continue;

            $data = array_combine($header, array_map('trim', $record));

            if (empty($data['employee_code']) || empty($data['full_name']))
                continue;

            // Auto-create Master Data if not exists
            $deptName = $data['department'] ?? 'Uncategorized';
            $department = \App\Models\Department::firstOrCreate(['name' => $deptName]);

            $posName = $data['position'] ?? 'Staff';
            $position = \App\Models\Position::firstOrCreate([
                'department_id' => $department->id,
                'name' => $posName
            ]);

            Employee::updateOrCreate(
                ['employee_code' => $data['employee_code']],
                [
                    'full_name' => $data['full_name'] ?? '',
                    'nickname' => $data['nickname'] ?? '',
                    'department_id' => $department->id,
                    'position_id' => $position->id,
                    'join_date' => !empty($data['join_date']) ? date('Y-m-d', strtotime($data['join_date'])) : now(),
                    'salary' => isset($data['salary']) && is_numeric($data['salary']) ? $data['salary'] : 0,
                    'is_active' => true,
                ]
            );
            $count++;
        }

        return response()->json(['message' => "$count employees imported successfully."]);
    }
}
