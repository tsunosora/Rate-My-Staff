<table style="border-collapse: collapse;">
    <!-- Top Padding / Meta Info -->
    <tr>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        @foreach($categories as $cat)
        <td></td>
        @endforeach
    </tr>

    <!-- Main Table Header -->
    <tr>
        <td colspan="7" style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle;"></td>
        <td colspan="{{ count($categories) }}" style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle; background-color: #ffffff;">{{ strtoupper($employeeName) }}</td>
    </tr>
    <tr>
        <th style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle; width: 120px;" rowspan="2">Hari</th>
        <th style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle; width: 120px;" rowspan="2">Tanggal</th>
        <th style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle;" colspan="3">Jam Kerja</th>
        <th style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle;" colspan="2">Keterangan</th>
        <th style="border: 2px solid #000000; font-weight: bold; text-align: center; vertical-align: middle;" colspan="{{ count($categories) }}">Jumlah</th>
    </tr>
    <tr>
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 100px;">Masuk</th>
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 100px;">Pulang</th>
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 100px;">Shift</th>
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 120px;">Terlambat</th>
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 120px;">Lembur</th>
        
        @foreach($categories as $cat)
        <th style="border: 2px solid #000000; background-color: #FFC000; font-weight: bold; text-align: center; vertical-align: middle; width: 150px;">{{ strtoupper($cat->name) }}</th>
        @endforeach
    </tr>

    <!-- Data Rows -->
    @foreach($reportData as $row)
        @php
            $date = \Carbon\Carbon::parse($row['date']);
            $hariIndo = ['Sunday' => 'Minggu', 'Monday' => 'Senin', 'Tuesday' => 'Selasa', 'Wednesday' => 'Rabu', 'Thursday' => 'Kamis', 'Friday' => 'Jumat', 'Saturday' => 'Sabtu'];
            $hariName = $hariIndo[$date->format('l')];
            $tanggalFormat = $date->format('d-M');
            
            // Background red for Sunday
            $isSunday = $date->isSunday();
            $rowBg = $isSunday ? 'background-color: #FF0000; color: #FFFFFF;' : '';
        @endphp
        <tr>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $hariName }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $tanggalFormat }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $row['clock_in'] !== '-' ? $row['clock_in'] : '' }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $row['clock_out'] !== '-' ? $row['clock_out'] : '' }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $row['shift'] !== 'No Shift' ? $row['shift'] : '' }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $row['late_minutes'] > 0 ? $row['late_minutes'] . ' MENIT' : '' }}</td>
            <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">{{ $row['overtime_minutes'] > 0 ? floor($row['overtime_minutes']/60) . 'jam' . ($row['overtime_minutes']%60) . 'menit' : '' }}</td>
            
            @foreach($categories as $cat)
                @if($row['overtime_category_id'] == $cat->id)
                    <!-- Assuming value 1 for attendance instance as per mockup -->
                    <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}">1</td>
                @else
                    <td style="border: 1px solid #000000; text-align: center; {{ $rowBg }}"></td>
                @endif
            @endforeach
        </tr>
    @endforeach

    <!-- Footer Summary Rows -->
    <tr>
        <td colspan="7"></td>
        @foreach($categories as $cat)
        <td></td>
        @endforeach
    </tr>

    @foreach($categories as $cat)
        @php 
            $catTotal = $categoryTotals[$cat->id] ?? null; 
        @endphp
        @if($catTotal && $catTotal['count'] > 0)
        <tr>
            <td colspan="3" style="border: 1px solid #000000; text-align: center; font-weight: bold;">{{ strtoupper($cat->name) }}</td>
            <td colspan="2" style="border: 1px solid #000000; text-align: center;">Rp {{ number_format($catTotal['rate'], 0, ',', '.') }}</td>
            <td style="border: 1px solid #000000; text-align: center;">{{ $catTotal['count'] }}</td>
            <td style="border: 1px solid #000000; text-align: center;">Rp {{ number_format($catTotal['total_rp'], 0, ',', '.') }}</td>
            <td colspan="{{ count($categories) }}"></td>
        </tr>
        @endif
    @endforeach

    <!-- Grand Total Row -->
    <tr>
        <td colspan="3" style="border: 2px solid #000000; text-align: center; font-weight: bold;">Jumlah</td>
        <td colspan="4" style="border: 2px solid #000000; text-align: center; font-weight: bold;">Rp {{ number_format($grandTotalRp, 0, ',', '.') }}</td>
        <td colspan="{{ count($categories) }}" style="text-align: right; font-weight: bold; font-size: 14pt;">Rp {{ number_format($grandTotalRp, 0, ',', '.') }}</td>
    </tr>
</table>
