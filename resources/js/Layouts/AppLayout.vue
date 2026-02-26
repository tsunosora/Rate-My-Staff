<template>
  <div class="flex h-screen overflow-hidden bg-[#fafcff] font-sans text-gray-800">
    
    <!-- Sidebar -->
    <div 
      class="bg-white flex flex-col transition-all duration-300 ease-in-out border-r border-gray-100 relative z-40 max-md:fixed max-md:h-screen max-md:shadow-2xl"
      :class="[
        isSidebarOpen ? 'w-[280px] max-md:translate-x-0' : 'w-[88px] max-md:-translate-x-full'
      ]"
    >
      <!-- Logo Area -->
      <div class="flex items-center h-[90px] px-6 transition-all duration-300" :class="{ 'justify-center px-0': !isSidebarOpen }">
        <div class="text-[#6366f1] flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <svg class="w-8 h-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span v-if="isSidebarOpen" class="font-bold text-2xl tracking-tighter">
            HR<span class="text-gray-800 font-black">Admin</span><span class="text-[#6366f1]">.</span>
          </span>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar px-4 py-2 flex flex-col gap-8">

        <!-- MENU SECTION -->
        <div>
          <p v-if="isSidebarOpen" class="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Menu</p>
          <div v-else class="h-4 border-b border-white mb-3"></div>
          
          <nav class="flex flex-col gap-1.5 relative">
            <router-link to="/dashboard" class="group flex items-center px-3 py-3 rounded-2xl transition-all hover:bg-[#f5f7ff] hover:text-[#6366f1] text-gray-500 font-medium relative" active-class="bg-[#f5f7ff] !text-[#6366f1]">
              <div class="flex items-center justify-center relative w-6 h-6 flex-shrink-0">
                  <svg class="w-5 h-5 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
              </div>
              <span v-if="isSidebarOpen" class="ml-3 text-sm whitespace-nowrap">Dashboard</span>
              
              <!-- Tooltip when collapsed -->
              <div v-if="!isSidebarOpen" class="absolute left-[72px] bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] font-medium shadow-xl">
                 Dashboard
                 <div class="absolute w-2 h-2 bg-gray-800 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
              </div>
            </router-link>

            <!-- Regular Sub Menu / Directory -->
            <router-link to="/employees" class="group flex items-center px-3 py-3 rounded-2xl transition-all hover:bg-[#f5f7ff] hover:text-[#6366f1] text-gray-500 font-medium relative" active-class="bg-[#f5f7ff] !text-[#6366f1]">
              <div class="flex items-center justify-center relative w-6 h-6 flex-shrink-0">
                  <svg class="w-5 h-5 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
              </div>
              <span v-if="isSidebarOpen" class="ml-3 text-sm whitespace-nowrap">Directory</span>
              
              <div v-if="!isSidebarOpen" class="absolute left-[72px] bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] font-medium shadow-xl">
                 Directory
                 <div class="absolute w-2 h-2 bg-gray-800 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
              </div>
            </router-link>
          </nav>
        </div>

        <!-- AGENTS & USERS SECTION -->
        <div>
          <p v-if="isSidebarOpen" class="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Agents & Users</p>
          <div v-else class="h-4 border-b border-white mb-3"></div>

          <nav class="flex flex-col gap-1.5">
            <!-- Parent Menu for Employee / Assessment -->
            <div class="relative group">
              <button @click="toggleEmployeeMenu" class="w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all hover:bg-[#f5f7ff] hover:text-[#6366f1] text-gray-500 font-medium focus:outline-none relative" :class="{ 'bg-[#f5f7ff] !text-[#6366f1]': isEmployeeMenuOpen && isSidebarOpen, '!text-[#6366f1]': isEmployeeActive && !isSidebarOpen }">
                <div class="flex items-center">
                  <div class="flex items-center justify-center relative w-6 h-6 flex-shrink-0">
                      <svg class="w-5 h-5 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                  </div>
                  <span v-if="isSidebarOpen" class="ml-3 text-sm whitespace-nowrap">Employee</span>
                </div>
                <svg v-if="isSidebarOpen" class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isEmployeeMenuOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                
                <!-- Expanded active indicator for collapsed sidebar -->
                <div v-if="!isSidebarOpen && isEmployeeActive" class="absolute w-1.5 h-1.5 rounded-full bg-[#6366f1] right-1 top-2"></div>
              </button>

              <!-- Sub Menu (Accordion when opened / Popover when collapsed) -->
              <div v-show="isSidebarOpen ? isEmployeeMenuOpen : true" 
                   :class="[
                     isSidebarOpen 
                       ? 'pl-2 mt-1 overflow-hidden transition-all duration-300' 
                       : 'absolute left-full top-0 ml-4 w-56 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl border border-gray-100 py-3 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200'
                   ]">
                
                <!-- Arrow for popover -->
                <div v-if="!isSidebarOpen" class="absolute w-3 h-3 bg-white border-l border-b border-gray-100 rotate-45 -left-[7px] top-4"></div>
                
                <div v-if="!isSidebarOpen" class="px-5 py-2 text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-2 whitespace-nowrap">Employee Sub-Menu</div>
                
                <div class="flex flex-col gap-1 relative" :class="{ 'before:absolute before:left-4 before:top-2 before:bottom-4 before:w-px before:bg-gray-200': isSidebarOpen }">
                  
                  <router-link to="/assessments/create/single" class="flex items-center px-4 py-2.5 text-sm text-gray-500 hover:text-[#6366f1] hover:bg-[#f5f7ff] rounded-xl relative z-10 transition-colors mx-2 font-medium" active-class="!text-[#6366f1] bg-[#f5f7ff]">
                    <span v-if="isSidebarOpen" class="absolute left-[-23px] top-1/2 -translate-y-1/2 w-[15px] h-px bg-gray-200"></span>
                    <span :class="isSidebarOpen ? 'ml-6' : 'ml-1'">New Score</span>
                  </router-link>
                  
                  <router-link to="/assessments/templates" class="flex items-center px-4 py-2.5 text-sm text-gray-500 hover:text-[#6366f1] hover:bg-[#f5f7ff] rounded-xl relative z-10 transition-colors mx-2 font-medium" active-class="!text-[#6366f1] bg-[#f5f7ff]">
                    <span v-if="isSidebarOpen" class="absolute left-[-23px] top-1/2 -translate-y-1/2 w-[15px] h-px bg-gray-200"></span>
                    <span :class="isSidebarOpen ? 'ml-6' : 'ml-1'">Templates</span>
                  </router-link>
                  
                  <router-link to="/assessments/create/bulk" class="flex items-center px-4 py-2.5 text-sm text-gray-500 hover:text-[#6366f1] hover:bg-[#f5f7ff] rounded-xl relative z-10 transition-colors mx-2 font-medium" active-class="!text-[#6366f1] bg-[#f5f7ff]">
                    <span v-if="isSidebarOpen" class="absolute left-[-23px] top-1/2 -translate-y-1/2 w-[15px] h-px bg-gray-200"></span>
                    <span :class="isSidebarOpen ? 'ml-6' : 'ml-1'">Bulk Score</span>
                  </router-link>
                  
                  <router-link to="/reports" class="flex items-center px-4 py-2.5 text-sm text-gray-500 hover:text-[#6366f1] hover:bg-[#f5f7ff] rounded-xl relative z-10 transition-colors mx-2 font-medium" active-class="!text-[#6366f1] bg-[#f5f7ff]">
                    <span v-if="isSidebarOpen" class="absolute left-[-23px] top-1/2 -translate-y-1/2 w-[15px] h-px bg-gray-200"></span>
                    <span :class="isSidebarOpen ? 'ml-6' : 'ml-1'">Reports</span>
                  </router-link>
                  
                </div>
              </div>
            </div>
          </nav>
        </div>
        
        <!-- SETTINGS SECTION -->
        <div class="mt-auto">
          <nav class="flex flex-col gap-1.5 relative">
             <router-link to="/settings" class="group flex items-center px-3 py-3 rounded-2xl transition-all hover:bg-[#f5f7ff] hover:text-[#6366f1] text-gray-500 font-medium relative" active-class="bg-[#f5f7ff] !text-[#6366f1]">
              <div class="flex items-center justify-center relative w-6 h-6 flex-shrink-0">
                  <svg class="w-5 h-5 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              </div>
              <span v-if="isSidebarOpen" class="ml-3 text-sm whitespace-nowrap">Settings</span>

              <div v-if="!isSidebarOpen" class="absolute left-[72px] bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] font-medium shadow-xl">
                 Settings
                 <div class="absolute w-2 h-2 bg-gray-800 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
              </div>
            </router-link>
          </nav>
        </div>
      </div>

      <!-- User & Collapse Toggle -->
      <div class="mt-4 px-4 py-4 border-t border-gray-100 flex items-center justify-between transition-all" :class="{ 'flex-col gap-4 px-2 pb-6': !isSidebarOpen }">
         
         <div class="flex items-center gap-3 overflow-hidden" v-if="isSidebarOpen">
           <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm flex-shrink-0 relative shadow-sm">
             {{ userInitials }}
             <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
           </div>
           <div class="flex-1 min-w-0">
              <p class="text-[0.85rem] font-bold text-gray-800 truncate">{{ userName }}</p>
              <button @click="logout" class="text-[0.7rem] text-gray-400 truncate hover:text-red-500 transition-colors font-medium text-left p-0 bg-transparent border-none cursor-pointer">Log out</button>
           </div>
         </div>
         
         <!-- Mobile/Collapsed logout -->
         <button v-if="!isSidebarOpen" @click="logout" class="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center flex-shrink-0 relative hover:bg-red-50 hover:text-red-500 transition-colors" title="Log out">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
         </button>

         <button @click="toggleSidebar" class="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all max-md:hidden mt-auto">
            <svg class="w-5 h-5 transition-transform duration-300" :class="{ 'rotate-180': !isSidebarOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
         </button>
      </div>
    </div>

    <!-- Mobile Overlay -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="md:hidden fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30"></div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative hide-scrollbar">
      
      <!-- Taller, Elegant Glassmorphism Header -->
      <header class="h-[110px] sm:h-[125px] px-6 sm:px-10 flex justify-between items-center w-full sticky top-0 z-20 transition-all duration-300 backdrop-blur-xl bg-white/40 border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] supports-[backdrop-filter]:bg-white/40">
        <div class="flex items-center gap-5">
           <!-- Mobile Hamburger -->
           <button class="md:hidden p-2.5 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-white/50 rounded-xl transition-all shadow-sm" @click="toggleSidebar">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
           </button>
           
           <div class="flex flex-col justify-center">
             <h1 class="text-[1.5rem] sm:text-[1.85rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 tracking-tight m-0 leading-tight drop-shadow-sm">{{ pageTitle }}</h1>
             <p class="text-gray-500/80 text-xs sm:text-sm m-0 mt-1 max-md:hidden font-medium tracking-wide">Manage your daily tasks and reports</p>
           </div>
        </div>
        
        <div class="flex items-center gap-4 sm:gap-6">
          <!-- Notification Bell -->
          <div class="relative cursor-pointer bg-white/60 backdrop-blur-md border border-white/80 p-3 sm:p-3.5 rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(99,102,241,0.08)] hover:bg-white/80 transition-all duration-300 text-gray-500 hover:text-indigo-600 group" @click="toggleNotifications">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span v-if="unreadCount > 0" class="absolute -top-1.5 -right-1.5 bg-gradient-to-tr from-red-500 to-pink-500 text-white text-[10px] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold border-2 border-white shadow-md transition-transform scale-100">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
            
            <!-- Notification Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-6 w-72 sm:w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-white/80 z-50 transform origin-top-right transition-all duration-300">
              <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30 rounded-t-2xl">
                <h3 class="font-bold text-sm m-0 text-gray-800 tracking-wide">Notifications</h3>
                <button v-if="unreadCount > 0" @click.stop="markAllAsRead" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-transparent border-none cursor-pointer p-0 transition-colors">Mark all read</button>
              </div>
              <div class="max-h-[350px] overflow-y-auto w-full rounded-b-2xl hide-scrollbar">
                <div v-if="notifications.length === 0" class="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                  <svg class="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  No new notifications
                </div>
                <div v-for="notif in notifications" :key="notif.id" 
                     @click.stop="markAsRead(notif)"
                     class="p-4 border-b border-gray-50/50 last:border-b-0 hover:bg-white/60 cursor-pointer transition-all duration-200"
                     :class="{'bg-indigo-50/30': !notif.read_at}">
                  <div class="flex items-start gap-4">
                    <div class="mt-1">
                      <span v-if="!notif.read_at" class="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                      <span v-else class="text-green-400 text-xs">✓</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-bold m-0 text-gray-800 leading-tight" :class="{'text-gray-500 font-medium': notif.read_at}">
                        {{ notif.data.title || 'System Notification' }}
                      </p>
                      <p class="text-xs text-gray-500 mt-1 mb-1.5 line-clamp-2 leading-relaxed">
                        {{ notif.data.message || 'You have a new message.' }}
                      </p>
                      <span class="text-[0.65rem] text-gray-400 font-semibold tracking-wider uppercase">
                         {{ new Date(notif.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content Slot -->
      <main class="w-full px-6 sm:px-8 pb-8 pt-6 sm:pt-8 w-full max-w-7xl mx-auto">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const userName = ref('Admin');

const isSidebarOpen = ref(true);
const isEmployeeMenuOpen = ref(true);

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
};

const toggleEmployeeMenu = () => {
    if (!isSidebarOpen.value) {
        // Automatically open the sidebar and show submenu
        isSidebarOpen.value = true;
        isEmployeeMenuOpen.value = true;
    } else {
        isEmployeeMenuOpen.value = !isEmployeeMenuOpen.value;
    }
};

const isEmployeeActive = computed(() => {
    const parentRoutes = [
        '/assessments/create/single', 
        '/assessments/templates', 
        '/assessments/create/bulk', 
        '/reports'
    ];
    return parentRoutes.includes(route.path);
});

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
        if (res.data) {
           notifications.value = res.data.notifications || [];
           unreadCount.value = res.data.unread_count || 0;
        }
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

// Close dropdown when clicking outside
// Auto Logout on Inactivity logic
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let inactivityTimer = null;

const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        logout();
    }, INACTIVITY_TIMEOUT);
};

const setupActivityListeners = () => {
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    resetInactivityTimer();
};

const removeActivityListeners = () => {
    window.removeEventListener('mousemove', resetInactivityTimer);
    window.removeEventListener('keypress', resetInactivityTimer);
    window.removeEventListener('click', resetInactivityTimer);
    window.removeEventListener('scroll', resetInactivityTimer);
    clearTimeout(inactivityTimer);
};

onMounted(() => {
    fetchUserData();
    fetchNotifications();
    setupActivityListeners();
    
    // Check initial window width to auto-collapse on smaller screens
    if (window.innerWidth < 1024) {
        isSidebarOpen.value = false;
    }

    window.addEventListener('click', (e) => {
       if (!e.target.closest('.relative.cursor-pointer')) {
           showNotifications.value = false;
       }
    });
});

onUnmounted(() => {
    removeActivityListeners();
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
