<template>
  <div class="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 font-sans">
    <div class="bg-white p-10 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] w-full max-w-[400px]">
      
      <div class="text-center mb-8">
        <h1 class="text-[#3498db] text-2xl font-semibold m-0">Rate My Staff</h1>
        <p class="text-[#5f6368] text-sm mt-2">Admin Dashboard Panel</p>
      </div>

      <div v-if="error" class="bg-[#fce8e6] text-[#d93025] p-3 rounded text-[13px] mb-5 border-l-4 border-[#d93025]">
        {{ error }}
      </div>

      <form @submit.prevent="login">
        <div class="mb-5 relative">
          <label for="email" class="block text-[14px] text-[#3c4043] mb-2 font-medium">Username or Email</label>
          <input 
            type="text" 
            id="email" 
            v-model="form.email"
            placeholder="admin@example.com"
            class="w-full p-3 border border-[#dadce0] rounded text-[16px] transition-colors focus:outline-none focus:border-[#3498db] focus:ring-1 focus:ring-[#3498db]"
            required
          >
        </div>

        <div class="mb-5 relative">
          <label for="password" class="block text-[14px] text-[#3c4043] mb-2 font-medium">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password"
            placeholder="••••••••"
            class="w-full p-3 border border-[#dadce0] rounded text-[16px] transition-colors focus:outline-none focus:border-[#3498db] focus:ring-1 focus:ring-[#3498db]"
            required
          >
        </div>

        <div class="text-right mt-2 mb-4">
          <a href="#" class="text-[13px] text-[#3498db] hover:underline">Forgot password?</a>
        </div>

        <button 
          type="submit" 
          :disabled="isLoading"
          class="w-full p-3 bg-[#3498db] text-white border-0 rounded text-[16px] font-medium cursor-pointer transition-colors hover:bg-[#2980b9] disabled:bg-opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="mt-8 text-center text-[12px] text-[#70757a]">
        <p>Don't have an account? <a href="#" class="text-[#3498db] hover:underline">Contact System Administrator</a></p>
        <p class="mt-2">&copy; {{ new Date().getFullYear() }} Rate My Staff Dashboard</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';

const form = reactive({
  email: '',
  password: ''
});

const error = ref('');
const isLoading = ref(false);

const login = async () => {
  error.value = '';
  isLoading.value = true;
  
  try {
    await axios.get('/sanctum/csrf-cookie');
    const response = await axios.post('/login', form);
    
    // Attempt redirect on success
    window.location.href = '/dashboard';
    
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      error.value = err.response.data.message;
    } else {
      error.value = 'Invalid username or password. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>
