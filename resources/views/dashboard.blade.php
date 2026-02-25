@extends('layouts.app')

@section('title', 'Dashboard')
@section('page-title', 'Dashboard')

@section('content')
<div id="dashboard-app" v-cloak>
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Total Employees -->
        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-voliko-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500">Total Karyawan</p>
                    <p class="text-2xl font-bold text-gray-900">@{{ stats.totalEmployees }}</p>
                </div>
                <div class="w-12 h-12 bg-voliko-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-users text-voliko-600 text-xl"></i>
                </div>
            </div>
            <div class="mt-4 flex items-center text-sm">
                <span class="text-green-500 flex items-center">
                    <i class="fas fa-arrow-up mr-1"></i>
                    @{{ stats.newEmployeesThisMonth }}
                </span>
                <span class="text-gray-400 ml-2">baru bulan ini</span>
            </div>
        </div>

        <!-- Pending Assessments -->
        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500">Penilaian Tertunda</p>
                    <p class="text-2xl font-bold text-gray-900">@{{ stats.pendingAssessments }}</p>
                </div>
                <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-clock text-amber-600 text-xl"></i>
                </div>
            </div>
            <div class="mt-4 flex items-center text-sm">
                <a href="{{ route('assessments.index') }}" class="text-amber-600 hover:text-amber-700 font-medium">
                    Lihat semua <i class="fas fa-arrow-right ml-1"></i>
                </a>
            </div>
        </div>

        <!-- Completed Assessments -->
        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500">Penilaian Selesai</p>
                    <p class="text-2xl font-bold text-gray-900">@{{ stats.completedAssessments }}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
            </div>
            <div class="mt-4 flex items-center text-sm">
                <span class="text-gray-400">Bulan ini</span>
            </div>
        </div>

        <!-- Average Score -->
        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500">Rata-rata Nilai</p>
                    <p class="text-2xl font-bold text-gray-900">@{{ stats.averageScore }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-star text-purple-600 text-xl"></i>
                </div>
            </div>
            <div class="mt-4 flex items-center text-sm">
                <span :class="stats.scoreTrend >= 0 ? 'text-green-500' : 'text-red-500'" class="flex items-center">
                    <i :class="stats.scoreTrend >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'" class="mr-1"></i>
                    @{{ Math.abs(stats.scoreTrend) }}%
                </span>
                <span class="text-gray-400 ml-2">vs bulan lalu</span>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Quick Actions -->
        <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <a href="{{ route('assessments.create-single') }}" 
                       class="flex flex-col items-center p-4 rounded-xl bg-voliko-50 hover:bg-voliko-100 transition-colors">
                        <div class="w-12 h-12 bg-voliko-500 rounded-lg flex items-center justify-center mb-3">
                            <i class="fas fa-plus text-white"></i>
                        </div>
                        <span class="text-sm font-medium text-gray-700 text-center">Penilaian Baru</span>
                    </a>
                    <a href="{{ route('employees.create') }}" 
                       class="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                        <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                            <i class="fas fa-user-plus text-white"></i>
                        </div>
                        <span class="text-sm font-medium text-gray-700 text-center">Tambah Karyawan</span>
                    </a>
                    <a href="{{ route('import-export.index') }}" 
                       class="flex flex-col items-center p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                        <div class="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-3">
                            <i class="fas fa-file-import text-white"></i>
                        </div>
                        <span class="text-sm font-medium text-gray-700 text-center">Import Data</span>
                    </a>
                    <a href="{{ route('reports.index') }}" 
                       class="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                        <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                            <i class="fas fa-file-export text-white"></i>
                        </div>
                        <span class="text-sm font-medium text-gray-700 text-center">Export Laporan</span>
                    </a>
                </div>
            </div>

            <!-- Recent Assessments -->
            <div class="bg-white rounded-xl shadow-sm p-6 mt-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Penilaian Terbaru</h3>
                    <a href="{{ route('assessments.index') }}" class="text-sm text-voliko-600 hover:text-voliko-700">
                        Lihat semua
                    </a>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-200">
                                <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Template</th>
                                <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Nilai</th>
                                <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Grade</th>
                                <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="assessment in recentAssessments" :key="assessment.id" class="border-b border-gray-100 hover:bg-gray-50">
                                <td class="py-3 px-4">
                                    <div class="flex items-center">
                                        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                            <span class="text-xs font-medium">@{{ assessment.employee_initials }}</span>
                                        </div>
                                        <span class="font-medium text-gray-900">@{{ assessment.employee_name }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-gray-600">@{{ assessment.template_name }}</td>
                                <td class="py-3 px-4">
                                    <span class="font-semibold text-gray-900">@{{ assessment.total_score }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span :class="getGradeClass(assessment.grade)" class="px-2 py-1 rounded-full text-xs font-medium">
                                        @{{ assessment.grade }}
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-gray-500 text-sm">@{{ assessment.date }}</td>
                            </tr>
                            <tr v-if="recentAssessments.length === 0">
                                <td colspan="5" class="py-8 text-center text-gray-500">
                                    Belum ada penilaian
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Right Sidebar -->
        <div class="space-y-6">
            <!-- Top Performers -->
            <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div class="space-y-4">
                    <div v-for="(performer, index) in topPerformers" :key="performer.id" 
                         class="flex items-center p-3 rounded-lg bg-gray-50">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                             :class="index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-600'">
                            <i class="fas fa-trophy text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium text-gray-900">@{{ performer.name }}</p>
                            <p class="text-xs text-gray-500">@{{ performer.department }}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-voliko-600">@{{ performer.score }}</p>
                            <p class="text-xs text-gray-400">rata-rata</p>
                        </div>
                    </div>
                    <div v-if="topPerformers.length === 0" class="text-center py-4 text-gray-500">
                        Belum ada data
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
                <div class="space-y-4">
                    <div v-for="activity in recentActivities" :key="activity.id" class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                             :class="activity.icon_bg">
                            <i :class="activity.icon" class="text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-900">@{{ activity.description }}</p>
                            <p class="text-xs text-gray-500">@{{ activity.time }}</p>
                        </div>
                    </div>
                    <div v-if="recentActivities.length === 0" class="text-center py-4 text-gray-500">
                        Belum ada aktivitas
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, onMounted } = Vue;

    createApp({
        setup() {
            const stats = ref({
                totalEmployees: 0,
                newEmployeesThisMonth: 0,
                pendingAssessments: 0,
                completedAssessments: 0,
                averageScore: '0.00',
                scoreTrend: 0,
            });

            const recentAssessments = ref([]);
            const topPerformers = ref([]);
            const recentActivities = ref([]);

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

            const fetchDashboardData = async () => {
                try {
                    // In a real app, these would be actual API calls
                    // const response = await axios.get('/api/dashboard/stats');
                    // stats.value = response.data;

                    // Mock data for demonstration
                    stats.value = {
                        totalEmployees: 24,
                        newEmployeesThisMonth: 3,
                        pendingAssessments: 8,
                        completedAssessments: 45,
                        averageScore: '3.75',
                        scoreTrend: 5.2,
                    };

                    recentAssessments.value = [
                        { id: 1, employee_name: 'Budi Santoso', employee_initials: 'BS', template_name: 'Customer Service', total_score: '4.25', grade: 'Baik', date: '2024-01-15' },
                        { id: 2, employee_name: 'Siti Rahayu', employee_initials: 'SR', template_name: 'Customer Service', total_score: '4.50', grade: 'Sangat Baik', date: '2024-01-14' },
                        { id: 3, employee_name: 'Ahmad Wijaya', employee_initials: 'AW', template_name: 'Operator', total_score: '3.75', grade: 'Baik', date: '2024-01-13' },
                    ];

                    topPerformers.value = [
                        { id: 1, name: 'Siti Rahayu', department: 'Customer Service', score: '4.50' },
                        { id: 2, name: 'Dewi Kusuma', department: 'Production', score: '4.35' },
                        { id: 3, name: 'Maya Indah', department: 'Design', score: '4.20' },
                    ];

                    recentActivities.value = [
                        { id: 1, description: 'Penilaian baru untuk Budi Santoso', time: '2 jam yang lalu', icon: 'fas fa-clipboard-check', icon_bg: 'bg-voliko-100 text-voliko-600' },
                        { id: 2, description: 'Karyawan baru ditambahkan: Rudi Hartono', time: '5 jam yang lalu', icon: 'fas fa-user-plus', icon_bg: 'bg-green-100 text-green-600' },
                        { id: 3, description: 'Laporan diekspor oleh Admin', time: '1 hari yang lalu', icon: 'fas fa-file-export', icon_bg: 'bg-purple-100 text-purple-600' },
                    ];
                } catch (error) {
                    console.error('Error fetching dashboard data:', error);
                }
            };

            onMounted(() => {
                fetchDashboardData();
            });

            return {
                stats,
                recentAssessments,
                topPerformers,
                recentActivities,
                getGradeClass,
            };
        }
    }).mount('#dashboard-app');
</script>
@endpush
