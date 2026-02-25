<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\AuditLog::insert([
            [
                'user_id' => 1,
                'action' => 'created',
                'target_table' => 'employees',
                'target_id' => 1,
                'created_at' => now()->subHours(2),
                'updated_at' => now()->subHours(2)
            ],
            [
                'user_id' => 1,
                'action' => 'updated',
                'target_table' => 'settings',
                'target_id' => null,
                'created_at' => now()->subDays(1),
                'updated_at' => now()->subDays(1)
            ],
            [
                'user_id' => 1,
                'action' => 'created',
                'target_table' => 'assessments',
                'target_id' => 2,
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2)
            ]
        ]);
    }
}
