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
        Schema::create('assessment_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('department_type', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('assessment_indicators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('assessment_templates')->onDelete('cascade');
            $table->string('category', 100);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->decimal('weight', 5, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index('template_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_indicators');
        Schema::dropIfExists('assessment_templates');
    }
};
