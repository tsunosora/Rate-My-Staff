<template>
  <AppLayout>
    <div class="flex flex-col gap-6 h-full">
      <div class="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
           <h1 class="m-0 text-2xl font-bold text-gray-800">Settings & Configuration</h1>
           <p class="m-0 text-gray-500 text-sm mt-1">Manage users, master data, and system preferences</p>
        </div>
        <button @click="saveChanges" :disabled="saving" class="bg-[#10b981] text-white border-none px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-emerald-600 disabled:opacity-50 shadow-sm transition-colors text-sm w-full md:w-auto mt-2 md:mt-0">
          {{ saving ? 'Saving...' : 'Save All Changes' }}
        </button>
      </div>

      <!-- User Access Management -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
        <h2 class="text-[1.1rem] font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100">User Access Management</h2>
        
        <div class="overflow-x-auto">
          <table class="w-full border-collapse mt-2.5 min-w-[600px]">
             <thead>
               <tr>
                 <th class="text-left p-3 border-b border-[#eee] text-[#7f8c8d] font-semibold">Name</th>
                 <th class="text-left p-3 border-b border-[#eee] text-[#7f8c8d] font-semibold">Email</th>
                 <th class="text-left p-3 border-b border-[#eee] text-[#7f8c8d] font-semibold">Role</th>
                 <th class="text-left p-3 border-b border-[#eee] text-[#7f8c8d] font-semibold">Status</th>
                 <th class="text-left p-3 border-b border-[#eee] text-[#7f8c8d] font-semibold">Action</th>
               </tr>
             </thead>
             <tbody>
               <tr v-if="loading"><td colspan="5" class="p-4 text-center text-gray-500">Loading users...</td></tr>
               <tr v-else v-for="user in users" :key="user.id">
                 <td class="p-3 border-b border-[#eee] font-medium">{{ user.name }}</td>
                 <td class="p-3 border-b border-[#eee]">{{ user.email }}</td>
                 <td class="p-3 border-b border-[#eee]">
                   <!-- Simple mock badge for MVP -->
                   <span v-if="user.id === 1" class="bg-[#e74c3c] text-white px-2 py-1 rounded-[12px] text-[0.75rem] font-bold">Owner</span>
                   <span v-else class="bg-[#3498db] text-white px-2 py-1 rounded-[12px] text-[0.75rem] font-bold">Admin</span>
                 </td>
                 <td class="p-3 border-b border-[#eee]">Active</td>
                 <td class="p-3 border-b border-[#eee]">
                    <a href="#" class="text-[#3498db] hover:underline text-sm font-medium">Edit</a>
                 </td>
               </tr>
             </tbody>
          </table>
        </div>
        <button class="bg-[#3498db] text-white border-none px-4 py-2.5 rounded font-bold cursor-pointer hover:bg-[#2980b9] text-[0.8rem] mt-[15px]">
          + Add New User
        </button>
      </div>

      <!-- System Settings -->
      <div class="grid grid-cols-2 gap-6 max-md:grid-cols-1">
        
        <!-- Branding Card -->
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h2 class="text-[1.1rem] font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100">Branding & Subdomain</h2>
          
          <div class="mb-[15px]">
            <label class="block mb-[5px] text-[0.9rem] font-medium">Subdomain</label>
            <div class="flex items-center">
              <input type="text" v-model="settings.branding.subdomain" class="w-full p-2.5 border border-[#ddd] rounded-l focus:outline-none focus:border-[#3498db]">
              <span class="bg-[#eee] p-2.5 border border-[#ddd] border-l-0 rounded-r text-gray-600">.assess-app.com</span>
            </div>
          </div>
          
          <div class="mb-[15px]">
            <label class="block mb-[5px] text-[0.9rem] font-medium">Company Logo</label>
            <input type="file" class="w-full p-2.5 border border-[#ddd] rounded box-border focus:outline-none focus:border-[#3498db]">
          </div>
          
          <div class="mb-[15px]">
            <label class="block mb-[5px] text-[0.9rem] font-medium">Primary Branding Color</label>
            <div class="flex items-center gap-[15px] mt-2.5">
              <input type="color" v-model="settings.branding.primary_color" class="w-[50px] h-[35px] cursor-pointer">
              <div class="w-[40px] h-[40px] rounded border border-[#ddd]" :style="{ backgroundColor: settings.branding.primary_color }"></div>
              <span class="font-mono text-gray-700">{{ settings.branding.primary_color }}</span>
            </div>
          </div>
        </div>

        <!-- Master Data Management -->
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
          <h2 class="text-[1.1rem] font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100">Master Data (Categories & Roles)</h2>
          
          <!-- Departments -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-md font-bold text-gray-700 m-0">Departments</h3>
              <button @click="openAddDepartmentModal" class="bg-[#3498db] text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-[#2980b9]">+ Add</button>
            </div>
            <ul class="list-none p-0 m-0 border border-gray-200 rounded">
              <li v-for="dept in departments" :key="dept.id" class="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 text-sm">
                <span>{{ dept.name }} <span class="text-gray-400 ml-2">({{ dept.employees_count || 0 }} employees)</span></span>
                <div class="flex gap-2">
                  <button @click="deleteDepartment(dept.id)" class="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-1" title="Delete">&times;</button>
                </div>
              </li>
              <li v-if="departments.length === 0" class="p-3 text-center text-gray-500 text-sm">No departments found.</li>
            </ul>
          </div>

          <!-- Roles / Positions -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-md font-bold text-gray-700 m-0">Roles / Positions</h3>
              <button @click="openAddPositionModal" class="bg-[#2ecc71] text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-[#27ae60]">+ Add</button>
            </div>
            <ul class="list-none p-0 m-0 border border-gray-200 rounded max-h-48 overflow-y-auto">
              <li v-for="pos in positions" :key="pos.id" class="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 text-sm">
                <div>
                  <strong>{{ pos.name }}</strong><br>
                  <small class="text-gray-500">{{ pos.department ? pos.department.name : 'No Department' }}</small>
                </div>
                <div class="flex gap-2 items-center">
                  <span class="text-gray-400 text-xs mr-2">{{ pos.employees_count || 0 }} emp</span>
                  <button @click="deletePosition(pos.id)" class="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-1" title="Delete">&times;</button>
                </div>
              </li>
              <li v-if="positions.length === 0" class="p-3 text-center text-gray-500 text-sm">No roles found.</li>
            </ul>
          </div>
        </div>
        
      </div>

      <!-- System Announcements -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 mb-6">
        <h2 class="text-[1.1rem] font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100">System Announcements (Broadcast)</h2>
        <div class="max-w-2xl bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
            <span class="text-xl">📢</span>
            <p class="m-0 text-blue-800 text-sm leading-relaxed">Use this form to send a real-time notification to <strong>all users</strong> in the system. The message will appear in their notification bell immediately.</p>
        </div>
        
        <div class="max-w-2xl bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <div class="mb-5">
            <label class="block mb-2 text-sm font-bold text-gray-600">Announcement Title</label>
            <input type="text" v-model="broadcastForm.title" placeholder="e.g., Mandatory Server Maintenance" class="w-full p-3 border border-gray-200 rounded-xl box-border focus:outline-none focus:border-[#3b82f6] shadow-sm text-sm">
          </div>
          
          <div class="mb-6">
            <label class="block mb-2 text-sm font-bold text-gray-600">Message Body</label>
            <textarea v-model="broadcastForm.message" rows="4" placeholder="Type your announcement here..." class="w-full p-3 border border-gray-200 rounded-xl box-border focus:outline-none focus:border-[#3b82f6] shadow-sm text-sm resize-y"></textarea>
          </div>
          
          <button @click="sendBroadcast" :disabled="sendingBroadcast || !broadcastForm.title || !broadcastForm.message" class="bg-[#3b82f6] text-white border-none px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm w-full flex justify-center items-center gap-2">
            <span v-if="sendingBroadcast" class="animate-spin text-lg">⏳</span>
            <span v-else class="text-lg">✉️</span> 
            {{ sendingBroadcast ? 'Broadcasting...' : 'Send Broadcast to All Users' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Add Department Modal -->
    <div v-if="showDeptModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-bold m-0">Add Department</h2>
          <button @click="showDeptModal = false" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <div class="p-4">
          <label class="block text-sm font-semibold mb-1">Department Name</label>
          <input v-model="newDeptName" type="text" class="w-full p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none" placeholder="e.g. Finance">
        </div>
        <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button @click="showDeptModal = false" class="px-3 py-1.5 border border-gray-300 rounded">Cancel</button>
          <button @click="saveDepartment" class="px-3 py-1.5 border-none rounded bg-[#3498db] text-white">Save</button>
        </div>
      </div>
    </div>

    <!-- Add Position Modal -->
    <div v-if="showPosModal" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-bold m-0">Add Role / Position</h2>
          <button @click="showPosModal = false" class="text-gray-500 hover:text-gray-800 bg-transparent border-none text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <div>
            <label class="block text-sm font-semibold mb-1">Department</label>
            <select v-model="newPosData.department_id" class="w-full p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none">
              <option value="" disabled>Select Department</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Role Name</label>
            <input v-model="newPosData.name" type="text" class="w-full p-2 border border-gray-300 rounded focus:border-[#3498db] outline-none" placeholder="e.g. Manager">
          </div>
        </div>
        <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button @click="showPosModal = false" class="px-3 py-1.5 border border-gray-300 rounded">Cancel</button>
          <button @click="savePosition" class="px-3 py-1.5 border-none rounded bg-[#2ecc71] text-white">Save</button>
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
const saving = ref(false);
const users = ref([]);

// --- Broadcast State ---
const sendingBroadcast = ref(false);
const broadcastForm = reactive({ title: '', message: '' });

// --- Master Data State ---
const departments = ref([]);
const positions = ref([]);
const showDeptModal = ref(false);
const showPosModal = ref(false);
const newDeptName = ref('');
const newPosData = reactive({ department_id: '', name: '' });

const settings = reactive({
  branding: {
    subdomain: 'megacorp',
    primary_color: '#3498db'
  }
});

onMounted(async () => {
    try {
        const [resSettings, resDepts, resPos] = await Promise.all([
            axios.get('/api/settings'),
            axios.get('/api/departments'),
            axios.get('/api/positions')
        ]);
        users.value = resSettings.data.users;
        
        if (resSettings.data.settings) {
            Object.assign(settings.branding, resSettings.data.settings.branding);
        }

        departments.value = resDepts.data;
        positions.value = resPos.data;

    } catch (e) {
        console.error("Failed to fetch settings or master data", e);
    } finally {
        loading.value = false;
    }
});

// --- Master Data Methods ---
const openAddDepartmentModal = () => {
  newDeptName.value = '';
  showDeptModal.value = true;
};

const saveDepartment = async () => {
  if(!newDeptName.value) return;
  try {
    const res = await axios.post('/api/departments', { name: newDeptName.value });
    departments.value.push(res.data);
    showDeptModal.value = false;
  } catch (error) {
    alert("Error saving department: " + (error.response?.data?.message || ''));
  }
};

const deleteDepartment = async (id) => {
  if(!confirm("Are you sure? This will set employees' department to empty.")) return;
  try {
    await axios.delete(`/api/departments/${id}`);
    departments.value = departments.value.filter(d => d.id !== id);
  } catch (error) {
    alert("Error deleting department");
  }
};

const openAddPositionModal = () => {
  newPosData.name = '';
  newPosData.department_id = '';
  showPosModal.value = true;
};

const savePosition = async () => {
  if(!newPosData.name || !newPosData.department_id) return;
  try {
    const res = await axios.post('/api/positions', newPosData);
    positions.value.push(res.data);
    showPosModal.value = false;
  } catch (error) {
    alert("Error saving position: " + (error.response?.data?.message || ''));
  }
};

const deletePosition = async (id) => {
  if(!confirm("Are you sure?")) return;
  try {
    await axios.delete(`/api/positions/${id}`);
    positions.value = positions.value.filter(p => p.id !== id);
  } catch (error) {
    alert("Error deleting position");
  }
};

const saveChanges = async () => {
    saving.value = true;
    try {
        await axios.post('/api/settings', settings);
        alert('Settings saved successfully!');
    } catch (e) {
        console.error("Failed to save settings", e);
        alert('An error occurred while saving.');
    } finally {
        saving.value = false;
    }
}

// --- Broadcast Methods ---
const sendBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.message) {
        alert("Please enter both a title and a message.");
        return;
    }
    
    if (!confirm("Are you sure you want to send this notification to all users?")) return;

    sendingBroadcast.value = true;
    try {
        const res = await axios.post('/api/notifications/broadcast', broadcastForm);
        alert(res.data.message || 'Broadcast sent successfully!');
        broadcastForm.title = '';
        broadcastForm.message = '';
    } catch (e) {
        console.error("Failed to send broadcast", e);
        alert('An error occurred while broadcasting.');
    } finally {
        sendingBroadcast.value = false;
    }
};
</script>
