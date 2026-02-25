<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Admin user
        $admin = User::create([
            'name' => 'Administrator',
            'email' => 'admin@voliko.com',
            'password' => Hash::make('password'),
        ]);
        $admin->assignRole('Admin');

        // Create Evaluator user
        $evaluator = User::create([
            'name' => 'Evaluator User',
            'email' => 'evaluator@voliko.com',
            'password' => Hash::make('password'),
        ]);
        $evaluator->assignRole('Evaluator');

        // Create HR user
        $hr = User::create([
            'name' => 'HR Manager',
            'email' => 'hr@voliko.com',
            'password' => Hash::make('password'),
        ]);
        $hr->assignRole('HR');

        // Create Owner user
        $owner = User::create([
            'name' => 'Company Owner',
            'email' => 'owner@voliko.com',
            'password' => Hash::make('password'),
        ]);
        $owner->assignRole('Owner');

        // Create additional random users
        User::factory(5)->create()->each(function ($user) {
            $user->assignRole('Evaluator');
        });
    }
}
