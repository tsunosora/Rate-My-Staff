<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });

Route::middleware('auth:sanctum')->group(function () {
    // Legacy API endpoints
    // Route::get('employees/search', [\App\Http\Controllers\Api\EmployeeApiController::class, 'search']);
    // Route::get('employees/{employee}/stats', [\App\Http\Controllers\Api\EmployeeApiController::class, 'stats']);
    // Route::get('dashboard/stats', [\App\Http\Controllers\Api\DashboardApiController::class, 'stats']);
    // Route::get('dashboard/recent-activities', [\App\Http\Controllers\Api\DashboardApiController::class, 'recentActivities']);
});

// Fingerspot Webhook Receiver
Route::post('/fingerspot/webhook', [\App\Http\Controllers\AttendanceController::class, 'webhook']);
