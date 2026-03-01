<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Models\Holiday;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get system settings and users list
     */
    public function index()
    {
        $users = User::all();

        // Load specific configuration from DB Settings Table
        $settings = [
            'branding' => [
                'subdomain' => Setting::get('subdomain', 'megacorp'),
                'primary_color' => Setting::get('primary_color', '#3498db'),
            ],
            'notifications' => [
                'assessment_reminders' => true,
                'new_report_alerts' => true,
                'employee_self_service' => false,
                'weekly_summary' => true,
                'admin_contact' => Setting::get('admin_contact', 'admin@example.com')
            ],
            'attendance' => [
                'auto_sunday_holiday' => Setting::get('auto_sunday_holiday', 'false') === 'true'
            ]
        ];

        $holidays = Holiday::orderBy('date', 'desc')->get();

        return response()->json([
            'users' => $users,
            'settings' => $settings,
            'holidays' => $holidays
        ]);
    }

    /**
     * Store updated settings
     */
    public function store(Request $request)
    {
        if ($request->has('attendance.auto_sunday_holiday')) {
            Setting::set('auto_sunday_holiday', $request->input('attendance.auto_sunday_holiday') ? 'true' : 'false');
        }

        return response()->json(['message' => 'Settings saved successfully.']);
    }

    /**
     * Store new manual holiday
     */
    public function storeHoliday(Request $request)
    {
        $request->validate([
            'date' => 'required|date|unique:holidays,date',
            'name' => 'required|string|max:255'
        ]);

        $holiday = Holiday::create([
            'date' => $request->date,
            'name' => $request->name
        ]);

        return response()->json($holiday);
    }

    /**
     * Delete manual holiday
     */
    public function destroyHoliday($id)
    {
        $holiday = Holiday::findOrFail($id);
        $holiday->delete();

        return response()->json(['message' => 'Holiday deleted.']);
    }
}
