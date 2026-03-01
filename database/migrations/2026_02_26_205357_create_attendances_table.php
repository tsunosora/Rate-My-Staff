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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->dateTime('scan_date');
            $table->string('scan_type', 20)->nullable(); // e.g., 'in', 'out'
            $table->string('machine_name', 100)->nullable();
            $table->string('sn_machine', 100)->nullable();
            $table->string('status', 20)->default('on_time'); // 'on_time', 'late', 'absent'
            $table->integer('late_minutes')->default(0); // If applicable
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
