<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$payload = [
    'employee_id' => 1,
    'template_id' => 1,
    'period' => 'Q1 2026',
    'status' => 'completed',
    'evaluator_notes' => '',
    'development_plan' => '',
    'scores' => [
        ['indicator_id' => 1, 'score' => 4],
        ['indicator_id' => 2, 'score' => 5]
    ]
];
$request = \Illuminate\Http\Request::create('/api/assessments/single', 'POST', $payload);
try {
    $controller = app(\App\Http\Controllers\AssessmentController::class);
    $response = $controller->storeSingle($request);
    echo json_encode(['status' => $response->getStatusCode(), 'content' => json_decode($response->getContent(), true)]);
} catch (\Illuminate\Validation\ValidationException $e) {
    echo json_encode(['status' => 422, 'errors' => $e->errors()]);
} catch (\Exception $e) {
    echo $e->getMessage();
}
