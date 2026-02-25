<template>
  <AppLayout>
    <div class="flex flex-col h-full gap-6">
      
      <!-- Header Actions -->
      <div class="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <h1 class="m-0 text-2xl font-bold text-gray-800">Employee Directory</h1>
        <div class="flex flex-wrap gap-2 w-full md:w-auto">
          <input type="file" ref="fileInput" @change="handleFileImport" accept=".csv,.txt" class="hidden" style="display: none;" />
          <button @click="triggerImport" class="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm grow md:grow-0 text-center">Import CSV</button>
          <button @click="exportPdf" class="bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm grow md:grow-0 text-center">Export PDF</button>
          <button @click="showAddModal = true" class="bg-[#3b82f6] text-white border-none px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex justify-center items-center hover:bg-blue-600 transition-colors shadow-sm grow md:grow-0">+ Add Employee</button>
          <router-link to="/assessments/create/bulk" class="bg-[#10b981] text-white border-none px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex justify-center items-center hover:bg-emerald-600 transition-colors shadow-sm decoration-none grow md:grow-0">+ Bulk Score</router-link>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex gap-4 items-center flex-wrap">
        <input type="text" v-model="filters.search" @keyup.enter="loadEmployees" class="flex-1 p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50" placeholder="Search by name, ID or email...">
        <select v-model="filters.department_id" @change="loadEmployees" class="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#3b82f6] transition-colors bg-gray-50/50 min-w-[200px]">
          <option value="">All Departments</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
        </select>
        <button @click="loadEmployees" class="bg-gray-800 text-white border-none px-6 py-3 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-700 transition-colors shadow-sm">Apply Filters</button>
      </div>

      <!-- Table Container -->
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left min-w-[800px]">
             <thead>
               <tr class="bg-gray-50 border-b border-gray-200">
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs w-10 text-center"><input type="checkbox" v-model="selectAll"></th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Employee Name</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Department</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Role</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Last Assessment</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Avg Score</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Status</th>
                 <th class="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-if="loading"><td colspan="8" class="p-4 text-center text-gray-500">Loading...</td></tr>
               <tr v-else-if="employees.length === 0"><td colspan="8" class="p-4 text-center text-gray-500">No employees found.</td></tr>
               
               <tr v-else v-for="emp in employees" :key="emp.id" class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                 <td class="px-3 py-3 text-center"><input type="checkbox" v-model="selectedEmployees" :value="emp.id"></td>
                 <td class="px-3 py-3 text-center">
                    <strong class="text-gray-800 text-[15px]">{{ emp.full_name }}</strong><br>
                    <span class="text-xs text-gray-500 mt-1 inline-block">ID: {{ emp.employee_code }}</span>
                 </td>
                 <td class="px-3 py-3 text-sm text-gray-600 font-medium text-center">{{ emp.department ? emp.department.name : '-' }}</td>
                 <td class="px-3 py-3 text-sm text-gray-600 text-center">{{ emp.position ? emp.position.name : '-' }}</td>
                 <td class="px-3 py-3 text-sm text-gray-500 font-medium whitespace-nowrap text-center">
                    {{ emp.latest_assessment ? new Date(emp.latest_assessment.assessment_date).toLocaleDateString() : '-' }}
                 </td>
                 <td class="px-3 py-3 text-sm">
                    <div v-if="emp.average_score" class="flex flex-col gap-1 items-center justify-center">
                      <span class="bg-[#e8f4fd] text-[#3498db] px-2.5 py-1 rounded-md font-bold">{{ Number(emp.average_score).toFixed(1) }}</span>
                      <span v-if="emp.previous_score !== null && emp.previous_score !== undefined" class="text-[11px] text-gray-500 flex items-center justify-center gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200" title="Previous score">
                          Prev: {{ Number(emp.previous_score).toFixed(1) }}
                          <span v-if="emp.average_score > emp.previous_score" class="text-green-500 font-bold" title="Improved">▲</span>
                          <span v-else-if="emp.average_score < emp.previous_score" class="text-red-500 font-bold" title="Declined">▼</span>
                      </span>
                    </div>
                    <span v-else class="bg-gray-100 text-gray-400 px-2.5 py-1 rounded-md font-bold text-center block w-fit mx-auto">-</span>
                 </td>
                 <td class="px-3 py-3 text-sm text-center">
                    <div class="flex justify-center">
                      <span v-if="emp.latest_assessment" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4edda] text-[#155724] border border-green-200">Completed</span>
                      <span v-else class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fff3cd] text-[#856404] border border-yellow-200">Pending</span>
                    </div>
                 </td>
                 <td class="px-3 py-3 text-sm">
                    <div class="flex gap-2 justify-center">
                      <button v-if="emp.latest_assessment" @click="openAssessmentDetails(emp.latest_assessment.id)" class="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#10b981] text-white border-none cursor-pointer hover:bg-emerald-600 transition-colors shadow-sm" title="View Details">
                         View Details
                      </button>
                      <router-link v-else :to="`/assessments/create/single?employee=${emp.id}`" class="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#3b82f6] text-white hover:bg-blue-600 border border-transparent transition-colors decoration-none shadow-sm" title="Assess Employee">
                         Assess
                      </router-link>
                      <button @click="openEditModal(emp)" class="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#f59e0b] text-white hover:bg-amber-600 border-none cursor-pointer shadow-sm" title="Edit Employee">Edit</button>
                      <button @click="requestDelete(emp)" class="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 border-none cursor-pointer shadow-sm" title="Delete Employee">Delete</button>
                    </div>
                 </td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination Placeholder -->
      <div v-if="pagination.total > 0" class="flex justify-between items-center mt-2 px-2 text-sm text-gray-500 font-medium">
        <span>Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} employees</span>
        <div class="flex gap-3">
          <button @click="changePage(pagination.current_page - 1)" :disabled="pagination.current_page <= 1" class="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
          <button @click="changePage(pagination.current_page + 1)" :disabled="pagination.current_page >= pagination.last_page" class="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>

    </div>

    <!-- Add Employee Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold m-0">Add New Employee</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1">
          <form @submit.prevent="submitEmployee" class="grid grid-cols-2 gap-4">
            
            <!-- Removed Employee ID Field -->

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Nama Lengkap (Full Name)</label>
              <input v-model="form.full_name" required type="text" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Nama Panggil (Nickname)</label>
              <input v-model="form.nickname" required type="text" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Department</label>
              <select v-model="form.department_id" required class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
                <option value="" disabled>Select Department</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Jabatan (Position)</label>
              <select v-model="form.position_id" required :disabled="!form.department_id" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="" disabled>Select Position</option>
                <option v-for="pos in filteredPositions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Tanggal Masuk (Join Date)</label>
              <input v-model="form.join_date" required type="date" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Gaji (Salary)</label>
              <input v-model="form.salary" required type="number" min="0" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

          </form>
        </div>

        <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" @click="submitEmployee" :disabled="submitting" class="px-4 py-2 border-none rounded bg-[#3498db] text-white cursor-pointer font-medium hover:bg-[#2980b9] disabled:opacity-50">
            {{ submitting ? 'Saving...' : 'Save Employee' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Employee Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold m-0">Edit Employee</h2>
          <button @click="closeEditModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1">
          <form @submit.prevent="updateEmployee" class="grid grid-cols-2 gap-4">
            
            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-sm font-semibold">Employee ID (Code)</label>
              <input v-model="editForm.employee_code" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none bg-gray-100 cursor-not-allowed" readonly>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Nama Lengkap (Full Name)</label>
              <input v-model="editForm.full_name" required type="text" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Nama Panggil (Nickname)</label>
              <input v-model="editForm.nickname" type="text" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Department</label>
              <select v-model="editForm.department_id" required class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
                <option value="" disabled>Select Department</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Jabatan (Position)</label>
              <select v-model="editForm.position_id" required :disabled="!editForm.department_id" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="" disabled>Select Position</option>
                <option v-for="pos in editFilteredPositions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Tanggal Masuk (Join Date)</label>
              <input v-model="editForm.join_date" required type="date" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">Gaji (Salary)</label>
              <input v-model="editForm.salary" type="number" min="0" class="p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
            </div>
            
            <div class="flex flex-col gap-1 col-span-2 relative top-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="editForm.is_active" class="w-4 h-4 rounded">
                <span class="text-sm font-semibold">Active Employee</span>
              </label>
            </div>

          </form>
        </div>

        <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" @click="closeEditModal" class="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" @click="updateEmployee" :disabled="submitting" class="px-4 py-2 border-none rounded bg-[#3498db] text-white cursor-pointer font-medium hover:bg-[#2980b9] disabled:opacity-50">
            {{ submitting ? 'Updating...' : 'Update Employee' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
        <div class="p-5 border-b border-gray-200">
          <h2 class="text-xl font-bold m-0 text-[#e74c3c]">Confirm Deletion</h2>
        </div>
        <div class="p-5">
          <p class="m-0 text-gray-700">Are you sure you want to delete <strong>{{ employeeToDelete?.full_name }}</strong>?</p>
          <p class="m-0 mt-2 text-sm text-gray-500">This action cannot be undone.</p>
        </div>
        <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" @click="closeDeleteModal" class="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" @click="confirmDeleteEmployee" :disabled="deleting" class="px-4 py-2 border-none rounded bg-[#e74c3c] text-white cursor-pointer font-medium hover:bg-[#c0392b] disabled:opacity-50">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Assessment Details Modal -->
    <div v-if="showAssessmentModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold m-0">Assessment Details</h2>
          <button @click="closeAssessmentModal" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-2xl font-bold cursor-pointer">&times;</button>
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
          <button @click="closeAssessmentModal" class="px-4 py-2 bg-gray-200 border-none rounded font-medium cursor-pointer hover:bg-gray-300 transition-colors text-[#333]">Close</button>
        </div>
      </div>
    </div>

  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

const employees = ref([]);
const departments = ref([]);
const positions = ref([]);
const loading = ref(true);

const filters = reactive({
  search: '',
  department_id: ''
});

const pagination = reactive({
  current_page: 1,
  last_page: 1,
  total: 0,
  from: 0,
  to: 0
});

const selectedEmployees = ref([]);

const selectAll = computed({
  get() {
    return employees.value.length > 0 && selectedEmployees.value.length === employees.value.length;
  },
  set(value) {
    if (value) {
      selectedEmployees.value = employees.value.map(emp => emp.id);
    } else {
      selectedEmployees.value = [];
    }
  }
});

const showAssessmentModal = ref(false);
const selectedAssessment = ref(null);

onMounted(async () => {
  await loadMasterData();
  await loadEmployees();
});

const openAssessmentDetails = async (id) => {
  showAssessmentModal.value = true;
  selectedAssessment.value = null;
  try {
    const res = await axios.get(`/api/reports/assessment/${id}`);
    selectedAssessment.value = res.data;
  } catch (e) {
    console.error("Failed to load assessment details", e);
    alert('Failed to load assessment details.');
    showAssessmentModal.value = false;
  }
};

const closeAssessmentModal = () => {
  showAssessmentModal.value = false;
};

const loadMasterData = async () => {
    try {
        const [resDepts, resPos] = await Promise.all([
            axios.get('/api/departments'),
            axios.get('/api/positions')
        ]);
        departments.value = resDepts.data;
        positions.value = resPos.data;
    } catch(e) {
        console.error("Failed to load master data", e);
    }
}

const loadEmployees = async (page = 1) => {
  loading.value = true;
  try {
    const params = {
        page: page,
        search: filters.search,
        department_id: filters.department_id
    };
    
    // We update the controller to return latest_assessment relation if needed. 
    // Usually it's better defined in Eloquent using appending or with()
    const res = await axios.get('/api/employees', { params });
    
    employees.value = res.data.data;
    
    pagination.current_page = res.data.current_page;
    pagination.last_page = res.data.last_page;
    pagination.total = res.data.total;
    pagination.from = res.data.from;
    pagination.to = res.data.to;
    
  } catch (e) {
    console.error("Failed to load employees list", e);
  } finally {
    loading.value = false;
  }
};

const changePage = (page) => {
  if (page >= 1 && page <= pagination.last_page) {
    loadEmployees(page);
  }
};

// --- Modal Add Employee Logic ---
const showAddModal = ref(false);
const submitting = ref(false);
const form = reactive({
  full_name: '',
  nickname: '',
  department_id: '',
  position_id: '',
  join_date: '',
  salary: ''
});

const filteredPositions = computed(() => {
    if(!form.department_id) return [];
    return positions.value.filter(p => p.department_id === form.department_id);
});

const closeModal = () => {
  showAddModal.value = false;
  // Reset form
  Object.keys(form).forEach(key => form[key] = '');
};

const submitEmployee = async () => {
  submitting.value = true;
  try {
    await axios.post('/api/employees', form);
    alert('Employee added successfully!');
    closeModal();
    loadEmployees(1); // Reload data
  } catch (error) {
    console.error("Failed to add employee", error);
    alert('Failed to add employee: \n' + (error.response?.data?.message || error.message));
  } finally {
    submitting.value = false;
  }
};

// --- Edit Employee Logic ---
const showEditModal = ref(false);
const editingEmployee = ref(null);
const editForm = reactive({
  employee_code: '',
  full_name: '',
  nickname: '',
  department_id: '',
  position_id: '',
  join_date: '',
  salary: '',
  is_active: true
});

const editFilteredPositions = computed(() => {
    if(!editForm.department_id) return [];
    return positions.value.filter(p => p.department_id === editForm.department_id);
});

const openEditModal = (emp) => {
  editingEmployee.value = emp;
  editForm.employee_code = emp.employee_code;
  editForm.full_name = emp.full_name;
  editForm.nickname = emp.nickname;
  editForm.department_id = emp.department_id;
  editForm.position_id = emp.position_id;
  editForm.join_date = emp.join_date;
  editForm.salary = emp.salary;
  editForm.is_active = emp.is_active;
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingEmployee.value = null;
};

const updateEmployee = async () => {
  submitting.value = true;
  try {
    await axios.put(`/api/employees/${editingEmployee.value.id}`, editForm);
    alert('Employee updated successfully!');
    closeEditModal();
    loadEmployees(pagination.current_page); // Reload data
  } catch (error) {
    console.error("Failed to update employee", error);
    alert('Failed to update employee: \n' + (error.response?.data?.message || error.message));
  } finally {
    submitting.value = false;
  }
};

const showDeleteModal = ref(false);
const employeeToDelete = ref(null);
const deleting = ref(false);

const requestDelete = (emp) => {
  employeeToDelete.value = emp;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  employeeToDelete.value = null;
};

const confirmDeleteEmployee = async () => {
  if (!employeeToDelete.value) return;
  deleting.value = true;
  try {
    await axios.delete(`/api/employees/${employeeToDelete.value.id}`);
    closeDeleteModal();
    loadEmployees(pagination.current_page);
  } catch (error) {
    console.error("Failed to delete employee", error);
    alert('Failed to delete employee: \n' + (error.response?.data?.message || error.message));
  } finally {
    deleting.value = false;
  }
};

// --- Import/Export Logic ---
const fileInput = ref(null);

const triggerImport = () => {
  if(fileInput.value) {
    fileInput.value.click();
  }
};

const handleFileImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    loading.value = true;
    const res = await axios.post('/api/employees/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert(res.data.message);
    loadEmployees(1); // Reload data
  } catch (error) {
    console.error("Import failed", error);
    alert('Import failed: \n' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
    event.target.value = ''; // Reset file input
  }
};

const exportPdf = () => {
    const params = new URLSearchParams({
        search: filters.search,
        department_id: filters.department_id
    }).toString();
    window.open(`/api/employees/export-pdf?${params}`, '_blank');
};
</script>
