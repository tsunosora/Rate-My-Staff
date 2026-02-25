@extends('layouts.app')

@section('title', 'Laporan')
@section('page-title', 'Laporan & Export')

@section('content')
<div id="reports-app" v-cloak>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Individual Report Card -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div class="h-32 bg-gradient-to-br from-voliko-500 to-voliko-600 flex items-center justify-center">
                <i class="fas fa-user text-white text-5xl"></i>
            </div>
            <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Laporan Per Karyawan</h3>
                <p class="text-sm text-gray-500 mb-4">Lihat dan export laporan penilaian untuk karyawan tertentu</p>
                
                <div class="mb-4">
                    <select v-model="selectedEmployee" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        <option value="">Pilih Karyawan</option>
                        <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                            @{{ emp.full_name }}
                        </option>
                    </select>
                </div>

                <div class="flex gap-2">
                    <button @click="viewEmployeeReport" 
                            :disabled="!selectedEmployee"
                            class="flex-1 px-4 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                        <i class="fas fa-eye mr-2"></i> Lihat
                    </button>
                    <button @click="exportEmployeePDF" 
                            :disabled="!selectedEmployee"
                            class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mass Report Card -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div class="h-32 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <i class="fas fa-users text-white text-5xl"></i>
            </div>
            <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Laporan Massal</h3>
                <p class="text-sm text-gray-500 mb-4">Export daftar penilaian untuk semua karyawan dalam periode tertentu</p>
                
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Dari</label>
                        <input type="date" v-model="massReportStart"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Sampai</label>
                        <input type="date" v-model="massReportEnd"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                </div>

                <div class="flex gap-2">
                    <button @click="exportMassExcel" 
                            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-file-excel mr-2"></i> Excel
                    </button>
                    <button @click="exportMassPDF" 
                            class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Detailed Report Card -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div class="h-32 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <i class="fas fa-file-alt text-white text-5xl"></i>
            </div>
            <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Laporan Detail</h3>
                <p class="text-sm text-gray-500 mb-4">Laporan lengkap dengan breakdown setiap indikator penilaian</p>
                
                <div class="mb-4">
                    <select v-model="detailedReportType" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        <option value="all">Semua Karyawan</option>
                        <option value="department">Per Departemen</option>
                        <option value="template">Per Template</option>
                    </select>
                </div>

                <div class="flex gap-2">
                    <button @click="viewDetailedReport" 
                            class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <i class="fas fa-eye mr-2"></i> Lihat
                    </button>
                    <button @click="exportDetailedPDF" 
                            class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Reports -->
    <div class="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Laporan Terbaru</h3>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis Laporan</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oleh</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="report in recentReports" :key="report.id" class="hover:bg-gray-50">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <i :class="report.icon" class="mr-3 text-lg" :class="report.icon_color"></i>
                                <span class="font-medium text-gray-900">@{{ report.name }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-gray-600">@{{ report.period }}</td>
                        <td class="px-6 py-4 text-gray-600">@{{ report.created_at }}</td>
                        <td class="px-6 py-4 text-gray-600">@{{ report.created_by }}</td>
                        <td class="px-6 py-4 text-right">
                            <a :href="report.download_url" 
                               class="text-voliko-600 hover:text-voliko-700 mr-3">
                                <i class="fas fa-download"></i>
                            </a>
                            <button @click="printReport(report)" 
                                    class="text-gray-600 hover:text-gray-700">
                                <i class="fas fa-print"></i>
                            </button>
                        </td>
                    </tr>
                    <tr v-if="recentReports.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            Belum ada laporan yang dibuat
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, onMounted } = Vue;

    createApp({
        setup() {
            const selectedEmployee = ref('');
            const massReportStart = ref('');
            const massReportEnd = ref('');
            const detailedReportType = ref('all');

            const employees = ref([
                { id: 1, full_name: 'Budi Santoso' },
                { id: 2, full_name: 'Siti Rahayu' },
                { id: 3, full_name: 'Ahmad Wijaya' },
                { id: 4, full_name: 'Dewi Kusuma' },
                { id: 5, full_name: 'Rudi Hartono' },
            ]);

            const recentReports = ref([
                { 
                    id: 1, 
                    name: 'Laporan Penilaian - Januari 2024', 
                    icon: 'fas fa-file-excel', 
                    icon_color: 'text-green-600',
                    period: '1 Jan - 31 Jan 2024', 
                    created_at: '2024-02-01', 
                    created_by: 'Admin',
                    download_url: '#'
                },
                { 
                    id: 2, 
                    name: 'Laporan Per Karyawan - Budi Santoso', 
                    icon: 'fas fa-file-pdf', 
                    icon_color: 'text-red-600',
                    period: '2023 - 2024', 
                    created_at: '2024-01-28', 
                    created_by: 'HR Manager',
                    download_url: '#'
                },
            ]);

            const viewEmployeeReport = () => {
                window.open(`/reports/employee/${selectedEmployee.value}`, '_blank');
            };

            const exportEmployeePDF = () => {
                window.open(`/reports/employee/${selectedEmployee.value}?format=pdf`, '_blank');
            };

            const exportMassExcel = () => {
                const params = new URLSearchParams({
                    start: massReportStart.value,
                    end: massReportEnd.value,
                    format: 'excel'
                });
                window.open(`/reports/mass?${params}`, '_blank');
            };

            const exportMassPDF = () => {
                const params = new URLSearchParams({
                    start: massReportStart.value,
                    end: massReportEnd.value,
                    format: 'pdf'
                });
                window.open(`/reports/mass?${params}`, '_blank');
            };

            const viewDetailedReport = () => {
                window.open(`/reports/detailed?type=${detailedReportType.value}`, '_blank');
            };

            const exportDetailedPDF = () => {
                window.open(`/reports/detailed?type=${detailedReportType.value}&format=pdf`, '_blank');
            };

            const printReport = (report) => {
                window.open(report.download_url + '?print=1', '_blank');
            };

            onMounted(() => {
                // Set default date range
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                massReportEnd.value = today.toISOString().split('T')[0];
                massReportStart.value = firstDay.toISOString().split('T')[0];
            });

            return {
                selectedEmployee,
                massReportStart,
                massReportEnd,
                detailedReportType,
                employees,
                recentReports,
                viewEmployeeReport,
                exportEmployeePDF,
                exportMassExcel,
                exportMassPDF,
                viewDetailedReport,
                exportDetailedPDF,
                printReport,
            };
        }
    }).mount('#reports-app');
</script>
@endpush
