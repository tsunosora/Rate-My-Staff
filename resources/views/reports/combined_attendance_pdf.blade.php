<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Laporan Kehadiran & Analisis Ketidakhadiran</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #333;
        }

        h2 {
            text-align: center;
            margin-bottom: 5px;
            font-size: 14px;
        }

        p.subtitle {
            text-align: center;
            margin-top: 0;
            color: #666;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: center;
        }

        th {
            background-color: #f4f4f4;
            font-weight: bold;
        }

        .text-left {
            text-align: left;
        }

        .highlight {
            color: #d32f2f;
            font-weight: bold;
        }

        .page-break {
            page-break-after: always;
        }

        .status-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }

        .status-present {
            color: #059669;
        }

        .status-absent {
            color: #dc2626;
        }

        .status-late {
            color: #d97706;
        }
    </style>
</head>

<body>

    <!-- PART 0: RINGKASAN KEHADIRAN (SUMMARY) -->
    <h2>Ringkasan Kehadiran Karyawan</h2>
    <p class="subtitle">Periode: {{ \Carbon\Carbon::parse($startDate)->format('d M Y') }} -
        {{ \Carbon\Carbon::parse($endDate)->format('d M Y') }}</p>

    <table>
        <thead>
            <tr>
                <th colspan="4" class="text-left" style="background-color: #e2e8f0;">RATA-RATA JAM KERJA (Berdasarkan
                    Jam Kerja Sistem)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($stats['shift_averages'] as $shiftName => $avgs)
                <tr>
                    <td style="font-weight: bold; width: 40%;" class="text-left">{{ $shiftName }}</td>
                    <td style="width: 30%;">Masuk: {{ $avgs['in'] }}</td>
                    <td style="width: 30%;">Pulang: {{ $avgs['out'] }}</td>
                    <td></td>
                </tr>
            @empty
                <tr>
                    <td colspan="4">Tidak ada data shift.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table>
        <tbody>
            <!-- Top 5 Paling Sering Terlambat -->
            <tr>
                <th colspan="4" class="text-left" style="background-color: #fee2e2; color: #991b1b;">TOP 5 KARYAWAN
                    SERING TERLAMBAT</th>
            </tr>
            @if(count($stats['top_late']) > 0)
                <tr>
                    <td style="font-weight: bold; width: 30%;" class="text-left">Nama</td>
                    <td style="font-weight: bold; width: 30%;">Departemen</td>
                    <td style="font-weight: bold; width: 40%;">Total Terlambat</td>
                    <td></td>
                </tr>
                @foreach($stats['top_late'] as $emp)
                    <tr>
                        <td class="text-left">{{ $emp['name'] }}</td>
                        <td>{{ $emp['department'] }}</td>
                        <td>{{ $emp['late_count'] }} kali</td>
                        <td></td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="4" style="font-style: italic; color: #718096;">Tidak ada karyawan yang terlambat pada
                        periode ini.</td>
                </tr>
            @endif

            <!-- Top 5 Paling Rajin / Tepat Waktu -->
            <tr>
                <th colspan="4" class="text-left" style="background-color: #dcfce7; color: #166534;">TOP 5 KARYAWAN
                    PALING TEPAT WAKTU</th>
            </tr>
            @if(count($stats['top_ontime']) > 0)
                <tr>
                    <td style="font-weight: bold;" class="text-left">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Tepat Waktu</td>
                    <td></td>
                </tr>
                @foreach($stats['top_ontime'] as $emp)
                    <tr>
                        <td class="text-left">{{ $emp['name'] }}</td>
                        <td>{{ $emp['department'] }}</td>
                        <td>{{ $emp['ontime_count'] }} kali</td>
                        <td></td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="4" style="font-style: italic; color: #718096;">Tidak data kehadiran tepat waktu pada
                        periode ini.</td>
                </tr>
            @endif

            <!-- Top 5 Paling Sering Lembur -->
            <tr>
                <th colspan="4" class="text-left" style="background-color: #e0f2fe; color: #075985;">TOP 5 KARYAWAN
                    PALING SERING LEMBUR</th>
            </tr>
            @if(count($stats['top_overtime']) > 0)
                <tr>
                    <td style="font-weight: bold;" class="text-left">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Lembur</td>
                    <td></td>
                </tr>
                @foreach($stats['top_overtime'] as $emp)
                    <tr>
                        <td class="text-left">{{ $emp['name'] }}</td>
                        <td>{{ $emp['department'] }}</td>
                        <td>{{ floor($emp['overtime_total_mins'] / 60) }} jam {{ $emp['overtime_total_mins'] % 60 }} menit</td>
                        <td></td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="4" style="font-style: italic; color: #718096;">Tidak ada data lembur pada periode ini.</td>
                </tr>
            @endif

            <!-- Top 5 Paling Sering Izin/Sakit/Alpha -->
            <tr>
                <th colspan="4" class="text-left" style="background-color: #fee2e2; color: #991b1b;">TOP 5 KARYAWAN
                    SERING IZIN / SAKIT / ALPHA</th>
            </tr>
            @if(count($stats['top_absence']) > 0)
                <tr>
                    <td style="font-weight: bold;" class="text-left">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Ketidakhadiran</td>
                    <td></td>
                </tr>
                @foreach($stats['top_absence'] as $emp)
                    <tr>
                        <td class="text-left">{{ $emp['name'] }}</td>
                        <td>{{ $emp['department'] }}</td>
                        <td>{{ $emp['absence_score'] }} kali absen</td>
                        <td></td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="4" style="font-style: italic; color: #718096;">Tidak ada karyawan yang izin/sakit/alpha
                        pada periode ini.</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- PART 1: ABSENCE ANALYSIS SUMMARY -->
    <h2>Rekap Analisis Ketidakhadiran & Kedisiplinan</h2>
    <p class="subtitle">Periode: {{ \Carbon\Carbon::parse($startDate)->format('d M Y') }} -
        {{ \Carbon\Carbon::parse($endDate)->format('d M Y') }}
    </p>

    <table>
        <thead>
            <tr>
                <th class="text-left">Nama Karyawan</th>
                <th>Departemen</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Cuti</th>
                <th>Alpha (Absent)</th>
                <th>Sering Terlambat</th>
                <th>Total Terlambat</th>
                <th>Total Lembur</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($analysisData as $row)
                <tr>
                    <td class="text-left">{{ $row['employee_name'] }}</td>
                    <td>{{ $row['department'] ?? '-' }}</td>
                    <td class="{{ $row['izin'] > 0 ? 'highlight' : '' }}">{{ $row['izin'] }}</td>
                    <td class="{{ $row['sakit'] > 0 ? 'highlight' : '' }}">{{ $row['sakit'] }}</td>
                    <td>{{ $row['cuti'] }}</td>
                    <td class="{{ $row['absent'] > 0 ? 'highlight' : '' }}">{{ $row['absent'] }}</td>
                    <td>{{ $row['late_count'] }} kali</td>
                    <td>{{ $row['total_late_minutes'] }} mnt</td>
                    <td>{{ $row['total_overtime_minutes'] }} mnt</td>
                </tr>
            @empty
                <tr>
                    <td colspan="9">Tidak ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- PART 2: DETAILED ATTENDANCE LOG -->
    <h2>Laporan Detail Kehadiran Harian</h2>
    <p class="subtitle">Periode: {{ \Carbon\Carbon::parse($startDate)->format('d M Y') }} -
        {{ \Carbon\Carbon::parse($endDate)->format('d M Y') }}
    </p>

    <table>
        <thead>
            <tr>
                <th class="text-left">Tanggal</th>
                <th class="text-left">Nama</th>
                <th>Shift</th>
                <th>In</th>
                <th>Out</th>
                <th>Terlambat</th>
                <th>Lembur</th>
                <th>Status</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($reportData as $row)
                <tr>
                    <td class="text-left">{{ \Carbon\Carbon::parse($row['date'])->format('d M Y') }}</td>
                    <td class="text-left">{{ $row['employee_name'] }}</td>
                    <td>{{ $row['shift'] }}</td>
                    <td>{{ $row['clock_in'] }}</td>
                    <td>{{ $row['clock_out'] }}</td>
                    <td>{{ $row['late_minutes'] > 0 ? $row['late_minutes'] . ' mnt' : '-' }}</td>
                    <td>
                        {{ $row['overtime_minutes'] > 0 ? $row['overtime_minutes'] . ' mnt' : '-' }}
                        @if($row['overtime_reason'])
                            <br><small><i>{{ trim($row['overtime_reason']) }}</i></small>
                        @endif
                    </td>
                    <td>
                        <span class="status-badge 
                                    {{ $row['status'] === 'Present' ? 'status-present' : '' }}
                                    {{ $row['status'] === 'Absent' ? 'status-absent' : '' }}
                                    {{ $row['status'] === 'Late' ? 'status-late' : '' }}
                                ">
                            {{ $row['status'] }}
                        </span>
                    </td>
                    <td>{{ $row['absence_reason'] ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="9">Tidak ada data kehadiran detail.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

</body>

</html>