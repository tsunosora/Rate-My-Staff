<template>
  <div class="flex h-screen overflow-hidden bg-[#f0f4f8] font-sans text-gray-800 p-3 sm:p-5 gap-3 sm:gap-5 max-md:pb-[80px] max-md:p-0">
    
    <!-- Sidebar / Bottom Nav (Soft UI floating card) -->
    <div class="w-[100px] bg-white sm:rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] flex flex-col py-8 items-center justify-between transition-all flex-shrink-0 z-40 overflow-y-auto hide-scrollbar max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:h-[75px] max-md:flex-row max-md:py-0 max-md:px-2 max-md:rounded-none max-md:rounded-t-3xl max-md:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.08)]">
      
      <!-- Logo / Branding -->
      <div class="font-bold text-xl text-[#3b82f6] mb-8 text-center px-2 flex flex-col items-center max-md:hidden">
        <span class="text-3xl mb-1">⭐</span>
        <span class="text-[0.7rem] uppercase tracking-wider text-gray-400">HR Admin</span>
      </div>
      
      <!-- Navigation Links -->
      <nav class="flex flex-col gap-3 w-full px-3 items-center max-md:flex-row max-md:justify-around max-md:px-2 max-md:gap-1 max-md:flex-1 h-full max-md:h-auto">
        <router-link to="/dashboard" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">🏠</span>
          <span class="text-[0.6rem] font-bold max-md:hidden">Dashboard</span>
        </router-link>
        
        <router-link to="/employees" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">👥</span>
          <span class="text-[0.6rem] font-bold max-md:hidden">Employees</span>
        </router-link>

        <router-link to="/assessments/create/single" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">📝</span>
          <span class="text-[0.6rem] font-bold text-center leading-tight max-md:hidden">New<br>Score</span>
        </router-link>

        <router-link to="/assessments/templates" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50 max-md:hidden" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">📁</span>
          <span class="text-[0.6rem] font-bold max-md:hidden">Templates</span>
        </router-link>

        <router-link to="/assessments/create/bulk" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">📋</span>
          <span class="text-[0.6rem] font-bold text-center leading-tight max-md:hidden">Bulk<br>Score</span>
        </router-link>

        <router-link to="/reports" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50 max-md:hidden" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">📊</span>
          <span class="text-[0.6rem] font-bold max-md:hidden">Reports</span>
        </router-link>

        <!-- More menu for mobile to access hidden routes -->
        <router-link to="/settings" class="flex flex-col items-center justify-center w-full aspect-square max-md:aspect-auto max-md:h-14 max-md:w-14 rounded-2xl cursor-pointer transition-all text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50/50" active-class="bg-[#3b82f6] !text-white shadow-md transform scale-105 max-md:scale-110">
          <span class="text-2xl mb-1 max-md:m-0 max-md:text-xl">⚙️</span>
          <span class="text-[0.6rem] font-bold max-md:hidden">Settings</span>
        </router-link>
      </nav>

      <!-- Profile & Logout at Bottom (hidden on mobile) -->
      <div class="flex flex-col items-center mt-6 gap-3 pt-6 border-t border-gray-100 w-full max-md:hidden">
        <!-- User Profile Bubble -->
        <div class="flex flex-col items-center gap-1">
          <div class="w-[45px] h-[45px] bg-indigo-100 text-indigo-600 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg shadow-sm border-2 border-white relative">
            {{ userInitials }}
            <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
          </div>
          <span class="text-[0.55rem] font-bold text-gray-600 text-center leading-tight mx-1 truncate w-[80px]">{{ userName }}</span>
        </div>
        
        <!-- Logout Button -->
        <button @click="logout" class="flex flex-col items-center text-gray-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer mt-1" title="Log out">
          <span class="text-xl">🚪</span>
        </button>
      </div>

    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-y-auto w-full relative hide-scrollbar sm:rounded-3xl">
      
      <!-- Seamless Transparent Header -->
      <header class="px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center w-full sticky top-0 z-30 bg-[#f0f4f8]/90 backdrop-blur-md">
        <div class="flex items-center gap-3">
           <div class="md:hidden w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white relative whitespace-nowrap">
             {{ userInitials }}
             <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
           </div>
           <div>
             <h1 class="text-xl sm:text-[1.8rem] font-bold text-[#1e293b] tracking-tight m-0 leading-tight">{{ pageTitle }}</h1>
             <p class="text-gray-500 text-xs sm:text-sm m-0 mt-0.5 sm:mt-1 max-md:hidden">Manage your daily tasks and reports</p>
           </div>
        </div>
        
        <div class="flex items-center gap-3 sm:gap-5">
          <!-- Notification Bell -->
          <div class="relative cursor-pointer bg-white p-2.5 sm:p-3 rounded-full shadow-sm hover:shadow-md transition-shadow" @click="toggleNotifications">
            <span class="text-lg sm:text-xl leading-none block">🔔</span>
            <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white shadow-sm">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
            
            <!-- Notification Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-4 w-72 sm:w-80 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-50 z-50 transform origin-top-right transition-all">
              <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <h3 class="font-bold text-sm m-0 text-gray-800">Notifications</h3>
                <button v-if="unreadCount > 0" @click.stop="markAllAsRead" class="text-xs text-[#3b82f6] hover:text-blue-700 font-semibold bg-transparent border-none cursor-pointer p-0">Mark all read</button>
              </div>
              <div class="max-h-[350px] overflow-y-auto w-full rounded-b-2xl">
                <div v-if="notifications.length === 0" class="p-6 text-center text-gray-400 text-sm flex flex-col items-center">
                  <span class="text-3xl mb-2 opacity-50">📭</span>
                  No notifications yet.
                </div>
                <div v-for="notif in notifications" :key="notif.id" 
                     @click.stop="markAsRead(notif)"
                     class="p-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                     :class="{'bg-[#f0f7ff]': !notif.read_at}">
                  <div class="flex items-start gap-3">
                    <div class="mt-1">
                      <span v-if="!notif.read_at" class="inline-block w-2.5 h-2.5 bg-[#3b82f6] rounded-full shadow-sm"></span>
                      <span v-else class="text-green-400 text-xs">✓</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-bold m-0 text-gray-800 leading-tight" :class="{'text-gray-500 font-medium': notif.read_at}">
                        {{ notif.data.title || 'System Notification' }}
                      </p>
                      <p class="text-xs text-gray-500 mt-1 mb-1 line-clamp-2 leading-relaxed">
                        {{ notif.data.message || 'You have a new message.' }}
                      </p>
                      <span class="text-[0.65rem] text-gray-400 font-medium tracking-wide uppercase">
                         {{ new Date(notif.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Mobile Logout Button -->
          <button @click="logout" class="md:hidden flex items-center justify-center bg-white p-2.5 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none" title="Log out">
            <span class="text-lg leading-none block text-red-500">🚪</span>
          </button>
        </div>
      </header>

      <!-- Page Content Slot -->
      <main class="w-full px-4 sm:px-6 pb-6">
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

// Notifications State
const notifications = ref([]);
const unreadCount = ref(0);
const showNotifications = ref(false);

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value && notifications.value.length === 0) {
     fetchNotifications();
  }
};

const fetchNotifications = async () => {
    try {
        const res = await axios.get('/api/notifications');
        notifications.value = res.data.notifications;
        unreadCount.value = res.data.unread_count;
    } catch (e) {
        console.error("Failed to load notifications", e);
    }
};

const markAsRead = async (notif) => {
    if (notif.read_at) return; // Already read
    
    try {
        await axios.post(`/api/notifications/${notif.id}/mark-read`);
        notif.read_at = new Date().toISOString();
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (e) {
        console.error("Failed to mark as read", e);
    }
};

const markAllAsRead = async () => {
    try {
        await axios.post('/api/notifications/mark-all-read');
        notifications.value.forEach(n => n.read_at = new Date().toISOString());
        unreadCount.value = 0;
    } catch (e) {
        console.error("Failed to mark all as read", e);
    }
};

// Close dropdown when clicking outside (simple implementation by listening on window)
onMounted(() => {
    fetchUserData();
    fetchNotifications();
    
    window.addEventListener('click', (e) => {
       if (!e.target.closest('.relative.cursor-pointer')) {
           showNotifications.value = false;
       }
    });
});

const fetchUserData = async () => {
    try {
        const res = await axios.get('/api/user');
        if (res.data && res.data.name) {
            userName.value = res.data.name;
        }
    } catch (e) {
        // Silently fail, fallback to Admin
    }
};

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
