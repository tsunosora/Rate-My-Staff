<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

$cloudId = 'C2630451070F2923';
$apiKey = '5LYDNGIT6BDI4UUV';

$startDateObj = Carbon::parse('2024-10-01'); // Choose a wider range or recent date
$endDateObj = Carbon::parse('2024-10-02');
$baseUrl = 'https://api.fingerspot.io/api';

while ($startDateObj->lte($endDateObj)) {
    $attendanceUpload = $startDateObj->format('Y-m-d');
    $currentTime = Carbon::now()->format('YmdHis'); // yyyyMMddhhmmss

    // Auth token logic: MD5(Cloud_ID + attendance_upload + current_time + API_KEY)
    $authString = $cloudId . $attendanceUpload . $currentTime . $apiKey;
    $auth = md5($authString);

    $url = "{$baseUrl}/download/attendance_log/{$cloudId}/{$attendanceUpload}/6/date_time/asc/JSON/{$auth}/{$currentTime}";
    echo "Requesting URL for {$attendanceUpload}: {$url}\n";

    $response = Http::timeout(30)->get($url);

    if ($response->successful()) {
        echo "Success!\n";
        print_r($response->json());
    } else {
        echo "Error ({$response->status()}): " . $response->body() . "\n";
    }

    $startDateObj->addDay();
}
