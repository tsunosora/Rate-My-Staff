<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$scheduleId = 1; // Assuming 'Shift Pagi' is 1
$updated = \App\Models\Employee::whereNull('work_schedule_id')->update(['work_schedule_id' => $scheduleId]);
echo "Updated $updated employees to schedule ID $scheduleId\n";
