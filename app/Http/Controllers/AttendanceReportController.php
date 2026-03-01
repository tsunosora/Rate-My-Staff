<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\Holiday;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class AttendanceReportController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        $departmentId = $request->get('department_id', 'all');
        $employeeId = $request->get('employee_id', 'all');
        $reportData = $this->getReportData($startDate, $endDate, $departmentId, $employeeId);

        // Sort by date desc, then employee name
        usort($reportData, function ($a, $b) {
            $dateCmp = strcmp($b['date'], $a['date']);
            if ($dateCmp === 0) {
                return strcmp($a['employee_name'], $b['employee_name']);
            }
            return $dateCmp;
        });

        // Pagination for the array
        $perPage = $request->get('per_page', 50);
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $paginatedData = array_slice($reportData, $offset, $perPage);

        return response()->json([
            'data' => $paginatedData,
            'current_page' => (int) $page,
            'last_page' => ceil(count($reportData) / $perPage),
            'total' => count($reportData),
            'per_page' => (int) $perPage
        ]);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        $departmentId = $request->get('department_id', 'all');
        $employeeId = $request->get('employee_id', 'all');

        $reportData = $this->getReportData($startDate, $endDate, $departmentId, $employeeId);

        // Sort specifically for Excel (maybe Name ascending, Date ascending is cleaner)
        usort($reportData, function ($a, $b) {
            $nameCmp = strcmp($a['employee_name'], $b['employee_name']);
            if ($nameCmp === 0) {
                return strcmp($a['date'], $b['date']);
            }
            return $nameCmp;
        });

        $fileName = 'Laporan_Kehadiran_' . $startDate . '_sd_' . $endDate . '.xlsx';

        // Use a new MultiSheet export instead of Single Sheet
        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\AttendanceMergedExport($reportData, $startDate, $endDate), $fileName);
    }

    public function exportPdf(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        $departmentId = $request->get('department_id', 'all');
        $employeeId = $request->get('employee_id', 'all');

        $reportData = $this->getReportData($startDate, $endDate, $departmentId, $employeeId);
        $analysisData = $this->getAnalysisData($startDate, $endDate, $departmentId, $employeeId);

        $stats = $this->calculateStats($reportData);

        // Sort Detailed Report by Date, then Name for PDF reading
        usort($reportData, function ($a, $b) {
            $dateCmp = strcmp($b['date'], $a['date']);
            if ($dateCmp === 0) {
                return strcmp($a['employee_name'], $b['employee_name']);
            }
            return $dateCmp;
        });

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.combined_attendance_pdf', [
            'stats' => $stats,
            'reportData' => $reportData,
            'analysisData' => $analysisData,
            'startDate' => $startDate,
            'endDate' => $endDate
        ]);

        $fileName = 'Laporan_Kehadiran_dan_Analisis_' . $startDate . '_sd_' . $endDate . '.pdf';
        return $pdf->download($fileName);
    }

    private function getAnalysisData($startDate, $endDate, $departmentId, $employeeId)
    {
        $reportData = $this->getReportData($startDate, $endDate, $departmentId, $employeeId);

        $analysis = [];

        foreach ($reportData as $row) {
            $empId = $row['employee_id'];
            if (!isset($analysis[$empId])) {
                $analysis[$empId] = [
                    'employee_name' => $row['employee_name'],
                    'department' => $row['department'],
                    'izin' => 0,
                    'sakit' => 0,
                    'cuti' => 0,
                    'absent' => 0,
                    'late_count' => 0,
                    'total_late_minutes' => 0,
                    'total_overtime_minutes' => 0,
                    'total_score' => 0 // used for sorting
                ];
            }

            // Count absences
            if ($row['status'] === 'Izin')
                $analysis[$empId]['izin']++;
            elseif ($row['status'] === 'Sakit')
                $analysis[$empId]['sakit']++;
            elseif ($row['status'] === 'Cuti')
                $analysis[$empId]['cuti']++;
            elseif ($row['status'] === 'Absent')
                $analysis[$empId]['absent']++;

            // Count lateness & overtime
            if ($row['late_minutes'] > 0) {
                $analysis[$empId]['late_count']++;
                $analysis[$empId]['total_late_minutes'] += $row['late_minutes'];
            }
            if ($row['overtime_minutes'] > 0) {
                $analysis[$empId]['total_overtime_minutes'] += $row['overtime_minutes'];
            }
        }

        // Calculate sort score (higher means worse attendance / more absence)
        foreach ($analysis as $empId => &$data) {
            // Give weights to types of absences for sorting priority
            $data['total_score'] = ($data['absent'] * 3) + ($data['sakit'] * 2) + ($data['izin'] * 2) + $data['cuti'];
        }

        // Convert to array and sort
        $analysisArray = array_values($analysis);
        usort($analysisArray, function ($a, $b) {
            // Sort by highest absence score first, then by late count
            if ($b['total_score'] === $a['total_score']) {
                return $b['late_count'] <=> $a['late_count'];
            }
            return $b['total_score'] <=> $a['total_score'];
        });

        return $analysisArray;
    }

    public function getReportData($startDate, $endDate, $departmentId, $employeeId)
    {
        $query = Employee::with([
            'department',
            'workSchedule',
            'attendances' => function ($q) use ($startDate, $endDate) {
                $q->whereBetween('scan_date', [
                    Carbon::parse($startDate)->startOfDay(),
                    Carbon::parse($endDate)->endOfDay()
                ])->orderBy('scan_date');
            }
        ])->active();

        if ($departmentId !== 'all') {
            $query->where('department_id', $departmentId);
        }

        if ($employeeId !== 'all') {
            $query->where('id', $employeeId);
        }

        $employees = $query->get();

        $period = CarbonPeriod::create($startDate, $endDate);
        $reportData = [];

        // Pre-fetch all available schedules for dynamic matching
        $allWorkSchedules = \App\Models\WorkSchedule::all();

        // Fetch holiday config
        $autoSundayHoliday = Setting::get('auto_sunday_holiday', 'false') === 'true';
        $holidaysList = Holiday::pluck('date')->toArray();

        foreach ($employees as $employee) {
            $attendancesByDate = $employee->attendances->groupBy(function ($att) {
                return Carbon::parse($att->scan_date)->format('Y-m-d');
            });

            // If a specific employee is selected, we might want to show all days in the period.
            // For a general report (all employees), we typically just want to show days where *something* happened,
            // or perhaps we still want to show every day to see Absences. Let's show every day in the period for each employee.
            // However, this might be huge if there are 100 employees and 30 days = 3000 rows.
            // Let's only include rows if they have attendance OR if it's a specific employee being viewed.
            $showAllDays = ($employeeId !== 'all') ? true : false;

            if ($showAllDays) {
                $daysToProcess = [];
                foreach ($period as $date) {
                    $daysToProcess[] = $date->format('Y-m-d');
                }
            } else {
                $daysToProcess = $attendancesByDate->keys()->toArray();
            }

            foreach ($daysToProcess as $dateStr) {
                $dailyAtts = $attendancesByDate->get($dateStr, collect());

                $inScans = $dailyAtts->where('scan_type', 'in')->sortBy('scan_date');
                $outScans = $dailyAtts->where('scan_type', 'out')->sortBy('scan_date');

                $clockIn = $inScans->first();
                $clockOut = $outScans->last();

                // 1) Enforce Shift from Work Schedule
                $shiftName = 'No Shift';
                $shiftStart = null;
                $shiftEnd = null;
                $lateTolerance = 15; // default 15 mins

                if ($clockIn) {
                    // Find actual closest schedule from all available schedules
                    $actualIn = Carbon::parse($clockIn->scan_date);
                    $closestSchedule = null;
                    $minDiff = PHP_INT_MAX;

                    foreach ($allWorkSchedules as $ws) {
                        if (!$ws->start_time)
                            continue;
                        $wsStart = Carbon::parse($dateStr . ' ' . $ws->start_time);
                        $diff = abs($actualIn->diffInMinutes($wsStart, false)); // absolute difference in minutes

                        if ($diff < $minDiff) {
                            $minDiff = $diff;
                            $closestSchedule = $ws;
                        }
                    }

                    if ($closestSchedule) {
                        $shiftName = $closestSchedule->name;
                        $shiftStart = $closestSchedule->start_time;
                        $shiftEnd = $closestSchedule->end_time;
                        $lateTolerance = $closestSchedule->late_tolerance_minutes ?? 15;
                    }
                } else {
                    // Fallback to assigned schedule if Absent
                    if ($employee->workSchedule) {
                        $shiftName = $employee->workSchedule->name;
                        $shiftStart = $employee->workSchedule->start_time;
                        $shiftEnd = $employee->workSchedule->end_time;
                        $lateTolerance = $employee->workSchedule->late_tolerance_minutes ?? 15;
                    }
                }

                $lateTolerance = $lateTolerance ?? 0;

                // Determine base status for no-scans
                $status = 'Absent';
                $isSunday = Carbon::parse($dateStr)->isSunday();
                // Detect if an absence record exists instead of in/out scans
                $absenceRecord = $dailyAtts->where('scan_type', 'absence')->first();
                $absenceReason = null;

                if ($absenceRecord) {
                    $status = $absenceRecord->status;
                    $absenceReason = $absenceRecord->absence_reason;
                } else {
                    if (!$clockIn && !$clockOut) {
                        if (in_array($dateStr, $holidaysList) || ($isSunday && $autoSundayHoliday)) {
                            $status = 'Libur';
                        }
                    }
                }

                $lateMinutes = 0;
                $overtimeMinutes = 0;

                if ($clockIn) {
                    if ($clockIn->status === 'long_shift') {
                        $status = 'Long Shift / Lembur';
                    } elseif ($clockIn->status === 'forgot_scan') {
                        $status = 'Lupa Scan Pulang';
                    } else {
                        $status = 'Present';
                    }

                    $storedLate = intval(abs($clockIn->late_minutes));
                    if ($storedLate > 0) {
                        $lateMinutes = $storedLate;
                        if ($lateMinutes <= $lateTolerance) {
                            $lateMinutes = 0;
                        } else {
                            if ($status === 'Present')
                                $status = 'Late';
                        }
                    } elseif ($shiftStart) {
                        $expectedIn = Carbon::parse($dateStr . ' ' . $shiftStart);
                        $actualIn = Carbon::parse($clockIn->scan_date);
                        if ($actualIn->greaterThan($expectedIn)) {
                            $diff = intval(abs($actualIn->diffInMinutes($expectedIn, false)));
                            if ($diff > $lateTolerance) {
                                $lateMinutes = $diff;
                                if ($status === 'Present')
                                    $status = 'Late';
                            }
                        }
                    }
                } elseif ($clockOut) {
                    if ($clockOut->status === 'forgot_scan_in') {
                        $status = 'Lupa Scan Masuk';
                    }
                }

                $storedOvertime = 0;
                $overtimeReason = null;
                if ($clockIn && $clockIn->overtime_minutes > 0) {
                    $storedOvertime = intval(abs($clockIn->overtime_minutes));
                    $overtimeReason = $clockIn->overtime_reason;
                } elseif ($clockOut && $clockOut->overtime_minutes > 0) {
                    $storedOvertime = intval(abs($clockOut->overtime_minutes));
                    $overtimeReason = $clockOut->overtime_reason;
                }

                if ($storedOvertime > 0) {
                    $overtimeMinutes = $storedOvertime;
                } elseif ($clockIn && $clockOut && $shiftEnd) {
                    $expectedOut = Carbon::parse($dateStr . ' ' . $shiftEnd);
                    $actualOut = Carbon::parse($clockOut->scan_date);

                    if ($actualOut->greaterThan($expectedOut)) {
                        $diff = intval(abs($actualOut->diffInMinutes($expectedOut, false)));
                        if ($diff >= 60) {
                            $overtimeMinutes = $diff;
                        }
                    }
                }

                $reportData[] = [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->full_name,
                    'department' => $employee->department ? $employee->department->name : '-',
                    'date' => $dateStr,
                    'shift' => $shiftName,
                    'shift_start' => $shiftStart,
                    'shift_end' => $shiftEnd,
                    'clock_in' => $clockIn ? Carbon::parse($clockIn->scan_date)->format('H:i') : '-',
                    'clock_out' => $clockOut ? Carbon::parse($clockOut->scan_date)->format('H:i') : '-',
                    'late_minutes' => $lateMinutes,
                    'overtime_minutes' => $overtimeMinutes,
                    'overtime_reason' => $overtimeReason,
                    'absence_reason' => $absenceReason,
                    'status' => $status
                ];
            }
        }

        return $reportData;
    }

    /**
     * Update Attendance Record from Detailed Report
     */
    public function updateReport(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'clock_in' => 'nullable',
            'clock_out' => 'nullable',
            'late_minutes' => 'nullable|integer',
            'overtime_minutes' => 'nullable|integer',
            'overtime_reason' => 'nullable|string',
            'status' => 'nullable|string'
        ]);

        $employeeId = $request->input('employee_id');
        $dateStr = Carbon::parse($request->input('date'))->format('Y-m-d');
        $clockInTime = $request->input('clock_in');
        $clockOutTime = $request->input('clock_out');
        $lateMins = $request->input('late_minutes', 0);
        $overtimeMins = $request->input('overtime_minutes', 0);
        $overtimeReason = $request->input('overtime_reason', null);
        $displayStatus = $request->input('status', 'Present');

        $dbStatus = 'on_time';
        if ($displayStatus === 'Absent')
            $dbStatus = 'absent';
        elseif ($displayStatus === 'Late')
            $dbStatus = 'late';
        elseif ($displayStatus === 'Long Shift / Lembur')
            $dbStatus = 'long_shift';
        elseif ($displayStatus === 'Lupa Scan Masuk')
            $dbStatus = 'forgot_scan_in';
        elseif ($displayStatus === 'Lupa Scan Pulang')
            $dbStatus = 'forgot_scan';

        // Note: Time is expected to be H:i

        // Handle Clock In
        if ($clockInTime) {
            $inDateTime = Carbon::parse($dateStr . ' ' . $clockInTime);
            $inRecord = \App\Models\Attendance::where('employee_id', $employeeId)
                ->whereDate('scan_date', $dateStr)
                ->where('scan_type', 'in')
                ->first();

            if ($inRecord) {
                $inRecord->update([
                    'scan_date' => $inDateTime,
                    'status' => $dbStatus,
                    'late_minutes' => $lateMins,
                    'overtime_minutes' => $overtimeMins,
                    'overtime_reason' => $overtimeReason
                ]);
            } else {
                \App\Models\Attendance::create([
                    'employee_id' => $employeeId,
                    'scan_date' => $inDateTime,
                    'scan_type' => 'in',
                    'machine_name' => 'Manual Edit',
                    'status' => $dbStatus,
                    'late_minutes' => $lateMins,
                    'overtime_minutes' => $overtimeMins,
                    'overtime_reason' => $overtimeReason
                ]);
            }
        }

        // Handle Clock Out
        if ($clockOutTime) {
            $outDateTime = Carbon::parse($dateStr . ' ' . $clockOutTime);
            $outRecord = \App\Models\Attendance::where('employee_id', $employeeId)
                ->whereDate('scan_date', $dateStr)
                ->where('scan_type', 'out')
                ->first();

            if ($outRecord) {
                $outRecord->update([
                    'scan_date' => $outDateTime,
                    'status' => $dbStatus,
                    'late_minutes' => $lateMins,
                    'overtime_minutes' => $overtimeMins,
                    'overtime_reason' => $overtimeReason
                ]);
            } else {
                \App\Models\Attendance::create([
                    'employee_id' => $employeeId,
                    'scan_date' => $outDateTime,
                    'scan_type' => 'out',
                    'machine_name' => 'Manual Edit',
                    'status' => $dbStatus,
                    'late_minutes' => $lateMins,
                    'overtime_minutes' => $overtimeMins,
                    'overtime_reason' => $overtimeReason
                ]);
            }
        }

        return response()->json(['message' => 'Attendance record updated successfully.']);
    }

    private function calculateStats(array $data): array
    {
        $stats = [
            'total_records' => count($data),
            'shift_averages' => [],
            'top_late' => [],
            'top_ontime' => [],
            'top_overtime' => [],
            'top_absence' => []
        ];

        if (empty($data))
            return $stats;

        $shiftData = [];
        $employeeStats = [];

        foreach ($data as $row) {
            $shift = $row['shift']; // Exact name from system
            $empName = $row['employee_name'];

            if (!isset($employeeStats[$empName])) {
                $employeeStats[$empName] = [
                    'name' => $empName,
                    'late_count' => 0,
                    'ontime_count' => 0,
                    'overtime_total_mins' => 0,
                    'absence_score' => 0,
                    'department' => $row['department']
                ];
            }

            // Tally absences
            if (in_array($row['status'], ['Izin', 'Sakit', 'Cuti', 'Absent'])) {
                $employeeStats[$empName]['absence_score']++;
            }

            // Tally statuses
            if ($row['status'] === 'Late' || $row['late_minutes'] > 0) {
                $employeeStats[$empName]['late_count']++;
            } elseif (in_array($row['status'], ['Present', 'on_time']) && $row['late_minutes'] == 0) {
                $employeeStats[$empName]['ontime_count']++;
            }

            if ($row['overtime_minutes'] > 0) {
                $employeeStats[$empName]['overtime_total_mins'] += $row['overtime_minutes'];
            }

            // Gather times for averages based on dynamic shifts
            if (!in_array($shift, ['No Shift', '-'])) {
                if (!isset($shiftData[$shift])) {
                    $shiftData[$shift] = ['in' => [], 'out' => []];
                }
                if ($row['clock_in'] !== '-')
                    $shiftData[$shift]['in'][] = $this->timeToMinutes($row['clock_in']);
                if ($row['clock_out'] !== '-')
                    $shiftData[$shift]['out'][] = $this->timeToMinutes($row['clock_out']);
            }
        }

        foreach ($shiftData as $shiftName => $times) {
            $stats['shift_averages'][$shiftName] = [
                'in' => $this->averageTime($times['in']),
                'out' => $this->averageTime($times['out'])
            ];
        }

        // Sort for Top 5 Late
        $topLate = $employeeStats;
        usort($topLate, fn($a, $b) => $b['late_count'] <=> $a['late_count']);
        $stats['top_late'] = array_slice(array_filter($topLate, fn($e) => $e['late_count'] > 0), 0, 5);

        // Sort for Top 5 On Time
        $topOntime = $employeeStats;
        usort($topOntime, fn($a, $b) => $b['ontime_count'] <=> $a['ontime_count']);
        $stats['top_ontime'] = array_slice(array_filter($topOntime, fn($e) => $e['ontime_count'] > 0), 0, 5);

        // Sort for Top 5 Overtime
        $topOvertime = $employeeStats;
        usort($topOvertime, fn($a, $b) => $b['overtime_total_mins'] <=> $a['overtime_total_mins']);
        $stats['top_overtime'] = array_slice(array_filter($topOvertime, fn($e) => $e['overtime_total_mins'] > 0), 0, 5);

        // Sort for Top 5 Absences
        $topAbsence = $employeeStats;
        usort($topAbsence, fn($a, $b) => $b['absence_score'] <=> $a['absence_score']);
        $stats['top_absence'] = array_slice(array_filter($topAbsence, fn($e) => $e['absence_score'] > 0), 0, 5);

        return $stats;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        if (count($parts) < 2)
            return 0;
        return ((int) $parts[0] * 60) + (int) $parts[1];
    }

    private function averageTime(array $minutesArr): string
    {
        if (empty($minutesArr))
            return '-';
        $avg = array_sum($minutesArr) / count($minutesArr);
        $hours = floor($avg / 60);
        $mins = round($avg - ($hours * 60));
        return sprintf('%02d:%02d', $hours, $mins);
    }
}
