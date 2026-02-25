<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        $departmentNames = ['Customer Service', 'Production', 'Design', 'HR', 'Finance', 'IT'];
        $deptName = $this->faker->randomElement($departmentNames);

        $department = \App\Models\Department::firstOrCreate(['name' => $deptName]);

        $positionNames = [
            'Customer Service' => ['Representative', 'Senior CS', 'CS Supervisor'],
            'Production' => ['Operator', 'Senior Operator', 'Supervisor'],
            'Design' => ['Junior Designer', 'Designer', 'Senior Designer'],
            'HR' => ['HR Staff', 'HR Officer', 'HR Manager'],
            'Finance' => ['Accountant', 'Senior Accountant', 'Finance Manager'],
            'IT' => ['IT Support', 'Developer', 'IT Manager'],
        ];

        $posName = $this->faker->randomElement($positionNames[$deptName]);
        $position = \App\Models\Position::firstOrCreate([
            'department_id' => $department->id,
            'name' => $posName
        ]);

        return [
            'employee_code' => 'EMP' . str_pad($this->faker->unique()->numberBetween(100, 999), 3, '0', STR_PAD_LEFT),
            'full_name' => $this->faker->name(),
            'nickname' => $this->faker->firstName(),
            'department_id' => $department->id,
            'position_id' => $position->id,
            'photo_path' => null,
            'join_date' => $this->faker->dateTimeBetween('-3 years', '-1 month'),
            'salary' => $this->faker->randomFloat(2, 3000000, 15000000),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'is_active' => true,
        ];
    }
}
