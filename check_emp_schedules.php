<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$emps = \App\Models\Employee::get();
foreach ($emps as $e) {
    echo $e->full_name . ' -> Schedule ID: ' . ($e->work_schedule_id ?? 'NULL') . "\n";
}
