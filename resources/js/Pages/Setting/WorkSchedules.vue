<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 m-0 flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🕒</span>
            Work Schedules
          </h1>
          <p class="text-gray-500 mt-1 mb-0 text-sm">Manage employee work shifts, rest hours, and wage calculations.</p>
        </div>
        
        <button @click="openAddModal" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm">
            <span>➕</span>
            Add Schedule
        </button>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-50/50">
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Name</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Work Hours</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Break Hours</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Late Toler. (Mins)</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Daily Wage</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Is Holiday</th>
                        <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="6" class="p-8 text-center text-gray-400">Loading schedules...</td>
                    </tr>
                    <tr v-else-if="schedules.length === 0">
                        <td colspan="6" class="p-8 text-center text-gray-500">
                            <div class="text-4xl mb-3">📭</div>
                            No work schedules created yet.
                        </td>
                    </tr>
                    <tr v-else v-for="schedule in schedules" :key="schedule.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                        <td class="p-4 font-bold text-gray-800">{{ schedule.name }}</td>
                        <td class="p-4 text-center text-gray-600 text-sm">
                            <span v-if="schedule.start_time && schedule.end_time">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</span>
                            <span v-else class="text-gray-400">-</span>
                        </td>
                        <td class="p-4 text-center text-gray-600 text-sm">
                            <span v-if="schedule.break_start_time && schedule.break_end_time">{{ formatTime(schedule.break_start_time) }} - {{ formatTime(schedule.break_end_time) }}</span>
                            <span v-else class="text-gray-400">-</span>
                        </td>
                        <td class="p-4 text-center text-gray-600 font-medium text-sm">
                            <span v-if="schedule.late_tolerance_minutes !== null">{{ schedule.late_tolerance_minutes }} min</span>
                            <span v-else class="text-gray-400">15 min</span>
                        </td>
                        <td class="p-4 text-center text-gray-600 font-medium">
                            Rp {{ Number(schedule.daily_wage).toLocaleString('id-ID') }}
                        </td>
                        <td class="p-4 text-center">
                            <span v-if="schedule.is_holiday" class="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-100">Yes</span>
                            <span v-else class="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-xs font-bold border border-gray-200">No</span>
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex gap-2 justify-center">
                                <button @click="openEditModal(schedule)" class="px-3 py-1.5 text-xs rounded-lg font-bold bg-[#f59e0b] text-white hover:bg-amber-600 transition-colors shadow-sm">Edit</button>
                                <button @click="confirmDelete(schedule)" class="px-3 py-1.5 text-xs rounded-lg font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm">Delete</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>

      <!-- Schedule Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="m-0 text-xl font-bold text-gray-800">{{ editMode ? 'Edit' : 'Add' }} Work Schedule</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer">&times;</button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <form @submit.prevent="submitForm" class="space-y-6">
                <!-- Basic Info -->
                <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h4 class="text-sm font-bold text-blue-800 mb-3 border-b border-blue-200/50 pb-2">Basic Information</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-bold text-gray-700 mb-1">Schedule Name <span class="text-red-500">*</span></label>
                            <input v-model="form.name" required type="text" placeholder="e.g. Shift Pagi, Normal, Libur" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        </div>
                        <div class="md:col-span-2 flex items-center gap-2 mt-2">
                            <input type="checkbox" id="is_holiday" v-model="form.is_holiday" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                            <label for="is_holiday" class="text-sm font-bold text-gray-700 cursor-pointer">Mark as Holiday Schedule (e.g. Sunday)</label>
                        </div>
                    </div>
                </div>

                <!-- Timing Settings -->
                <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100" v-if="!form.is_holiday">
                    <h4 class="text-sm font-bold text-emerald-800 mb-3 border-b border-emerald-200/50 pb-2">Working Hours</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Check In Time (Jam Masuk)</label>
                            <input v-model="form.start_time" type="time" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Check Out Time (Jam Pulang)</label>
                            <input v-model="form.end_time" type="time" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Break Start (Mulai Istirahat)</label>
                            <input v-model="form.break_start_time" type="time" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Break End (Selesai Istirahat)</label>
                            <input v-model="form.break_end_time" type="time" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                        </div>
                        <div class="md:col-span-2 mt-2 pt-4 border-t border-emerald-100/50">
                            <label class="block text-sm font-bold text-gray-700 mb-1">Late Tolerance (Batas Toleransi Terlambat) / Menit</label>
                            <input v-model="form.late_tolerance_minutes" type="number" min="0" placeholder="e.g. 15" class="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                            <p class="text-xs text-gray-500 mt-1">If empty, defaults to 15 minutes.</p>
                        </div>
                    </div>
                </div>

                <!-- Wage Settings -->
                <div class="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <h4 class="text-sm font-bold text-amber-800 mb-3 border-b border-amber-200/50 pb-2">Wage Configuration</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Daily Wage (Gaji Harian)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-gray-500 text-sm font-bold">Rp</span>
                                <input v-model="form.daily_wage" type="number" min="0" step="1000" class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Holiday Wage (Upah Hari Libur)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-gray-500 text-sm font-bold">Rp</span>
                                <input v-model="form.holiday_wage" type="number" min="0" step="1000" class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Weekly Wage Config</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-gray-500 text-sm font-bold">Rp</span>
                                <input v-model="form.weekly_wage" type="number" min="0" step="1000" class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Monthly Wage Config</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-gray-500 text-sm font-bold">Rp</span>
                                <input v-model="form.monthly_wage" type="number" min="0" step="1000" class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-bold text-gray-700 mb-1">Overtime per Hour (Upah Lembur per Jam)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-gray-500 text-sm font-bold">Rp</span>
                                <input v-model="form.overtime_wage_per_hour" type="number" min="0" step="1000" class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            </div>
                        </div>
                    </div>
                </div>

            </form>
          </div>

          <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
            <button @click="closeModal" type="button" class="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-white border border-gray-200 transition-colors shadow-sm">Cancel</button>
            <button @click="submitForm" :disabled="isSaving" class="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
                <span v-if="isSaving" class="animate-spin">⏳</span>
                <span>{{ editMode ? 'Update' : 'Save' }} Schedule</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const loading = ref(true);
const schedules = ref([]);
const showModal = ref(false);
const editMode = ref(false);
const isSaving = ref(false);

const initialFormState = {
    id: null,
    name: '',
    start_time: '',
    end_time: '',
    break_start_time: '',
    break_end_time: '',
    daily_wage: 0,
    monthly_wage: 0,
    weekly_wage: 0,
    holiday_wage: 0,
    overtime_wage_per_hour: 0,
    late_tolerance_minutes: 15,
    is_holiday: false
};

const form = reactive({ ...initialFormState });

onMounted(() => {
    fetchSchedules();
});

const formatTime = (timeString) => {
    if (!timeString) return '';
    // timeString is typically "HH:mm:ss", return "HH:mm"
    return timeString.substring(0, 5);
};

const fetchSchedules = async () => {
    loading.value = true;
    try {
        const response = await axios.get('/api/work-schedules');
        schedules.value = response.data.data;
    } catch (error) {
        console.error("Failed to load schedules", error);
    } finally {
        loading.value = false;
    }
};

const openAddModal = () => {
    editMode.value = false;
    Object.assign(form, initialFormState);
    showModal.value = true;
};

const openEditModal = (schedule) => {
    editMode.value = true;
    Object.assign(form, {
        id: schedule.id,
        name: schedule.name,
        start_time: formatTime(schedule.start_time),
        end_time: formatTime(schedule.end_time),
        break_start_time: formatTime(schedule.break_start_time),
        break_end_time: formatTime(schedule.break_end_time),
        daily_wage: schedule.daily_wage || 0,
        monthly_wage: schedule.monthly_wage || 0,
        weekly_wage: schedule.weekly_wage || 0,
        holiday_wage: schedule.holiday_wage || 0,
        overtime_wage_per_hour: schedule.overtime_wage_per_hour || 0,
        late_tolerance_minutes: schedule.late_tolerance_minutes ?? 15,
        is_holiday: schedule.is_holiday
    });
    showModal.value = true;
};

const closeModal = () => {
    showModal.value = false;
};

const submitForm = async () => {
    if (!form.name) return alert('Name is required');

    isSaving.value = true;
    try {
        // Clean empty string times to null
        const payload = { ...form };
        const timeFields = ['start_time', 'end_time', 'break_start_time', 'break_end_time'];
        timeFields.forEach(field => {
            if (payload[field] === '') payload[field] = null;
        });

        if (editMode.value) {
            await axios.put(`/api/work-schedules/${form.id}`, payload);
        } else {
            await axios.post('/api/work-schedules', payload);
        }
        
        closeModal();
        fetchSchedules();
    } catch (error) {
        console.error("Save failed", error);
        alert('Failed to save schedule: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
        isSaving.value = false;
    }
};

const confirmDelete = async (schedule) => {
    if (confirm(`Are you sure you want to delete "${schedule.name}"?`)) {
        try {
            await axios.delete(`/api/work-schedules/${schedule.id}`);
            fetchSchedules();
        } catch (error) {
            alert('Failed to delete: ' + (error.response?.data?.message || 'Unknown error'));
        }
    }
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
</style>
