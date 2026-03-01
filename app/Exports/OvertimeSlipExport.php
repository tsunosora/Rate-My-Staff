<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class OvertimeSlipExport implements FromView, ShouldAutoSize, WithStyles
{
    protected $reportData;
    protected $employeeName;
    protected $categories;
    protected $startDate;
    protected $endDate;

    public function __construct(array $reportData, string $employeeName, $categories, $startDate, $endDate)
    {
        $this->reportData = $reportData;
        $this->employeeName = $employeeName;
        $this->categories = $categories; // Collection of OvertimeCategory
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public function view(): View
    {
        // Calculate Totals per Category
        $categoryTotals = [];
        $grandTotalRp = 0;

        foreach ($this->categories as $cat) {
            $categoryTotals[$cat->id] = [
                'name' => $cat->name,
                'rate' => $cat->rate,
                'count' => 0,
                'total_rp' => 0
            ];
        }

        foreach ($this->reportData as $row) {
            if (!empty($row['overtime_category_id'])) {
                $catId = $row['overtime_category_id'];
                if (isset($categoryTotals[$catId])) {
                    // Default behavior: if type is flat, count is 1. If hourly, count is hours (or minutes/60).
                    // The mockup shows "1" for the columns usually, implying instances. 
                    // Let's count instances or flat amounts for simplicity if it's flat/hybrid. 
                    // If it's pure hourly, maybe count hours. The mockup shows "1" for Lembur Longshif, Cetak, Libur.
                    // This implies frequency. We will just count '1' for the occurrence for the column marked,
                    // but the total Rp will take the actual calculated 'overtime_amount' from the db!

                    $categoryTotals[$catId]['count']++;
                    $categoryTotals[$catId]['total_rp'] += ($row['overtime_amount'] ?? 0);
                    $grandTotalRp += ($row['overtime_amount'] ?? 0);
                }
            }
        }

        return view('reports.overtime_slip_excel', [
            'reportData' => $this->reportData,
            'employeeName' => $this->employeeName,
            'categories' => $this->categories,
            'categoryTotals' => $categoryTotals,
            'grandTotalRp' => $grandTotalRp,
            'startDate' => $this->startDate,
            'endDate' => $this->endDate
        ]);
    }

    public function styles(Worksheet $sheet)
    {
        // Global alignment
        $sheet->getStyle($sheet->calculateWorksheetDimension())->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        // We will apply more complex styling within the Blade view using inline styles where possible, 
        // or rely on Maatwebsite formatting.
        return [];
    }
}
