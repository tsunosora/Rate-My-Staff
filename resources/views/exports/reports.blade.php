<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Reports & Analytics</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 10px;
        }

        .header h2 {
            margin: 0;
            color: #2c3e50;
        }

        .header p {
            margin: 5px 0 0 0;
            color: #7f8c8d;
        }

        .filters {
            margin-bottom: 20px;
        }

        .filters span {
            font-weight: bold;
            margin-right: 15px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f8f9fa;
            color: #2c3e50;
        }

        .status-high {
            color: #27ae60;
            font-weight: bold;
        }

        .status-mid {
            color: #f39c12;
            font-weight: bold;
        }

        .status-low {
            color: #c62828;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="header">
        <h2>Reports & Analytics</h2>
        <p>Generated on {{ now()->format('Y-m-d H:i') }}</p>
    </div>

    <div class="filters">
        <span>Period:</span> {{ $period === 'all' ? 'All Time' : $period }}<br>
        <span>Department:</span> {{ $department === 'all' ? 'All Departments' : $department }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Template</th>
                <th>Period</th>
                <th>Score</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($assessments as $assessment)
                <tr>
                    <td>{{ $assessment->assessment_date->format('Y-m-d') }}</td>
                    <td>{{ $assessment->employee->full_name }}</td>
                    <td>{{ $assessment->employee->department->name ?? '-' }}</td>
                    <td>{{ $assessment->template->name }}</td>
                    <td>{{ $assessment->period }}</td>
                    <td>
                        @php
                            $score = $assessment->total_score;
                            $class = $score >= 4.0 ? 'status-high' : ($score >= 3.0 ? 'status-mid' : 'status-low');
                        @endphp
                        <span class="{{ $class }}">{{ number_format($score, 2) }}</span>
                    </td>
                    <td>{{ ucfirst($assessment->status) }}</td>
                </tr>
            @endforeach
            @if(count($assessments) == 0)
                <tr>
                    <td colspan="7" style="text-align: center;">No assessments found matching the given filters.</td>
                </tr>
            @endif
        </tbody>
    </table>
</body>

</html>