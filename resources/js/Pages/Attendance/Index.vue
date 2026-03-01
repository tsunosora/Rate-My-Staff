<template>
  <AppLayout>
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 m-0 flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🕒</span>
            Attendance Dashboard
          </h1>
          <p class="text-gray-500 mt-1 mb-0 text-sm">Monitor daily employee attendance synced from Fingerspot.</p>
        </div>
        
        <div class="flex items-center gap-3 flex-wrap">
            <input type="date" v-model="filters.date" @change="fetchData" class="text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            
            <button @click="openLeaveLinkModal" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm">
                <span>🔗</span>
                Share Leave Link
            </button>
            <button @click="openManualModal" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm">
                <span>➕</span>
                Add Manual
            </button>
            <button @click="openImportModal" class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm">
                <span>📁</span>
                Import Excel
            </button>
        </div>
      </div>

      <div v-if="syncMessage" class="p-4 rounded-xl text-sm font-medium border text-center transition-all" 
           :class="syncError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'">
          {{ syncMessage }}
      </div>

      <!-- Metrics Cards -->
      <div class="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-sm:grid-cols-1">
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3 text-xl">👥</div>
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Total Present</h3>
          <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
            <span v-if="loadingMetrics" class="animate-pulse">...</span>
            <span v-else>{{ metrics.present }} / {{ metrics.total_employees }}</span>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <div class="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3 text-xl">⚠️</div>
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Total Late</h3>
          <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
            <span v-if="loadingMetrics" class="animate-pulse">...</span>
            <span v-else>{{ metrics.late }}</span>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3 text-xl">❌</div>
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Total Absent</h3>
          <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
            <span v-if="loadingMetrics" class="animate-pulse">...</span>
            <span v-else>{{ metrics.absent }}</span>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
            <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide mb-3">Recent Latecomers today</h3>
            <div v-if="loadingMetrics" class="animate-pulse text-gray-400">Loading...</div>
            <div v-else-if="recentLates.length === 0" class="text-gray-400 text-sm">No one is late today! 🎉</div>
            <ul v-else class="list-none p-0 m-0 space-y-2">
                <li v-for="late in recentLates" :key="late.id" class="flex justify-between items-center text-sm">
                    <span class="font-medium text-gray-700 truncate max-w-[120px]">{{ late.employee.full_name }}</span>
                    <span class="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg text-xs">{{ late.late_minutes }}m late</span>
                </li>
            </ul>
        </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 class="m-0 text-lg font-bold text-gray-800">Scan Logs</h2>
            <div class="flex gap-2">
                 <select v-model="filters.status" @change="fetchTableData" class="text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500">
                    <option value="all">All Status</option>
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                 </select>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-50/50">
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Employee</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Scan Date & Time</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Type</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Status</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Machine</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loadingTable">
                        <td colspan="5" class="p-8 text-center text-gray-400">Loading data...</td>
                    </tr>
                    <tr v-else-if="attendances.length === 0">
                        <td colspan="5" class="p-8 text-center text-gray-500">
                            <div class="text-4xl mb-3">📭</div>
                            No attendance records found for this date.
                        </td>
                    </tr>
                    <tr v-else v-for="record in attendances" :key="record.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                        <td class="p-4">
                            <div class="font-bold text-gray-800">{{ record.employee?.full_name || 'Unknown' }}</div>
                            <div class="text-xs text-gray-400 mt-0.5">{{ record.employee?.employee_code || 'No Code' }}</div>
                        </td>
                        <td class="p-4 text-center text-gray-600 text-sm">
                            {{ new Date(record.scan_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }}
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="record.scan_type === 'in'" class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                <span>📥</span> In
                            </span>
                            <span v-else-if="record.scan_type === 'out'" class="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                                <span>📤</span> Out
                            </span>
                            <span v-else class="text-xs text-gray-500">{{ record.scan_type || 'Unknown' }}</span>
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="record.status === 'on_time'" class="inline-flex text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                                On Time
                            </span>
                            <span v-else-if="record.status === 'late'" class="inline-flex text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100" :title="record.late_minutes + ' minutes late'">
                                Late ({{ record.late_minutes }}m)
                            </span>
                        </td>
                        <td class="p-4 text-center text-xs text-gray-400 max-w-[150px] truncate" :title="record.machine_name">
                            {{ record.machine_name }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Pagination Placeholder -->
        <div v-if="pagination.total > pagination.per_page" class="p-4 border-t border-gray-100 flex justify-center gap-2">
            <button @click="changePage(pagination.current_page - 1)" :disabled="pagination.current_page === 1" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50">Prev</button>
            <span class="px-3 py-1.5 text-sm text-gray-500">Page {{ pagination.current_page }} of {{ pagination.last_page }}</span>
            <button @click="changePage(pagination.current_page + 1)" :disabled="pagination.current_page === pagination.last_page" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
      
      <!-- Import/Preview Modal -->
      <div v-if="showImportModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 class="m-0 text-lg font-bold text-gray-800">{{ previewData ? 'Preview Import Data' : 'Import Attendance Excel' }}</h3>
            <button @click="closeImportModal" class="text-gray-400 hover:text-gray-600">×</button>
          </div>
          
          <!-- Upload Step -->
          <div v-if="!previewData" class="p-5">
            <p class="text-sm text-gray-500 mb-4">Please upload an Excel or HTML Export file (.xls, .xlsx, .html) from Fingerspot. Must contain columns: pin, tanggal, scan 1/jam masuk.</p>
            <input type="file" ref="fileInput" @change="handleFileChange" accept=".xls,.xlsx,.csv,.html,.htm" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"/>
            <div v-if="importError" class="text-red-500 text-xs mb-2">{{ importError }}</div>
          </div>

          <!-- Preview & Mapping Step -->
          <div v-if="previewData" class="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-green-50 border border-green-200 p-4 rounded-xl">
                    <h4 class="text-green-800 font-bold m-0 mb-1">Matched Records: {{ previewData.matched_count }}</h4>
                    <p class="text-green-600 text-sm m-0">Successfully matched to existing employees.</p>
                </div>
                <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                    <h4 class="text-orange-800 font-bold m-0 mb-1">Unmatched Names: {{ previewData.unique_unmatched_names.length }}</h4>
                    <p class="text-orange-600 text-sm m-0">Need to be mapped or created as new employees.</p>
                </div>
              </div>

              <!-- Warnings & Resolutions -->
              <div v-if="recordsWithWarnings.length > 0 || recordsWithMissingScans.length > 0" class="mb-6">
                  <h4 class="font-bold text-yellow-800 mb-3 border-b border-yellow-200 pb-2">⚠️ Data Warnings & Resolutions</h4>
                  
                  <!-- Overtime / Double Scan -->
                  <div v-if="recordsWithWarnings.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p class="text-sm font-bold text-yellow-800 mb-2" style="margin: 0">Extra Scans Detected ({{ recordsWithWarnings.length }} records):</p>
                      <ul class="list-disc list-inside text-sm text-yellow-700 space-y-1 mt-2">
                          <li v-for="(record, idx) in recordsWithWarnings" :key="'w-'+idx">
                              <strong>{{ getRecordName(record) }}</strong> on {{ record.tanggal }}:
                              <span v-for="(w, wIdx) in record.warnings.filter(x => x !== 'Missing Scan (Only 1 Scan Detected)')" :key="wIdx" class="ml-1">
                                  {{ w }}{{ wIdx < record.warnings.length - 2 ? ',' : '' }}
                              </span>
                          </li>
                      </ul>
                  </div>

                  <!-- Missing Scans -->
                  <div v-if="recordsWithMissingScans.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p class="text-sm font-bold text-blue-800 mb-1" style="margin: 0">Missing Scans / Only 1 Scan Detected ({{ recordsWithMissingScans.length }} records):</p>
                      <p class="text-xs text-blue-600 mb-3" style="margin: 0">Please resolve these single scans before importing.</p>
                      
                      <div class="space-y-3 mt-3">
                          <div v-for="(record, idx) in recordsWithMissingScans" :key="'m-'+idx" class="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded border border-blue-100">
                              <div class="font-medium text-gray-800 min-w-[200px]" :title="getRecordName(record)">
                                  {{ getRecordName(record) }} <span class="text-xs text-gray-500 font-normal ml-1">({{ record.tanggal }})</span>
                              </div>
                              <div class="flex-1">
                                  <select v-model="record.resolution" class="w-full text-sm bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500">
                                      <option :value="undefined" disabled>-- Select Resolution --</option>
                                      <option value="lupa_scan">Auto-Deteksi (Otomatis Jadikan Jam Masuk/Pulang)</option>
                                      <option value="long_shift">Long Shift / Lembur</option>
                                      <option value="ignore">❌ Ignore (Do not import this row)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div v-if="previewData.unique_unmatched_names.length > 0">
                  <h4 class="font-bold text-gray-800 mb-3 border-b pb-2">Resolve Unmatched Names</h4>
                  <p class="text-sm text-gray-500 mb-4">Map these names to existing employees or create new profiles for them.</p>

                  <div class="space-y-4">
                      <div v-for="name in previewData.unique_unmatched_names" :key="name" class="flex flex-col md:flex-row md:items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div class="font-medium text-gray-800 min-w-[200px] max-w-[300px] truncate" :title="name">{{ name }}</div>
                          <div class="flex-1">
                              <select v-model="mappings[name]" class="w-full text-sm bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500">
                                  <option value="SKIP">❌ Ignore / Do not import</option>
                                  <option value="CREATE_NEW">✨ Create New Employee Profile</option>
                                  <optgroup label="Map to Existing Employee:">
                                      <option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">
                                          {{ emp.full_name }} ({{ emp.employee_code }})
                                      </option>
                                  </optgroup>
                              </select>
                          </div>
                      </div>
                  </div>
              </div>
              <div v-else class="text-center py-8">
                  <div class="text-5xl mb-3">🎉</div>
                  <h3 class="text-gray-800 font-bold m-0">All records matched perfectly!</h3>
                  <p class="text-gray-500 text-sm mt-2">You can proceed to finalize the import.</p>
              </div>
          </div>

          <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
            <button @click="closeImportModal" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            
            <button v-if="!previewData" @click="submitImport" :disabled="!selectedFile || isImporting" class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              <span v-if="isImporting" class="animate-spin">⏳</span>
              <span>Preview Data</span>
            </button>

            <button v-if="previewData" @click="finalizeImport" :disabled="isFinalizing" class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              <span v-if="isFinalizing" class="animate-spin">⏳</span>
              <span>Finalize Import</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Add Manual Attendance Modal -->
      <div v-if="showManualModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="m-0 text-lg font-bold text-gray-800">Add Manual Attendance</h3>
            <button @click="closeManualModal" class="text-gray-400 hover:text-gray-600 border-none bg-transparent text-xl font-bold cursor-pointer">×</button>
          </div>
          
          <div class="p-5 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Employee</label>
                <select v-model="manualForm.employee_id" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                    <option value="" disabled>Select Employee</option>
                    <option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">{{ emp.full_name }} ({{ emp.employee_code }})</option>
                </select>
            </div>
            
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Date</label>
                <input type="date" v-model="manualForm.date" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Clock In</label>
                    <input type="time" v-model="manualForm.clock_in" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Clock Out</label>
                    <input type="time" v-model="manualForm.clock_out" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                </div>
            </div>

            <div v-if="manualError" class="text-red-500 text-xs font-medium">{{ manualError }}</div>
          </div>

          <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
            <button @click="closeManualModal" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors border-none bg-transparent cursor-pointer">Cancel</button>
            <button @click="submitManual" :disabled="isSubmittingManual" class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 border-none cursor-pointer">
              <span v-if="isSubmittingManual" class="animate-spin">⏳</span>
              Save Entry
            </button>
          </div>
        </div>
      </div>

      <!-- Share Leave Link Modal -->
      <div v-if="showLeaveLinkModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50">
            <h3 class="m-0 text-lg font-bold text-purple-800">Share Leave Link</h3>
            <button @click="closeLeaveLinkModal" class="text-purple-400 hover:text-purple-600 border-none bg-transparent text-xl font-bold cursor-pointer">×</button>
          </div>
          
          <div class="p-5 space-y-4 text-center">
            <p class="text-sm text-gray-500">
                Bagikan link ini ke karyawan agar mereka bisa mengisi konfirmasi Izin/Sakit/Cuti tanpa harus login.
                Link akan otomatis kadaluwarsa dalam 24 jam.
            </p>

            <div v-if="isLoadingLeaveLink" class="text-gray-400">Loading...</div>
            
            <div v-else-if="activeLeaveLink" class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tautan Aktif</p>
                <input type="text" readonly :value="activeLeaveLink.url" class="w-full text-center text-sm font-mono bg-white border border-gray-300 px-3 py-2 rounded-lg text-purple-700 mb-3 select-all focus:outline-none focus:border-purple-500">
                <p class="text-xs text-orange-500 m-0">
                    Kedaluwarsa: {{ new Date(activeLeaveLink.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
                </p>
            </div>
            
            <div v-else class="text-gray-500 text-sm mb-4">
                Belum ada tautan aktif. Silakan buat tautan baru.
            </div>

            <button @click="generateLeaveLink" :disabled="isGeneratingLink" class="w-full px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm border-none cursor-pointer disabled:opacity-50">
                <span v-if="isGeneratingLink" class="animate-spin">⏳</span>
                <span v-else>✨</span>
                Generate New 24hr Link
            </button>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const loadingMetrics = ref(true);
const loadingTable = ref(true);
const syncMessage = ref('');
const syncError = ref(false);

const showImportModal = ref(false);
const fileInput = ref(null);
const selectedFile = ref(null);
const isImporting = ref(false);
const isFinalizing = ref(false);
const importError = ref('');
const previewData = ref(null);
const mappings = reactive({});
const employeeOptions = ref([]);

// Manual Entry State
const showManualModal = ref(false);
const isSubmittingManual = ref(false);
const manualError = ref('');
const manualForm = reactive({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: ''
});

// Leave Link State
const showLeaveLinkModal = ref(false);
const isLoadingLeaveLink = ref(false);
const isGeneratingLink = ref(false);
const activeLeaveLink = ref(null);

const recordsWithWarnings = computed(() => {
    if (!previewData.value || !previewData.value.preview_data) return [];
    
    const allRecords = [
        ...(previewData.value.preview_data.matched || []),
        ...(previewData.value.preview_data.unmatched || [])
    ];
    
    return allRecords.filter(r => r.warnings && r.warnings.length > 0 && r.warnings.some(w => w !== 'Missing Scan (Only 1 Scan Detected)'));
});

const recordsWithMissingScans = computed(() => {
    if (!previewData.value || !previewData.value.preview_data) return [];
    
    const allRecords = [
        ...(previewData.value.preview_data.matched || []),
        ...(previewData.value.preview_data.unmatched || [])
    ];
    
    return allRecords.filter(r => r.warnings && r.warnings.includes('Missing Scan (Only 1 Scan Detected)'));
});

const getRecordName = (r) => r.original_name || r.original_pin || 'Unknown';

const todayStr = new Date().toISOString().split('T')[0];
const filters = reactive({
    date: todayStr,
    status: 'all'
});

const metrics = ref({ present: 0, late: 0, absent: 0, total_employees: 0 });
const recentLates = ref([]);

const attendances = ref([]);
const pagination = ref({ current_page: 1, last_page: 1, total: 0, per_page: 20 });

onMounted(() => {
    fetchData();
});

const fetchData = () => {
    fetchDashboardStats();
    fetchTableData(1);
};

const fetchDashboardStats = async () => {
    loadingMetrics.value = true;
    try {
        const response = await axios.get('/api/attendances/dashboard-stats', { params: { date: filters.date } });
        metrics.value = response.data.metrics;
        recentLates.value = response.data.recent_lates;
    } catch (error) {
        console.error("Failed to load attendance metrics", error);
    } finally {
        loadingMetrics.value = false;
    }
};

const fetchTableData = async (page = 1) => {
    loadingTable.value = true;
    try {
        const response = await axios.get('/api/attendances', { 
            params: { 
                start_date: filters.date,
                end_date: filters.date,
                status: filters.status,
                page: page
            } 
        });
        attendances.value = response.data.data;
        pagination.value = {
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            total: response.data.total,
            per_page: response.data.per_page
        };
    } catch (error) {
        console.error("Failed to load attendance table", error);
    } finally {
        loadingTable.value = false;
    }
};

const changePage = (page) => {
    if (page >= 1 && page <= pagination.value.last_page) {
        fetchTableData(page);
    }
};

const openImportModal = async () => {
    showImportModal.value = true;
    importError.value = '';
    selectedFile.value = null;
    previewData.value = null;
    if (fileInput.value) fileInput.value.value = '';

    // Load employees for mapping options if not loaded
    if (employeeOptions.value.length === 0) {
        try {
            const res = await axios.get('/api/employees', { params: { limit: 1000 } });
            // Since index is paginated, we handle it if data property exists
            employeeOptions.value = res.data.data ? res.data.data : res.data;
        } catch (e) {
            console.error(e);
        }
    }
};

const closeImportModal = () => {
    showImportModal.value = false;
    previewData.value = null;
};

const handleFileChange = (e) => {
    selectedFile.value = e.target.files[0];
    importError.value = '';
};

const submitImport = async () => {
    if (!selectedFile.value) return;
    
    isImporting.value = true;
    importError.value = '';
    syncMessage.value = '';
    syncError.value = false;

    const formData = new FormData();
    formData.append('file', selectedFile.value);

    try {
        const response = await axios.post('/api/attendances/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        previewData.value = response.data;
        
        // Auto-select SKIP for all unmatched names by default
        if (previewData.value.unique_unmatched_names) {
            previewData.value.unique_unmatched_names.forEach(name => {
                if (!mappings[name]) mappings[name] = 'SKIP';
            });
        }
    } catch (error) {
        importError.value = error.response?.data?.message || 'Failed to parse file for preview.';
    } finally {
        isImporting.value = false;
    }
};

const finalizeImport = async () => {
    isFinalizing.value = true;
    importError.value = '';
    
    // Filter out SKIPPED mappings and prepare records
    let finalMappings = {};
    for (const [key, val] of Object.entries(mappings)) {
        if (val !== 'SKIP') {
            finalMappings[key] = val;
        }
    }

    try {
        const response = await axios.post('/api/attendances/import/finalize', {
            mappings: finalMappings,
            matched_data: previewData.value.preview_data.matched.filter(r => r.resolution !== 'ignore'),
            unmatched_data: previewData.value.preview_data.unmatched.filter(r => {
                const id = r.original_name || r.original_pin;
                return mappings[id] && mappings[id] !== 'SKIP' && r.resolution !== 'ignore';
            }),
        });
        
        syncMessage.value = response.data.message || 'Import finalized successfully';
        closeImportModal();
        fetchData();
    } catch (error) {
        if (error.response && error.response.data) {
            console.error("IMPORT ERROR DETAILS:", error.response.data);
        }
        importError.value = error.response?.data?.message || 'Failed to finalize import.';
    } finally {
        isFinalizing.value = false;
        setTimeout(() => syncMessage.value = '', 5000);
    }
};

// --- Manual Entry Logic ---
const openManualModal = async () => {
    manualError.value = '';
    manualForm.clock_in = '';
    manualForm.clock_out = '';
    manualForm.employee_id = '';
    manualForm.date = filters.date || new Date().toISOString().split('T')[0];
    showManualModal.value = true;
    
    // Ensure we have employee options loaded
    if (employeeOptions.value.length === 0) {
        try {
            const res = await axios.get('/api/employees', { params: { limit: 1000 } });
            employeeOptions.value = res.data.data ? res.data.data : res.data;
        } catch (e) {
            console.error(e);
        }
    }
};

const closeManualModal = () => {
    showManualModal.value = false;
};

const submitManual = async () => {
    if (!manualForm.employee_id || !manualForm.date) {
        manualError.value = "Employee and Date are required.";
        return;
    }
    if (!manualForm.clock_in && !manualForm.clock_out) {
        manualError.value = "Please provide at least a Clock In or Clock Out time.";
        return;
    }

    isSubmittingManual.value = true;
    manualError.value = '';

    try {
        await axios.post('/api/attendances/store-manual', manualForm);
        syncMessage.value = "Manual attendance saved successfully.";
        closeManualModal();
        fetchData();
        setTimeout(() => syncMessage.value = '', 5000);
    } catch (error) {
        manualError.value = error.response?.data?.message || 'Failed to save manual attendance.';
    } finally {
        isSubmittingManual.value = false;
    }
};

// --- Leave Link Logic ---
const openLeaveLinkModal = async () => {
    showLeaveLinkModal.value = true;
    isLoadingLeaveLink.value = true;
    try {
        const response = await axios.get('/api/attendances/leave-link');
        if (response.data.active) {
            activeLeaveLink.value = response.data;
        } else {
            activeLeaveLink.value = null;
        }
    } catch (e) {
        console.error("Failed to fetch leave link", e);
    } finally {
        isLoadingLeaveLink.value = false;
    }
};

const closeLeaveLinkModal = () => {
    showLeaveLinkModal.value = false;
};

const generateLeaveLink = async () => {
    isGeneratingLink.value = true;
    try {
        const response = await axios.post('/api/attendances/leave-link');
        activeLeaveLink.value = {
            url: response.data.url,
            expires_at: response.data.expires_at
        };
        syncMessage.value = "Tautan izin baru berhasil dibuat!";
        setTimeout(() => syncMessage.value = '', 5000);
    } catch (e) {
        console.error("Failed to generate leave link", e);
    } finally {
        isGeneratingLink.value = false;
    }
};

</script>
