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
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['assessment_period_start', 'assessment_period_end', 'notes', 'recommendation']);
            $table->string('period')->nullable()->after('assessment_date');
            $table->text('evaluator_notes')->nullable()->after('grade');
            $table->text('development_plan')->nullable()->after('evaluator_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['period', 'evaluator_notes', 'development_plan']);
            $table->date('assessment_period_start')->nullable();
            $table->date('assessment_period_end')->nullable();
            $table->text('notes')->nullable();
            $table->text('recommendation')->nullable();
        });
    }
};
