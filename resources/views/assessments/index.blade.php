@extends('layouts.app')

@section('title', 'Daftar Penilaian')
@section('page-title', 'Daftar Penilaian')

@section('content')
<div id="assessments-app" v-cloak>
    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <!-- Search -->
            <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-search text-gray-400"></i>
                </div>
                <input 
                    v-model="searchQuery"
                    @input="debouncedSearch"
                    type="text" 
                    placeholder="Cari penilaian..."
                    class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent w-full sm:w-64">
            </div>
            
            <!-- Status Filter -->
            <select 
                v-model="selectedStatus"
                @change="filterAssessments"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                <option value="">Semua Status</option>
                <option value="draft">Draft</option>
                <option value="completed">Selesai</option>
                <option value="approved">Disetujui</option>
            </select>
        </div>

        <div class="flex gap-3">
            <a href="{{ route('assessments.create-bulk') }}" 
               class="inline-flex items-center px-4 py-2 border border-voliko-600 text-voliko-600 rounded-lg hover:bg-voliko-50 transition-colors">
                <i class="fas fa-table mr-2"></i>
                Bulk Entry
            </a>
            <a href="{{ route('assessments.create-single') }}" 
               class="inline-flex items-center px-4 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors">
                <i class="fas fa-plus mr-2"></i>
                Penilaian Baru
            </a>
        </div>
    </div>

    <!-- Assessments Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Evaluator</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Nilai</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="assessment in paginatedAssessments" :key="assessment.id" class="hover:bg-gray-50">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div class="w-10 h-10 rounded-full bg-voliko-100 flex items-center justify-center mr-3">
                                    <span class="text-voliko-600 font-medium">@{{ assessment.employee_initials }}</span>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900">@{{ assessment.employee_name }}</div>
                                    <div class="text-sm text-gray-500">@{{ assessment.employee_code }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-gray-600">@{{ assessment.template_name }}</td>
                        <td class="px-6 py-4 text-gray-600">@{{ assessment.assessment_date }}</td>
                        <td class="px-6 py-4 text-gray-600">@{{ assessment.evaluator_name }}</td>
                        <td class="px-6 py-4">
                            <span class="font-semibold text-gray-900">@{{ assessment.total_score }}</span>
                        </td>
                        <td class="px-6 py-4">
                            <span :class="getGradeClass(assessment.grade)" class="px-2 py-1 rounded-full text-xs font-medium">
                                @{{ assessment.grade }}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <span :class="getStatusClass(assessment.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                                @{{ assessment.status_label }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex justify-end gap-2">
                                <a :href="`/assessments/${assessment.id}`" 
                                   class="p-2 text-voliko-600 hover:bg-voliko-50 rounded-lg transition-colors"
                                   title="Detail">
                                    <i class="fas fa-eye"></i>
                                </a>
                                <a :href="`/assessments/${assessment.id}/pdf`" 
                                   class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                   title="Download PDF"
                                   target="_blank">
                                    <i class="fas fa-file-pdf"></i>
                                </a>
                                <button v-if="assessment.status === 'draft'" 
                                        @click="completeAssessment(assessment)"
                                        class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Selesaikan">
                                    <i class="fas fa-check"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="paginatedAssessments.length === 0">
                        <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                            <i class="fas fa-clipboard-list text-4xl mb-4 text-gray-300"></i>
                            <p>Tidak ada penilaian ditemukan</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination -->
    <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="text-sm text-gray-500">
            Menampilkan @{{ startIndex + 1 }} - @{{ endIndex }} dari @{{ filteredAssessments.length }} penilaian
        </div>
        <div class="flex items-center gap-2">
            <button 
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="px-4 py-2 text-sm text-gray-700">
                Halaman @{{ currentPage }} dari @{{ totalPages }}
            </span>
            <button 
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const searchQuery = ref('');
            const selectedStatus = ref('');
            const currentPage = ref(1);
            const itemsPerPage = 10;

            // Mock data - in real app, fetch from API
            const assessments = ref([
                { id: 1, employee_name: 'Budi Santoso', employee_initials: 'BS', employee_code: 'EMP001', template_name: 'Customer Service', assessment_date: '2024-01-15', evaluator_name: 'Admin', total_score: '4.25', grade: 'Baik', status: 'completed', status_label: 'Selesai' },
                { id: 2, employee_name: 'Siti Rahayu', employee_initials: 'SR', employee_code: 'EMP002', template_name: 'Customer Service', assessment_date: '2024-01-14', evaluator_name: 'Admin', total_score: '4.50', grade: 'Sangat Baik', status: 'approved', status_label: 'Disetujui' },
                { id: 3, employee_name: 'Ahmad Wijaya', employee_initials: 'AW', employee_code: 'EMP003', template_name: 'Operator', assessment_date: '2024-01-13', evaluator_name: 'Admin', total_score: '3.75', grade: 'Baik', status: 'draft', status_label: 'Draft' },
                { id: 4, employee_name: 'Dewi Kusuma', employee_initials: 'DK', employee_code: 'EMP004', template_name: 'Operator', assessment_date: '2024-01-12', evaluator_name: 'Admin', total_score: '4.35', grade: 'Sangat Baik', status: 'completed', status_label: 'Selesai' },
                { id: 5, employee_name: 'Rudi Hartono', employee_initials: 'RH', employee_code: 'EMP005', template_name: 'Designer', assessment_date: '2024-01-11', evaluator_name: 'Admin', total_score: '3.50', grade: 'Cukup', status: 'draft', status_label: 'Draft' },
            ]);

            const filteredAssessments = computed(() => {
                let result = assessments.value;

                if (searchQuery.value) {
                    const query = searchQuery.value.toLowerCase();
                    result = result.filter(a => 
                        a.employee_name.toLowerCase().includes(query) ||
                        a.employee_code.toLowerCase().includes(query) ||
                        a.template_name.toLowerCase().includes(query)
                    );
                }

                if (selectedStatus.value) {
                    result = result.filter(a => a.status === selectedStatus.value);
                }

                return result;
            });

            const totalPages = computed(() => Math.ceil(filteredAssessments.value.length / itemsPerPage));
            const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
            const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage, filteredAssessments.value.length));

            const paginatedAssessments = computed(() => {
                return filteredAssessments.value.slice(startIndex.value, endIndex.value);
            });

            let searchTimeout;
            const debouncedSearch = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage.value = 1;
                }, 300);
            };

            const filterAssessments = () => {
                currentPage.value = 1;
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

            const getStatusClass = (status) => {
                const classes = {
                    'draft': 'bg-gray-100 text-gray-700',
                    'completed': 'bg-green-100 text-green-700',
                    'approved': 'bg-blue-100 text-blue-700',
                };
                return classes[status] || 'bg-gray-100 text-gray-700';
            };

            const completeAssessment = async (assessment) => {
                if (confirm('Apakah Anda yakin ingin menyelesaikan penilaian ini?')) {
                    // In real app: await axios.patch(`/assessments/${assessment.id}/complete`);
                    assessment.status = 'completed';
                    assessment.status_label = 'Selesai';
                }
            };

            onMounted(async () => {
                // In real app: fetch assessments from API
            });

            return {
                searchQuery,
                selectedStatus,
                currentPage,
                paginatedAssessments,
                filteredAssessments,
                totalPages,
                startIndex,
                endIndex,
                debouncedSearch,
                filterAssessments,
                getGradeClass,
                getStatusClass,
                completeAssessment,
            };
        }
    }).mount('#assessments-app');
</script>
@endpush
