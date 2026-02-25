<template>
  <AppLayout>
    <div class="p-[25px] flex flex-col h-full bg-[#f4f7f6]">
      <div class="flex justify-between items-center mb-[25px] max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <h1 class="m-0 text-[1.5rem] font-bold">Assessment Templates</h1>
          <p class="text-[0.9rem] text-[#7f8c8d] mt-1 mb-0">Manage assessment templates and their evaluation indicators.</p>
        </div>
        <div class="flex gap-2.5">
          <button @click="openAddModal" class="bg-[#3498db] text-white border-none px-4 py-2 rounded text-[14px] font-medium cursor-pointer flex items-center hover:bg-[#2980b9] transition-colors">+ New Template</button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d]">Template Name</th>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d]">Department/Type</th>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d]">Status</th>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d] text-center">Indicators</th>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d] text-center">Total Weight</th>
                <th class="bg-[#f8f9fa] p-3 px-[15px] border-b-2 border-[#eee] font-semibold text-[13px] text-[#7f8c8d] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="6" class="p-4 text-center text-gray-500">Loading...</td></tr>
              <tr v-else-if="templates.length === 0"><td colspan="6" class="p-4 text-center text-gray-500">No templates found. Create one to get started.</td></tr>
              
              <tr v-else v-for="tpl in templates" :key="tpl.id" class="hover:bg-gray-50 transition-colors">
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px]">
                  <strong>{{ tpl.name }}</strong>
                  <div class="text-[12px] text-[#999] truncate max-w-[250px]">{{ tpl.description || 'No description' }}</div>
                </td>
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px]">{{ tpl.department_type }}</td>
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px]">
                  <span v-if="tpl.is_active" class="px-2 py-1 rounded-[12px] text-[11px] font-bold bg-[#d4edda] text-[#155724]">Active</span>
                  <span v-else class="px-2 py-1 rounded-[12px] text-[11px] font-bold bg-[#f8d7da] text-[#721c24]">Inactive</span>
                </td>
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px] text-center">
                  <span class="bg-[#e8f4fd] text-[#3498db] px-2.5 py-1 rounded font-bold">{{ tpl.indicators ? tpl.indicators.length : 0 }}</span>
                </td>
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px] text-center">
                  <span :class="{'text-[#2ecc71] font-bold': Number(tpl.total_weight) === 100, 'text-[#e74c3c] font-bold': Number(tpl.total_weight) !== 100}">
                    {{ Number(tpl.total_weight).toFixed(0) }}%
                  </span>
                </td>
                <td class="p-3 px-[15px] border-b border-[#eee] text-[14px] text-right">
                  <div class="flex justify-end gap-2">
                    <button @click="manageIndicators(tpl)" class="px-2 py-1 text-[12px] rounded font-medium bg-[#9b59b6] text-white hover:bg-[#8e44ad] border-none cursor-pointer" title="Manage Indicators">Indicators</button>
                    <button @click="editTemplate(tpl)" class="px-2 py-1 text-[12px] rounded font-medium bg-[#f39c12] text-white hover:bg-[#d68910] border-none cursor-pointer" title="Edit Template">Edit</button>
                    <button @click="deleteTemplate(tpl)" class="px-2 py-1 text-[12px] rounded font-medium bg-[#e74c3c] text-white hover:bg-[#c0392b] border-none cursor-pointer" title="Delete Template">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Template Modal (Add/Edit) -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mb-[10vh]">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold m-0">{{ isEditing ? 'Edit Template' : 'Add New Template' }}</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <div class="p-5">
          <form @submit.prevent="saveTemplate" class="flex flex-col gap-4">
            
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Template Name</label>
              <input v-model="form.name" required type="text" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none" placeholder="e.g. Sales Q3 KPI">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Target Department</label>
              <select v-model="form.department_type" required class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
                <option value="All">All Departments (General)</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.name">{{ dept.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Description</label>
              <textarea v-model="form.description" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none h-[80px] resize-y" placeholder="Brief description of this template's use case"></textarea>
            </div>
            
            <label class="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" v-model="form.is_active" class="w-4 h-4 rounded">
              <span class="text-sm font-semibold">Template is Active</span>
            </label>

          </form>
        </div>

        <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" @click="saveTemplate" :disabled="saving" class="px-4 py-2 border-none rounded bg-[#3498db] text-white cursor-pointer font-medium hover:bg-[#2980b9] disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Save Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Indicators Modal -->
    <div v-if="showIndicatorsModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-[#f8f9fa] rounded-t-lg">
          <div>
            <h2 class="text-xl font-bold m-0 text-[#2c3e50]">Manage Indicators</h2>
            <p class="text-[0.85rem] text-[#7f8c8d] m-0 mt-1">Template: <strong>{{ selectedTemplate?.name }}</strong></p>
          </div>
          <button @click="closeIndicatorsModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1 bg-[#f4f7f6]">
          
          <!-- Indicators List -->
          <div class="bg-white rounded border border-[#e0e0e0] overflow-hidden mb-5">
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-[#f1f4f6]">
                  <th class="p-2.5 border-b border-[#e0e0e0] text-[13px] text-[#555] font-semibold w-[40px]">Ord</th>
                  <th class="p-2.5 border-b border-[#e0e0e0] text-[13px] text-[#555] font-semibold">Category</th>
                  <th class="p-2.5 border-b border-[#e0e0e0] text-[13px] text-[#555] font-semibold w-[40%]">Indicator Name</th>
                  <th class="p-2.5 border-b border-[#e0e0e0] text-[13px] text-[#555] font-semibold w-[80px]">Weight</th>
                  <th class="p-2.5 border-b border-[#e0e0e0] text-[13px] text-[#555] font-semibold text-right w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="selectedTemplate?.indicators?.length === 0">
                  <td colspan="5" class="p-4 text-center text-gray-500 text-[14px]">No indicators added yet.</td>
                </tr>
                <tr v-else v-for="ind in selectedTemplate?.indicators" :key="ind.id" class="hover:bg-[#fafafa]">
                  <td class="p-2.5 border-b border-[#eee] text-[13px] text-center font-mono">{{ ind.sort_order }}</td>
                  <td class="p-2.5 border-b border-[#eee] text-[13px]">{{ ind.category }}</td>
                  <td class="p-2.5 border-b border-[#eee] text-[13px]">
                    <strong>{{ ind.name }}</strong>
                    <div class="text-[11px] text-[#888] truncate max-w-[280px]" :title="ind.description">{{ ind.description }}</div>
                  </td>
                  <td class="p-2.5 border-b border-[#eee] text-[13px] font-bold">{{ Number(ind.weight).toFixed(0) }}%</td>
                  <td class="p-2.5 border-b border-[#eee] text-[13px] text-right">
                    <button @click="editIndicator(ind)" class="text-[#3498db] hover:text-[#2980b9] bg-transparent border-none cursor-pointer text-[12px] font-semibold mr-2">Edit</button>
                    <button @click="deleteIndicator(ind)" class="text-[#e74c3c] hover:text-[#c0392b] bg-transparent border-none cursor-pointer text-[12px] font-semibold">Del</button>
                  </td>
                </tr>
                <tr v-if="selectedTemplate" class="bg-[#f8f9fa] border-t-2 border-[#ddd]">
                  <td colspan="3" class="p-2.5 text-right font-bold text-[13px]">Total Weight:</td>
                  <td class="p-2.5 font-bold text-[13px]" :class="{'text-[#2ecc71]': currentTotalWeight === 100, 'text-[#e74c3c]': currentTotalWeight !== 100}">
                    {{ currentTotalWeight }}%
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add/Edit Indicator Form -->
          <div class="bg-white p-4 rounded border border-[#e0e0e0]">
            <h3 class="mt-0 mb-3 text-[1.1rem] text-[#2c3e50] border-b border-[#eee] pb-2">{{ isEditingInd ? 'Edit Indicator' : 'Add New Indicator' }}</h3>
            <form @submit.prevent="saveIndicator" class="grid grid-cols-12 gap-3">
              
              <div class="col-span-2">
                <label class="block text-[12px] font-semibold text-[#555] mb-1">Order</label>
                <input v-model="indForm.sort_order" type="number" min="0" class="w-full p-2 border border-gray-300 rounded text-[13px] focus:border-[#3498db] outline-none">
              </div>

              <div class="col-span-4">
                <label class="block text-[12px] font-semibold text-[#555] mb-1">Category</label>
                <input v-model="indForm.category" required type="text" placeholder="e.g. Technical Skills" class="w-full p-2 border border-gray-300 rounded text-[13px] focus:border-[#3498db] outline-none list" list="categories">
                <datalist id="categories">
                  <option value="Technical Skills"></option>
                  <option value="Soft Skills"></option>
                  <option value="Core Competencies"></option>
                  <option value="Leadership"></option>
                  <option value="KPIs"></option>
                </datalist>
              </div>

              <div class="col-span-4">
                <label class="block text-[12px] font-semibold text-[#555] mb-1">Indicator Name</label>
                <input v-model="indForm.name" required type="text" placeholder="e.g. Code Quality" class="w-full p-2 border border-gray-300 rounded text-[13px] focus:border-[#3498db] outline-none">
              </div>

              <div class="col-span-2">
                <label class="block text-[12px] font-semibold text-[#555] mb-1">Weight (%)</label>
                <input v-model="indForm.weight" required type="number" min="0" max="100" class="w-full p-2 border border-gray-300 rounded text-[13px] focus:border-[#3498db] outline-none">
              </div>

              <div class="col-span-12">
                <label class="block text-[12px] font-semibold text-[#555] mb-1">Description / Guidelines</label>
                <input v-model="indForm.description" type="text" placeholder="Explain how to evaluate this indicator..." class="w-full p-2 border border-gray-300 rounded text-[13px] focus:border-[#3498db] outline-none">
              </div>

              <div class="col-span-12 flex justify-end gap-2 mt-1">
                <button v-if="isEditingInd" type="button" @click="resetIndForm" class="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-[13px] cursor-pointer hover:bg-gray-50">Cancel Edit</button>
                <button type="submit" :disabled="savingInd" class="px-4 py-1.5 border-none rounded bg-[#2ecc71] text-white text-[13px] font-bold cursor-pointer hover:bg-[#27ae60] disabled:opacity-50">
                  {{ savingInd ? 'Saving...' : (isEditingInd ? 'Update Indicator' : 'Add Indicator') }}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>

  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const templates = ref([]);
const departments = ref([]);
const loading = ref(true);

// --- Initialization ---
onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const [tplRes, deptRes] = await Promise.all([
      axios.get('/api/assessment-templates'),
      axios.get('/api/departments')
    ]);
    templates.value = tplRes.data;
    departments.value = deptRes.data;
  } catch (error) {
    console.error("Failed to load data", error);
  } finally {
    loading.value = false;
  }
};

// --- Template CRUD ---
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
let editTempId = null;

const form = reactive({
  name: '',
  department_type: 'All',
  description: '',
  is_active: true
});

const openAddModal = () => {
  isEditing.value = false;
  editTempId = null;
  form.name = '';
  form.department_type = 'All';
  form.description = '';
  form.is_active = true;
  showModal.value = true;
};

const editTemplate = (tpl) => {
  isEditing.value = true;
  editTempId = tpl.id;
  form.name = tpl.name;
  form.department_type = tpl.department_type;
  form.description = tpl.description || '';
  form.is_active = tpl.is_active;
  showModal.value = true;
};

const closeModal = () => showModal.value = false;

const saveTemplate = async () => {
  if (!form.name || !form.department_type) return;
  saving.value = true;
  try {
    if (isEditing.value) {
      await axios.put(`/api/assessment-templates/${editTempId}`, form);
    } else {
      await axios.post('/api/assessment-templates', form);
    }
    closeModal();
    loadData();
  } catch (error) {
    alert("Error saving template: " + (error.response?.data?.message || ''));
  } finally {
    saving.value = false;
  }
};

const deleteTemplate = async (tpl) => {
  if (!confirm(`Are you sure you want to delete template '${tpl.name}'?`)) return;
  try {
    await axios.delete(`/api/assessment-templates/${tpl.id}`);
    loadData();
  } catch (error) {
    alert(error.response?.data?.message || "Error deleting template");
  }
};

// --- Indicator CRUD ---
const showIndicatorsModal = ref(false);
const selectedTemplate = ref(null);
const isEditingInd = ref(false);
const savingInd = ref(false);
let editIndId = null;

const indForm = reactive({
  category: '',
  name: '',
  description: '',
  weight: 10,
  sort_order: 10
});

const currentTotalWeight = computed(() => {
  if (!selectedTemplate.value || !selectedTemplate.value.indicators) return 0;
  return selectedTemplate.value.indicators.reduce((sum, ind) => sum + Number(ind.weight), 0);
});

const manageIndicators = (tpl) => {
  selectedTemplate.value = tpl;
  resetIndForm();
  showIndicatorsModal.value = true;
};

const closeIndicatorsModal = () => {
  showIndicatorsModal.value = false;
  selectedTemplate.value = null;
  loadData(); // Reload main datatable in case indicators/weights changed
};

const resetIndForm = () => {
  isEditingInd.value = false;
  editIndId = null;
  indForm.category = '';
  indForm.name = '';
  indForm.description = '';
  indForm.weight = 10;
  // Auto increment sort_order based on existing
  const currentCount = selectedTemplate.value?.indicators?.length || 0;
  indForm.sort_order = (currentCount + 1) * 10; 
};

const editIndicator = (ind) => {
  isEditingInd.value = true;
  editIndId = ind.id;
  indForm.category = ind.category;
  indForm.name = ind.name;
  indForm.description = ind.description || '';
  indForm.weight = ind.weight;
  indForm.sort_order = ind.sort_order;
};

const saveIndicator = async () => {
  if (!indForm.name || !indForm.category) return;
  savingInd.value = true;
  try {
    if (isEditingInd.value) {
      const res = await axios.put(`/api/assessment-indicators/${editIndId}`, indForm);
      // Update local array
      const index = selectedTemplate.value.indicators.findIndex(i => i.id === editIndId);
      if (index !== -1) selectedTemplate.value.indicators[index] = res.data.indicator;
    } else {
      const res = await axios.post(`/api/assessment-templates/${selectedTemplate.value.id}/indicators`, indForm);
      // Append to local array
      if (!selectedTemplate.value.indicators) selectedTemplate.value.indicators = [];
      selectedTemplate.value.indicators.push(res.data.indicator);
      
      // Re-sort local array
      selectedTemplate.value.indicators.sort((a,b) => a.sort_order - b.sort_order);
    }
    resetIndForm();
  } catch (error) {
    alert("Error saving indicator: " + (error.response?.data?.message || ''));
  } finally {
    savingInd.value = false;
  }
};

const deleteIndicator = async (ind) => {
  if (!confirm(`Are you sure you want to delete indicator '${ind.name}'?`)) return;
  try {
    await axios.delete(`/api/assessment-indicators/${ind.id}`);
    selectedTemplate.value.indicators = selectedTemplate.value.indicators.filter(i => i.id !== ind.id);
  } catch (error) {
    alert(error.response?.data?.message || "Error deleting indicator");
  }
};
</script>
