<template>
  <LinkExpired v-if="isInvalid" />
  
  <div v-else-if="isLoading" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="animate-spin text-4xl">⏳</div>
  </div>

  <div v-else class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-center text-white relative flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl mb-3 shadow-sm border border-white/30">
                📝
            </div>
            <h2 class="text-xl font-bold m-0 tracking-wide">Formulir Ketidakhadiran</h2>
            <p class="text-xs text-white/80 mt-1 mb-0 opacity-90">Berlaku s/d {{ new Date(expires_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
        </div>

        <div v-if="successMessage" class="p-8 text-center flex flex-col items-center justify-center animate-fade-in-up">
            <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-4xl mb-4 border border-green-100 shadow-sm text-green-500">
                ✅
            </div>
            <h3 class="text-xl font-bold text-gray-800 m-0">Berhasil!</h3>
            <p class="text-gray-500 mt-2 mb-0 text-sm">{{ successMessage }}</p>
            <p class="text-xs text-gray-400 mt-6">Anda sudah bisa menutup halaman ini.</p>
        </div>

        <div v-else class="p-6">
            <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
               <span>⚠️</span> <span>{{ errorMessage }}</span>
            </div>

            <form @submit.prevent="submitForm" class="space-y-5">
                <!-- Employee Selection -->
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Nama Anda <span class="text-red-500">*</span></label>
                    <select required v-model="form.employee_id" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all appearance-none cursor-pointer">
                        <option value="" disabled selected>-- Pilih Nama Anda --</option>
                        <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                            {{ emp.full_name }} ({{ emp.employee_code }})
                        </option>
                    </select>
                </div>

                <!-- Date -->
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tanggal Ketidakhadiran <span class="text-red-500">*</span></label>
                    <input required type="date" v-model="form.scan_date" class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all">
                </div>

                <!-- Status Select -->
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Jenis <span class="text-red-500">*</span></label>
                    <div class="grid grid-cols-3 gap-3">
                        <label class="cursor-pointer relative">
                            <input type="radio" value="Izin" v-model="form.status" class="peer sr-only">
                            <div class="text-center bg-gray-50 border border-gray-200 rounded-xl py-3 peer-checked:bg-blue-50 peer-checked:border-blue-500 peer-checked:text-blue-700 transition-all font-medium text-sm text-gray-500 flex flex-col items-center gap-1">
                                <span class="text-xl block">🚶</span> Izin
                            </div>
                        </label>
                        <label class="cursor-pointer relative">
                            <input type="radio" value="Sakit" v-model="form.status" class="peer sr-only">
                            <div class="text-center bg-gray-50 border border-gray-200 rounded-xl py-3 peer-checked:bg-orange-50 peer-checked:border-orange-500 peer-checked:text-orange-700 transition-all font-medium text-sm text-gray-500 flex flex-col items-center gap-1">
                                <span class="text-xl block">🤒</span> Sakit
                            </div>
                        </label>
                        <label class="cursor-pointer relative">
                            <input type="radio" value="Cuti" v-model="form.status" class="peer sr-only">
                            <div class="text-center bg-gray-50 border border-gray-200 rounded-xl py-3 peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700 transition-all font-medium text-sm text-gray-500 flex flex-col items-center gap-1">
                                <span class="text-xl block">🌴</span> Cuti
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Reason -->
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Keterangan / Alasan Lengkap <span class="text-red-500">*</span></label>
                    <textarea required v-model="form.absence_reason" rows="3" placeholder="Tuliskan keterangan sakit atau alasan izin secara rinci..." class="w-full text-sm bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all resize-none"></textarea>
                </div>

                <div class="pt-2">
                    <button type="submit" :disabled="isSubmitting || !isFormValid" class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:shadow-none border-none cursor-pointer">
                        <span v-if="isSubmitting" class="animate-spin text-lg">⏳</span>
                        <span v-else class="text-lg">📤</span>
                        {{ isSubmitting ? 'Mengirim Data...' : 'Kirim Laporan' }}
                    </button>
                </div>
            </form>
        </div>
        
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import LinkExpired from './LinkExpired.vue';

const route = useRoute();
const token = route.params.token;

const isLoading = ref(true);
const isInvalid = ref(false);
const employees = ref([]);
const expires_at = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const form = reactive({
    employee_id: '',
    scan_date: new Date().toISOString().split('T')[0],
    status: '',
    absence_reason: ''
});

onMounted(async () => {
    try {
        const res = await axios.get(`/api/public/absence-form/${token}`);
        employees.value = res.data.employees;
        expires_at.value = res.data.expires_at;
    } catch (e) {
        isInvalid.value = true;
    } finally {
        isLoading.value = false;
    }
});

const isFormValid = computed(() => {
    return form.employee_id && form.scan_date && form.status && form.absence_reason.trim() !== '';
});

const submitForm = async () => {
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        const response = await axios.post(`/api/public/absence-form/${token}`, form);
        successMessage.value = response.data.message || 'Data berhasil dikirim!';
    } catch (e) {
        errorMessage.value = e.response?.data?.message || 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style scoped>
.animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out;
}
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
