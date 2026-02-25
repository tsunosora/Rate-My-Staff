<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('template_id')->constrained('assessment_templates')->onDelete('cascade');
            $table->foreignId('evaluator_id')->constrained('users')->onDelete('cascade');
            $table->date('assessment_date');
            $table->date('assessment_period_start')->nullable();
            $table->date('assessment_period_end')->nullable();
            $table->decimal('total_score', 5, 2)->nullable();
            $table->string('grade', 20)->nullable();
            $table->text('notes')->nullable();
            $table->text('recommendation')->nullable();
            $table->enum('status', ['draft', 'completed', 'approved'])->default('draft');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('employee_id');
            $table->index('template_id');
            $table->index('evaluator_id');
            $table->index('assessment_date');
            $table->index('status');
        });

        Schema::create('assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->onDelete('cascade');
            $table->foreignId('indicator_id')->constrained('assessment_indicators')->onDelete('cascade');
            $table->integer('score');
            $table->decimal('weighted_value', 5, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('assessment_id');
            $table->index('indicator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_scores');
        Schema::dropIfExists('assessments');
    }
};
