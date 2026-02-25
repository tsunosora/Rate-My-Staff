<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DashboardController;

// Auth Routes
Route::get('/login', function () {
    return view('welcome');
})->name('login');
Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

// Authenticated API Routes
Route::get('/api/test-auth', function () {
    return [
        'session_id' => session()->getId(),
        'auth_check' => auth()->check(),
        'user' => auth()->user()
    ];
});

Route::middleware('auth')->group(function () {
    Route::get('/api/user', function (Illuminate\Http\Request $request) {
        return response()->json($request->user());
    });

    Route::get('/api/dashboard', [DashboardController::class, 'index']);

    // Assessment API
    Route::get('/api/assessments/templates', [\App\Http\Controllers\AssessmentController::class, 'getTemplates']);
    Route::get('/api/assessments/templates/{id}', [\App\Http\Controllers\AssessmentController::class, 'getTemplateDetails']);
    Route::get('/api/assessments/employees', [\App\Http\Controllers\AssessmentController::class, 'getEmployees']);
    Route::post('/api/assessments/single', [\App\Http\Controllers\AssessmentController::class, 'storeSingle']);
    Route::put('/api/assessments/single/{id}', [\App\Http\Controllers\AssessmentController::class, 'updateSingle']);

    // Assessment Template Management API
    Route::apiResource('/api/assessment-templates', \App\Http\Controllers\AssessmentTemplateController::class);
    Route::post('/api/assessment-templates/{assessment_template}/indicators', [\App\Http\Controllers\AssessmentTemplateController::class, 'storeIndicator']);
    Route::put('/api/assessment-indicators/{indicator}', [\App\Http\Controllers\AssessmentTemplateController::class, 'updateIndicator']);
    Route::delete('/api/assessment-indicators/{indicator}', [\App\Http\Controllers\AssessmentTemplateController::class, 'destroyIndicator']);

    // Employee API
    Route::get('/api/employees/export-pdf', [\App\Http\Controllers\EmployeeController::class, 'exportPdf']);
    Route::post('/api/employees/import-csv', [\App\Http\Controllers\EmployeeController::class, 'importCsv']);
    Route::get('/api/employees', [\App\Http\Controllers\EmployeeController::class, 'index']);
    Route::post('/api/employees', [\App\Http\Controllers\EmployeeController::class, 'store']);
    Route::get('/api/employees/{employee}', [\App\Http\Controllers\EmployeeController::class, 'show']);
    Route::put('/api/employees/{employee}', [\App\Http\Controllers\EmployeeController::class, 'update']);
    Route::delete('/api/employees/{employee}', [\App\Http\Controllers\EmployeeController::class, 'destroy']);

    // Reports API
    Route::get('/api/reports/export-pdf', [\App\Http\Controllers\ReportController::class, 'exportPdf']);
    Route::get('/api/reports/export-excel', [\App\Http\Controllers\ReportController::class, 'exportExcel']);
    Route::get('/api/reports/assessment/{id}', [\App\Http\Controllers\ReportController::class, 'showAssessment']);
    Route::get('/api/reports', [\App\Http\Controllers\ReportController::class, 'index']);
    Route::get('/api/reports/employee/{id}', [\App\Http\Controllers\ReportController::class, 'employeeReport']);

    // Master Data API
    Route::get('/api/departments', [\App\Http\Controllers\MasterDataController::class, 'departments']);
    Route::post('/api/departments', [\App\Http\Controllers\MasterDataController::class, 'storeDepartment']);
    Route::put('/api/departments/{id}', [\App\Http\Controllers\MasterDataController::class, 'updateDepartment']);
    Route::delete('/api/departments/{id}', [\App\Http\Controllers\MasterDataController::class, 'destroyDepartment']);

    Route::get('/api/positions', [\App\Http\Controllers\MasterDataController::class, 'positions']);
    Route::post('/api/positions', [\App\Http\Controllers\MasterDataController::class, 'storePosition']);
    Route::put('/api/positions/{id}', [\App\Http\Controllers\MasterDataController::class, 'updatePosition']);
    Route::delete('/api/positions/{id}', [\App\Http\Controllers\MasterDataController::class, 'destroyPosition']);

    // Settings API
    Route::get('/api/settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('/api/settings', [\App\Http\Controllers\SettingController::class, 'store']);
});

// Catch-all route for Vue SPA
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
