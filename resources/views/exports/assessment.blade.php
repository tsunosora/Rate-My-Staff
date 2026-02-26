<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Assessment Details</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 13px;
            color: #333;
            line-height: 1.4;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 15px;
        }

        .header h2 {
            margin: 0 0 5px 0;
            color: #2c3e50;
            font-size: 20px;
        }

        .header p {
            margin: 0;
            color: #7f8c8d;
            font-size: 12px;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-top: 25px;
            margin-bottom: 15px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background-color: #f8f9fa;
            color: #2c3e50;
            font-weight: bold;
        }

        .info-table th {
            width: 30%;
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

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .box-container {
            border: 1px solid #ddd;
            padding: 15px;
            background-color: #fcfcfc;
            border-radius: 4px;
            margin-bottom: 15px;
        }

        .box-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #555;
            font-size: 12px;
        }

        .stars {
            color: #f39c12;
            font-size: 14px;
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
        }
    </style>
</head>

<body>
    <div class="header">
        <h2>Employee Assessment Report</h2>
        <p>Period: {{ $assessment->period }} | Generated on: {{ now()->format('Y-m-d H:i') }}</p>
    </div>

    <!-- Employee Info -->
    <table class="info-table">
        <tbody>
            <tr>
                <th>Employee Name</th>
                <td>{{ $assessment->employee->full_name ?? 'N/A' }}</td>
                <th>Employee Code</th>
                <td>{{ $assessment->employee->employee_code ?? 'N/A' }}</td>
            </tr>
            <tr>
                <th>Department</th>
                <td>{{ $assessment->employee->department->name ?? 'N/A' }}</td>
                <th>Position</th>
                <td>{{ $assessment->employee->position->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <th>Evaluator</th>
                <td>{{ $assessment->evaluator->name ?? 'System' }}</td>
                <th>Evaluation Date</th>
                <td>{{ \Carbon\Carbon::parse($assessment->assessment_date)->format('Y-m-d') }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Calculated Score Details -->
    @php
        $officialScore = (float) $assessment->total_score;
        $publicRating = $assessment->employee ? (float) $assessment->employee->public_rating : 0;
        $combinedScore = $publicRating > 0 ? ($officialScore + $publicRating) / 2 : $officialScore;
        $class = $combinedScore >= 4.0 ? 'status-high' : ($combinedScore >= 3.0 ? 'status-mid' : 'status-low');

        // Dynamic Recommendation Recalculated
        $rec = $assessment->recommendation;
        if ($publicRating > 0) {
            if ($combinedScore >= 4.5)
                $rec = 'Promosi / Kenaikan Gaji (Promote / Salary Increase)';
            elseif ($combinedScore >= 4.0)
                $rec = 'Berikan Bonus / Reward (Give Bonus / Reward)';
            elseif ($combinedScore >= 3.0)
                $rec = 'Pertahankan Kinerja (Maintain Performance)';
            elseif ($combinedScore >= 2.0)
                $rec = 'Perlu Pelatihan / Coaching (Needs Training / Coaching)';
            else
                $rec = 'Teguran / SP / Evaluasi Ketat (Warning / Strict Evaluation)';
        }
    @endphp

    <div class="section-title">Score Summary</div>
    <table class="info-table">
        <tbody>
            <tr>
                <th>Official Score</th>
                <td>{{ number_format($officialScore, 2) }} / 5.0 ({{ $assessment->grade }})</td>
                <th>Public Rating</th>
                <td>
                    @if($publicRating > 0)
                        <span class="stars">&#9733;</span> {{ number_format($publicRating, 1) }} / 5.0
                    @else
                        No Public Rating
                    @endif
                </td>
            </tr>
            <tr>
                <th>Combined Overall Score</th>
                <td colspan="3" class="{{ $class }}" style="font-size: 16px;">
                    {{ number_format($combinedScore, 2) }} / 5.0
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Indicators -->
    <div class="section-title">Performance Indicators ({{ $assessment->template->name ?? 'Unknown Template' }})</div>
    <table>
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Indicator Name</th>
                <th style="width: 15%; text-align: center;">Score</th>
                <th style="width: 40%;">Evaluator Notes</th>
            </tr>
        </thead>
        <tbody>
            @forelse($assessment->scores as $index => $score)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $score->indicator->name ?? 'Unknown Indicator' }}</td>
                    <td class="text-center"><strong>{{ $score->score }}</strong> / 5</td>
                    <td style="font-size: 11px; color: #555;">{{ $score->notes ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center">No indicator scores recorded.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Text fields -->
    <div class="box-container">
        <div class="box-title">General Evaluator Notes:</div>
        <div>{{ $assessment->evaluator_notes ?: 'No notes provided.' }}</div>
    </div>

    <div class="box-container">
        <div class="box-title">Development Plan:</div>
        <div>{{ $assessment->development_plan ?: 'No development plan provided.' }}</div>
    </div>

    <div class="box-container">
        <div class="box-title">Recommendation:</div>
        <div style="color: #2980b9; font-weight: bold;">{{ $rec }}</div>
    </div>

    <!-- Public Feedbacks -->
    @if(count($publicFeedbacks) > 0)
        <!-- Pagination break to ensure guests are readable -->
        <div style="page-break-inside: avoid;">
            <div class="section-title">Recent Public Guest Feedback</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Date</th>
                        <th style="width: 20%;">Guest Name</th>
                        <th style="width: 15%; text-align: center;">Rating</th>
                        <th style="width: 50%;">Feedback Notes</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($publicFeedbacks as $feedback)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($feedback->assessment_date)->format('Y-m-d') }}</td>
                            <td>{{ $feedback->rater_name ?: 'Anonymous' }}</td>
                            <td class="text-center">
                                <span class="stars">&#9733;</span> <strong>{{ $feedback->total_score }}</strong> / 5
                            </td>
                            <td style="font-size: 12px; font-style: italic;">
                                "{{ $feedback->evaluator_notes ?: 'No text feedback provided.' }}"</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            @if(count($publicFeedbacks) == 10)
                <p style="text-align: center; font-size: 11px; color: #7f8c8d;">* Showing the 10 most recent guest feedbacks.
                    View the system dashboard for the complete history.</p>
            @endif
        </div>
    @endif

</body>

</html>