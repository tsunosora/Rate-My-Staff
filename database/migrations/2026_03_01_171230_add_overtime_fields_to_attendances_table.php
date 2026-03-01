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
        Schema::table('attendances', function (Blueprint $table) {
            $table->foreignId('overtime_category_id')->nullable()->constrained('overtime_categories')->nullOnDelete();
            $table->integer('approved_overtime_minutes')->default(0);
            $table->decimal('overtime_amount', 12, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['overtime_category_id']);
            $table->dropColumn(['overtime_category_id', 'approved_overtime_minutes', 'overtime_amount']);
        });
    }
};
