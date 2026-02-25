<template>
  <AppLayout>
    <div class="flex flex-col gap-6 h-full">
      <div class="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-2xl font-bold text-gray-800 mb-3">Bulk Assessment</h1>
          <div class="flex items-center gap-4 text-sm text-gray-600">
             <label class="flex items-center gap-2 font-bold">
                Date:
                <input type="date" v-model="assessmentDate" class="p-2 border border-gray-200 rounded-xl outline-none focus:border-[#3b82f6] shadow-sm bg-white font-normal" @change="updatePeriodFromDate">
             </label>
             <label class="flex items-center gap-2 font-bold">
                Period:
                <input type="text" v-model="currentPeriod" class="p-2 border border-gray-200 rounded-xl outline-none focus:border-[#3b82f6] shadow-sm bg-white font-normal" placeholder="e.g. March 2026">
             </label>
          </div>
        </div>
        <div class="flex gap-3">
          <!-- TODO: Save as draft logic -->
          <button class="bg-white text-gray-600 border border-gray-200 px-5 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm font-bold text-sm">Save as Draft</button>
          <button @click="submitAll" :disabled="saving" class="bg-[#10b981] text-white border-none px-5 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm font-bold text-sm">
            {{ saving ? 'Submitting...' : 'Submit All' }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden flex-1 flex flex-col">
        <div class="p-5 bg-white border-b border-gray-100 flex gap-4 flex-wrap items-center">
          <input type="text" v-model="filters.search" placeholder="Search employee..." class="p-2.5 px-4 border border-gray-200 rounded-xl min-w-[250px] outline-none focus:border-[#3b82f6] shadow-sm bg-gray-50/50 text-sm transition-colors">
          <select v-model="filters.department_id" class="p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#3b82f6] shadow-sm bg-gray-50/50 text-sm transition-colors min-w-[180px]">
            <option value="">All Departments</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
          </select>
          <select v-model="filters.template_id" @change="loadTemplate" class="p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#3b82f6] shadow-sm bg-gray-50/50 ml-auto font-bold text-[#3b82f6] text-sm transition-colors min-w-[200px]">
            <option value="">-- Choose Template --</option>
            <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
          </select>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full border-collapse text-left min-w-[800px] text-sm">
             <thead>
               <tr class="bg-gray-50 border-b border-gray-200">
                 <th class="px-3 py-3 font-bold text-gray-600 uppercase tracking-wider text-sm text-center whitespace-nowrap">Employee Name</th>
                 <!-- Dynamic Indicator Columns -->
                 <th v-if="!currentTemplate" class="px-3 py-3 font-normal italic text-gray-400 text-sm text-center">Select a template to view indicators</th>
                 <template v-else>
                   <th v-for="ind in currentTemplate.indicators" :key="ind.id" class="px-3 py-3 font-bold text-gray-600 uppercase tracking-wider text-xs text-center whitespace-nowrap">
                     {{ ind.name }} ({{ ind.weight }}%)
                   </th>
                 </template>
                 <th class="px-3 py-3 font-bold text-gray-600 uppercase tracking-wider text-xs text-center whitespace-nowrap">Final Score</th>
                 <th class="px-3 py-3 font-bold text-gray-600 uppercase tracking-wider text-xs text-center whitespace-nowrap">Status</th>
               </tr>
             </thead>
             <tbody>
               <tr v-if="loading" class="border-b border-gray-100"><td colspan="10" class="p-6 text-center text-gray-400 font-medium">Loading employees...</td></tr>
               <tr v-else-if="employees.length === 0" class="border-b border-gray-100"><td colspan="10" class="p-6 text-center text-gray-400 font-medium">No employees found.</td></tr>
               
               <tr v-for="(emp, empIndex) in employees" :key="emp.id" class="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                 <td class="px-3 py-3 text-center">
                   <strong class="text-gray-800 text-[15px] block mb-1">{{ emp.full_name }}</strong>
                   <span class="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md mt-1 inline-block border border-gray-100">{{ emp.department ? emp.department.name : 'Unknown' }}</span>
                 </td>
                 
                 <!-- Empty state when no template selected -->
                 <td v-if="!currentTemplate" class="px-3 py-3 text-gray-400 text-sm text-center">
                   <span v-if="emp.latest_assessment" class="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 shadow-sm">Last Assessed: {{ emp.latest_assessment.period }}</span>
                   <span v-else class="text-gray-300 italic">No history</span>
                 </td>
                 
                 <!-- Score inputs per indicator -->
                 <template v-else>
                   <td v-for="(ind, indIndex) in currentTemplate.indicators" :key="ind.id" class="px-3 py-3 text-center">
                     <div class="flex justify-center">
                       <input 
                         type="number" 
                         v-model.number="getScoreModel(emp.id, ind.id).score"
                         min="1" max="5" 
                         placeholder="-"
                         class="w-[60px] p-2 border-2 rounded-lg text-center outline-none focus:border-[#3b82f6] transition-colors shadow-sm font-bold text-gray-700"
                         :class="{'border-red-300 bg-red-50 text-red-600': getScoreModel(emp.id, ind.id).score && getScoreModel(emp.id, ind.id).score < 3, 'border-blue-100 bg-blue-50': getScoreModel(emp.id, ind.id).score >= 3, 'border-gray-200': !getScoreModel(emp.id, ind.id).score}"
                       >
                     </div>
                   </td>
                 </template>
                 
                 <td class="px-3 py-3 font-bold text-lg text-center" :class="getFinalScoreColor(calculateRowScore(emp.id))">
                   <span v-if="!currentTemplate">
                     <span v-if="emp.latest_assessment" :class="getFinalScoreColor(emp.latest_assessment.total_score)">
                       {{ Number(emp.latest_assessment.total_score).toFixed(2) }}
                     </span>
                     <span v-else class="text-gray-300 font-normal">-</span>
                   </span>
                   <span v-else>{{ calculateRowScore(emp.id) > 0 ? calculateRowScore(emp.id).toFixed(2) : 'N/A' }}</span>
                 </td>
                 <td class="px-3 py-3">
                   <div class="flex justify-center items-center h-full min-h-[50px]">
                     <span v-if="!currentTemplate">
                        <span v-if="emp.latest_assessment" class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 shadow-sm">History</span>
                        <span v-else class="text-gray-300 font-normal">-</span>
                     </span>
                     <span v-else-if="isRowReady(emp.id)" class="bg-green-100 text-green-700 px-4 py-1.5 rounded-lg text-xs font-bold border border-green-200 shadow-sm flex items-center justify-center w-fit">Ready</span>
                     <span v-else class="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-lg text-xs font-bold border border-orange-100 shadow-sm flex items-center justify-center w-fit">Incomplete</span>
                   </div>
                 </td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      <div class="bg-blue-50 p-5 rounded-2xl border border-blue-100 shrink-0 flex items-start gap-4">
        <span class="text-2xl mt-1">💡</span>
        <div>
          <h4 class="m-0 mb-1 font-bold text-blue-900">Scoring Guide</h4>
          <p class="m-0 text-sm text-blue-800 leading-relaxed font-medium"><strong>5:</strong> Exceeds Targets &bull; <strong>4:</strong> Meets Targets &bull; <strong>3:</strong> Average &bull; <strong>2:</strong> Needs Improvement &bull; <strong>1:</strong> Critical Failure</p>
        </div>
      </div>
      
      <!-- Custom Alert Modal -->
      <div v-if="alertModal.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div class="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-gray-100">
          <h3 class="text-lg font-bold mb-3 flex items-center gap-2" :class="alertModal.isError ? 'text-red-500' : 'text-emerald-500'">
            <span v-if="alertModal.isError" class="text-2xl">⚠️</span>
            <span v-else class="text-2xl">✅</span>
            {{ alertModal.title }}
          </h3>
          <p class="text-gray-600 mb-6 text-sm leading-relaxed">{{ alertModal.message }}</p>
          <div class="flex justify-end">
            <button @click="alertModal.show = false" class="px-6 py-2.5 bg-[#3b82f6] text-white rounded-xl hover:bg-blue-600 transition-colors font-bold shadow-sm text-sm w-full">Got it</button>
          </div>
        </div>
      </div>

      <!-- Custom Confirm Modal -->
      <div v-if="confirmModal.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div class="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-gray-100">
          <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span class="text-2xl">❓</span> Confirm Submission
          </h3>
          <p class="text-gray-600 mb-6 text-sm leading-relaxed">Are you sure you want to submit assessments for <strong class="text-gray-800">{{ confirmModal.count }}</strong> employees? This action cannot be easily undone.</p>
          <div class="flex justify-end gap-3 w-full">
            <button @click="confirmModal.show = false" class="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm flex-1 shadow-sm">Cancel</button>
            <button @click="proceedSubmit" class="px-4 py-2.5 bg-[#10b981] text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold text-sm flex-1 shadow-sm">Yes, Submit All</button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const employees = ref([]);
const templates = ref([]);
const departments = ref([]);
const currentTemplate = ref(null);
const loading = ref(false);
const saving = ref(false);

const alertModal = reactive({ show: false, title: '', message: '', isError: false });
const confirmModal = reactive({ show: false, count: 0, payload: [] });

const showAlert = (title, message, isError = false) => {
  alertModal.title = title;
  alertModal.message = message;
  alertModal.isError = isError;
  alertModal.show = true;
};

const today = new Date();
const assessmentDate = ref(today.toISOString().split('T')[0]);

const getPeriodString = (dateObj) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

const currentPeriod = ref(getPeriodString(today));

const updatePeriodFromDate = () => {
   if (assessmentDate.value) {
       const d = new Date(assessmentDate.value);
       currentPeriod.value = getPeriodString(d);
   }
};

const filters = reactive({
  search: '',
  department_id: '',
  template_id: ''
});

// Store scores as localized cache: bulkScores[emp_id][indicator_id] = score
const bulkScores = reactive({}); 

onMounted(async () => {
  await Promise.all([
    fetchTemplates(),
    fetchDepartments(),
    fetchEmployees()
  ]);
});

watch(() => filters.search, () => { fetchEmployees(); });
watch(() => filters.department_id, () => { fetchEmployees(); });

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/assessments/templates');
    templates.value = res.data;
  } catch (e) {
    console.error("Failed to load templates", e);
  }
};

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/api/departments');
    departments.value = res.data;
  } catch (e) {
    console.error("Failed to load departments", e);
  }
};

const fetchEmployees = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.department_id) params.department_id = filters.department_id;
    
    // Simulate pagination load
    const res = await axios.get('/api/assessments/employees', { params });
    employees.value = res.data;
    
    // Initialize score cache for new employees
    initializeScoreCache();
  } catch (e) {
    console.error("Failed to load employees", e);
  } finally {
    loading.value = false;
  }
};

const loadTemplate = async () => {
  if (!filters.template_id) {
    currentTemplate.value = null;
    return;
  }
  
  try {
    const res = await axios.get(`/api/assessments/templates/${filters.template_id}`);
    currentTemplate.value = res.data;
    
    // Fetch previous scores for bulk prepopulation
    const scoresRes = await axios.get(`/api/assessments/templates/${filters.template_id}/scores`);
    const historyScores = scoresRes.data; 
    
    initializeScoreCache(historyScores); 
  } catch (error) {
    console.error("Error loading template", error);
  }
};

const initializeScoreCache = (historyScores = {}) => {
  if (!currentTemplate.value) return;
  
  employees.value.forEach(emp => {
    if (!bulkScores[emp.id]) bulkScores[emp.id] = {};
    const empHistory = historyScores[emp.id] || {};
    
    currentTemplate.value.indicators.forEach(ind => {
      // If we don't have a score set by the user yet, set it from history or null
      if (bulkScores[emp.id][ind.id] === undefined || bulkScores[emp.id][ind.id].score === null) {
         bulkScores[emp.id][ind.id] = { score: empHistory[ind.id] !== undefined ? empHistory[ind.id] : null };
      }
    });
  });
};

const getScoreModel = (empId, indId) => {
  if (!bulkScores[empId] || !bulkScores[empId][indId]) {
    // Failsafe
    return { score: null };
  }
  return bulkScores[empId][indId];
};

const calculateRowScore = (empId) => {
  if (!currentTemplate.value) return 0;
  
  let total = 0;
  let hasScore = false;
  
  currentTemplate.value.indicators.forEach(ind => {
    const s = getScoreModel(empId, ind.id).score;
    if (s && s >= 1 && s <= 5) {
      total += (s * ind.weight) / 100;
      hasScore = true;
    }
  });
  
  return hasScore ? total : 0;
};

const getFinalScoreColor = (score) => {
  if (score >= 4.0) return 'text-[#27ae60]';
  if (score >= 3.0) return 'text-[#f39c12]';
  if (score > 0) return 'text-[#c62828]';
  return 'text-[#999]';
};

const isRowReady = (empId) => {
  if (!currentTemplate.value) return false;
  
  // Check if all indicators have a valid score
  return currentTemplate.value.indicators.every(ind => {
    const s = getScoreModel(empId, ind.id).score;
    return s && s >= 1 && s <= 5;
  });
};

const submitAll = () => {
  if (!currentTemplate.value) {
    showAlert("Template Required", "Please select a template first.", true);
    return;
  }
  
  // Collect all ready rows
  const readyAssessments = [];
  
  try {
    employees.value.forEach(emp => {
      if (isRowReady(emp.id)) {
        const scoresArray = currentTemplate.value.indicators.map(ind => ({
          indicator_id: ind.id,
          score: getScoreModel(emp.id, ind.id).score // safer accessor
        }));
        
        readyAssessments.push({
          employee_id: emp.id,
          template_id: currentTemplate.value.id,
          assessment_date: assessmentDate.value,
          period: currentPeriod.value,
          status: 'completed',
          evaluator_notes: '',
          development_plan: '',
          scores: scoresArray
        });
      }
    });
  } catch (err) {
    console.error("Payload building error", err);
    showAlert("Error", "A technical error occurred while preparing data.", true);
    return;
  }
  
  if (readyAssessments.length === 0) {
    showAlert("No Data Ready", "No employees have completed scoring yet. Please fill all indicators (1-5) for at least one employee.", true);
    return;
  }
  
  // Show custom confirm instead of window.confirm
  confirmModal.count = readyAssessments.length;
  confirmModal.payload = readyAssessments;
  confirmModal.show = true;
};

const proceedSubmit = async () => {
  confirmModal.show = false;
  saving.value = true;
  
  try {
    const promises = confirmModal.payload.map(payload => axios.post('/api/assessments/single', payload));
    await Promise.all(promises);
    
    showAlert("Success!", `Successfully submitted ${confirmModal.payload.length} assessments!`);
    
    // Clear completed rows
    confirmModal.payload.forEach(ass => {
      delete bulkScores[ass.employee_id];
    });
    initializeScoreCache();
    
  } catch (error) {
    console.error("Bulk submission error", error);
    let msg = "An error occurred during bulk submission. Some assessments may not have been saved.";
    if (error.response?.data?.message) {
      msg = error.response.data.message;
    }
    showAlert("Submission Failed", msg, true);
  } finally {
    saving.value = false;
  }
};
</script>
