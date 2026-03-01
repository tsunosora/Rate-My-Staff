<?php

namespace App\Services\Overtime;

use App\Models\Attendance;
use App\Models\OvertimeCategory;

class StandardOvertimeCalculator implements OvertimeCalculatorInterface
{
    /**
     * Standard Generic Calculation
     * Flat: Returns standard rate
     * Hourly: (Approved Minutes / 60) * Rate
     * Hybrid: Hourly
     */
    public function calculate(Attendance $attendance, ?OvertimeCategory $category): float
    {
        if (!$category || $attendance->approved_overtime_minutes <= 0) {
            return 0;
        }

        if ($category->type === 'flat') {
            return (float) $category->rate;
        }

        // Hourly and Hybrid default safely to hourly in standard mode
        $hours = $attendance->approved_overtime_minutes / 60;
        return (float) ($hours * $category->rate);
    }
}
