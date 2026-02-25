<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles
        $roles = ['Admin', 'Evaluator', 'HR', 'Owner'];
        
        foreach ($roles as $roleName) {
            Role::create(['name' => $roleName, 'guard_name' => 'web']);
        }

        // Create permissions
        $permissions = [
            // Employee permissions
            'view employees',
            'create employees',
            'edit employees',
            'delete employees',
            
            // Assessment permissions
            'view assessments',
            'create assessments',
            'edit assessments',
            'delete assessments',
            
            // Template permissions
            'view templates',
            'create templates',
            'edit templates',
            'delete templates',
            
            // Report permissions
            'view reports',
            'export reports',
            'import data',
            
            // User management permissions
            'view users',
            'create users',
            'edit users',
            'delete users',
            
            // Settings permissions
            'view settings',
            'edit settings',
        ];

        foreach ($permissions as $permissionName) {
            Permission::create(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // Assign permissions to roles
        $adminRole = Role::findByName('Admin');
        $adminRole->givePermissionTo(Permission::all());

        $evaluatorRole = Role::findByName('Evaluator');
        $evaluatorRole->givePermissionTo([
            'view employees',
            'view assessments',
            'create assessments',
            'edit assessments',
            'view reports',
            'export reports',
        ]);

        $hrRole = Role::findByName('HR');
        $hrRole->givePermissionTo([
            'view employees',
            'create employees',
            'edit employees',
            'view assessments',
            'view reports',
            'export reports',
            'import data',
        ]);

        $ownerRole = Role::findByName('Owner');
        $ownerRole->givePermissionTo(Permission::all());
    }
}
