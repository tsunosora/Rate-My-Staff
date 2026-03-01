<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Rekap Analisis Ketidakhadiran</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }

        h2 {
            text-align: center;
            margin-bottom: 5px;
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
            padding: 8px;
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
    </style>
</head>

<body>

    <h2>Rekap Analisis Ketidakhadiran & Kedisiplinan</h2>
    <p class="subtitle">Periode: {{ \Carbon\Carbon::parse($startDate)->format('d M Y') }} -
        {{ \Carbon\Carbon::parse($endDate)->format('d M Y') }}</p>

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

</body>

</html>