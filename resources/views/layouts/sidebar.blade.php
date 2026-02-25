<!-- Mobile Sidebar Overlay -->
<div v-if="sidebarOpen" 
     @click="toggleSidebar"
     class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
</div>

<!-- Sidebar -->
<aside :class="{'translate-x-0': sidebarOpen, '-translate-x-full': !sidebarOpen}"
       class="fixed left-0 top-0 h-full w-64 bg-slate-800 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col">
    
    <!-- Logo -->
    <div class="h-16 flex items-center px-6 bg-slate-900 border-b border-slate-700">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-voliko-500 rounded-lg flex items-center justify-center">
                <i class="fas fa-chart-line text-white text-lg"></i>
            </div>
            <div>
                <h1 class="font-bold text-lg tracking-tight">Voliko</h1>
                <p class="text-xs text-slate-400">Assessment</p>
            </div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-1 px-3">
            <!-- Dashboard -->
            <li>
                <a href="{{ route('dashboard') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('dashboard') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-home w-5"></i>
                    <span>Dashboard</span>
                </a>
            </li>

            <!-- Employees -->
            <li>
                <a href="{{ route('employees.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('employees.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-users w-5"></i>
                    <span>Karyawan</span>
                </a>
            </li>

            <!-- Assessments -->
            <li>
                <a href="{{ route('assessments.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('assessments.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-clipboard-check w-5"></i>
                    <span>Penilaian</span>
                </a>
            </li>

            <!-- Reports -->
            <li>
                <a href="{{ route('reports.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('reports.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-file-alt w-5"></i>
                    <span>Laporan</span>
                </a>
            </li>

            <!-- Import/Export -->
            <li>
                <a href="{{ route('import-export.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('import-export.*') || request()->routeIs('import.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-exchange-alt w-5"></i>
                    <span>Import/Export</span>
                </a>
            </li>

            <!-- History -->
            <li>
                <a href="{{ route('history.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('history.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-history w-5"></i>
                    <span>Riwayat</span>
                </a>
            </li>

            @hasrole('Admin|Owner')
            <!-- User Management -->
            <li>
                <a href="{{ route('users.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('users.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-user-cog w-5"></i>
                    <span>Manajemen User</span>
                </a>
            </li>
            @endhasrole

            <!-- Settings -->
            <li>
                <a href="{{ route('settings.index') }}" 
                   class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {{ request()->routeIs('settings.*') ? 'bg-voliko-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                    <i class="fas fa-cog w-5"></i>
                    <span>Pengaturan</span>
                </a>
            </li>
        </ul>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-slate-700">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-voliko-500 flex items-center justify-center">
                <span class="font-semibold text-sm">{{ substr(Auth::user()->name ?? 'U', 0, 1) }}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ Auth::user()->name ?? 'User' }}</p>
                <p class="text-xs text-slate-400 truncate">{{ Auth::user()->email ?? '' }}</p>
            </div>
        </div>
    </div>
</aside>

<!-- Mobile Menu Button -->
<button @click="toggleSidebar" 
        class="fixed top-4 left-4 z-30 lg:hidden bg-voliko-600 text-white p-2 rounded-lg shadow-lg">
    <i class="fas fa-bars"></i>
</button>
