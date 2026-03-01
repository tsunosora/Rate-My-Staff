<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Services\FingerspotService;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\AttendanceImport;
use App\Models\LeaveLink;
use Illuminate\Support\Str;
class AttendanceController extends Controller
{
    /**
     * Display a paginated list of attendance records with filters
     */
    public function index(Request $request)
    {
        $query = Attendance::with('employee:id,full_name,employee_code,department_id')
            ->orderBy('scan_date', 'desc');

        if ($request->has('start_date') && $request->has('end_date')) {
            $start = Carbon::parse($request->start_date)->startOfDay();
            $end = Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('scan_date', [$start, $end]);
        } else {
            // Default to today
            $query->whereDate('scan_date', date('Y-m-d'));
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Trigger a manual sync with Fingerspot API
     */
    public function sync(Request $request, FingerspotService $fingerspot)
    {
        $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
        ]);

        try {
            $result = $fingerspot->syncScanlogs($request->start_date, $request->end_date);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get aggregate statistics for the Attendance Dashboard
     */
    public function dashboardStats(Request $request)
    {
        $date = $request->get('date', date('Y-m-d'));
        $start = Carbon::parse($date)->startOfDay();
        $end = Carbon::parse($date)->endOfDay();

        $query = Attendance::whereBetween('scan_date', [$start, $end]);

        $totalPresent = (clone $query)->distinct('employee_id')->count('employee_id');

        $totalLate = (clone $query)->where('status', 'late')
            ->where('scan_type', 'in')
            ->distinct('employee_id')
            ->count('employee_id');

        // Estimate total absent (Total active employees - Total Present)
        $totalEmployees = \App\Models\Employee::active()->count();
        $totalAbsent = max(0, $totalEmployees - $totalPresent);

        // Recent latecomers
        $recentLates = (clone $query)->with('employee:id,full_name')
            ->where('status', 'late')
            ->orderBy('late_minutes', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'date' => $date,
            'metrics' => [
                'present' => $totalPresent,
                'late' => $totalLate,
                'absent' => $totalAbsent,
                'total_employees' => $totalEmployees
            ],
            'recent_lates' => $recentLates
        ]);
    }

    /**
     * Webhook endpoint to receive push data from Fingerspot
     */
    public function webhook(Request $request)
    {
        // Log the entire request payload to a dedicated channel/file
        \Illuminate\Support\Facades\Log::channel('single')->info('FINGERSPOT WEBHOOK RECEIVED:', [
            'headers' => $request->headers->all(),
            'body' => $request->all(),
            'raw' => $request->getContent()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data received and logged'
        ], 200);
    }

    /**
     * Import attendance from Excel (Preview Phase)
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xls,xlsx,csv,html,htm,txt'
        ]);

        try {
            $file = $request->file('file');

            try {
                // Use PhpSpreadsheet IOFactory to auto-detect and load the file regardless of extension
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
                $data = [
                    $spreadsheet->getActiveSheet()->toArray()
                ];
            } catch (\Exception $e) {
                // If auto-detect fails (often happens with BIFF5/BIFF8), explicitly force the legacy Xls reader
                try {
                    $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xls();
                    $reader->setReadDataOnly(true);
                    $spreadsheet = $reader->load($file->getRealPath());
                    $data = [
                        $spreadsheet->getActiveSheet()->toArray()
                    ];
                } catch (\Exception $innerE) {
                    // Try shuchkin/simplexls as last resort for corrupted BIFF
                    if ($xls = \Shuchkin\SimpleXLS::parse($file->getRealPath())) {
                        $data = [
                            $xls->rows()
                        ];
                    } else {
                        // Fingerspot sometimes exports raw HTML strings disguised as XLS.
                        $content = file_get_contents($file->getRealPath());

                        if (\Illuminate\Support\Str::contains(strtolower(substr($content, 0, 1000)), '<table')) {
                            $dom = new \DOMDocument();
                            @$dom->loadHTML($content);
                            $tables = $dom->getElementsByTagName('table');

                            if ($tables->length > 0) {
                                $rows = $tables->item(0)->getElementsByTagName('tr');
                                $parsedData = [];
                                foreach ($rows as $row) {
                                    if ($row instanceof \DOMElement) {
                                        $rowData = [];
                                        $cols = $row->getElementsByTagName('td');
                                        if ($cols->length == 0) {
                                            $cols = $row->getElementsByTagName('th');
                                        }
                                        foreach ($cols as $col) {
                                            $val = $col->nodeValue;
                                            // Replace non-breaking spaces (HTML &nbsp;) with regular spaces
                                            $val = str_replace(["\xC2\xA0", "\xA0"], ' ', $val);
                                            // Collapse multiple spaces into one and trim
                                            $val = trim(preg_replace('/\s+/', ' ', $val));
                                            $rowData[] = $val;
                                        }
                                        $parsedData[] = $rowData;
                                    }
                                }
                                $data = [$parsedData];
                            } else {
                                throw new \Exception("Could not find table in HTML Excel representation.");
                            }
                        } else {
                            $snippet = substr($content, 0, 500);
                            $hex = bin2hex(substr($content, 0, 30));
                            $safeSnippet = mb_check_encoding($snippet, 'UTF-8') ? $snippet : utf8_encode($snippet);

                            return response()->json([
                                'message' => "DEBUG: Hex=[{$hex}] \n\nSnippet=[{$safeSnippet}] \n\nErr: " . $e->getMessage()
                            ], 500);
                        }
                    } // End inner else
                } // End inner catch 2
            } // End catch 1

            if (empty($data) || empty($data[0])) {
                return response()->json(['message' => 'File is empty'], 400);
            }

            $rawRows = $data[0];

            // Dynamically find the header row
            $headerRowIndex = 0;
            $headers = [];
            foreach ($rawRows as $index => $row) {
                $rowStr = strtolower(implode(' ', array_filter(array_map('strval', $row))));
                if (\Illuminate\Support\Str::contains($rowStr, ['pin', 'nip', 'nama', 'name', 'tanggal', 'date'])) {
                    $headerRowIndex = $index;
                    $headers = array_map(function ($h) {
                        return \Illuminate\Support\Str::slug(strtolower(trim((string) $h)), '_');
                    }, $row);
                    break;
                }
            }

            // Convert raw rows to associative arrays using the found headers
            $rows = [];
            for ($i = $headerRowIndex + 1; $i < count($rawRows); $i++) {
                $row = $rawRows[$i];
                $assocRow = [];
                foreach ($headers as $colIndex => $headerName) {
                    if (!empty($headerName)) {
                        $assocRow[$headerName] = $row[$colIndex] ?? null;
                    }
                }
                // Also support the explicit "Scan 1", "Scan 2" fallback by looking at all values
                $assocRow['_raw'] = $row;
                $rows[] = $assocRow;
            }

            $matched = [];
            $unmatched = [];
            $uniqueUnmatchedNames = [];

            // Load existing employees for quick lookup by ID or Name
            $employeesByCode = \App\Models\Employee::pluck('id', 'employee_code')->toArray();

            // Build name lookup map with both exact and loose matches
            $allEmployees = \App\Models\Employee::get(['id', 'full_name']);
            $employeesByName = [];
            foreach ($allEmployees as $emp) {
                $employeesByName[$emp->full_name] = $emp->id;
                // Loose match: lowercase, no spaces
                $looseName = strtolower(preg_replace('/\s+/', '', $emp->full_name));
                if (!empty($looseName)) {
                    $employeesByName['loose_' . $looseName] = $emp->id;
                }
            }

            foreach ($rows as $row) {
                // Determine identifiers
                $pin = $row['pin'] ?? $row['kode_karyawan'] ?? $row['nik'] ?? $row['nip'] ?? null;
                $name = $row['nama'] ?? $row['name'] ?? null;
                $tanggal = $row['tanggal'] ?? $row['date'] ?? null;

                // Fingerspot sometimes exports "Scan 1", "Scan 2"
                $masuk = $row['jam_masuk'] ?? $row['scan_masuk'] ?? $row['masuk'] ?? $row['scan_1'] ?? null;
                $keluar = $row['jam_keluar'] ?? $row['scan_keluar'] ?? $row['pulang'] ?? $row['jam_pulang'] ?? $row['scan_2'] ?? null;

                if (empty($tanggal) || empty($masuk))
                    continue;

                $foundEmployeeId = null;

                if (!empty($pin) && isset($employeesByCode[$pin])) {
                    $foundEmployeeId = $employeesByCode[$pin];
                } elseif (!empty($name)) {
                    $looseName = strtolower(preg_replace('/\s+/', '', $name));
                    if (isset($employeesByName[$name])) {
                        $foundEmployeeId = $employeesByName[$name];
                    } elseif (isset($employeesByName['loose_' . $looseName])) {
                        $foundEmployeeId = $employeesByName['loose_' . $looseName];
                    }
                }

                // --- Detect Scan Warnings (Missing Scans & Extra Scans) ---
                $warnings = [];

                // 1. Missing Out Scan
                if (empty($keluar)) {
                    $warnings[] = 'Missing Scan (Only 1 Scan Detected)';
                }

                // 2. Extra Scans (Double Scan vs Lembur/Istirahat)
                if (isset($row['_raw']) && is_array($row['_raw'])) {
                    $timePattern = '/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/';
                    $allTimes = [];

                    foreach ($row['_raw'] as $rawVal) {
                        $valStr = trim((string) $rawVal);
                        if (preg_match($timePattern, $valStr)) {
                            if (strlen($valStr) == 5) { // Normalize H:i to H:i:s
                                $valStr .= ':00';
                            }
                            $allTimes[] = $valStr;
                        }
                    }

                    $masukTime = null;
                    $keluarTime = null;
                    if (!empty($masuk) && preg_match($timePattern, trim($masuk))) {
                        $masukTime = strlen(trim($masuk)) == 5 ? trim($masuk) . ':00' : trim($masuk);
                    }
                    if (!empty($keluar) && preg_match($timePattern, trim($keluar))) {
                        $keluarTime = strlen(trim($keluar)) == 5 ? trim($keluar) . ':00' : trim($keluar);
                    }

                    // Remove exact matching Masuk and Keluar from allTimes to find extras
                    $extraTimes = [];
                    $masukFound = false;
                    $keluarFound = false;

                    foreach ($allTimes as $t) {
                        if (!$masukFound && $t === $masukTime) {
                            $masukFound = true;
                            continue;
                        }
                        if (!$keluarFound && $t === $keluarTime) {
                            $keluarFound = true;
                            continue;
                        }
                        $extraTimes[] = $t;
                    }

                    // Classify Extra Times
                    foreach ($extraTimes as $et) {
                        $isDoubleScan = false;
                        try {
                            $etParsed = \Carbon\Carbon::parse($et);
                            if ($masukTime && $etParsed->diffInMinutes(\Carbon\Carbon::parse($masukTime)) < 60) {
                                $isDoubleScan = true;
                            }
                            if ($keluarTime && $etParsed->diffInMinutes(\Carbon\Carbon::parse($keluarTime)) < 60) {
                                $isDoubleScan = true;
                            }
                        } catch (\Exception $e) {
                            // Fallback if parsing fails
                        }

                        if ($isDoubleScan) {
                            $warnings[] = "Double Scan ({$et})";
                        } else {
                            $warnings[] = "Indikasi Lembur / Istirahat ({$et})";
                        }
                    }
                }

                $record = [
                    'original_pin' => $pin,
                    'original_name' => $name,
                    'tanggal' => $tanggal,
                    'masuk' => $masuk,
                    'keluar' => $keluar,
                    'warnings' => $warnings,
                ];

                if ($foundEmployeeId) {
                    $record['employee_id'] = $foundEmployeeId;
                    $matched[] = $record;
                } else {
                    $unmatched[] = $record;
                    if (!empty($name) && !in_array($name, $uniqueUnmatchedNames)) {
                        $uniqueUnmatchedNames[] = $name;
                    } elseif (empty($name) && !empty($pin) && !in_array($pin, $uniqueUnmatchedNames)) {
                        $uniqueUnmatchedNames[] = $pin;
                    }
                }
            } // End header iter loop

            return response()->json([
                'message' => 'File parsed successfully',
                'matched_count' => count($matched),
                'unmatched_count' => count($unmatched),
                'unique_unmatched_names' => $uniqueUnmatchedNames,
                'preview_data' => [
                    'matched' => $matched,
                    'unmatched' => $unmatched
                ]
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Import Error: ' . $e->getMessage());
            return response()->json(['message' => 'Error parsing file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Finalize Import after user mapping
     */
    public function finalizeImport(Request $request)
    {
        // Increase execution time for large imports
        set_time_limit(0);

        $request->validate([
            'mappings' => 'array', // e.g. ["John Doe" => 5, "Jane" => "CREATE_NEW"]
            'matched_data' => 'nullable|array',
            'unmatched_data' => 'nullable|array'
        ]);

        $mappings = $request->input('mappings', []);
        $matchedData = $request->input('matched_data', []);
        $unmatchedData = $request->input('unmatched_data', []);

        $recordsToSave = $matchedData;
        $createdCount = 0;

        // Process unmatched data with mappings
        foreach ($unmatchedData as $row) {
            $identifier = $row['original_name'] ?: $row['original_pin'];
            if (isset($mappings[$identifier])) {
                $mappedAction = $mappings[$identifier];

                if ($mappedAction === 'CREATE_NEW') {
                    // Create new employee
                    $dept = \App\Models\Department::firstOrCreate(['name' => 'Uncategorized']);
                    $pos = \App\Models\Position::firstOrCreate(['name' => 'Staff', 'department_id' => $dept->id]);
                    $baseCode = 'EMP-' . strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', \Illuminate\Support\Str::words($identifier, 1, '')));

                    // employee_code length limit is 20 chars.
                    // baseCode like EMP-IKA- is max 13 chars typically (depend on word). To be safe, let's take up to 8 chars.
                    $shortBase = substr($baseCode, 0, 11); // max 11 chars
                    $uniqueCode = $shortBase . '-' . substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);
                    $newEmp = \App\Models\Employee::create([
                        'employee_code' => $uniqueCode,
                        'full_name' => $identifier,
                        'nickname' => \Str::words($identifier, 1, ''),
                        'department_id' => $dept->id,
                        'position_id' => $pos->id,
                        'join_date' => now()->format('Y-m-d'),
                        'salary' => 0,
                        'is_active' => true,
                    ]);

                    // Update mapping to avoid creating multiple times
                    $mappings[$identifier] = $newEmp->id;
                    $row['employee_id'] = $newEmp->id;
                    $recordsToSave[] = $row;
                } elseif (is_numeric($mappedAction)) {
                    // Map to existing employee
                    $row['employee_id'] = $mappedAction;
                    $recordsToSave[] = $row;
                }
            }
        }

        // Save $recordsToSave
        $importHelper = new \App\Imports\AttendanceImport();

        // Group by employee to optimize work schedule fetching
        $employeeIds = collect($recordsToSave)->pluck('employee_id')->unique()->toArray();
        $employees = \App\Models\Employee::with('workSchedule')->whereIn('id', $employeeIds)->get()->keyBy('id');
        $allWorkSchedules = \App\Models\WorkSchedule::all();

        foreach ($recordsToSave as $record) {
            $employee = $employees->get($record['employee_id']);
            if (!$employee)
                continue;

            $dateObj = $importHelper->parseDate($record['tanggal']);
            if (!$dateObj)
                continue;
            $dateStr = $dateObj->format('Y-m-d');

            $masukTime = $importHelper->parseTime($record['masuk']);
            $checkInDateTime = Carbon::parse($dateStr . ' ' . $masukTime);

            // Calculate status & late considering Work Schedule
            $status = 'on_time';
            $lateMinutes = 0;
            $expectedStartTime = '08:00:00';

            if ($employee->workSchedule && $employee->workSchedule->start_time) {
                $expectedStartTime = $employee->workSchedule->start_time;
            }

            if ($checkInDateTime->format('H:i:s') > $expectedStartTime) {
                $status = 'late';
                $expectedFullTime = Carbon::parse($dateStr . ' ' . $expectedStartTime);
                $lateMinutes = intval(abs($checkInDateTime->diffInMinutes($expectedFullTime, false)));
            }

            // Apply Missing Scan Resolution from Frontend
            $resolution = $record['resolution'] ?? null;
            $isForgotScanIn = false;

            if (empty($record['keluar']) && $resolution) {
                if ($resolution === 'long_shift') {
                    $status = 'long_shift';
                } elseif ($resolution === 'lupa_scan') {
                    // Auto-Detect Logic
                    $minDiff = PHP_INT_MAX;
                    $closestIsStart = true;
                    $scanTimeObj = Carbon::parse($masukTime);

                    foreach ($allWorkSchedules as $ws) {
                        if ($ws->start_time) {
                            $diffStart = $scanTimeObj->diffInMinutes(Carbon::parse($ws->start_time));
                            if ($diffStart < $minDiff) {
                                $minDiff = $diffStart;
                                $closestIsStart = true;
                            }
                        }
                        if ($ws->end_time) {
                            $diffEnd = $scanTimeObj->diffInMinutes(Carbon::parse($ws->end_time));
                            if ($diffEnd < $minDiff) {
                                $minDiff = $diffEnd;
                                $closestIsStart = false;
                            }
                        }
                    }

                    if ($closestIsStart) {
                        $status = 'forgot_scan'; // Treat as Check-In
                        $isForgotScanIn = false;
                    } else {
                        $isForgotScanIn = true; // Treat as Check-Out
                    }
                }
            }

            if ($isForgotScanIn) {
                // The scan was actually a clock-out. Do not create an 'in' record.
                // Shift the masukTime to keluarTime.
                $record['keluar'] = $masukTime;
                $masukTime = null;
                $checkInDateTime = null; // Prevent the 'in' record branch
            } else {
                // Create Normal 'in' Record
                Attendance::firstOrCreate([
                    'employee_id' => $employee->id,
                    'scan_date' => $checkInDateTime,
                    'scan_type' => 'in',
                ], [
                    'machine_name' => 'Excel Import',
                    'status' => $status,
                    'late_minutes' => $lateMinutes
                ]);
            }

            if (!empty($record['keluar'])) {
                // Determine correct status for the Out scan
                $outStatus = 'on_time';
                if ($isForgotScanIn ?? false) {
                    $outStatus = 'forgot_scan_in';
                }

                $keluarTimeObj = $importHelper->parseTime($record['keluar']);
                $checkOutDateTime = Carbon::parse($dateStr . ' ' . $keluarTimeObj);

                Attendance::firstOrCreate([
                    'employee_id' => $employee->id,
                    'scan_date' => $checkOutDateTime,
                    'scan_type' => 'out',
                ], [
                    'machine_name' => 'Excel Import',
                    'status' => $outStatus,
                    'late_minutes' => 0
                ]);
            }
            $createdCount++;
        }

        return response()->json([
            'message' => "Import finalized. Saved $createdCount attendance records.",
        ]);
    }

    /**
     * Store manual attendance record from Dashboard
     */
    public function storeManual(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'clock_in' => 'nullable',
            'clock_out' => 'nullable'
        ]);

        if (empty($request->clock_in) && empty($request->clock_out)) {
            return response()->json(['message' => 'Please provide at least a Clock In or Clock Out time.'], 400);
        }

        $employeeId = $request->input('employee_id');
        $dateStr = Carbon::parse($request->input('date'))->format('Y-m-d');

        $employee = \App\Models\Employee::with('workSchedule')->find($employeeId);
        $expectedStartTime = '08:00:00';
        if ($employee && $employee->workSchedule && $employee->workSchedule->start_time) {
            $expectedStartTime = $employee->workSchedule->start_time;
        }

        // Handle Clock In
        if (!empty($request->clock_in)) {
            $inDateTime = Carbon::parse($dateStr . ' ' . $request->clock_in);

            $status = 'on_time';
            $lateMinutes = 0;

            if ($inDateTime->format('H:i:s') > $expectedStartTime) {
                $status = 'late';
                $expectedFullTime = Carbon::parse($dateStr . ' ' . $expectedStartTime);
                $lateMinutes = intval(abs($inDateTime->diffInMinutes($expectedFullTime, false)));
            }

            $inRecord = \App\Models\Attendance::where('employee_id', $employeeId)
                ->whereDate('scan_date', $dateStr)
                ->where('scan_type', 'in')
                ->first();

            if ($inRecord) {
                $inRecord->update(['scan_date' => $inDateTime, 'status' => $status, 'late_minutes' => $lateMinutes]);
            } else {
                \App\Models\Attendance::create([
                    'employee_id' => $employeeId,
                    'scan_date' => $inDateTime,
                    'scan_type' => 'in',
                    'machine_name' => 'Manual Input',
                    'status' => $status,
                    'late_minutes' => $lateMinutes
                ]);
            }
        }

        // Handle Clock Out
        if (!empty($request->clock_out)) {
            $outDateTime = Carbon::parse($dateStr . ' ' . $request->clock_out);

            $outRecord = \App\Models\Attendance::where('employee_id', $employeeId)
                ->whereDate('scan_date', $dateStr)
                ->where('scan_type', 'out')
                ->first();

            if ($outRecord) {
                $outRecord->update(['scan_date' => $outDateTime]);
            } else {
                \App\Models\Attendance::create([
                    'employee_id' => $employeeId,
                    'scan_date' => $outDateTime,
                    'scan_type' => 'out',
                    'machine_name' => 'Manual Input',
                    'status' => 'on_time',
                    'late_minutes' => 0
                ]);
            }
        }

        return response()->json(['message' => 'Manual attendance saved successfully.']);
    }

    /**
     * Fetch the active leave link, if any
     */
    public function getActiveLeaveLink()
    {
        $activeLink = LeaveLink::where('expires_at', '>', Carbon::now())
            ->orderBy('created_at', 'desc')
            ->first();

        if ($activeLink) {
            $url = url('/public/absence-form/' . $activeLink->token);
            return response()->json([
                'active' => true,
                'url' => $url,
                'expires_at' => $activeLink->expires_at
            ]);
        }

        return response()->json(['active' => false]);
    }

    /**
     * Generate a new 24hr shareable leave link
     */
    public function generateLeaveLink()
    {
        $token = Str::random(32);

        $link = LeaveLink::create([
            'token' => $token,
            'expires_at' => Carbon::now()->addHours(24)
        ]);

        return response()->json([
            'message' => 'Link created successfully',
            'url' => url('/public/absence-form/' . $token),
            'expires_at' => $link->expires_at
        ]);
    }
}
