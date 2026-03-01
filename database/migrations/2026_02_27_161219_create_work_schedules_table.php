<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('work_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->time('break_start_time')->nullable();
            $table->time('break_end_time')->nullable();

            // Wages
            $table->decimal('daily_wage', 15, 2)->default(0);
            $table->decimal('monthly_wage', 15, 2)->default(0);
            $table->decimal('weekly_wage', 15, 2)->default(0);
            $table->decimal('holiday_wage', 15, 2)->default(0);
            $table->decimal('overtime_wage_per_hour', 15, 2)->default(0);

            $table->boolean('is_holiday')->default(false);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_schedules');
    }
};
