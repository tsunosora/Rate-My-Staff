@extends('layouts.app')

@section('title', 'Import / Export')
@section('page-title', 'Import / Export Data')

@section('content')
<div id="import-export-app" v-cloak>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Import Section -->
        <div class="bg-white rounded-xl shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-file-import text-voliko-600 mr-2"></i>Import Data
                </h3>
                <p class="text-sm text-gray-500 mt-1">Import data karyawan atau penilaian dari file</p>
            </div>

            <div class="p-6">
                <!-- Step 1: Select Import Type -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Jenis Data</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button @click="importType = 'employees'" 
                                :class="{'bg-voliko-50 border-voliko-500 text-voliko-700': importType === 'employees', 'border-gray-300 text-gray-700': importType !== 'employees'}"
                                class="px-4 py-3 border rounded-lg text-center transition-colors">
                            <i class="fas fa-users text-2xl mb-2 block"></i>
                            Karyawan
                        </button>
                        <button @click="importType = 'assessments'" 
                                :class="{'bg-voliko-50 border-voliko-500 text-voliko-700': importType === 'assessments', 'border-gray-300 text-gray-700': importType !== 'assessments'}"
                                class="px-4 py-3 border rounded-lg text-center transition-colors">
                            <i class="fas fa-clipboard-check text-2xl mb-2 block"></i>
                            Penilaian
                        </button>
                    </div>
                </div>

                <!-- Step 2: Upload File -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                    <div 
                        @dragover.prevent="dragover = true"
                        @dragleave.prevent="dragover = false"
                        @drop.prevent="handleDrop"
                        :class="{'border-voliko-500 bg-voliko-50': dragover, 'border-gray-300': !dragover}"
                        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors">
                        
                        <input type="file" 
                               ref="fileInput"
                               @change="handleFileSelect"
                               accept=".csv,.xlsx,.xls,.json"
                               class="hidden">
                        
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 mb-2">Drag & drop file atau</p>
                        <button @click="$refs.fileInput.click()" 
                                class="text-voliko-600 hover:text-voliko-700 font-medium">
                            Pilih file
                        </button>
                        <p class="text-sm text-gray-500 mt-2">Format: CSV, Excel, JSON</p>
                    </div>

                    <div v-if="selectedFile" class="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-file text-voliko-600 text-xl mr-3"></i>
                            <div>
                                <p class="font-medium text-gray-900">@{{ selectedFile.name }}</p>
                                <p class="text-sm text-gray-500">@{{ formatFileSize(selectedFile.size) }}</p>
                            </div>
                        </div>
                        <button @click="selectedFile = null; previewData = []" 
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Step 3: Column Mapping -->
                <div v-if="previewData.length > 0" class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Mapping Kolom</label>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-2 text-left">Kolom File</th>
                                    <th class="px-4 py-2 text-left">Map ke Field</th>
                                    <th class="px-4 py-2 text-left">Preview Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(col, index) in fileColumns" :key="index" class="border-b">
                                    <td class="px-4 py-2 font-medium">@{{ col }}</td>
                                    <td class="px-4 py-2">
                                        <select v-model="columnMapping[col]" 
                                                class="w-full px-3 py-1 border border-gray-300 rounded text-sm">
                                            <option value="">-- Abaikan --</option>
                                            <option v-for="field in availableFields" :key="field.value" :value="field.value">
                                                @{{ field.label }}
                                            </option>
                                        </select>
                                    </td>
                                    <td class="px-4 py-2 text-gray-500">@{{ previewData[0][col] }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Import Button -->
                <button @click="startImport" 
                        :disabled="!canImport || isImporting"
                        class="w-full px-6 py-3 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="isImporting" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-upload mr-2"></i>
                    @{{ isImporting ? 'Mengimport...' : 'Import Data' }}
                </button>
            </div>
        </div>

        <!-- Export Section -->
        <div class="bg-white rounded-xl shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-file-export text-green-600 mr-2"></i>Export Data
                </h3>
                <p class="text-sm text-gray-500 mt-1">Download data atau template</p>
            </div>

            <div class="p-6 space-y-6">
                <!-- Export Employees -->
                <div class="p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-medium text-gray-900">Data Karyawan</h4>
                            <p class="text-sm text-gray-500">Export semua data karyawan</p>
                        </div>
                        <div class="flex gap-2">
                            <button @click="exportData('employees', 'excel')" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-file-excel mr-2"></i>Excel
                            </button>
                            <button @click="exportData('employees', 'csv')" 
                                    class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                <i class="fas fa-file-csv mr-2"></i>CSV
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Export Assessments -->
                <div class="p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-medium text-gray-900">Data Penilaian</h4>
                            <p class="text-sm text-gray-500">Export data penilaian karyawan</p>
                        </div>
                        <div class="flex gap-2">
                            <button @click="exportData('assessments', 'excel')" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-file-excel mr-2"></i>Excel
                            </button>
                            <button @click="exportData('assessments', 'csv')" 
                                    class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                <i class="fas fa-file-csv mr-2"></i>CSV
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Download Templates -->
                <div class="border-t border-gray-200 pt-6">
                    <h4 class="font-medium text-gray-900 mb-4">Download Template</h4>
                    <div class="space-y-3">
                        <button @click="downloadTemplate('employees')" 
                                class="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex items-center">
                                <i class="fas fa-file-excel text-green-600 text-xl mr-3"></i>
                                <div class="text-left">
                                    <p class="font-medium text-gray-900">Template Karyawan</p>
                                    <p class="text-sm text-gray-500">Format standar untuk import karyawan</p>
                                </div>
                            </div>
                            <i class="fas fa-download text-gray-400"></i>
                        </button>

                        <button @click="downloadTemplate('assessments')" 
                                class="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex items-center">
                                <i class="fas fa-file-excel text-green-600 text-xl mr-3"></i>
                                <div class="text-left">
                                    <p class="font-medium text-gray-900">Template Penilaian</p>
                                    <p class="text-sm text-gray-500">Format standar untuk import penilaian</p>
                                </div>
                            </div>
                            <i class="fas fa-download text-gray-400"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Import Progress Modal -->
    <div v-if="showProgressModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Progress Import</h3>
            
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600">@{{ importProgress }}% selesai</span>
                    <span class="text-gray-600">@{{ importedCount }}/@{{ totalRows }} baris</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-voliko-600 h-2 rounded-full transition-all duration-300" 
                         :style="{width: importProgress + '%'}"></div>
                </div>
            </div>

            <div v-if="importErrors.length > 0" class="mt-4">
                <p class="text-sm font-medium text-red-600 mb-2">Error (@{{ importErrors.length }}):</p>
                <div class="max-h-32 overflow-y-auto bg-red-50 rounded-lg p-3">
                    <p v-for="(error, index) in importErrors" :key="index" class="text-sm text-red-600">
                        @{{ error }}
                    </p>
                </div>
            </div>

            <div class="mt-6 flex justify-end">
                <button @click="showProgressModal = false" 
                        :disabled="importProgress < 100"
                        class="px-4 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                    Tutup
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
            const importType = ref('employees');
            const selectedFile = ref(null);
            const dragover = ref(false);
            const previewData = ref([]);
            const fileColumns = ref([]);
            const columnMapping = ref({});
            const isImporting = ref(false);
            const showProgressModal = ref(false);
            const importProgress = ref(0);
            const importedCount = ref(0);
            const totalRows = ref(0);
            const importErrors = ref([]);

            const employeeFields = [
                { value: 'employee_code', label: 'Kode Karyawan' },
                { value: 'full_name', label: 'Nama Lengkap' },
                { value: 'department', label: 'Departemen' },
                { value: 'position', label: 'Posisi' },
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Telepon' },
                { value: 'join_date', label: 'Tanggal Bergabung' },
            ];

            const assessmentFields = [
                { value: 'employee_code', label: 'Kode Karyawan' },
                { value: 'assessment_date', label: 'Tanggal Penilaian' },
                { value: 'template_id', label: 'ID Template' },
                { value: 'score_1', label: 'Nilai Indikator 1' },
                { value: 'score_2', label: 'Nilai Indikator 2' },
                { value: 'score_3', label: 'Nilai Indikator 3' },
                { value: 'score_4', label: 'Nilai Indikator 4' },
                { value: 'score_5', label: 'Nilai Indikator 5' },
                { value: 'notes', label: 'Catatan' },
            ];

            const availableFields = computed(() => {
                return importType.value === 'employees' ? employeeFields : assessmentFields;
            });

            const canImport = computed(() => {
                return selectedFile.value && 
                       previewData.value.length > 0 &&
                       Object.values(columnMapping.value).some(v => v !== '');
            });

            const handleFileSelect = (event) => {
                const file = event.target.files[0];
                if (file) {
                    processFile(file);
                }
            };

            const handleDrop = (event) => {
                dragover.value = false;
                const file = event.dataTransfer.files[0];
                if (file) {
                    processFile(file);
                }
            };

            const processFile = (file) => {
                selectedFile.value = file;
                
                // Parse CSV/Excel - simplified for demo
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    fileColumns.value = headers;
                    columnMapping.value = {};
                    
                    // Auto-suggest mapping
                    headers.forEach(col => {
                        const match = availableFields.value.find(f => 
                            f.label.toLowerCase().includes(col.toLowerCase()) ||
                            f.value.toLowerCase() === col.toLowerCase()
                        );
                        if (match) {
                            columnMapping.value[col] = match.value;
                        }
                    });
                    
                    // Preview first 5 rows
                    previewData.value = lines.slice(1, 6).map(line => {
                        const values = line.split(',');
                        const row = {};
                        headers.forEach((h, i) => {
                            row[h] = values[i]?.trim() || '';
                        });
                        return row;
                    });
                };
                reader.readAsText(file);
            };

            const formatFileSize = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            const startImport = async () => {
                isImporting.value = true;
                showProgressModal.value = true;
                importProgress.value = 0;
                importedCount.value = 0;
                totalRows.value = previewData.value.length;
                importErrors.value = [];

                // Simulate import progress
                for (let i = 0; i <= 100; i += 10) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    importProgress.value = i;
                    importedCount.value = Math.floor((i / 100) * totalRows.value);
                }

                isImporting.value = false;
            };

            const exportData = async (type, format) => {
                // Simulate export
                alert(`Export ${type} dalam format ${format} akan segera diunduh.`);
            };

            const downloadTemplate = (type) => {
                let csv = '';
                if (type === 'employees') {
                    csv = 'employee_code,full_name,department,position,email,phone,join_date\n';
                    csv += 'EMP001,Budi Santoso,Customer Service,Representative,budi@email.com,081234567890,2022-01-15\n';
                } else {
                    csv = 'employee_code,assessment_date,template_id,score_1,score_2,score_3,score_4,score_5,notes\n';
                    csv += 'EMP001,2024-01-15,1,4,5,3,4,5,Good performance\n';
                }
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `template_${type}.csv`;
                a.click();
            };

            return {
                importType,
                selectedFile,
                dragover,
                previewData,
                fileColumns,
                columnMapping,
                isImporting,
                showProgressModal,
                importProgress,
                importedCount,
                totalRows,
                importErrors,
                availableFields,
                canImport,
                handleFileSelect,
                handleDrop,
                formatFileSize,
                startImport,
                exportData,
                downloadTemplate,
            };
        }
    }).mount('#import-export-app');
</script>
@endpush
