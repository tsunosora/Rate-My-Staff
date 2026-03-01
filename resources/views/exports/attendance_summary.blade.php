<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
</head>

<body>
    <table>
        <thead>
            <tr>
                <th colspan="4"
                    style="font-weight: bold; font-size: 16px; text-align: center; background-color: #4A5568; color: #FFFFFF;">
                    RINGKASAN KEHADIRAN KARYAWAN
                </th>
            </tr>
            <tr>
                <td colspan="4"></td>
            </tr>
        </thead>
        <tbody>
            <!-- Rata-rata Jam Masuk / Pulang -->
            <tr>
                <td colspan="4" style="font-weight: bold; background-color: #EDF2F7;">RATA-RATA JAM KERJA (Berdasarkan
                    Jam Kerja Sistem)</td>
            </tr>
            @foreach($stats['shift_averages'] as $shiftName => $avgs)
                <tr>
                    <td style="font-weight: bold;">{{ $shiftName }}</td>
                    <td>Masuk: {{ $avgs['in'] }}</td>
                    <td>Pulang: {{ $avgs['out'] }}</td>
                    <td></td>
                </tr>
            @endforeach
            <tr>
                <td colspan="4"></td>
            </tr>

            <!-- Top 5 Paling Sering Terlambat -->
            <tr>
                <td colspan="4" style="font-weight: bold; color: #C53030; background-color: #FFF5F5;">TOP 5 KARYAWAN
                    SERING TERLAMBAT</td>
            </tr>
            @if(count($stats['top_late']) > 0)
                <tr>
                    <td style="font-weight: bold;">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Terlambat</td>
                    <td></td>
                </tr>
                @foreach($stats['top_late'] as $emp)
                    <tr>
                        <td>{{ $emp['name'] }}</td>
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
            <tr>
                <td colspan="4"></td>
            </tr>

            <!-- Top 5 Paling Rajin / Tepat Waktu -->
            <tr>
                <td colspan="4" style="font-weight: bold; color: #276749; background-color: #F0FFF4;">TOP 5 KARYAWAN
                    PALING TEPAT WAKTU</td>
            </tr>
            @if(count($stats['top_ontime']) > 0)
                <tr>
                    <td style="font-weight: bold;">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Tepat Waktu</td>
                    <td></td>
                </tr>
                @foreach($stats['top_ontime'] as $emp)
                    <tr>
                        <td>{{ $emp['name'] }}</td>
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
            <tr>
                <td colspan="4"></td>
            </tr>

            <!-- Top 5 Paling Sering Lembur -->
            <tr>
                <td colspan="4" style="font-weight: bold; color: #2B6CB0; background-color: #EBF8FF;">TOP 5 KARYAWAN
                    PALING SERING LEMBUR</td>
            </tr>
            @if(count($stats['top_overtime']) > 0)
                <tr>
                    <td style="font-weight: bold;">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Lembur</td>
                    <td></td>
                </tr>
                @foreach($stats['top_overtime'] as $emp)
                    <tr>
                        <td>{{ $emp['name'] }}</td>
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
            <tr>
                <td colspan="4"></td>
            </tr>

            <!-- Top 5 Paling Sering Izin/Sakit/Alpha -->
            <tr>
                <td colspan="4" style="font-weight: bold; color: #742A2A; background-color: #FED7D7;">TOP 5 KARYAWAN
                    SERING IZIN / SAKIT / ALPHA</td>
            </tr>
            @if(count($stats['top_absence']) > 0)
                <tr>
                    <td style="font-weight: bold;">Nama</td>
                    <td style="font-weight: bold;">Departemen</td>
                    <td style="font-weight: bold;">Total Ketidakhadiran</td>
                    <td></td>
                </tr>
                @foreach($stats['top_absence'] as $emp)
                    <tr>
                        <td>{{ $emp['name'] }}</td>
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
</body>

</html>