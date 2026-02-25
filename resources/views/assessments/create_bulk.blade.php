@extends('layouts.app')

@section('title', 'Bulk Assessment Entry')
@section('page-title', 'Bulk Assessment Entry')

@section('content')
<div id="bulk-assessment-app" v-cloak>
    <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Penilaian Massal</h3>
            <p class="text-sm text-gray-500 mt-1">Isi penilaian untuk beberapa karyawan sekaligus</p>
        </div>

        <div class="p-6">
            <!-- Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Template Penilaian <span class="text-red-500">*</span>
                    </label>
                    <select v-model="selectedTemplate" @change="loadIndicators" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        <option value="">Pilih Template</option>
                        <option v-for="template in templates" :key="template.id" :value="template.id">
                            @{{ template.name }}
                        </option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Penilaian <span class="text-red-500">*</span>
                    </label>
                    <input type="date" v-model="assessmentDate" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                </div>

                <div class="flex items-end">
                    <button @click="addRow" 
                            class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-plus mr-2"></i> Tambah Karyawan
                    </button>
                </div>
            </div>

            <!-- Bulk Entry Table -->
            <div v-if="indicators.length > 0" class="overflow-x-auto">
                <table class="w-full border border-gray-200 rounded-lg">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[200px]">Karyawan</th>
                            <th v-for="indicator in indicators" :key="indicator.id" 
                                class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                                <div>@{{ indicator.name }}</div>
                                <div class="text-gray-400 font-normal">(@{{ indicator.weight }}%)</div>
                            </th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[80px]">Total</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[60px]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-for="(row, rowIndex) in rows" :key="rowIndex" class="hover:bg-gray-50">
                            <td class="px-4 py-3 sticky left-0 bg-white">
                                <select v-model="row.employee_id" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent text-sm">
                                    <option value="">Pilih</option>
                                    <option v-for="emp in availableEmployees(rowIndex)" :key="emp.id" :value="emp.id">
                                        @{{ emp.full_name }}
                                    </option>
                                </select>
                            </td>
                            <td v-for="(indicator, indIndex) in indicators" :key="indicator.id" 
                                class="px-4 py-3 text-center">
                                <select v-model="row.scores[indIndex]" @change="calculateRowTotal(rowIndex)"
                                        class="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent text-center">
                                    <option value="">-</option>
                                    <option v-for="n in 5" :key="n" :value="n">@{{ n }}</option>
                                </select>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="font-bold text-voliko-600">@{{ row.total.toFixed(2) }}</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button @click="removeRow(rowIndex)" 
                                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        :disabled="rows.length === 1">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Summary -->
            <div v-if="indicators.length > 0 && rows.length > 0" class="mt-6 p-4 bg-gray-50 rounded-lg">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-sm text-gray-500">Total Karyawan</p>
                        <p class="text-xl font-bold text-gray-900">@{{ rows.length }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Rata-rata Nilai</p>
                        <p class="text-xl font-bold text-voliko-600">@{{ averageTotal.toFixed(2) }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Nilai Tertinggi</p>
                        <p class="text-xl font-bold text-green-600">@{{ maxTotal.toFixed(2) }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Nilai Terendah</p>
                        <p class="text-xl font-bold text-red-600">@{{ minTotal.toFixed(2) }}</p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <a href="{{ route('assessments.index') }}" 
                   class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    Batal
                </a>
                <button @click="exportTemplate" 
                        class="px-6 py-2 border border-voliko-600 text-voliko-600 rounded-lg hover:bg-voliko-50 transition-colors">
                    <i class="fas fa-download mr-2"></i> Export Template
                </button>
                <button @click="submitBulk" 
                        :disabled="!isValid || isSubmitting"
                        class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-save mr-2"></i>
                    @{{ isSubmitting ? 'Menyimpan...' : 'Simpan Semua' }}
                </button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const selectedTemplate = ref('');
            const assessmentDate = ref(new Date().toISOString().split('T')[0]);
            const indicators = ref([]);
            const rows = ref([]);
            const isSubmitting = ref(false);

            // Mock data
            const templates = ref([
                { id: 1, name: 'Customer Service' },
                { id: 2, name: 'Operator' },
                { id: 3, name: 'Designer' },
            ]);

            const employees = ref([
                { id: 1, full_name: 'Budi Santoso' },
                { id: 2, full_name: 'Siti Rahayu' },
                { id: 3, full_name: 'Ahmad Wijaya' },
                { id: 4, full_name: 'Dewi Kusuma' },
                { id: 5, full_name: 'Rudi Hartono' },
                { id: 6, full_name: 'Maya Indah' },
            ]);

            const loadIndicators = () => {
                if (!selectedTemplate.value) {
                    indicators.value = [];
                    rows.value = [];
                    return;
                }

                // Mock indicators
                const mockIndicators = {
                    1: [
                        { id: 1, name: 'Kehadiran', weight: 15 },
                        { id: 2, name: 'Ketaatan', weight: 10 },
                        { id: 3, name: 'Komunikasi', weight: 15 },
                        { id: 4, name: 'Pelayanan', weight: 20 },
                        { id: 5, name: 'Problem Solving', weight: 20 },
                        { id: 6, name: 'Kerjasama', weight: 10 },
                    ],
                    2: [
                        { id: 7, name: 'Kehadiran', weight: 15 },
                        { id: 8, name: 'Mesin', weight: 25 },
                        { id: 9, name: 'Kualitas', weight: 20 },
                        { id: 10, name: 'Target', weight: 20 },
                    ],
                    3: [
                        { id: 11, name: 'Kreativitas', weight: 20 },
                        { id: 12, name: 'Inovasi', weight: 15 },
                        { id: 13, name: 'Tools', weight: 20 },
                        { id: 14, name: 'Kualitas', weight: 15 },
                    ],
                };

                indicators.value = mockIndicators[selectedTemplate.value] || [];
                
                // Initialize with one row
                if (rows.value.length === 0) {
                    addRow();
                }
            };

            const addRow = () => {
                rows.value.push({
                    employee_id: '',
                    scores: Array(indicators.value.length).fill(''),
                    total: 0,
                });
            };

            const removeRow = (index) => {
                if (rows.value.length > 1) {
                    rows.value.splice(index, 1);
                }
            };

            const calculateRowTotal = (rowIndex) => {
                const row = rows.value[rowIndex];
                let total = 0;
                row.scores.forEach((score, index) => {
                    if (score && indicators.value[index]) {
                        total += (parseInt(score) * indicators.value[index].weight) / 100;
                    }
                });
                row.total = total;
            };

            const availableEmployees = (currentRowIndex) => {
                const selectedIds = rows.value
                    .filter((_, index) => index !== currentRowIndex)
                    .map(row => row.employee_id)
                    .filter(id => id !== '');
                
                return employees.value.filter(emp => !selectedIds.includes(emp.id));
            };

            const averageTotal = computed(() => {
                if (rows.value.length === 0) return 0;
                return rows.value.reduce((sum, row) => sum + row.total, 0) / rows.value.length;
            });

            const maxTotal = computed(() => {
                if (rows.value.length === 0) return 0;
                return Math.max(...rows.value.map(row => row.total));
            });

            const minTotal = computed(() => {
                if (rows.value.length === 0) return 0;
                return Math.min(...rows.value.map(row => row.total));
            });

            const isValid = computed(() => {
                return selectedTemplate.value && 
                       assessmentDate.value &&
                       rows.value.every(row => 
                           row.employee_id && 
                           row.scores.every(score => score !== '')
                       );
            });

            const exportTemplate = () => {
                // Generate CSV template
                let csv = 'Employee ID,Employee Name,';
                csv += indicators.value.map(i => `${i.name} (${i}%)`).join(',');
                csv += '\n';
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `template_${selectedTemplate.value}.csv`;
                a.click();
            };

            const submitBulk = async () => {
                if (!isValid.value) return;

                isSubmitting.value = true;
                try {
                    const data = {
                        template_id: selectedTemplate.value,
                        assessment_date: assessmentDate.value,
                        assessments: rows.value.map(row => ({
                            employee_id: row.employee_id,
                            scores: row.scores.map((score, index) => ({
                                indicator_id: indicators.value[index].id,
                                score: parseInt(score),
                            })),
                        })),
                    };

                    console.log('Submitting bulk:', data);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    alert('Penilaian massal berhasil disimpan!');
                    window.location.href = '{{ route('assessments.index') }}';
                } catch (error) {
                    console.error('Error submitting bulk assessment:', error);
                    alert('Terjadi kesalahan saat menyimpan penilaian.');
                } finally {
                    isSubmitting.value = false;
                }
            };

            onMounted(() => {
                // Load initial data
            });

            return {
                selectedTemplate,
                assessmentDate,
                templates,
                employees,
                indicators,
                rows,
                isSubmitting,
                averageTotal,
                maxTotal,
                minTotal,
                isValid,
                loadIndicators,
                addRow,
                removeRow,
                calculateRowTotal,
                availableEmployees,
                exportTemplate,
                submitBulk,
            };
        }
    }).mount('#bulk-assessment-app');
</script>
@endpush
