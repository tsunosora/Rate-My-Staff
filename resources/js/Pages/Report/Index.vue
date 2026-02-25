<template>
  <AppLayout>
    <div class="p-[25px] flex flex-col h-full bg-[#f4f7f6]">
      <div class="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-2xl font-bold">Reports & Analytics</h1>
          <p class="m-0 text-[#7f8c8d] text-[0.9rem]">Performance overview and data exports</p>
        </div>
        
        <div class="flex gap-2.5">
          <button @click="exportPdf" class="bg-transparent border border-[#bdc3c7] text-[#7f8c8d] px-4 py-2 rounded font-medium cursor-pointer hover:bg-gray-100 flex items-center gap-2">
            <span>📄</span> Export to PDF
          </button>
          <button @click="exportExcel" class="bg-[#27ae60] border-none text-white px-4 py-2 rounded font-medium cursor-pointer hover:bg-[#219653] flex items-center gap-2">
            <span>📊</span> Export to Excel
          </button>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] mb-5 flex gap-4 items-center flex-wrap">
        <div class="flex items-center gap-2">
          <label class="font-semibold text-[0.9rem]">Period:</label>
          <select v-model="filters.period" @change="fetchData" class="p-2 border border-[#ddd] rounded outline-none focus:border-[#3498db]">
            <option value="all">All Time</option>
            <option value="Q1 2024">Q1 2024</option>
            <option value="Q4 2023">Q4 2023</option>
            <option value="Q3 2023">Q3 2023</option>
          </select>
        </div>
        
        <div class="flex items-center gap-2">
          <label class="font-semibold text-[0.9rem]">Department:</label>
          <select v-model="filters.department" @change="fetchData" class="p-2 border border-[#ddd] rounded outline-none focus:border-[#3498db]">
            <option value="all">All Departments</option>
            <option value="Customer Service">Customer Service</option>
            <option value="IT Support">IT Support</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>
      </div>

      <!-- Key Metrics summary -->
      <div class="grid grid-cols-4 gap-5 mb-5 max-md:grid-cols-2 max-sm:grid-cols-1">
        <div class="bg-white p-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-[#3498db]">
          <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Total Assessments</h3>
          <div class="text-[1.8rem] font-bold mt-2">{{ summary.total_assessments }}</div>
        </div>
        <div class="bg-white p-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-[#9b59b6]">
          <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Company Average</h3>
          <div class="text-[1.8rem] font-bold mt-2">{{ summary.average_score }}</div>
        </div>
        <div class="bg-white p-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-[#2ecc71]">
          <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">High Performers (>4.0)</h3>
          <div class="text-[1.8rem] font-bold mt-2">{{ summary.high_performers }}</div>
        </div>
        <div class="bg-white p-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-[#e74c3c]">
          <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Needs Impr. (<3.0)</h3>
          <div class="text-[1.8rem] font-bold mt-2">{{ summary.needs_improvement }}</div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div class="p-4 border-b border-[#eee] bg-[#fafafa]">
          <h3 class="m-0 text-[1.1rem]">Recent Evaluated Employees</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Date</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Employee</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Department</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Template</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Period</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Score</th>
                <th class="bg-[#f8f9fa] p-3 px-4 border-b-2 border-[#eee] text-[#7f8c8d] text-[0.85rem] font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="p-4 text-center text-gray-500">Loading data...</td></tr>
              <tr v-else-if="recentAssessments.length === 0"><td colspan="7" class="p-4 text-center text-gray-500">No assessments found for selected filters.</td></tr>
              <tr v-else v-for="item in recentAssessments" :key="item.id" class="border-b border-[#eee] hover:bg-[#f9f9f9]">
                <td class="p-3 px-4 text-[0.9rem]">{{ new Date(item.date).toLocaleDateString() }}</td>
                <td class="p-3 px-4 text-[0.9rem] font-medium">{{ item.employee_name }}</td>
                <td class="p-3 px-4 text-[0.9rem]">{{ item.department.name ? item.department.name : item.department }}</td>
                <td class="p-3 px-4 text-[0.9rem]">{{ item.template_name }}</td>
                <td class="p-3 px-4 text-[0.9rem]">{{ item.period }}</td>
                <td class="p-3 px-4 text-[0.9rem] font-bold">
                  <span :class="{'text-[#27ae60]': item.score >= 4.0, 'text-[#f39c12]': item.score >= 3.0 && item.score < 4.0, 'text-[#c62828]': item.score < 3.0}">
                    {{ Number(item.score).toFixed(2) }}
                  </span>
                </td>
                <td class="p-3 px-4 text-[0.9rem]">
                  <button @click="showDetails(item.id)" class="bg-transparent border border-[#3498db] text-[#3498db] px-2 py-1 rounded text-[0.8rem] hover:bg-[#ebf5fb] cursor-pointer transition-colors inline-block">View Details</button>
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
          <router-link :to="`/assessments/edit/${selectedAssessment?.id}`" class="px-4 py-2 bg-[#3498db] text-white border-none rounded font-medium cursor-pointer hover:bg-[#2980b9] transition-colors decoration-none flex items-center gap-1">
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
  department: 'all'
});

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
