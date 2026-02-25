@extends('layouts.app')

@section('title', 'Riwayat Penilaian')
@section('page-title', 'Riwayat & Analisis')

@section('content')
<div id="history-app" v-cloak>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Employee Selection -->
        <div class="lg:col-span-1">
            <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Pilih Karyawan</h3>
                
                <div class="mb-4">
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i class="fas fa-search text-gray-400"></i>
                        </div>
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Cari karyawan..."
                            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent w-full">
                    </div>
                </div>

                <div class="space-y-2 max-h-96 overflow-y-auto">
                    <button v-for="emp in filteredEmployees" :key="emp.id"
                            @click="selectEmployee(emp)"
                            :class="{'bg-voliko-50 border-voliko-500': selectedEmployee?.id === emp.id, 'border-transparent hover:bg-gray-50': selectedEmployee?.id !== emp.id}"
                            class="w-full flex items-center p-3 border rounded-lg transition-colors text-left">
                        <img :src="emp.photo_url" :alt="emp.full_name" class="w-10 h-10 rounded-full object-cover mr-3">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 truncate">@{{ emp.full_name }}</p>
                            <p class="text-sm text-gray-500">@{{ emp.department }}</p>
                        </div>
                        <div v-if="emp.average_score" class="text-right">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                  :class="getScoreClass(emp.average_score)">
                                @{{ emp.average_score.toFixed(2) }}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Chart & Details -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Employee Info Card -->
            <div v-if="selectedEmployee" class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex items-center">
                    <img :src="selectedEmployee.photo_url" :alt="selectedEmployee.full_name" 
                         class="w-20 h-20 rounded-full object-cover mr-6">
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-900">@{{ selectedEmployee.full_name }}</h3>
                        <p class="text-gray-600">@{{ selectedEmployee.position }}</p>
                        <p class="text-sm text-gray-500">@{{ selectedEmployee.department }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Rata-rata Nilai</p>
                        <p class="text-3xl font-bold" :class="getScoreColor(selectedEmployee.average_score)">
                            @{{ selectedEmployee.average_score?.toFixed(2) || '-' }}
                        </p>
                        <p class="text-sm text-gray-500 mt-1">
                            @{{ selectedEmployee.total_assessments }} penilaian
                        </p>
                    </div>
                </div>
            </div>

            <!-- Performance Chart -->
            <div v-if="selectedEmployee" class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Grafik Performa</h3>
                    <div class="flex gap-2">
                        <button @click="chartType = 'line'" 
                                :class="{'bg-voliko-600 text-white': chartType === 'line', 'bg-gray-100 text-gray-700': chartType !== 'line'}"
                                class="px-3 py-1 rounded-lg text-sm transition-colors">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        <button @click="chartType = 'bar'" 
                                :class="{'bg-voliko-600 text-white': chartType === 'bar', 'bg-gray-100 text-gray-700': chartType !== 'bar'}"
                                class="px-3 py-1 rounded-lg text-sm transition-colors">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    </div>
                </div>
                <div class="h-80">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>

            <!-- Assessment History Table -->
            <div v-if="selectedEmployee" class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Riwayat Penilaian</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr v-for="assessment in employeeAssessments" :key="assessment.id" class="hover:bg-gray-50">
                                <td class="px-6 py-4 text-gray-900">@{{ assessment.date }}</td>
                                <td class="px-6 py-4 text-gray-600">@{{ assessment.template }}</td>
                                <td class="px-6 py-4 font-semibold text-gray-900">@{{ assessment.score }}</td>
                                <td class="px-6 py-4">
                                    <span :class="getGradeClass(assessment.grade)" class="px-2 py-1 rounded-full text-xs font-medium">
                                        @{{ assessment.grade }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <a :href="`/assessments/${assessment.id}`" 
                                       class="text-voliko-600 hover:text-voliko-700 mr-3">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <a :href="`/assessments/${assessment.id}/pdf`" 
                                       class="text-red-600 hover:text-red-700"
                                       target="_blank">
                                        <i class="fas fa-file-pdf"></i>
                                    </a>
                                </td>
                            </tr>
                            <tr v-if="employeeAssessments.length === 0">
                                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                                    Belum ada penilaian
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="!selectedEmployee" class="bg-white rounded-xl shadow-sm p-12 text-center">
                <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-user text-gray-400 text-3xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Pilih Karyawan</h3>
                <p class="text-gray-500">Pilih karyawan dari daftar di sebelah kiri untuk melihat riwayat penilaian</p>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, computed, watch, onMounted } = Vue;

    createApp({
        setup() {
            const searchQuery = ref('');
            const selectedEmployee = ref(null);
            const chartType = ref('line');
            let chart = null;

            // Mock data
            const employees = ref([
                { id: 1, full_name: 'Budi Santoso', department: 'Customer Service', position: 'Representative', average_score: 4.25, total_assessments: 5, photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0ea5e9&color=fff' },
                { id: 2, full_name: 'Siti Rahayu', department: 'Customer Service', position: 'Senior CS', average_score: 4.50, total_assessments: 6, photo_url: 'https://ui-avatars.com/api/?name=Siti+Rahayu&background=0ea5e9&color=fff' },
                { id: 3, full_name: 'Ahmad Wijaya', department: 'Production', position: 'Operator', average_score: 3.75, total_assessments: 4, photo_url: 'https://ui-avatars.com/api/?name=Ahmad+Wijaya&background=0ea5e9&color=fff' },
                { id: 4, full_name: 'Dewi Kusuma', department: 'Production', position: 'Senior Operator', average_score: 4.35, total_assessments: 7, photo_url: 'https://ui-avatars.com/api/?name=Dewi+Kusuma&background=0ea5e9&color=fff' },
                { id: 5, full_name: 'Rudi Hartono', department: 'Design', position: 'Designer', average_score: 3.50, total_assessments: 3, photo_url: 'https://ui-avatars.com/api/?name=Rudi+Hartono&background=0ea5e9&color=fff' },
            ]);

            const employeeAssessments = ref([]);

            const filteredEmployees = computed(() => {
                if (!searchQuery.value) return employees.value;
                const query = searchQuery.value.toLowerCase();
                return employees.value.filter(e => 
                    e.full_name.toLowerCase().includes(query) ||
                    e.department.toLowerCase().includes(query)
                );
            });

            const getScoreClass = (score) => {
                if (score >= 4.5) return 'bg-green-100 text-green-700';
                if (score >= 3.5) return 'bg-blue-100 text-blue-700';
                if (score >= 2.5) return 'bg-yellow-100 text-yellow-700';
                return 'bg-red-100 text-red-700';
            };

            const getScoreColor = (score) => {
                if (score >= 4.5) return 'text-green-600';
                if (score >= 3.5) return 'text-blue-600';
                if (score >= 2.5) return 'text-yellow-600';
                return 'text-red-600';
            };

            const getGradeClass = (grade) => {
                const classes = {
                    'Sangat Baik': 'bg-green-100 text-green-700',
                    'Baik': 'bg-blue-100 text-blue-700',
                    'Cukup': 'bg-yellow-100 text-yellow-700',
                    'Kurang': 'bg-orange-100 text-orange-700',
                    'Sangat Kurang': 'bg-red-100 text-red-700',
                };
                return classes[grade] || 'bg-gray-100 text-gray-700';
            };

            const selectEmployee = (emp) => {
                selectedEmployee.value = emp;
                
                // Mock assessment history
                employeeAssessments.value = [
                    { id: 1, date: '2024-01-15', template: 'Customer Service', score: '4.25', grade: 'Baik' },
                    { id: 2, date: '2023-12-15', template: 'Customer Service', score: '4.00', grade: 'Baik' },
                    { id: 3, date: '2023-11-15', template: 'Customer Service', score: '3.75', grade: 'Baik' },
                    { id: 4, date: '2023-10-15', template: 'Customer Service', score: '3.50', grade: 'Cukup' },
                    { id: 5, date: '2023-09-15', template: 'Customer Service', score: '4.50', grade: 'Sangat Baik' },
                ];

                updateChart();
            };

            const updateChart = () => {
                if (chart) {
                    chart.destroy();
                }

                const ctx = document.getElementById('performanceChart');
                if (!ctx) return;

                const labels = employeeAssessments.value.map(a => a.date).reverse();
                const data = employeeAssessments.value.map(a => parseFloat(a.score)).reverse();

                chart = new Chart(ctx, {
                    type: chartType.value,
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Nilai Penilaian',
                            data: data,
                            borderColor: '#0ea5e9',
                            backgroundColor: chartType.value === 'line' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.7)',
                            borderWidth: 2,
                            fill: chartType.value === 'line',
                            tension: 0.4,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 5,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            };

            watch(chartType, updateChart);

            onMounted(() => {
                // Initial load
            });

            return {
                searchQuery,
                selectedEmployee,
                chartType,
                employees,
                filteredEmployees,
                employeeAssessments,
                getScoreClass,
                getScoreColor,
                getGradeClass,
                selectEmployee,
            };
        }
    }).mount('#history-app');
</script>
@endpush
