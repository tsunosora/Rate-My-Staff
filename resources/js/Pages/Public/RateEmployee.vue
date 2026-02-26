<template>
  <div class="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e2e8f0] flex items-center justify-center p-4 font-sans relative overflow-hidden">
    <!-- Abstract decorative background shapes -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
    <div class="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

    <!-- Main Glassmorphism Card -->
    <div class="w-full max-w-md bg-white/60 backdrop-blur-xl rounded-[32px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/80 p-8 sm:p-10 relative z-10 transition-all">
      
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-10">
        <svg class="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500 font-medium">Loading employee data...</p>
      </div>

      <div v-else-if="error" class="text-center py-10">
        <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
        <p class="text-gray-500">{{ error }}</p>
      </div>

      <div v-else-if="isSuccess" class="text-center py-8">
        <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
          <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Thank You!</h2>
        <p class="text-gray-500 leading-relaxed max-w-xs mx-auto">Your feedback for <span class="font-bold text-gray-700">{{ employee.full_name }}</span> has been submitted successfully.</p>
        <button @click="resetForm" class="mt-8 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors">Submit Another Feedback</button>
      </div>

      <div v-else>
        <!-- Header Branding -->
        <div class="text-center mb-8 flex flex-col items-center">
            <div class="text-indigo-500 flex items-center justify-center gap-2 mb-2">
              <span class="text-3xl">⭐</span>
              <span class="font-bold text-xl tracking-tighter">Rate<span class="text-gray-800 font-black">MyStaff</span></span>
            </div>
            <p class="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-1">Guest Feedback</p>
        </div>

        <!-- Employee Profile Card -->
        <div class="bg-white/80 rounded-2xl p-4 mb-8 flex items-center gap-4 border border-gray-100 shadow-sm">
            <img :src="employee.photo_url" alt="Employee Photo" class="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm">
            <div>
                <h3 class="font-bold text-gray-800 text-lg leading-tight">{{ employee.full_name }}</h3>
                <p class="text-sm text-indigo-500 font-medium">{{ employee.position }}</p>
            </div>
        </div>

        <form @submit.prevent="submitRating" class="space-y-6">
            
            <!-- Star Rating (1-5) -->
            <div class="flex flex-col items-center">
                <label class="block text-sm font-bold text-gray-700 mb-3">How was your experience?</label>
                <div class="flex gap-2">
                    <button 
                        v-for="star in 5" 
                        :key="star"
                        type="button"
                        @click="form.rating = star"
                        @mouseover="hoverRating = star"
                        @mouseleave="hoverRating = 0"
                        class="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                        :class="[(hoverRating || form.rating) >= star ? 'bg-amber-100 text-amber-500 scale-110 shadow-sm' : 'bg-gray-100 text-gray-300 hover:bg-gray-200']"
                    >
                        <svg class="w-7 h-7" :fill="(hoverRating || form.rating) >= star ? 'currentColor' : 'none'" viewBox="0 0 24 24" :stroke="(hoverRating || form.rating) >= star ? 'currentColor' : 'currentColor'">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                </div>
                <div class="h-6 mt-2 text-center text-sm font-medium transition-colors" :class="ratingColor">
                    {{ ratingText }}
                </div>
            </div>

            <!-- Rater Name Input -->
            <div>
                <label for="rater_name" class="block text-sm font-bold text-gray-700 mb-1.5">Your Name (Optional)</label>
                <input 
                    type="text" 
                    id="rater_name" 
                    v-model="form.rater_name"
                    placeholder="Guest / Visitor"
                    class="w-full bg-white/70 border border-gray-200 px-4 py-3 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                >
            </div>

            <!-- Feedback Textarea -->
            <div>
                <label for="feedback" class="block text-sm font-bold text-gray-700 mb-1.5">Feedback & Suggestions</label>
                <textarea 
                    id="feedback" 
                    v-model="form.feedback"
                    rows="3"
                    placeholder="Tell us what you liked or how we can improve..."
                    class="w-full bg-white/70 border border-gray-200 px-4 py-3 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium resize-none"
                    maxlength="1000"
                ></textarea>
                <div class="text-right mt-1 text-xs text-gray-400 font-medium">{{ form.feedback.length }}/1000</div>
            </div>

            <!-- Submit Button -->
            <button 
                type="submit" 
                :disabled="isSubmitting || form.rating === 0"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
            >
                <span v-if="isSubmitting">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </span>
                <span v-else>Submit Application</span>
                <svg v-if="!isSubmitting" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const token = route.params.token;

const employee = ref(null);
const isLoading = ref(true);
const error = ref('');
const isSubmitting = ref(false);
const isSuccess = ref(false);
const hoverRating = ref(0);

const form = reactive({
    rater_name: 'Guest',
    rating: 0,
    feedback: ''
});

const ratingText = computed(() => {
    const val = hoverRating.value || form.rating;
    switch(val) {
        case 1: return 'Very Poor';
        case 2: return 'Poor';
        case 3: return 'Average';
        case 4: return 'Good';
        case 5: return 'Excellent';
        default: return 'Select rating';
    }
});

const ratingColor = computed(() => {
    const val = hoverRating.value || form.rating;
    if (val === 0) return 'text-gray-400';
    if (val <= 2) return 'text-red-500';
    if (val === 3) return 'text-yellow-600';
    return 'text-green-500';
});

onMounted(async () => {
    // Check if user already submitted within the last hour for this specific employee
    const lastSubmitted = localStorage.getItem(`rate_my_staff_submitted_${token}`);
    if (lastSubmitted) {
        const timePassed = Date.now() - parseInt(lastSubmitted);
        if (timePassed < 60 * 60 * 1000) { // 1 hour in ms
            error.value = 'Hooray! You’ve already rated this employee recently. Please try again later.';
            isLoading.value = false;
            return;
        } else {
            // Expired, clear it
            localStorage.removeItem(`rate_my_staff_submitted_${token}`);
        }
    }

    try {
        const res = await axios.get(`/api/public/employee/${token}`);
        employee.value = res.data;
        document.title = `Rate ${employee.value.full_name} - Rate My Staff`;
    } catch (e) {
        error.value = e.response?.data?.message || 'Unable to load employee information. The link might be invalid or expired.';
    } finally {
        isLoading.value = false;
    }
});

const submitRating = async () => {
    if (form.rating === 0) return;
    
    // Double check local storage right before submit
    const lastSubmitted = localStorage.getItem(`rate_my_staff_submitted_${token}`);
    if (lastSubmitted && (Date.now() - parseInt(lastSubmitted) < 60 * 60 * 1000)) {
        alert("You have already submitted a rating recently. Please try again in an hour.");
        return;
    }

    isSubmitting.value = true;
    error.value = '';
    
    try {
        await axios.post(`/api/public/employee/${token}/rate`, form);
        isSuccess.value = true;
        // Save to local storage to prevent immediate spam
        localStorage.setItem(`rate_my_staff_submitted_${token}`, Date.now().toString());
    } catch (e) {
        console.error("Submission failed", e);
        if (e.response?.status === 429) {
             error.value = 'Too many attempts. Please try again in an hour.';
             alert(error.value);
        } else {
             error.value = 'An error occurred while submitting your feedback. Please try again.';
             alert(error.value);
        }
    } finally {
        isSubmitting.value = false;
    }
};

const resetForm = () => {
    // If we want to strictly prevent them from bypassing the UI block, 
    // we can either hide the "Submit Another" button or just let the reset happen 
    // but the next submit will be caught by the 429 server error / local storage check.
    
    // Just to be user-friendly, if they click submit another, we'll reload and let the onMounted handle the block screen
    window.location.reload();
};
</script>

<style scoped>
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob {
  animation: blob 7s infinite alternate;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
