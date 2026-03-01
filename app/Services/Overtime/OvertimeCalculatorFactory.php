<?php

namespace App\Services\Overtime;

use App\Models\Setting;

class OvertimeCalculatorFactory
{
    /**
     * Resolve the appropriate overtime calculator based on system settings.
     *
     * @return OvertimeCalculatorInterface
     */
    public static function make(): OvertimeCalculatorInterface
    {
        // Get the active context from settings, default to 'default'
        $context = Setting::where('key', 'overtime_engine_context')
            ->value('value') ?? 'default';

        if ($context === 'rate_my_staff_custom') {
            return new RateMyStaffOvertimeCalculator();
        }

        return new StandardOvertimeCalculator();
    }
}
