<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;

$employees = Employee::orderBy('id')->get();
$seen = [];
$duplicates = [];

echo "Total Employees Before: " . $employees->count() . "\n";

foreach ($employees as $emp) {
    // Normalize name to catch the hidden space duplicates
    $normName = strtolower(preg_replace('/\s+/', '', $emp->full_name));

    if (isset($seen[$normName])) {
        // This is a duplicate
        $original = $seen[$normName];
        echo "Duplicate found: [ID {$emp->id}] '{$emp->full_name}' -> matches original [ID {$original->id}] '{$original->full_name}'\n";

        $duplicates[] = $emp->id;

        // Let's delete it
        // We might want to re-assign attendances or assessments to the original before deleting if they made any, but they were just imported today.
        // The ones imported today will be re-imported perfectly if we delete them.
        // For safety, force delete.
        $emp->forceDelete();
    } else {
        $seen[$normName] = $emp;
    }
}

echo "Deleted " . count($duplicates) . " duplicates.\n";
echo "Total Employees After: " . Employee::count() . "\n";
