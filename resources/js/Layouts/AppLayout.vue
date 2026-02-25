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
        
        <div class="flex items-center gap-4">
          <!-- Notification Bell -->
          <div class="relative cursor-pointer" @click="toggleNotifications">
            <span class="text-xl">🔔</span>
            <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
            
            <!-- Notification Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-3 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 transform origin-top-right transition-all">
              <div class="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 class="font-bold text-sm m-0">Notifications</h3>
                <button v-if="unreadCount > 0" @click.stop="markAllAsRead" class="text-xs text-blue-500 hover:text-blue-700 bg-transparent border-none cursor-pointer p-0">Mark all read</button>
              </div>
              <div class="max-h-80 overflow-y-auto w-full">
                <div v-if="notifications.length === 0" class="p-4 text-center text-gray-500 text-sm">
                  No notifications yet.
                </div>
                <div v-for="notif in notifications" :key="notif.id" 
                     @click.stop="markAsRead(notif)"
                     class="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                     :class="{'bg-blue-50/30': !notif.read_at}">
                  <div class="flex items-start gap-3">
                    <div class="mt-1 text-blue-500">
                      <span v-if="!notif.read_at" class="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span v-else class="text-gray-300">✓</span>
                    </div>
                    <div>
                      <p class="text-sm font-semibold m-0 text-gray-800" :class="{'text-gray-600 font-normal': notif.read_at}">
                        {{ notif.data.title || 'System Notification' }}
                      </p>
                      <p class="text-xs text-gray-500 mt-1 mb-1 line-clamp-2">
                        {{ notif.data.message || 'You have a new message.' }}
                      </p>
                      <span class="text-[10px] text-gray-400 font-medium">
                         {{ new Date(notif.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span class="max-md:hidden text-gray-600 font-medium pl-2 border-l border-gray-200">Welcome, {{ userName }}</span>
          <div class="w-[35px] h-[35px] bg-[#3498db] text-white rounded-full overflow-hidden flex items-center justify-center cursor-pointer font-bold shadow-sm">
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
