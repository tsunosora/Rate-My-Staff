<template>
  <AppLayout>
    <div class="p-[25px] grid grid-cols-4 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
      
      <!-- Metrics -->
      <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-l-4 border-l-[#3498db]">
        <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Total Employees</h3>
        <div class="text-[1.8rem] font-bold mt-2.5">
          <span v-if="loading" class="text-gray-300">...</span>
          <span v-else>{{ metrics.total_employees }}</span>
        </div>
      </div>
      
      <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-l-4 border-l-[#f1c40f]">
        <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Pending Reviews</h3>
        <div class="text-[1.8rem] font-bold mt-2.5">
          <span v-if="loading" class="text-gray-300">...</span>
          <span v-else>{{ metrics.pending_reviews }}</span>
        </div>
      </div>
      
      <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-l-4 border-l-[#2ecc71]">
        <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Avg. Team Score</h3>
        <div class="text-[1.8rem] font-bold mt-2.5">
          <span v-if="loading" class="text-gray-300">...</span>
          <span v-else>{{ metrics.avg_score }}</span>
        </div>
      </div>
      
      <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-l-4 border-l-[#e74c3c]">
        <h3 class="m-0 text-[0.85rem] text-[#7f8c8d] uppercase">Notifications</h3>
        <div class="text-[1.8rem] font-bold mt-2.5">
          <span v-if="loading" class="text-gray-300">...</span>
          <span v-else>{{ metrics.notifications }}</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="col-span-4 bg-white p-5 rounded-lg flex gap-[15px] flex-wrap shadow-[0_2px_10px_rgba(0,0,0,0.05)] items-center">
        <strong class="mr-2">Quick Actions:</strong>
        <router-link to="/assessments/create/single" class="px-5 py-2.5 rounded text-white font-medium inline-flex items-center justify-center bg-[#3498db] hover:bg-[#2980b9] transition-colors decoration-none">+ New Assessment</router-link>
        <router-link to="/assessments/create/bulk" class="px-5 py-2.5 rounded text-white font-medium inline-flex items-center justify-center bg-[#27ae60] hover:bg-[#219653] transition-colors decoration-none">Bulk Entry</router-link>
        <router-link to="/reports" class="px-5 py-2.5 rounded text-white font-medium inline-flex items-center justify-center bg-[#f39c12] hover:bg-[#d68910] transition-colors decoration-none">Export PDF/Excel</router-link>
        <router-link to="/employees" class="px-5 py-2.5 rounded text-white font-medium inline-flex items-center justify-center bg-[#9b59b6] hover:bg-[#8e44ad] transition-colors decoration-none">Import Data</router-link>
      </div>

      <!-- Main Content Rows -->
      <div class="col-span-4 grid grid-cols-[2fr_1fr] gap-5 max-md:grid-cols-1">
        
        <!-- Performance Trend & Recent Activity -->
        <div class="flex flex-col gap-5">
            <!-- Performance Trend Chart -->
            <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                <h2 class="mt-0 text-[1.1rem] border-b border-[#eee] pb-2.5 mb-4 font-semibold">Team Performance Trend</h2>
                <div v-if="loading" class="text-gray-400">Loading chart...</div>
                <div v-else class="relative h-[300px] w-full">
                    <Line v-if="chartDataLoaded" :data="chartCanvasData" :options="chartOptions" />
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] h-full">
            <h2 class="mt-0 text-[1.1rem] border-b border-[#eee] pb-2.5 mb-4 font-semibold">Recent Activity</h2>
            <div v-if="loading" class="text-gray-400">Loading activity...</div>
            <div v-else-if="recentActivity.length === 0" class="text-gray-500">No recent activity.</div>
            <ul v-else class="list-none p-0 m-0">
                <li v-for="activity in recentActivity" :key="activity.id" class="py-3 border-b border-[#f9f9f9] flex flex-col text-[0.9rem] last:border-b-0">
                  <div class="flex justify-between items-start mb-1">
                    <span class="font-medium text-[#2c3e50]">{{ activity.user ? activity.user.name : 'System' }}</span>
                    <span class="text-[0.8rem] text-[#95a5a6] font-medium">{{ new Date(activity.created_at).toLocaleDateString() }} {{ new Date(activity.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                  </div>
                  <span class="text-[#555]">{{ activity.message || `Performed ${activity.action} on ${activity.target_table}` }}</span>
                </li>
            </ul>
            </div>
        </div>

        <!-- System Alerts -->
        <div class="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] h-fit">
          <h2 class="mt-0 text-[1.1rem] border-b border-[#eee] pb-2.5 mb-4 font-semibold">System Alerts</h2>
          
          <div v-if="loading" class="text-gray-400">Loading alerts...</div>
          <div v-else class="list-none p-0 m-0">
            <div v-for="(alert, index) in alerts" :key="index" class="py-3 text-[0.9rem]">
              <span :class="{'text-[#e74c3c]': alert.type === 'danger', 'text-[#f39c12]': alert.type === 'warning', 'text-[#3498db]': alert.type === 'info'}">● {{ alert.message }}</span>
            </div>
          </div>
          <div class="mt-5 bg-[#f9f9f9] p-4 rounded text-[0.85rem] border border-[#eee]">
            <strong class="font-semibold">Assessment Tip:</strong> Focus on 'Respon Waktu' for Customer Service evaluations this week.
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

onMounted(async () => {
  try {
    const response = await axios.get('/api/dashboard');
    metrics.value = response.data.metrics;
    recentActivity.value = response.data.recent_activity;
    alerts.value = response.data.alerts;

    // Load Chart Data
    if (response.data.chart_data) {
        chartCanvasData.value = {
            labels: response.data.chart_data.labels,
            datasets: [
                {
                    label: 'Average Team Score',
                    backgroundColor: '#3498db',
                    borderColor: '#3498db',
                    data: response.data.chart_data.data,
                    tension: 0.3, // Add smooth curves
                    fill: false,
                }
            ]
        };
        chartDataLoaded.value = true;
    }

  } catch (error) {
    if (error.response && error.response.status === 401) {
      window.location.href = '/login';
    }
  } finally {
    loading.value = false;
  }
});
</script>
