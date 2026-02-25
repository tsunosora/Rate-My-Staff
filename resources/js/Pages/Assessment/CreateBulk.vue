<template>
  <AppLayout>
    <div class="p-[25px] flex flex-col h-full bg-[#f4f7f6]">
      <div class="flex justify-between items-center mb-5">
        <div>
          <h2 class="m-0 text-[1.5rem] font-bold">Bulk Assessment</h2>
          <p class="m-0 text-[#666] text-[0.85rem]">Department: All | Period: {{ currentPeriod }}</p>
        </div>
        <div class="flex gap-2.5">
          <!-- TODO: Save as draft logic -->
          <button class="bg-[#95a5a6] text-white border-none px-4 py-2 rounded cursor-pointer hover:bg-[#7f8c8d]">Save as Draft</button>
          <button @click="submitAll" :disabled="saving" class="bg-[#27ae60] text-white border-none px-4 py-2 rounded cursor-pointer hover:bg-[#219653] disabled:opacity-50">
            {{ saving ? 'Submitting...' : 'Submit All' }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden flex-1 flex flex-col">
        <div class="p-[15px] bg-[#fafafa] border-b border-[#eee] flex gap-[15px] flex-wrap items-center">
          <input type="text" v-model="filters.search" placeholder="Search employee..." class="p-1.5 px-3 border border-[#ddd] rounded min-w-[250px] outline-none focus:border-[#3498db]">
          <select v-model="filters.department_id" class="p-2 border border-[#ddd] rounded outline-none focus:border-[#3498db]">
            <option value="">All Departments</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
          </select>
          <select v-model="filters.template_id" @change="loadTemplate" class="p-2 border border-[#ddd] rounded outline-none focus:border-[#3498db] ml-auto">
            <option value="">-- Choose Template --</option>
            <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
          </select>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full border-collapse text-left min-w-[800px]">
             <thead>
               <tr class="bg-[#f8f9fa] border-b-2 border-[#eee]">
                 <th class="p-3 text-[0.85rem]">Employee Name</th>
                 <!-- Dynamic Indicator Columns -->
                 <th v-if="!currentTemplate" class="p-3 text-[0.85rem] italic text-gray-500">Select a template to view indicators</th>
                 <th v-for="ind in currentTemplate?.indicators" :key="ind.id" class="p-3 text-[0.85rem]">
                   {{ ind.name }} ({{ ind.weight }}%)
                 </th>
                 <th class="p-3 text-[0.85rem]">Final Score</th>
                 <th class="p-3 text-[0.85rem]">Status</th>
               </tr>
             </thead>
             <tbody>
               <tr v-if="loading" class="border-b border-[#eee]"><td colspan="10" class="p-4 text-center text-gray-500">Loading employees...</td></tr>
               <tr v-else-if="employees.length === 0" class="border-b border-[#eee]"><td colspan="10" class="p-4 text-center text-gray-500">No employees found.</td></tr>
               
               <tr v-for="(emp, empIndex) in employees" :key="emp.id" class="border-b border-[#eee] hover:bg-[#f9f9f9]">
                 <td class="p-3 font-medium">{{ emp.full_name }}<br><span class="text-xs text-gray-500">{{ emp.department ? emp.department.name : 'Unknown' }}</span></td>
                 
                 <!-- Score inputs per indicator -->
                 <td v-for="(ind, indIndex) in currentTemplate?.indicators" :key="ind.id" class="p-3">
                   <input 
                     type="number" 
                     v-model.number="getScoreModel(emp.id, ind.id).score"
                     min="1" max="5" 
                     placeholder="-"
                     class="w-[50px] p-1 border rounded text-center outline-none focus:border-[#3498db]"
                     :class="{'border-[#e74c3c] bg-[#fff9f9]': getScoreModel(emp.id, ind.id).score && getScoreModel(emp.id, ind.id).score < 3, 'border-[#3498db]': getScoreModel(emp.id, ind.id).score >= 3}"
                   >
                 </td>
                 
                 <td class="p-3 font-bold" :class="getFinalScoreColor(calculateRowScore(emp.id))">
                   {{ calculateRowScore(emp.id) > 0 ? calculateRowScore(emp.id).toFixed(2) : 'N/A' }}
                 </td>
                 <td class="p-3">
                   <span v-if="isRowReady(emp.id)" class="bg-[#e8f5e9] text-[#2e7d32] px-2 py-1 rounded-[12px] text-[0.75rem]">Ready</span>
                   <span v-else class="bg-[#ffebee] text-[#c62828] px-2 py-1 rounded-[12px] text-[0.75rem]">Incomplete</span>
                 </td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      <div class="mt-5 bg-[#ebf5fb] p-[15px] rounded-lg border-l-4 border-[#3498db] shrink-0">
        <h4 class="m-0 mb-1 text-[0.9rem] font-bold">Scoring Guide:</h4>
        <p class="m-0 text-[0.8rem] text-[#555]">5: Exceeds Targets | 4: Meets Targets | 3: Average | 2: Needs Improvement | 1: Critical Failure</p>
      </div>
      
      <!-- Custom Alert Modal -->
      <div v-if="alertModal.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white p-6 rounded-lg max-w-sm w-full shadow-xl">
          <h3 class="text-lg font-bold mb-2" :class="alertModal.isError ? 'text-red-600' : 'text-green-600'">
            {{ alertModal.title }}
          </h3>
          <p class="text-gray-700 mb-6">{{ alertModal.message }}</p>
          <div class="flex justify-end">
            <button @click="alertModal.show = false" class="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">OK</button>
          </div>
        </div>
      </div>

      <!-- Custom Confirm Modal -->
      <div v-if="confirmModal.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white p-6 rounded-lg max-w-sm w-full shadow-xl">
          <h3 class="text-lg font-bold mb-2">Confirm Submission</h3>
          <p class="text-gray-700 mb-6">Are you sure you want to submit assessments for {{ confirmModal.count }} employees?</p>
          <div class="flex justify-end gap-3">
            <button @click="confirmModal.show = false" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button @click="proceedSubmit" class="px-4 py-2 bg-[#27ae60] text-white rounded hover:bg-[#219653]">Confirm</button>
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

const currentPeriod = ref('Q1 ' + new Date().getFullYear());

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
    initializeScoreCache(); // Re-init cache with new template indicators
  } catch (error) {
    console.error("Error loading template", error);
  }
};

const initializeScoreCache = () => {
  if (!currentTemplate.value) return;
  
  employees.value.forEach(emp => {
    if (!bulkScores[emp.id]) bulkScores[emp.id] = {};
    
    currentTemplate.value.indicators.forEach(ind => {
      if (bulkScores[emp.id][ind.id] === undefined) {
         bulkScores[emp.id][ind.id] = { score: null };
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
