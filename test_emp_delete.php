<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emp = \App\Models\Employee::first();
if (!$emp) {
    echo "No employees found\n";
    exit;
}

echo "First employee: " . $emp->full_name . " (ID: " . $emp->id . ")\n";
try {
    $emp->delete();
    echo "Deleted successfully.\n";
} catch (\Exception $e) {
    echo "Deletion failed: " . $e->getMessage() . "\n";
}
