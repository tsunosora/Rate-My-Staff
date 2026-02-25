<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = [
            [
                'employee_code' => 'EMP001',
                'full_name' => 'Budi Santoso',
                'department' => 'Customer Service',
                'position' => 'Customer Service Representative',
                'join_date' => '2022-01-15',
                'email' => 'budi.santoso@voliko.com',
                'phone' => '081234567890',
            ],
            [
                'employee_code' => 'EMP002',
                'full_name' => 'Siti Rahayu',
                'department' => 'Customer Service',
                'position' => 'Senior Customer Service',
                'join_date' => '2021-06-20',
                'email' => 'siti.rahayu@voliko.com',
                'phone' => '081234567891',
            ],
            [
                'employee_code' => 'EMP003',
                'full_name' => 'Ahmad Wijaya',
                'department' => 'Production',
                'position' => 'Machine Operator',
                'join_date' => '2022-03-10',
                'email' => 'ahmad.wijaya@voliko.com',
                'phone' => '081234567892',
            ],
            [
                'employee_code' => 'EMP004',
                'full_name' => 'Dewi Kusuma',
                'department' => 'Production',
                'position' => 'Senior Operator',
                'join_date' => '2020-08-05',
                'email' => 'dewi.kusuma@voliko.com',
                'phone' => '081234567893',
            ],
            [
                'employee_code' => 'EMP005',
                'full_name' => 'Rudi Hartono',
                'department' => 'Design',
                'position' => 'Graphic Designer',
                'join_date' => '2021-11-12',
                'email' => 'rudi.hartono@voliko.com',
                'phone' => '081234567894',
            ],
            [
                'employee_code' => 'EMP006',
                'full_name' => 'Maya Indah',
                'department' => 'Design',
                'position' => 'Senior Designer',
                'join_date' => '2020-02-28',
                'email' => 'maya.indah@voliko.com',
                'phone' => '081234567895',
            ],
            [
                'employee_code' => 'EMP007',
                'full_name' => 'Eko Prasetyo',
                'department' => 'Customer Service',
                'position' => 'Customer Service Representative',
                'join_date' => '2023-01-10',
                'email' => 'eko.prasetyo@voliko.com',
                'phone' => '081234567896',
            ],
            [
                'employee_code' => 'EMP008',
                'full_name' => 'Lina Susanti',
                'department' => 'Production',
                'position' => 'Quality Control',
                'join_date' => '2022-07-15',
                'email' => 'lina.susanti@voliko.com',
                'phone' => '081234567897',
            ],
        ];

        foreach ($employees as $employeeData) {
            $deptParams = ['name' => $employeeData['department']];
            $department = \App\Models\Department::firstOrCreate($deptParams);

            $posParams = ['department_id' => $department->id, 'name' => $employeeData['position']];
            $position = \App\Models\Position::firstOrCreate($posParams);

            unset($employeeData['department']);
            unset($employeeData['position']);

            $employeeData['department_id'] = $department->id;
            $employeeData['position_id'] = $position->id;
            $employeeData['nickname'] = explode(' ', $employeeData['full_name'])[0];
            $employeeData['salary'] = rand(3000000, 15000000);

            Employee::create($employeeData);
        }

        // Create additional random employees
        Employee::factory(10)->create();
    }
}
