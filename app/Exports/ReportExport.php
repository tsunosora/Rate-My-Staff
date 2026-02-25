<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ReportExport implements FromCollection, WithHeadings, WithMapping
{
    protected $assessments;

    public function __construct($assessments)
    {
        $this->assessments = $assessments;
    }

    public function collection()
    {
        return $this->assessments;
    }

    public function headings(): array
    {
        return [
            'Assessment ID',
            'Date',
            'Employee Code',
            'Employee Name',
            'Department',
            'Position',
            'Template',
            'Period',
            'Score',
            'Status'
        ];
    }

    public function map($assessment): array
    {
        return [
            $assessment->id,
            $assessment->assessment_date->format('Y-m-d'),
            $assessment->employee->employee_code,
            $assessment->employee->full_name,
            $assessment->employee->department->name ?? 'N/A',
            $assessment->employee->position->name ?? 'N/A',
            $assessment->template->name,
            $assessment->period,
            $assessment->total_score,
            $assessment->status
        ];
    }
}
