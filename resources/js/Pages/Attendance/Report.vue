<template>
  <AppLayout>
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 m-0 flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">📋</span>
            Detailed Attendance Report
          </h1>
          <p class="text-gray-500 mt-1 mb-0 text-sm">View attendance summaries overlaid with schedule and overtime.</p>
        </div>
        
        <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
                <input type="date" v-model="filters.start_date" @change="fetchData(1)" class="text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <span class="text-gray-400">to</span>
                <input type="date" v-model="filters.end_date" @change="fetchData(1)" class="text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            </div>
            <div class="flex items-center gap-2">
                <button @click="exportExcel" class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm border-none cursor-pointer" title="Laporan Kehadiran & Analisis (Excel)">
                    <span>📊</span>
                    Export Excel
                </button>
                <div class="h-8 w-px bg-gray-200 mx-1"></div>
                <button @click="exportPdf" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm border-none cursor-pointer" title="Laporan Kehadiran & Analisis (PDF)">
                    <span>📄</span>
                    Export PDF
                </button>
            </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex gap-4 flex-wrap">
          <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Department</label>
              <select v-model="filters.department_id" @change="fetchData(1)" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                  <option value="all">All Departments</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
          </div>
          <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Employee</label>
              <select v-model="filters.employee_id" @change="fetchData(1)" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                  <option value="all">All Employees</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
              </select>
          </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-50/50">
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Date</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Employee</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Shift Schedule</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Clock In</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Clock Out</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Late</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Overtime</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Status</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="9" class="p-8 text-center text-gray-400">Loading comprehensive report...</td>
                    </tr>
                    <tr v-else-if="reports.length === 0">
                        <td colspan="9" class="p-8 text-center text-gray-500">
                            <div class="text-4xl mb-3">📭</div>
                            No attendance records found for this period.
                        </td>
                    </tr>
                    <tr v-else v-for="(row, idx) in reports" :key="idx" class="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td class="p-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                            {{ formatDate(row.date) }}
                        </td>
                        <td class="p-4">
                            <div class="font-bold text-gray-800 whitespace-nowrap">{{ row.employee_name }}</div>
                            <div class="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">{{ row.department }}</div>
                        </td>
                        <td class="p-4 text-center">
                            <div class="text-sm text-gray-600 font-medium">{{ row.shift }}</div>
                            <div v-if="row.shift_start" class="text-xs text-gray-400 mt-0.5">{{ row.shift_start }} - {{ row.shift_end }}</div>
                        </td>
                        <td class="p-4 text-center">
                            <span :class="{'text-blue-600 font-bold': row.clock_in !== '-', 'text-gray-400': row.clock_in === '-'}">{{ row.clock_in }}</span>
                        </td>
                        <td class="p-4 text-center">
                            <span :class="{'text-purple-600 font-bold': row.clock_out !== '-', 'text-gray-400': row.clock_out === '-'}">{{ row.clock_out }}</span>
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="row.late_minutes > 0" class="inline-flex text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                {{ row.late_minutes }}m
                            </span>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="row.overtime_minutes > 0" class="inline-flex text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                {{ formatDuration(row.overtime_minutes) }}
                            </span>
                            <span v-else class="text-xs text-gray-400">-</span>
                            <div v-if="row.overtime_reason" class="text-[10px] text-gray-500 mt-1 max-w-[120px] whitespace-normal text-left mx-auto leading-tight italic" :title="row.overtime_reason">
                                {{ row.overtime_reason }}
                            </div>
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="row.status === 'Present'" class="inline-flex text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                Present
                            </span>
                            <span v-else-if="row.status === 'Absent'" class="inline-flex text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                Absent
                            </span>
                            <span v-else-if="['Izin', 'Sakit', 'Cuti'].includes(row.status)" class="inline-flex text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                                {{ row.status }}
                            </span>
                            <span v-else class="inline-flex text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                                {{ row.status }}
                            </span>

                            <div v-if="row.absence_reason" class="text-[10px] text-gray-500 mt-1 max-w-[120px] whitespace-normal text-center mx-auto leading-tight italic" :title="row.absence_reason">
                                {{ row.absence_reason }}
                            </div>
                        </td>
                        <td class="p-4 text-center">
                            <button @click="openEditModal(row)" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                Edit
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Pagination -->
        <div v-if="pagination.total > pagination.per_page" class="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
            <div class="text-sm text-gray-500 font-medium">
                Showing <span class="text-gray-900">{{ (pagination.current_page - 1) * pagination.per_page + 1 }}</span> to <span class="text-gray-900">{{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }}</span> of <span class="text-gray-900">{{ pagination.total }}</span> results
            </div>
            <div class="flex gap-2">
                <button @click="changePage(pagination.current_page - 1)" :disabled="pagination.current_page === 1" class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors shadow-sm bg-gray-50">Previous</button>
                <button @click="changePage(pagination.current_page + 1)" :disabled="pagination.current_page === pagination.last_page" class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors shadow-sm bg-gray-50">Next</button>
            </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="m-0 text-lg font-bold text-gray-800">Edit Attendance Record</h3>
            <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600 border-none bg-transparent text-xl font-bold cursor-pointer">×</button>
          </div>
          
          <div class="p-5 space-y-4">
            <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <p class="text-sm font-bold text-gray-800 m-0">{{ editForm.employee_name }}</p>
                <p class="text-xs text-gray-500 m-0">{{ formatDate(editForm.date) }} • {{ editForm.shift }}</p>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Clock In Time</label>
                <input type="time" v-model="editForm.clock_in" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Clock Out Time</label>
                <input type="time" v-model="editForm.clock_out" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
            </div>

            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Late (Minutes)</label>
                    <input type="number" min="0" v-model="editForm.late_minutes" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Overtime (Minutes)</label>
                    <input type="number" min="0" v-model="editForm.overtime_minutes" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                </div>
            </div>

            <div v-if="editForm.overtime_minutes > 0">
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Overtime Reason</label>
                <textarea v-model="editForm.overtime_reason" rows="2" placeholder="What task was completed during this overtime?" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 resize-none"></textarea>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                <select v-model="editForm.status" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500">
                    <option value="Present">Present (On Time)</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Long Shift / Lembur">Long Shift / Lembur</option>
                    <option value="Lupa Scan Masuk">Lupa Scan Masuk</option>
                    <option value="Lupa Scan Pulang">Lupa Scan Pulang</option>
                </select>
            </div>

            <div v-if="editError" class="text-red-500 text-xs font-medium">{{ editError }}</div>
          </div>

          <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
            <button @click="closeEditModal" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors border-none bg-transparent cursor-pointer">Cancel</button>
            <button @click="submitEdit" :disabled="isSubmitting" class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 border-none cursor-pointer">
              <span v-if="isSubmitting" class="animate-spin">⏳</span>
              Save Changes
            </button>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const loading = ref(true);
const reports = ref([]);
const departments = ref([]);
const employees = ref([]);

// Default to past 7 days
const end = new Date();
const start = new Date();
start.setDate(end.getDate() - 7);

const filters = reactive({
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
    department_id: 'all',
    employee_id: 'all'
});

const pagination = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 });

onMounted(() => {
    fetchOptions();
    fetchData(1);
});

const fetchOptions = async () => {
    try {
        const [deptRes, empRes] = await Promise.all([
            axios.get('/api/departments'),
            axios.get('/api/employees', { params: { limit: 1000 } })
        ]);
        departments.value = deptRes.data;
        employees.value = empRes.data.data ? empRes.data.data : empRes.data;
    } catch (e) {
        console.error("Failed to fetch filter options", e);
    }
};

const fetchData = async (page = 1) => {
    loading.value = true;
    try {
        const response = await axios.get('/api/attendance-reports', { 
            params: { 
                ...filters,
                page: page
            } 
        });
        reports.value = response.data.data;
        pagination.value = {
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            total: response.data.total,
            per_page: response.data.per_page
        };
    } catch (error) {
        console.error("Failed to load detailed report", error);
    } finally {
        loading.value = false;
    }
};

const changePage = (page) => {
    if (page >= 1 && page <= pagination.value.last_page) {
        fetchData(page);
    }
};

const exportExcel = () => {
    const params = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id,
        employee_id: filters.employee_id,
    });
    
    window.location.href = `/api/attendance-reports/export/excel?${params.toString()}`;
};

const exportPdf = () => {
    const params = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id,
        employee_id: filters.employee_id,
    });
    
    window.open(`/api/attendance-reports/export/pdf?${params.toString()}`, '_blank');
};

const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Edit Modal State & Logic ---
const showEditModal = ref(false);
const isSubmitting = ref(false);
const editError = ref('');
const editForm = reactive({
    id: null,
    employee_id: null,
    employee_name: '',
    date: '',
    shift: '',
    clock_in: '',
    clock_out: '',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_reason: '',
    status: 'Present'
});

const openEditModal = (row) => {
    editError.value = '';
    
    // We need to pass the IDs to the backend. The Report query doesn't currently return the exact Attendance ID.
    // Instead, we will pass employee_id and date to the backend API, and it will update the IN/OUT records for that day.
    Object.assign(editForm, {
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        date: row.date,
        shift: row.shift,
        clock_in: row.clock_in !== '-' ? row.clock_in : '',
        clock_out: row.clock_out !== '-' ? row.clock_out : '',
        late_minutes: row.late_minutes || 0,
        overtime_minutes: row.overtime_minutes || 0,
        overtime_reason: row.overtime_reason || '',
        status: row.status
    });
    
    showEditModal.value = true;
};

const closeEditModal = () => {
    showEditModal.value = false;
};

const submitEdit = async () => {
    isSubmitting.value = true;
    editError.value = '';

    try {
        await axios.post('/api/attendances/update-report', {
            employee_id: editForm.employee_id,
            date: editForm.date,
            clock_in: editForm.clock_in,
            clock_out: editForm.clock_out,
            late_minutes: editForm.late_minutes,
            overtime_minutes: editForm.overtime_minutes,
            overtime_reason: editForm.overtime_reason,
            status: editForm.status
        });
        
        closeEditModal();
        fetchData(pagination.value.current_page); // Refresh current page
    } catch (error) {
        editError.value = error.response?.data?.message || 'Failed to update attendance record.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>
