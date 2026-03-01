<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\LeaveLink;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;

class PublicAbsenceController extends Controller
{
    /**
     * Render the public Vue form if the token is valid
     */
    public function show($token)
    {
        $link = LeaveLink::where('token', $token)->first();

        if (!$link || Carbon::now()->greaterThan($link->expires_at)) {
            // Render an expired or invalid view
            return response()->json([
                'valid' => false,
                'message' => 'Tautan sudah kedaluwarsa atau tidak valid.'
            ], 403);
        }

        $employees = Employee::orderBy('full_name')->get(['id', 'employee_code', 'full_name']);

        return response()->json([
            'valid' => true,
            'token' => $token,
            'employees' => $employees,
            'expires_at' => $link->expires_at
        ]);
    }

    /**
     * Handle the form submission
     */
    public function submit(Request $request, $token)
    {
        $link = LeaveLink::where('token', $token)->first();

        if (!$link || Carbon::now()->greaterThan($link->expires_at)) {
            return response()->json(['message' => 'Tautan sudah kedaluwarsa atau tidak valid.'], 403);
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'scan_date' => 'required|date',
            'status' => 'required|in:Izin,Sakit,Cuti',
            'absence_reason' => 'required|string|max:1000'
        ]);

        // Attempt to find existing record, or create a new "absence" scan
        $attendance = Attendance::firstOrNew([
            'employee_id' => $request->employee_id,
            'scan_date' => $request->scan_date,
            'scan_type' => 'absence'
        ]);

        $attendance->status = $request->status;
        $attendance->absence_reason = $request->absence_reason;

        $attendance->save();

        return response()->json([
            'message' => 'Laporan ketidakhadiran berhasil dikirim!'
        ]);
    }
}
