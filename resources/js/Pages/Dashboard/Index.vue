<template>
  <AppLayout>
    <div class="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-sm:grid-cols-1">
      
      <!-- Metrics -->
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden border border-gray-50">
        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
          <span class="text-xl">👥</span>
        </div>
        <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Total Employees</h3>
        <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
          <span v-if="loading" class="text-gray-300 animate-pulse">...</span>
          <span v-else>{{ metrics.total_employees }}</span>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden border border-gray-50">
        <div class="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
          <span class="text-xl">⏳</span>
        </div>
        <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Pending Reviews</h3>
        <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
          <span v-if="loading" class="text-gray-300 animate-pulse">...</span>
          <span v-else>{{ metrics.pending_reviews }}</span>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden border border-gray-50">
        <div class="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-3">
          <span class="text-xl">📈</span>
        </div>
        <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Avg. Team Score</h3>
        <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
          <span v-if="loading" class="text-gray-300 animate-pulse">...</span>
          <span v-else>{{ metrics.avg_score }}</span>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden border border-gray-50">
        <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
          <span class="text-xl">🔔</span>
        </div>
        <h3 class="m-0 text-xs text-gray-400 uppercase font-bold tracking-wide">Notifications</h3>
        <div class="text-[2rem] font-extrabold mt-1 text-gray-800">
          <span v-if="loading" class="text-gray-300 animate-pulse">...</span>
          <span v-else>{{ metrics.notifications }}</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="col-span-4 max-md:col-span-2 max-sm:col-span-1 bg-white p-6 rounded-3xl flex gap-4 flex-wrap shadow-[0_8px_30px_rgb(0,0,0,0.04)] items-center border border-gray-50">
        <strong class="mr-2 text-gray-700 w-full md:w-auto mb-2 md:mb-0">Quick Actions:</strong>
        <router-link to="/assessments/create/single" class="px-5 py-2.5 rounded-xl text-white font-medium inline-flex items-center justify-center bg-[#3b82f6] hover:bg-blue-600 transition-colors shadow-sm decoration-none text-sm grow md:grow-0 text-center">+ New Assessment</router-link>
        <router-link to="/assessments/create/bulk" class="px-5 py-2.5 rounded-xl text-white font-medium inline-flex items-center justify-center bg-[#10b981] hover:bg-emerald-600 transition-colors shadow-sm decoration-none text-sm grow md:grow-0 text-center">Bulk Entry</router-link>
        <router-link to="/reports" class="px-5 py-2.5 rounded-xl text-white font-medium inline-flex items-center justify-center bg-[#f59e0b] hover:bg-amber-600 transition-colors shadow-sm decoration-none text-sm grow md:grow-0 text-center">Export PDF/Excel</router-link>
        <router-link to="/employees" class="px-5 py-2.5 rounded-xl text-white font-medium inline-flex items-center justify-center bg-[#8b5cf6] hover:bg-violet-600 transition-colors shadow-sm decoration-none text-sm grow md:grow-0 text-center">Manage Staff</router-link>
      </div>

      <!-- Main Content Rows -->
      <div class="col-span-4 max-md:col-span-2 max-sm:col-span-1 grid grid-cols-[2fr_1fr] gap-6 max-md:grid-cols-1">
        
        <!-- Performance Trend & Recent Activity -->
        <div class="flex flex-col gap-6">
            <!-- Performance Trend Chart -->
            <div class="bg-white p-6 justify-between rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex flex-col">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-5 max-sm:flex-col max-sm:items-start max-sm:gap-3">
                    <h2 class="mt-0 text-[1.1rem] m-0 font-bold text-gray-800">Team Performance Trend</h2>
                    <div class="flex gap-2">
                        <select v-model="filters.employee_id" @change="fetchDashboardData" class="text-sm border-gray-200 rounded-lg bg-gray-50 py-1.5 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]">
                            <option value="all">All Employees</option>
                            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.full_name }}</option>
                        </select>
                        <select v-model="filters.timeframe" @change="fetchDashboardData" class="text-sm border-gray-200 rounded-lg bg-gray-50 py-1.5 focus:ring-blue-500 focus:border-blue-500">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>
                <div v-if="loading" class="text-gray-400 animate-pulse h-[300px] flex items-center justify-center bg-gray-50 rounded-xl">Loading chart...</div>
                <div v-else class="relative h-[300px] w-full">
                    <Line v-if="chartDataLoaded" :data="chartCanvasData" :options="chartOptions" />
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 h-full">
            <h2 class="mt-0 text-[1.1rem] border-b border-gray-100 pb-3 mb-5 font-bold text-gray-800">Recent Activity</h2>
            <div v-if="loading" class="text-gray-400 animate-pulse">Loading activity...</div>
            <div v-else-if="recentActivity.length === 0" class="text-gray-500 py-4 text-center">No recent activity.</div>
            <ul v-else class="list-none p-0 m-0">
                <li v-for="activity in recentActivity" :key="activity.id" class="py-4 border-b border-gray-50 flex flex-col text-[0.9rem] last:border-b-0">
                  <div class="flex justify-between items-start mb-1 gap-2">
                    <span class="font-bold text-gray-800">{{ activity.user ? activity.user.name : 'System' }}</span>
                    <span class="text-[0.75rem] text-gray-400 font-medium whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md">{{ new Date(activity.created_at).toLocaleDateString() }}</span>
                  </div>
                  <span class="text-gray-500 text-sm">{{ activity.message || `Performed ${activity.action} on ${activity.target_table}` }}</span>
                </li>
            </ul>
            </div>
        </div>

        <!-- System Alerts -->
        <div class="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 h-fit">
          <h2 class="mt-0 text-[1.1rem] border-b border-gray-100 pb-3 mb-4 font-bold text-gray-800">System Alerts</h2>
          
          <div v-if="loading" class="text-gray-400 animate-pulse">Loading alerts...</div>
          <div v-else class="list-none p-0 m-0 flex flex-col gap-3">
            <div v-for="(alert, index) in alerts" :key="index" class="p-4 rounded-2xl text-[0.9rem]" :class="{'bg-red-50 text-red-600': alert.type === 'danger', 'bg-orange-50 text-orange-600': alert.type === 'warning', 'bg-blue-50 text-blue-600': alert.type === 'info'}">
              <span class="font-semibold block mb-1 flex items-center gap-2">
                <span v-if="alert.type === 'danger'">🔴</span>
                <span v-if="alert.type === 'warning'">🟠</span>
                <span v-if="alert.type === 'info'">🔵</span>
                Notice
              </span>
              {{ alert.message }}
            </div>
          </div>
          <div class="mt-6 bg-[#f0f4f8] p-5 rounded-2xl text-[0.85rem] border border-[#e2e8f0]">
            <strong class="font-bold text-blue-600 block mb-1">💡 Assessment Tip:</strong> 
            Focus on 'Respon Waktu' for Customer Service evaluations this week.
          </div>
        </div>

      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout.vue';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const loading = ref(true);
const metrics = ref({ total_employees: 0, pending_reviews: 0, avg_score: 0, notifications: 0 });
const recentActivity = ref([]);
const alerts = ref([]);
const employees = ref([]);

const filters = ref({
    timeframe: 'monthly',
    employee_id: 'all'
});

// Chart configuration
const chartDataLoaded = ref(false);
const chartCanvasData = ref({
  labels: [],
  datasets: []
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false,
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 5 // Assuming max score is 5 based on early average (2.7)
    }
  }
});

const fetchDashboardData = async () => {
  try {
    const response = await axios.get('/api/dashboard', { params: filters.value });
    
    // Only set metrics/activity on first load to prevent flickering on filter change
    if (loading.value) {
        metrics.value = response.data.metrics;
        recentActivity.value = response.data.recent_activity;
        alerts.value = response.data.alerts;
    }

    if (response.data.employees && employees.value.length === 0) {
        employees.value = response.data.employees;
    }

    // Load Chart Data
    if (response.data.chart_data) {
        chartDataLoaded.value = false; // Trigger re-render of chart component
        
        // small timeout to allow Vue to destroy the old chart before rendering a new one based on new Data
        setTimeout(() => {
            chartCanvasData.value = {
                labels: response.data.chart_data.labels,
                datasets: [
                    {
                        label: filters.value.employee_id === 'all' ? 'Average Team Score' : 'Employee Score',
                        backgroundColor: '#3498db',
                        borderColor: '#3498db',
                        data: response.data.chart_data.data,
                        tension: 0.3, // Add smooth curves
                        fill: false,
                    }
                ]
            };
            chartDataLoaded.value = true;
        }, 50);
    }

  } catch (error) {
    if (error.response && error.response.status === 401) {
      window.location.href = '/login';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
    fetchDashboardData();
});
</script>
