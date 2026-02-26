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
        // Add public_token to employees table
        Schema::table('employees', function (Blueprint $table) {
            $table->uuid('public_token')->nullable()->unique()->after('employee_code');
        });

        // Modify assessments table to allow guest raters
        Schema::table('assessments', function (Blueprint $table) {
            $table->unsignedBigInteger('evaluator_id')->nullable()->change();
            $table->string('rater_name')->nullable()->after('evaluator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn('rater_name');
            $table->unsignedBigInteger('evaluator_id')->nullable(false)->change();
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('public_token');
        });
    }
};
