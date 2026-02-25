<template>
  <AppLayout>
    <div class="flex flex-col h-full gap-6">
      
      <!-- Header Actions -->
      <div class="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p class="m-0 text-gray-500 text-sm mt-1">Performance overview and data exports</p>
        </div>
        
        <div class="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button @click="exportPdf" class="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2 flex-1 md:flex-none">
            <span class="text-lg leading-none">📄</span> Export to PDF
          </button>
          <button @click="exportExcel" class="bg-[#10b981] border-none text-white px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center gap-2 flex-1 md:flex-none">
            <span class="text-lg leading-none">📊</span> Export to Excel
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex gap-4 items-center flex-wrap">
        <div class="flex items-center gap-2">
          <label class="font-bold text-gray-500 text-xs uppercase tracking-wide">Period</label>
          <select v-model="filters.period" @change="fetchData" class="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50">
            <option value="all">All Time</option>
            <option v-for="period in availablePeriods" :key="period" :value="period">{{ period }}</option>
          </select>
        </div>
        
        <div class="flex items-center gap-2">
          <label class="font-bold text-gray-500 text-xs uppercase tracking-wide">Department</label>
          <select v-model="filters.department" @change="fetchData" class="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50">
            <option value="all">All Departments</option>
            <option v-for="dept in availableDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="font-bold text-gray-500 text-xs uppercase tracking-wide">Category</label>
          <select v-model="filters.performance_category" @change="fetchData" class="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50">
            <option value="all">All Performers</option>
            <option value="high_performer">High Performers (>4.0)</option>
            <option value="average">Average (3.0 - 4.0)</option>
            <option value="needs_improvement">Needs Improvement (<3.0)</option>
          </select>
        </div>
        
        <div class="flex items-center gap-2 ml-auto">
          <input type="text" v-model="filters.search" @input="debounceFetchData" placeholder="Search employee..." class="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50 min-w-[250px]">
        </div>
      </div>

      <!-- Key Metrics summary -->
      <div class="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-sm:grid-cols-1">
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Total Assessments</h3>
          <div class="text-[2rem] font-extrabold mt-2 text-gray-800">{{ summary.total_assessments }}</div>
        </div>
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Company Average</h3>
          <div class="text-[2rem] font-extrabold mt-2 text-[#3b82f6]">{{ summary.average_score }}</div>
        </div>
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">High Performers (>4.0)</h3>
          <div class="text-[2rem] font-extrabold mt-2 text-[#10b981]">{{ summary.high_performers }}</div>
        </div>
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Needs Impr. (<3.0)</h3>
          <div class="text-[2rem] font-extrabold mt-2 text-red-500">{{ summary.needs_improvement }}</div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden flex-1 flex flex-col">
        <div class="p-6 border-b border-gray-100 bg-white">
          <h3 class="m-0 text-[1.1rem] font-bold text-gray-800">Evaluated Employees</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Date</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Employee</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Department</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Template</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Period</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Score</th>
                <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="p-4 text-center text-gray-500">Loading data...</td></tr>
              <tr v-else-if="recentAssessments.length === 0"><td colspan="7" class="p-4 text-center text-gray-500">No assessments found for selected filters.</td></tr>
              <tr v-else v-for="item in recentAssessments" :key="item.id" class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="px-3 py-3 text-sm text-gray-500 text-center">{{ new Date(item.date).toLocaleDateString() }}</td>
                <td class="px-3 py-3 text-[15px] font-bold text-gray-800 text-center">{{ item.employee_name }}</td>
                <td class="px-3 py-3 text-sm text-gray-600 text-center">{{ item.department.name ? item.department.name : item.department }}</td>
                <td class="px-3 py-3 text-sm text-gray-600 text-center">{{ item.template_name }}</td>
                <td class="px-3 py-3 text-sm text-gray-600 text-center">{{ item.period }}</td>
                <td class="px-3 py-3 text-sm font-bold text-center">
                  <span :class="{'text-[#27ae60]': item.score >= 4.0, 'text-[#f39c12]': item.score >= 3.0 && item.score < 4.0, 'text-[#c62828]': item.score < 3.0}">
                    {{ Number(item.score).toFixed(2) }}
                  </span>
                </td>
                <td class="px-3 py-3 text-sm text-center">
                  <div class="flex justify-center">
                    <button @click="showDetails(item.id)" class="bg-white border border-[#3b82f6] text-[#3b82f6] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 cursor-pointer transition-colors inline-block shadow-sm">View Details</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Assessment Details Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold m-0">Assessment Details</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1" v-if="selectedAssessment">
           <div class="grid grid-cols-2 gap-4 mb-4">
               <div>
                   <label class="text-sm font-semibold text-gray-500">Employee</label>
                   <p class="m-0 font-medium">{{ selectedAssessment.employee?.full_name }}</p>
               </div>
               <div>
                   <label class="text-sm font-semibold text-gray-500">Department / Role</label>
                   <p class="m-0">{{ selectedAssessment.employee?.department?.name }} / {{ selectedAssessment.employee?.position?.name }}</p>
               </div>
               <div>
                   <label class="text-sm font-semibold text-gray-500">Date Evaluated</label>
                   <p class="m-0">{{ new Date(selectedAssessment.assessment_date).toLocaleDateString() }}</p>
               </div>
               <div>
                   <label class="text-sm font-semibold text-gray-500">Evaluator</label>
                   <p class="m-0">{{ selectedAssessment.evaluator?.name || 'System' }}</p>
               </div>
               <div>
                   <label class="text-sm font-semibold text-gray-500">Period</label>
                   <p class="m-0">{{ selectedAssessment.period }}</p>
               </div>
               <div>
                   <label class="text-sm font-semibold text-gray-500">Overall Score & Grade</label>
                   <p class="m-0 font-bold text-lg" :class="{'text-[#27ae60]': selectedAssessment.total_score >= 4.0, 'text-[#f39c12]': selectedAssessment.total_score >= 3.0 && selectedAssessment.total_score < 4.0, 'text-[#c62828]': selectedAssessment.total_score < 3.0}">
                       {{ Number(selectedAssessment.total_score).toFixed(2) }} ({{ selectedAssessment.grade }})
                   </p>
               </div>
           </div>

           <h3 class="font-bold text-lg border-b pb-2 mb-3 mt-6">Indicator Scores</h3>
           <table class="w-full border-collapse text-left text-sm mb-6">
               <thead>
                   <tr>
                       <th class="bg-gray-100 p-2 border-b">Indicator</th>
                       <th class="bg-gray-100 p-2 border-b w-24 text-center">Score</th>
                       <th class="bg-gray-100 p-2 border-b w-32">Notes</th>
                   </tr>
               </thead>
               <tbody>
                   <tr v-for="score in selectedAssessment.scores" :key="score.id" class="border-b">
                       <td class="p-2">{{ score.indicator?.name }}</td>
                       <td class="p-2 text-center font-semibold">{{ score.score }} / 5</td>
                       <td class="p-2 text-xs text-gray-600">{{ score.notes || '-' }}</td>
                   </tr>
               </tbody>
           </table>

           <div class="mb-4">
               <label class="text-sm font-semibold text-gray-500 block mb-1">Evaluator Notes</label>
               <div class="p-3 bg-gray-50 rounded border text-sm">{{ selectedAssessment.evaluator_notes || 'No notes provided.' }}</div>
           </div>
           
           <div class="mb-4">
               <label class="text-sm font-semibold text-gray-500 block mb-1">Development Plan</label>
               <div class="p-3 bg-gray-50 rounded border text-sm">{{ selectedAssessment.development_plan || 'No development plan provided.' }}</div>
           </div>

           <div>
               <label class="text-sm font-semibold text-gray-500 block mb-1">Recommendation</label>
               <div class="p-3 bg-blue-50 text-blue-800 rounded border border-blue-200 text-sm font-medium">{{ selectedAssessment.recommendation }}</div>
           </div>
        </div>
        <div v-else class="p-10 text-center text-gray-500">
            Loading assessment details...
        </div>

        <div class="p-5 border-t border-gray-200 flex justify-end gap-2">
          <router-link v-if="selectedAssessment" :to="`/assessments/edit/${selectedAssessment.id}`" class="px-4 py-2 bg-[#3498db] text-white border-none rounded font-medium cursor-pointer hover:bg-[#2980b9] transition-colors decoration-none flex items-center gap-1">
             ✏️ Edit Details
          </router-link>
          <button @click="closeModal" class="px-4 py-2 bg-gray-200 border-none rounded font-medium cursor-pointer hover:bg-gray-300 transition-colors text-[#333]">Close</button>
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

const filters = reactive({
  period: 'all',
  department: 'all',
  performance_category: 'all',
  search: ''
});

let searchTimeout = null;
const debounceFetchData = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchData();
    }, 500);
};

const summary = reactive({
  total_assessments: 0,
  average_score: 0.00,
  high_performers: 0,
  needs_improvement: 0
});

const recentAssessments = ref([]);

// Modal state
const showModal = ref(false);
const selectedAssessment = ref(null);

const availablePeriods = ref([]);
const availableDepartments = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await axios.get('/api/reports', { params: filters });
    
    summary.total_assessments = res.data.summary.total_assessments;
    summary.average_score = res.data.summary.average_score.toFixed(2);
    summary.high_performers = res.data.summary.high_performers;
    summary.needs_improvement = res.data.summary.needs_improvement;
    
    recentAssessments.value = res.data.recent_assessments;
    
    if (res.data.available_periods) {
      availablePeriods.value = res.data.available_periods;
    }
    if (res.data.available_departments) {
      availableDepartments.value = res.data.available_departments;
    }
  } catch (e) {
    console.error("Failed to load report data", e);
  } finally {
    loading.value = false;
  }
};

const showDetails = async (assessmentId) => {
  showModal.value = true;
  selectedAssessment.value = null; // show loading state
  try {
      const res = await axios.get(`/api/reports/assessment/${assessmentId}`);
      selectedAssessment.value = res.data;
  } catch (error) {
      console.error("Failed to load details", error);
      alert("Failed to load assessment details.");
      showModal.value = false;
  }
};

const closeModal = () => {
    showModal.value = false;
    selectedAssessment.value = null;
};

const exportPdf = () => {
  const queryParams = new URLSearchParams(filters).toString();
  window.open(`/api/reports/export-pdf?${queryParams}`, '_blank');
};

const exportExcel = () => {
  const queryParams = new URLSearchParams(filters).toString();
  window.open(`/api/reports/export-excel?${queryParams}`, '_blank');
};
</script>
