<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\Employee;
use App\Models\Attendance;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class FingerspotService
{
    protected $cloudId;
    protected $apiKey;
    protected $baseUrl = 'https://api.fingerspot.io/api';

    public function __construct()
    {
        $this->cloudId = Setting::get('fingerspot_cloud_id');
        $this->apiKey = Setting::get('fingerspot_api_key');
    }

    /**
     * Check if API credentials exist
     */
    public function isConfigured()
    {
        return !empty($this->cloudId) && !empty($this->apiKey);
    }

    /**
     * Fetch scanlog data from Fingerspot API and sync to local DB
     * Note: The Auth Token API specific endpoint requires querying exactly one day at a time.
     */
    public function syncScanlogs($startDate, $endDate)
    {
        if (!$this->isConfigured()) {
            throw new \Exception('Fingerspot API credentials not configured.');
        }

        try {
            $startDateObj = Carbon::parse($startDate);
            $endDateObj = Carbon::parse($endDate);
            $allLogs = [];

            // The Auth SDK endpoint only accepts a single `Y-m-d` date parameter per request. 
            // We loop through each day in the date range.
            while ($startDateObj->lte($endDateObj)) {
                $attendanceUpload = $startDateObj->format('Y-m-d');
                $currentTime = Carbon::now()->format('YmdHis'); // yyyyMMddhhmmss

                // Auth token logic: MD5(Cloud_ID + attendance_upload + current_time + API_KEY)
                $authString = $this->cloudId . $attendanceUpload . $currentTime . $this->apiKey;
                $auth = md5($authString);

                // Build the parameterized GET URI path
                // Format: format_date = 6 (Y-m-d H:i:s), property = date_time, direction = asc, export = JSON
                $url = "{$this->baseUrl}/download/attendance_log/{$this->cloudId}/{$attendanceUpload}/6/date_time/asc/JSON/{$auth}/{$currentTime}";

                $response = Http::timeout(30)->get($url);

                if ($response->successful()) {
                    $data = $response->json();

                    // The Fingerspot JSON response usually embeds the array in a data property or returns raw array
                    $logs = $data['data'] ?? $data;

                    if (is_array($logs)) {
                        // Check if it's a single associative array rather than an array of objects
                        if (isset($logs['pin']) && !isset($logs[0])) {
                            $logs = [$logs];
                        }
                        $allLogs = array_merge($allLogs, $logs);
                    }
                } else {
                    Log::error('Fingerspot API Error for Date ' . $attendanceUpload . ': ' . $response->body());
                    // We shouldn't throw to break the whole loop for just 1 bad day, but we can log it.
                }

                $startDateObj->addDay();
            }

            return $this->processScanlogs($allLogs);

        } catch (\Exception $e) {
            Log::error('Fingerspot Sync Exception: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process JSON response and update Attendances table
     */
    protected function processScanlogs($scanlogs)
    {
        if (!is_array($scanlogs) || empty($scanlogs)) {
            return ['status' => 'success', 'message' => 'No new data found.', 'synced' => 0];
        }

        // Preload employees mapping (employee_code => id) to avoid N+1 queries
        // Assumes Employee PIN from Fingerspot matches Employee Code in RMS
        $employeesMap = Employee::whereNotNull('employee_code')
            ->pluck('id', 'employee_code')
            ->toArray();

        $syncedCount = 0;

        foreach ($scanlogs as $log) {
            // Check if essential fields are present in the row
            if (!isset($log['pin']) || !isset($log['scan_date'])) {
                continue; // Skip invalid rows
            }

            $pin = (string) $log['pin'];

            // Skip if employee not found in local DB
            if (!isset($employeesMap[$pin])) {
                continue;
            }

            $employeeId = $employeesMap[$pin];

            // Expected scan_date format from Fingerspot format_date=1: Y-m-d H:i
            $scanDateStr = $log['scan_date'] . ':00'; // Append seconds for proper timestamp
            $scanDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $scanDateStr);

            // Determine basic logic if it's 'in' or 'out' based on time of day 
            // Very simplified: before 11:59 AM is Check In, after 12:00 PM is Check Out.
            // * This can be refined based on user's actual shift configurations later.
            $hour = $scanDateTime->hour;
            $scanType = ($hour < 12) ? 'in' : 'out';

            // Determine status (Late logic)
            // Example: Shift starts at 08:00 AM. If scanning IN after 08:15 AM, marked as LATE.
            $status = 'on_time';
            $lateMinutes = 0;
            if ($scanType === 'in') {
                $shiftStart = $scanDateTime->copy()->setTime(8, 0, 0); // 08:00 AM
                if ($scanDateTime->gt($shiftStart)) {
                    $diffInMinutes = $scanDateTime->diffInMinutes($shiftStart);
                    if ($diffInMinutes > 15) { // 15 min grace period
                        $status = 'late';
                        $lateMinutes = $diffInMinutes;
                    }
                }
            }

            // Upsert / Insert ignore duplicate scans (same employee, same minute)
            $exists = Attendance::where('employee_id', $employeeId)
                ->where('scan_date', $scanDateTime)
                ->exists();

            if (!$exists) {
                Attendance::create([
                    'employee_id' => $employeeId,
                    'scan_date' => $scanDateTime,
                    'scan_type' => $scanType,
                    'machine_name' => $log['machine_name'] ?? 'Unknown Machine',
                    'sn_machine' => $log['sn_machine'] ?? 'Unknown SN',
                    'status' => $status,
                    'late_minutes' => $lateMinutes,
                ]);
                $syncedCount++;
            }
        }

        return [
            'status' => 'success',
            'message' => "Successfully synced {$syncedCount} scan records.",
            'synced' => $syncedCount
        ];
    }
}
