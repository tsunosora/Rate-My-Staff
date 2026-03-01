<?php

namespace App\Services\Overtime;

use App\Models\Attendance;
use App\Models\OvertimeCategory;

interface OvertimeCalculatorInterface
{
    /**
     * Calculate the final overtime amount (Rp)
     *
     * @param Attendance $attendance The attendance record containing approved minutes
     * @param OvertimeCategory|null $category The mapped category
     * @return float The calculated monetary value
     */
    public function calculate(Attendance $attendance, ?OvertimeCategory $category): float;
}
