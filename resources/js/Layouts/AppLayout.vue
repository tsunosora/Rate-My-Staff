<template>
  <div class="flex h-screen overflow-hidden bg-[#f4f7f6] font-sans text-[#333]">
    <!-- Sidebar -->
    <div class="w-[220px] bg-[#2c3e50] text-white flex flex-col py-5 transition-all md:w-[220px] max-md:w-[60px]">
      <div class="px-5 pb-5 border-b border-[#34495e] font-bold text-lg max-md:hidden">
        HR Admin
      </div>
      
      <div class="mt-4 flex flex-col">
        <router-link to="/dashboard" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">🏠</span>
          <span class="max-md:hidden">Dashboard</span>
        </router-link>
        
        <router-link to="/employees" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">👥</span>
          <span class="max-md:hidden">Employees</span>
        </router-link>

        <router-link to="/assessments/create/single" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">📝</span>
          <span class="max-md:hidden">New Assessment</span>
        </router-link>

        <router-link to="/assessments/templates" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">📁</span>
          <span class="max-md:hidden">Templates</span>
        </router-link>

        <router-link to="/assessments/create/bulk" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">📋</span>
          <span class="max-md:hidden">Bulk Assessment</span>
        </router-link>

        <router-link to="/reports" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">📊</span>
          <span class="max-md:hidden">Reports</span>
        </router-link>

        <router-link to="/settings" class="flex items-center px-5 py-3 cursor-pointer transition-colors text-[#bdc3c7] hover:bg-[#34495e] hover:text-white" active-class="bg-[#34495e] text-white">
          <span class="text-xl mr-3">⚙️</span>
          <span class="max-md:hidden">Settings</span>
        </router-link>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-y-auto w-full">
      <!-- Header -->
      <header class="bg-white px-[30px] py-[15px] flex justify-between items-center shadow-[0_2px_4px_rgba(0,0,0,0.05)] sticky top-0 z-10 w-full">
        <div class="text-[1.4rem] font-semibold">{{ pageTitle }}</div>
        
        <div class="flex items-center gap-2">
          <span class="max-md:hidden">Welcome, {{ userName }}</span>
          <div class="w-[35px] h-[35px] bg-[#3498db] text-white rounded-full overflow-hidden flex items-center justify-center cursor-pointer font-bold">
            {{ userInitials }}
          </div>
          <!-- Log out button -->
          <button @click="logout" class="ml-4 text-sm text-red-500 hover:text-red-700 font-medium bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="w-full">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const userName = ref('Admin');

const pageTitle = computed(() => {
  return route.meta.title || 'Dashboard Overview';
});

const userInitials = computed(() => {
  if (!userName.value) return 'A';
  return userName.value.charAt(0).toUpperCase();
});

onMounted(async () => {
    try {
        const res = await axios.get('/api/user');
        if (res.data && res.data.name) {
            userName.value = res.data.name;
        }
    } catch (e) {
        // Silently fail, fallback to Admin
    }
});

const logout = async () => {
    try {
        await axios.post('/logout');
        window.location.href = '/login';
    } catch (e) {
        console.error("Logout failed", e);
        window.location.href = '/login';
    }
}
</script>
