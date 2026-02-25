<template>
  <AppLayout>
    <div class="p-[25px]">
      <div class="text-[0.85rem] text-[#7f8c8d] mb-2.5">Employees / Assessment / Edit</div>
      
      <div class="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-2xl font-bold">Edit Assessment Detail</h1>
          <p class="text-[#7f8c8d] m-0">Modify evaluation</p>
        </div>
        
        <div :class="[`text-white p-4 rounded-lg text-center w-[150px] transition-colors duration-300`, finalScoreColorClass]">
          <span class="block text-[0.8rem] opacity-90">Final Score</span>
          <strong class="text-[1.8rem]">{{ finalScore }}</strong>
        </div>
      </div>

      <div v-if="loadingInitial" class="p-10 text-center text-gray-500">
        Loading assessment data...
      </div>
      <div v-else>
        <!-- Selection Card -->
        <div class="bg-white rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.05)] p-5 mb-5 space-y-4">
          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <label class="block font-semibold mb-2">Employee</label>
              <input type="text" disabled :value="employeeDisplay" class="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-500">
            </div>
            <div>
              <label class="block font-semibold mb-2">Template</label>
              <input type="text" disabled :value="templateDisplay" class="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-500">
            </div>
            <div>
               <label class="block font-semibold mb-2">Assessment Period</label>
               <input type="text" v-model="form.period" placeholder="e.g. Q3 2023 or October 2023" class="w-full p-2 border border-gray-300 rounded" required>
            </div>
          </div>
        </div>

        <!-- Assessment Indicators -->
        <div v-if="currentTemplate" class="bg-white rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.05)] p-5 mb-5 overflow-x-auto">
          <h3 class="text-lg font-bold mb-4">Sheet Penilaian: {{ currentTemplate.name }}</h3>
          
          <table class="w-full border-collapse mt-[15px] min-w-[600px]">
            <thead>
              <tr>
                <th class="text-left bg-[#f8f9fa] p-3 border-b-2 border-[#eee] text-[0.85rem] uppercase text-[#7f8c8d]">Indicator Penilaian</th>
                <th class="text-left bg-[#f8f9fa] p-3 border-b-2 border-[#eee] text-[0.85rem] uppercase text-[#7f8c8d]">Weight (%)</th>
                <th class="text-left bg-[#f8f9fa] p-3 border-b-2 border-[#eee] text-[0.85rem] uppercase text-[#7f8c8d]">Score (1-5)</th>
                <th class="text-left bg-[#f8f9fa] p-3 border-b-2 border-[#eee] text-[0.85rem] uppercase text-[#7f8c8d]">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(indicator, index) in currentTemplate.indicators" :key="indicator.id">
                <td class="p-3 border-b border-[#eee]">
                  <strong>{{ indicator.name }}</strong><br>
                  <small class="text-[#7f8c8d]">{{ indicator.description }}</small>
                </td>
                <td class="p-3 border-b border-[#eee]">{{ indicator.weight }}%</td>
                <td class="p-3 border-b border-[#eee]">
                  <select v-model.number="form.scores[index].score" class="p-2 border border-[#ddd] rounded w-[60px]">
                    <option value="0">-</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </td>
                <td class="p-3 border-b border-[#eee] font-medium">
                  {{ ((form.scores[index].score * indicator.weight) / 100).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Notes & Plan -->
        <div v-if="currentTemplate" class="bg-white rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.05)] p-5 mb-5">
          <div class="mb-5">
            <label class="block mb-2 font-semibold text-[0.9rem]">Evaluator Notes</label>
            <textarea v-model="form.evaluator_notes" class="w-full h-[80px] p-2.5 border border-[#ddd] rounded box-border resize-y" placeholder="Enter qualitative feedback regarding performance..."></textarea>
          </div>
          <div class="mb-5">
            <label class="block mb-2 font-semibold text-[0.9rem]">Development Plan</label>
            <textarea v-model="form.development_plan" class="w-full h-[80px] p-2.5 border border-[#ddd] rounded box-border resize-y" placeholder="Steps for improvement or career growth..."></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="currentTemplate" class="flex justify-end gap-2.5 mt-5">
          <button @click="router.push('/reports')" class="px-5 py-2.5 rounded border border-[#ddd] text-[#666] font-semibold hover:bg-[#f8f9fa] cursor-pointer transition-colors">Cancel</button>
          <button @click="submitAssessment('draft')" :disabled="saving" class="px-5 py-2.5 rounded border border-[#ddd] text-[#666] font-semibold hover:bg-[#f8f9fa] cursor-pointer transition-colors disabled:opacity-50">Save as Draft</button>
          <button @click="submitAssessment('completed')" :disabled="saving" class="px-5 py-2.5 rounded border-none bg-[#3498db] text-white font-semibold cursor-pointer hover:bg-[#2980b9] transition-colors disabled:opacity-50">Update Assessment</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const router = useRouter();
const route = useRoute();

const loadingInitial = ref(true);
const currentTemplate = ref(null);
const saving = ref(false);

const employeeDisplay = ref('');
const templateDisplay = ref('');

const form = ref({
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
  const assessmentId = route.params.id;
  if (!assessmentId) {
    alert("Invalid assessment ID");
    router.push('/reports');
    return;
  }
  
  try {
    const res = await axios.get(`/api/reports/assessment/${assessmentId}`);
    const assessment = res.data;
    
    // Setup displays
    employeeDisplay.value = `${assessment.employee.employee_code} - ${assessment.employee.full_name}`;
    templateDisplay.value = `${assessment.template.name}`;
    
    // Setup core template so indicators show
    // We already have indicators nested inside the template from our controller (wait we don't have all indicators, we need the full template details)
    const tplRes = await axios.get(`/api/assessments/templates/${assessment.template_id}`);
    const tplData = tplRes.data;
    currentTemplate.value = tplData;
    
    // Map initial scores mapping
    const existingScoresMap = {};
    if (assessment.scores) {
        assessment.scores.forEach(s => {
            existingScoresMap[s.indicator_id] = s.score;
        });
    }

    form.value.scores = tplData.indicators.map(ind => ({
      indicator_id: ind.id,
      score: existingScoresMap[ind.id] || 0
    }));

    form.value.period = assessment.period;
    form.value.status = assessment.status;
    form.value.evaluator_notes = assessment.evaluator_notes;
    form.value.development_plan = assessment.development_plan;
    
  } catch (error) {
    console.error("Error loading assessment data", error);
    alert("Failed to load assessment.");
    router.push('/reports');
  } finally {
    loadingInitial.value = false;
  }
});


const submitAssessment = async (status) => {
  // Basic validation
  if (!form.value.period) {
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
    const assessmentId = route.params.id;
    await axios.put(`/api/assessments/single/${assessmentId}`, form.value);
    alert('Assessment updated successfully!');
    router.push('/reports');
  } catch (error) {
    console.error("Error updating assessment", error);
    alert(error.response?.data?.message || "An error occurred while saving.");
  } finally {
    saving.value = false;
  }
};
</script>
