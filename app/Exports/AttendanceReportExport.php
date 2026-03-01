<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use App\Exports\Sheets\AttendanceSummarySheet;
use App\Exports\Sheets\AttendanceDetailSheet;

class AttendanceReportExport implements WithMultipleSheets
{
    use Exportable;

    protected $reportData;

    public function __construct(array $reportData)
    {
        $this->reportData = $reportData;
    }

    /**
     * @return array
     */
    public function sheets(): array
    {
        return [
            new AttendanceSummarySheet($this->reportData),
            new AttendanceDetailSheet($this->reportData),
        ];
    }
}
