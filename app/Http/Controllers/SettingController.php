<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get system settings and users list
     */
    public function index()
    {
        // For a more advanced setup, settings would be in a DB table
        // For this scaffold we'll return mock configuration alongside users

        $users = User::all();

        $settings = [
            'branding' => [
                'subdomain' => 'megacorp',
                'primary_color' => '#3498db',
            ],
            'notifications' => [
                'assessment_reminders' => true,
                'new_report_alerts' => true,
                'employee_self_service' => false,
                'weekly_summary' => true,
                'admin_contact' => 'admin@example.com'
            ]
        ];

        return response()->json([
            'users' => $users,
            'settings' => $settings
        ]);
    }

    /**
     * Store updated settings
     */
    public function store(Request $request)
    {
        // Stub for saving settings to DB
        return response()->json(['message' => 'Settings saved successfully.']);
    }
}
