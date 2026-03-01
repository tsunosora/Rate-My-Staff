<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Employee;

class Attendance extends Model
{
    protected $fillable = [
        'employee_id',
        'scan_date',
        'scan_type',
        'machine_name',
        'sn_machine',
        'status',
        'late_minutes',
        'overtime_minutes',
        'overtime_reason',
    ];

    protected $casts = [
        'scan_date' => 'datetime',
    ];

    /**
     * Get the employee that owns the attendance.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
