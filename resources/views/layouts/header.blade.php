<header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
    <!-- Left side - Page Title -->
    <div class="flex items-center gap-4">
        <h2 class="text-xl font-semibold text-gray-800">
            @yield('page-title', 'Dashboard')
        </h2>
    </div>

    <!-- Right side - Actions -->
    <div class="flex items-center gap-4">
        <!-- Notifications -->
        <button class="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <i class="fas fa-bell text-lg"></i>
            <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <!-- User Dropdown -->
        <div class="relative user-dropdown">
            <button @click="toggleUserDropdown" 
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="w-8 h-8 rounded-full bg-voliko-500 flex items-center justify-center">
                    <span class="text-white font-medium text-sm">{{ substr(Auth::user()->name ?? 'U', 0, 1) }}</span>
                </div>
                <span class="hidden sm:block text-sm font-medium text-gray-700">{{ Auth::user()->name ?? 'User' }}</span>
                <i class="fas fa-chevron-down text-xs text-gray-400"></i>
            </button>

            <!-- Dropdown Menu -->
            <div v-show="userDropdownOpen" 
                 v-cloak
                 class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <a href="{{ route('settings.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-user mr-2"></i> Profil
                </a>
                <a href="{{ route('settings.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-cog mr-2"></i> Pengaturan
                </a>
                <hr class="my-2 border-gray-200">
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <i class="fas fa-sign-out-alt mr-2"></i> Keluar
                    </button>
                </form>
            </div>
        </div>
    </div>
</header>
