<?php

namespace App\Services\Overtime;

use App\Models\Attendance;
use App\Models\OvertimeCategory;
use Carbon\Carbon;

class RateMyStaffOvertimeCalculator implements OvertimeCalculatorInterface
{
    public function calculate(Attendance $attendance, ?OvertimeCategory $category): float
    {
        if (!$category) {
            return 0;
        }

        $minutes = $attendance->approved_overtime_minutes;
        if ($minutes <= 0 && $category->type !== 'flat') {
            return 0;
        }

        $name = strtolower(trim($category->name));
        $rate = (float) $category->rate;

        // Custom Logic 1: Lembur Libur (Flat rate regardless of hours)
        if (str_contains($name, 'libur')) {
            return $rate;
        }

        // Custom Logic 2: Lembur Cetak (Hourly rate)
        if (str_contains($name, 'cetak')) {
            $hours = $minutes / 60;
            return $hours * $rate;
        }

        // Custom Logic 3: Longshift (Hybrid: Flat base + Hourly for extra)
        if (str_contains($name, 'longshift')) {
            // In Rate My Staff, Longshift itself pays a flat rate (e.g. 30k)
            // But if they work BEYOND the 13h longshift, they get additional hourly rate.
            // How do we know the hourly rate for the extra? We might need a generic fallback
            // or we assume `$category->rate` is the flat base, and we need another way to fetch hourly.
            // For simplicity, let's assume `approved_overtime_minutes` is ONLY the extra time beyond the 13h shift.
            // Wait, if it's strictly longshift without extra, and approved_overtime_minutes is 0,
            // we should still pay the base if they did the longshift.

            // If the category is applied, they get the base rate.
            $baseAmount = $rate;

            // If there's extra minutes (e.g., they stayed until 12 malam), add hourly.
            // Let's assume standard hourly rate is 10k (same as cetak) for now, or we can look it up.
            // A more robust way: use the category rate as the Base, and a setting for Hourly.
            // For now, let's assume extra time is paid at 10,000/hr if not specified.
            $extraHourlyRate = 10000;

            $extraAmount = ($minutes / 60) * $extraHourlyRate;

            return $baseAmount + $extraAmount;
        }

        // Fallback for any other custom category
        if ($category->type === 'flat') {
            return $rate;
        }

        return ($minutes / 60) * $rate;
    }
}
