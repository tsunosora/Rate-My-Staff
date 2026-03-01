<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

class WorkSchedule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'break_start_time',
        'break_end_time',
        'daily_wage',
        'monthly_wage',
        'weekly_wage',
        'holiday_wage',
        'overtime_wage_per_hour',
        'is_holiday',
        'late_tolerance_minutes'
    ];

    protected $casts = [
        'is_holiday' => 'boolean',
        'daily_wage' => 'float',
        'monthly_wage' => 'float',
        'weekly_wage' => 'float',
        'holiday_wage' => 'float',
        'overtime_wage_per_hour' => 'float',
    ];

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
