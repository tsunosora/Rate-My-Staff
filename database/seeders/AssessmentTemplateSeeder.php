<?php

namespace Database\Seeders;

use App\Models\AssessmentTemplate;
use App\Models\AssessmentIndicator;
use Illuminate\Database\Seeder;

class AssessmentTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Template 1: Customer Service
        $csTemplate = AssessmentTemplate::create([
            'name' => 'Customer Service',
            'description' => 'Template penilaian untuk staf Customer Service',
            'department_type' => 'customer_service',
            'is_active' => true,
        ]);

        $csIndicators = [
            ['category' => 'Kedisiplinan', 'name' => 'Kehadiran', 'description' => 'Ketepatan waktu kehadiran', 'weight' => 15.00, 'sort_order' => 1],
            ['category' => 'Kedisiplinan', 'name' => 'Ketaatan aturan', 'description' => 'Kepatuhan terhadap peraturan perusahaan', 'weight' => 10.00, 'sort_order' => 2],
            ['category' => 'Komunikasi', 'name' => 'Komunikasi verbal', 'description' => 'Kemampuan berkomunikasi dengan jelas', 'weight' => 15.00, 'sort_order' => 3],
            ['category' => 'Komunikasi', 'name' => 'Komunikasi tertulis', 'description' => 'Kemampuan menulis email dan dokumen', 'weight' => 10.00, 'sort_order' => 4],
            ['category' => 'Pelayanan', 'name' => 'Sikap pelayanan', 'description' => 'Keramahan dan kesopanan dalam melayani', 'weight' => 20.00, 'sort_order' => 5],
            ['category' => 'Pelayanan', 'name' => 'Penyelesaian masalah', 'description' => 'Kemampuan menyelesaikan keluhan pelanggan', 'weight' => 20.00, 'sort_order' => 6],
            ['category' => 'Kerjasama', 'name' => 'Kerjasama tim', 'description' => 'Kemampuan bekerja sama dengan rekan kerja', 'weight' => 10.00, 'sort_order' => 7],
        ];

        foreach ($csIndicators as $indicator) {
            $indicator['template_id'] = $csTemplate->id;
            AssessmentIndicator::create($indicator);
        }

        // Template 2: Operator
        $operatorTemplate = AssessmentTemplate::create([
            'name' => 'Operator',
            'description' => 'Template penilaian untuk staf Operator Produksi',
            'department_type' => 'production',
            'is_active' => true,
        ]);

        $operatorIndicators = [
            ['category' => 'Kedisiplinan', 'name' => 'Kehadiran', 'description' => 'Ketepatan waktu kehadiran', 'weight' => 15.00, 'sort_order' => 1],
            ['category' => 'Kedisiplinan', 'name' => 'Ketaatan aturan', 'description' => 'Kepatuhan terhadap SOP dan peraturan', 'weight' => 10.00, 'sort_order' => 2],
            ['category' => 'Teknis', 'name' => 'Penguasaan mesin', 'description' => 'Kemampuan mengoperasikan mesin produksi', 'weight' => 25.00, 'sort_order' => 3],
            ['category' => 'Teknis', 'name' => 'Kualitas produksi', 'description' => 'Ketepatan dan kualitas hasil kerja', 'weight' => 20.00, 'sort_order' => 4],
            ['category' => 'Produktivitas', 'name' => 'Target harian', 'description' => 'Pencapaian target produksi harian', 'weight' => 20.00, 'sort_order' => 5],
            ['category' => 'Kerjasama', 'name' => 'Kerjasama tim', 'description' => 'Kemampuan bekerja sama dengan rekan kerja', 'weight' => 10.00, 'sort_order' => 6],
        ];

        foreach ($operatorIndicators as $indicator) {
            $indicator['template_id'] = $operatorTemplate->id;
            AssessmentIndicator::create($indicator);
        }

        // Template 3: Designer
        $designerTemplate = AssessmentTemplate::create([
            'name' => 'Designer',
            'description' => 'Template penilaian untuk staf Designer',
            'department_type' => 'design',
            'is_active' => true,
        ]);

        $designerIndicators = [
            ['category' => 'Kedisiplinan', 'name' => 'Kehadiran', 'description' => 'Ketepatan waktu kehadiran', 'weight' => 10.00, 'sort_order' => 1],
            ['category' => 'Kedisiplinan', 'name' => 'Ketaatan aturan', 'description' => 'Kepatuhan terhadap peraturan perusahaan', 'weight' => 10.00, 'sort_order' => 2],
            ['category' => 'Kreativitas', 'name' => 'Ide dan konsep', 'description' => 'Kemampuan menghasilkan ide kreatif', 'weight' => 20.00, 'sort_order' => 3],
            ['category' => 'Kreativitas', 'name' => 'Inovasi desain', 'description' => 'Kemampuan menciptakan desain inovatif', 'weight' => 15.00, 'sort_order' => 4],
            ['category' => 'Teknis', 'name' => 'Penguasaan tools', 'description' => 'Kemampuan menggunakan software desain', 'weight' => 20.00, 'sort_order' => 5],
            ['category' => 'Teknis', 'name' => 'Kualitas desain', 'description' => 'Kualitas hasil desain yang dihasilkan', 'weight' => 15.00, 'sort_order' => 6],
            ['category' => 'Kerjasama', 'name' => 'Kerjasama tim', 'description' => 'Kemampuan bekerja sama dengan tim', 'weight' => 10.00, 'sort_order' => 7],
        ];

        foreach ($designerIndicators as $indicator) {
            $indicator['template_id'] = $designerTemplate->id;
            AssessmentIndicator::create($indicator);
        }
    }
}
