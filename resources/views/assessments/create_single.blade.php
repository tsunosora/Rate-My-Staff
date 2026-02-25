@extends('layouts.app')

@section('title', 'Penilaian Baru')
@section('page-title', 'Penilaian Baru')

@section('content')
<div id="assessment-app" v-cloak>
    <div class="max-w-4xl mx-auto">
        <form @submit.prevent="submitAssessment" class="bg-white rounded-xl shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Form Penilaian Karyawan</h3>
                <p class="text-sm text-gray-500 mt-1">Isi penilaian untuk setiap indikator</p>
            </div>

            <div class="p-6 space-y-6">
                <!-- Employee & Template Selection -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Karyawan <span class="text-red-500">*</span>
                        </label>
                        <select v-model="form.employee_id" @change="onEmployeeChange" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                            <option value="">Pilih Karyawan</option>
                            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                                @{{ emp.full_name }} - @{{ emp.department }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Template Penilaian <span class="text-red-500">*</span>
                        </label>
                        <select v-model="form.template_id" @change="onTemplateChange" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                            <option value="">Pilih Template</option>
                            <option v-for="template in templates" :key="template.id" :value="template.id">
                                @{{ template.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Assessment Period -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Tanggal Penilaian <span class="text-red-500">*</span>
                        </label>
                        <input type="date" v-model="form.assessment_date" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Periode Mulai
                        </label>
                        <input type="date" v-model="form.assessment_period_start"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Periode Selesai
                        </label>
                        <input type="date" v-model="form.assessment_period_end"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                    </div>
                </div>

                <!-- Indicators -->
                <div v-if="indicators.length > 0" class="border-t border-gray-200 pt-6">
                    <h4 class="text-md font-semibold text-gray-900 mb-4">Indikator Penilaian</h4>
                    
                    <div class="space-y-4">
                        <div v-for="(indicator, index) in indicators" :key="indicator.id" 
                             class="p-4 bg-gray-50 rounded-lg">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm font-medium text-voliko-600">@{{ indicator.category }}</span>
                                        <span class="text-gray-300">|</span>
                                        <span class="text-sm text-gray-500">Bobot: @{{ indicator.weight }}%</span>
                                    </div>
                                    <h5 class="font-medium text-gray-900 mt-1">@{{ indicator.name }}</h5>
                                    <p class="text-sm text-gray-500">@{{ indicator.description }}</p>
                                </div>
                                
                                <div class="flex items-center gap-4">
                                    <div class="text-right">
                                        <label class="block text-xs text-gray-500 mb-1">Nilai (1-5)</label>
                                        <select v-model="form.scores[index].score" @change="calculateTotal"
                                                class="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent text-center">
                                            <option value="">-</option>
                                            <option v-for="n in 5" :key="n" :value="n">@{{ n }}</option>
                                        </select>
                                    </div>
                                    <div class="text-right min-w-[80px]">
                                        <label class="block text-xs text-gray-500 mb-1">Nilai Akhir</label>
                                        <span class="text-lg font-bold text-voliko-600">
                                            @{{ calculateWeightedScore(form.scores[index]?.score, indicator.weight).toFixed(2) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total Score -->
                <div v-if="indicators.length > 0" class="border-t border-gray-200 pt-6">
                    <div class="flex justify-end items-center gap-6">
                        <div class="text-right">
                            <p class="text-sm text-gray-500">Total Nilai</p>
                            <p class="text-3xl font-bold text-voliko-600">@{{ totalScore.toFixed(2) }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-500">Grade</p>
                            <span :class="getGradeClass(grade)" class="px-4 py-2 rounded-lg text-lg font-semibold">
                                @{{ grade }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div class="border-t border-gray-200 pt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Penilaian
                    </label>
                    <textarea v-model="form.notes" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                              placeholder="Tambahkan catatan tentang penilaian ini..."></textarea>
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <a href="{{ route('assessments.index') }}" 
                   class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    Batal
                </a>
                <button type="submit" 
                        :disabled="!isValid || isSubmitting"
                        class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-save mr-2"></i>
                    @{{ isSubmitting ? 'Menyimpan...' : 'Simpan Penilaian' }}
                </button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const form = ref({
                employee_id: '{{ request('employee_id', '') }}',
                template_id: '',
                assessment_date: new Date().toISOString().split('T')[0],
                assessment_period_start: '',
                assessment_period_end: '',
                scores: [],
                notes: '',
            });

            const employees = ref([]);
            const templates = ref([]);
            const indicators = ref([]);
            const isSubmitting = ref(false);

            // Mock data - in real app, fetch from API
            employees.value = [
                { id: 1, full_name: 'Budi Santoso', department: 'Customer Service' },
                { id: 2, full_name: 'Siti Rahayu', department: 'Customer Service' },
                { id: 3, full_name: 'Ahmad Wijaya', department: 'Production' },
                { id: 4, full_name: 'Dewi Kusuma', department: 'Production' },
                { id: 5, full_name: 'Rudi Hartono', department: 'Design' },
                { id: 6, full_name: 'Maya Indah', department: 'Design' },
            ];

            templates.value = [
                { id: 1, name: 'Customer Service' },
                { id: 2, name: 'Operator' },
                { id: 3, name: 'Designer' },
            ];

            const totalScore = computed(() => {
                let total = 0;
                indicators.value.forEach((indicator, index) => {
                    const score = form.value.scores[index]?.score || 0;
                    total += (score * indicator.weight) / 100;
                });
                return total;
            });

            const grade = computed(() => {
                const score = totalScore.value;
                if (score >= 4.5) return 'Sangat Baik';
                if (score >= 3.5) return 'Baik';
                if (score >= 2.5) return 'Cukup';
                if (score >= 1.5) return 'Kurang';
                return 'Sangat Kurang';
            });

            const isValid = computed(() => {
                return form.value.employee_id && 
                       form.value.template_id && 
                       form.value.assessment_date &&
                       form.value.scores.every(s => s.score > 0);
            });

            const onTemplateChange = async () => {
                if (!form.value.template_id) {
                    indicators.value = [];
                    form.value.scores = [];
                    return;
                }

                // Mock indicators - in real app, fetch from API
                const mockIndicators = {
                    1: [ // Customer Service
                        { id: 1, category: 'Kedisiplinan', name: 'Kehadiran', description: 'Ketepatan waktu kehadiran', weight: 15.00 },
                        { id: 2, category: 'Kedisiplinan', name: 'Ketaatan aturan', description: 'Kepatuhan terhadap peraturan', weight: 10.00 },
                        { id: 3, category: 'Komunikasi', name: 'Komunikasi verbal', description: 'Kemampuan berkomunikasi', weight: 15.00 },
                        { id: 4, category: 'Pelayanan', name: 'Sikap pelayanan', description: 'Keramahan dan kesopanan', weight: 20.00 },
                        { id: 5, category: 'Pelayanan', name: 'Penyelesaian masalah', description: 'Kemampuan menyelesaikan keluhan', weight: 20.00 },
                        { id: 6, category: 'Kerjasama', name: 'Kerjasama tim', description: 'Kemampuan bekerja sama', weight: 10.00 },
                    ],
                    2: [ // Operator
                        { id: 7, category: 'Kedisiplinan', name: 'Kehadiran', description: 'Ketepatan waktu kehadiran', weight: 15.00 },
                        { id: 8, category: 'Teknis', name: 'Penguasaan mesin', description: 'Kemampuan mengoperasikan mesin', weight: 25.00 },
                        { id: 9, category: 'Teknis', name: 'Kualitas produksi', description: 'Ketepatan dan kualitas', weight: 20.00 },
                        { id: 10, category: 'Produktivitas', name: 'Target harian', description: 'Pencapaian target', weight: 20.00 },
                    ],
                    3: [ // Designer
                        { id: 11, category: 'Kreativitas', name: 'Ide dan konsep', description: 'Kemampuan menghasilkan ide', weight: 20.00 },
                        { id: 12, category: 'Kreativitas', name: 'Inovasi desain', description: 'Kemampuan menciptakan desain', weight: 15.00 },
                        { id: 13, category: 'Teknis', name: 'Penguasaan tools', description: 'Kemampuan software', weight: 20.00 },
                        { id: 14, category: 'Teknis', name: 'Kualitas desain', description: 'Kualitas hasil', weight: 15.00 },
                    ],
                };

                indicators.value = mockIndicators[form.value.template_id] || [];
                form.value.scores = indicators.value.map(() => ({ score: '', notes: '' }));
            };

            const onEmployeeChange = () => {
                // Could fetch employee-specific data here
            };

            const calculateWeightedScore = (score, weight) => {
                if (!score) return 0;
                return (score * weight) / 100;
            };

            const calculateTotal = () => {
                // Triggered by score change - computed property handles calculation
            };

            const getGradeClass = (g) => {
                const classes = {
                    'Sangat Baik': 'bg-green-100 text-green-700',
                    'Baik': 'bg-blue-100 text-blue-700',
                    'Cukup': 'bg-yellow-100 text-yellow-700',
                    'Kurang': 'bg-orange-100 text-orange-700',
                    'Sangat Kurang': 'bg-red-100 text-red-700',
                };
                return classes[g] || 'bg-gray-100 text-gray-700';
            };

            const submitAssessment = async () => {
                if (!isValid.value) return;

                isSubmitting.value = true;
                try {
                    // In real app: await axios.post('/assessments', form.value);
                    console.log('Submitting:', form.value);
                    
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    alert('Penilaian berhasil disimpan!');
                    window.location.href = '{{ route('assessments.index') }}';
                } catch (error) {
                    console.error('Error submitting assessment:', error);
                    alert('Terjadi kesalahan saat menyimpan penilaian.');
                } finally {
                    isSubmitting.value = false;
                }
            };

            onMounted(async () => {
                // In real app: fetch employees and templates from API
            });

            return {
                form,
                employees,
                templates,
                indicators,
                totalScore,
                grade,
                isValid,
                isSubmitting,
                onTemplateChange,
                onEmployeeChange,
                calculateWeightedScore,
                calculateTotal,
                getGradeClass,
                submitAssessment,
            };
        }
    }).mount('#assessment-app');
</script>
@endpush
