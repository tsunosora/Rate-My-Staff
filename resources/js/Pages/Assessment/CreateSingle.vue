<template>
  <AppLayout>
    <div class="flex flex-col gap-6 h-full">
      <div class="text-xs text-gray-500 font-medium tracking-wide uppercase">Employees / Assessment / New</div>
      
      <div class="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-2xl font-bold text-gray-800">Assessment Detail</h1>
          <p class="text-gray-500 text-sm mt-1 m-0">Create new evaluation</p>
        </div>
        
        <div :class="[`text-white p-4 rounded-2xl shadow-sm text-center w-[150px] transition-colors duration-300`, finalScoreColorClass]">
          <span class="block text-[0.8rem] uppercase font-bold tracking-wider opacity-90 mb-1">Final Score</span>
          <strong class="text-[2rem] font-extrabold leading-none">{{ finalScore }}</strong>
        </div>
      </div>

      <!-- Selection Card -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 p-6 space-y-4">
        <div class="grid grid-cols-3 gap-6 max-md:grid-cols-1">
          <div>
            <label class="block font-bold text-sm text-gray-700 mb-2">Select Employee</label>
            <select v-model="form.employee_id" class="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] bg-gray-50/50 transition-colors" required>
              <option value="">-- Choose Employee --</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.employee_code }} - {{ emp.full_name }} ({{ emp.department ? emp.department.name : 'Unknown' }})
              </option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-sm text-gray-700 mb-2">Select Template</label>
            <select v-model="form.template_id" @change="loadTemplate" class="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] bg-gray-50/50 transition-colors" required>
              <option value="">-- Choose Assessment Template --</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }} ({{ tpl.department_type }})
              </option>
            </select>
          </div>
          <div>
             <label class="block font-bold text-sm text-gray-700 mb-2">Assessment Period</label>
             <input type="text" v-model="form.period" placeholder="e.g. Q3 2023 or October 2023" class="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] bg-gray-50/50 transition-colors" required>
          </div>
        </div>
      </div>

      <!-- Assessment Indicators -->
      <div v-if="currentTemplate" class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden">
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-[1.1rem] font-bold text-gray-800 m-0">Sheet Penilaian: {{ currentTemplate.name }}</h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full border-collapse min-w-[600px] text-sm">
            <thead>
              <tr>
                <th class="text-left bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-xs">Indicator Penilaian</th>
                <th class="text-left bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-xs w-[120px]">Weight (%)</th>
                <th class="text-left bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-xs w-[150px]">Score (1-5)</th>
                <th class="text-left bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-xs w-[120px]">Value</th>
              </tr>
            </thead>
          <tbody>
            <tr v-for="(indicator, index) in currentTemplate.indicators" :key="indicator.id" class="hover:bg-gray-50/50 transition-colors">
              <td class="p-4 border-b border-gray-100">
                <strong class="text-gray-800 text-sm block mb-1">{{ indicator.name }}</strong>
                <span class="text-gray-500 text-xs">{{ indicator.description }}</span>
              </td>
              <td class="p-4 border-b border-gray-100 font-medium text-gray-600">{{ indicator.weight }}%</td>
              <td class="p-4 border-b border-gray-100">
                <select v-model.number="form.scores[index].score" class="p-2 border border-gray-200 rounded-lg w-20 text-sm focus:outline-none focus:border-[#3b82f6] bg-white shadow-sm">
                  <option value="0">-</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </td>
              <td class="p-4 border-b border-gray-100 font-bold text-[#3b82f6]">
                {{ ((form.scores[index].score * indicator.weight) / 100).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Notes & Plan -->
      <div v-if="currentTemplate" class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 p-6 flex flex-col gap-5">
        <div>
          <label class="block mb-2 font-bold text-sm text-gray-700">Evaluator Notes</label>
          <textarea v-model="form.evaluator_notes" class="w-full h-[100px] p-4 border border-gray-200 rounded-xl box-border resize-y text-sm focus:outline-none focus:border-[#3b82f6] shadow-sm bg-gray-50/30" placeholder="Enter qualitative feedback regarding performance..."></textarea>
        </div>
        <div>
          <label class="block mb-2 font-bold text-sm text-gray-700">Development Plan</label>
          <textarea v-model="form.development_plan" class="w-full h-[100px] p-4 border border-gray-200 rounded-xl box-border resize-y text-sm focus:outline-none focus:border-[#3b82f6] shadow-sm bg-gray-50/30" placeholder="Steps for improvement or career growth..."></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="currentTemplate" class="flex justify-end gap-3 mt-4">
        <button @click="router.push('/dashboard')" class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors shadow-sm text-sm">Cancel</button>
        <button @click="submitAssessment('draft')" :disabled="saving" class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm text-sm">Save as Draft</button>
        <button @click="submitAssessment('completed')" :disabled="saving" class="px-6 py-3 rounded-xl border-none bg-[#3b82f6] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm text-sm">Submit Assessment</button>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const router = useRouter();

const employees = ref([]);
const templates = ref([]);
const currentTemplate = ref(null);
const saving = ref(false);

const form = ref({
  employee_id: '',
  template_id: '',
  period: '',
  status: 'draft',
  evaluator_notes: '',
  development_plan: '',
  scores: []
});

const finalScore = computed(() => {
  if (!currentTemplate.value || form.value.scores.length === 0) return '0.00';
  
  let total = 0;
  form.value.scores.forEach((s, index) => {
    const indicator = currentTemplate.value.indicators[index];
    if (indicator && s.score > 0) {
      total += (s.score * indicator.weight) / 100;
    }
  });
  
  return total.toFixed(2);
});

const finalScoreColorClass = computed(() => {
  const score = parseFloat(finalScore.value);
  if (score === 0) return 'bg-[#95a5a6]'; // Gray when 0
  if (score < 3.0) return 'bg-[#e74c3c]'; // Red for Poor/Needs Improvement
  if (score < 4.0) return 'bg-[#f1c40f]'; // Yellow for Average/Good
  return 'bg-[#2ecc71]'; // Green for Very Good/Excellent
});

onMounted(async () => {
  try {
    const [empRes, tplRes] = await Promise.all([
      axios.get('/api/assessments/employees'),
      axios.get('/api/assessments/templates')
    ]);
    
    employees.value = empRes.data;
    templates.value = tplRes.data;
  } catch (error) {
    console.error("Error loading form data", error);
  }
});

const loadTemplate = async () => {
  if (!form.value.template_id) {
    currentTemplate.value = null;
    return;
  }
  
  try {
    const res = await axios.get(`/api/assessments/templates/${form.value.template_id}`);
    currentTemplate.value = res.data;
    
    // Setup scores array to match indicators
    form.value.scores = res.data.indicators.map(ind => ({
      indicator_id: ind.id,
      score: 0
    }));
  } catch (error) {
    console.error("Error loading template details", error);
  }
};

const submitAssessment = async (status) => {
  // Basic validation
  if (!form.value.employee_id || !form.value.template_id || !form.value.period) {
    alert("Please fill all required fields");
    return;
  }
  
  const hasZeroScores = form.value.scores.some(s => s.score === 0);
  if (status === 'completed' && hasZeroScores) {
    alert("Please grade all indicators before submitting as completed.");
    return;
  }

  saving.value = true;
  form.value.status = status;
  
  try {
    await axios.post('/api/assessments/single', form.value);
    alert('Assessment ' + (status === 'draft' ? 'saved as draft' : 'submitted successfully') + '!');
    router.push('/dashboard');
  } catch (error) {
    console.error("Error saving assessment", error);
    alert(error.response?.data?.message || "An error occurred while saving.");
  } finally {
    saving.value = false;
  }
};
</script>
