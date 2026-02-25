@extends('layouts.app')

@section('title', 'Daftar Karyawan')
@section('page-title', 'Daftar Karyawan')

@section('content')
<div id="employees-app" v-cloak>
    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <!-- Search -->
            <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-search text-gray-400"></i>
                </div>
                <input 
                    v-model="searchQuery"
                    @input="debouncedSearch"
                    type="text" 
                    placeholder="Cari karyawan..."
                    class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent w-full sm:w-64">
            </div>
            
            <!-- Department Filter -->
            <select 
                v-model="selectedDepartment"
                @change="filterEmployees"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                <option value="">Semua Departemen</option>
                <option v-for="dept in departments" :key="dept" :value="dept">@{{ dept }}</option>
            </select>
        </div>

        <a href="{{ route('employees.create') }}" 
           class="inline-flex items-center px-4 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors">
            <i class="fas fa-plus mr-2"></i>
            Tambah Karyawan
        </a>
    </div>

    <!-- Mobile Cards View -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-6">
        <div v-for="employee in paginatedEmployees" :key="employee.id" 
             class="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div class="flex items-start gap-4">
                <img :src="employee.photo_url" :alt="employee.full_name" 
                     class="w-16 h-16 rounded-full object-cover">
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 truncate">@{{ employee.full_name }}</h3>
                    <p class="text-sm text-gray-500">@{{ employee.employee_code }}</p>
                    <p class="text-sm text-gray-600">@{{ employee.position }}</p>
                    <span class="inline-block mt-2 px-2 py-1 bg-voliko-100 text-voliko-700 text-xs rounded-full">
                        @{{ employee.department }}
                    </span>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                <a :href="`/employees/${employee.id}`" 
                   class="p-2 text-voliko-600 hover:bg-voliko-50 rounded-lg transition-colors"
                   title="Detail">
                    <i class="fas fa-eye"></i>
                </a>
                <a :href="`/employees/${employee.id}/edit`" 
                   class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                   title="Edit">
                    <i class="fas fa-edit"></i>
                </a>
                <button @click="confirmDelete(employee)" 
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Desktop Table View -->
    <div class="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karyawan</th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departemen</th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi</th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bergabung</th>
                    <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                <tr v-for="employee in paginatedEmployees" :key="employee.id" class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            <img :src="employee.photo_url" :alt="employee.full_name" 
                                 class="w-10 h-10 rounded-full object-cover mr-4">
                            <div>
                                <div class="font-medium text-gray-900">@{{ employee.full_name }}</div>
                                <div class="text-sm text-gray-500">@{{ employee.employee_code }}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-voliko-100 text-voliko-700">
                            @{{ employee.department }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-gray-600">@{{ employee.position }}</td>
                    <td class="px-6 py-4 text-gray-600">@{{ employee.join_date }}</td>
                    <td class="px-6 py-4">
                        <span :class="employee.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                              class="inline-flex px-2 py-1 text-xs font-medium rounded-full">
                            @{{ employee.is_active ? 'Aktif' : 'Nonaktif' }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2">
                            <a :href="`/employees/${employee.id}`" 
                               class="p-2 text-voliko-600 hover:bg-voliko-50 rounded-lg transition-colors"
                               title="Detail">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a :href="`/employees/${employee.id}/edit`" 
                               class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                               title="Edit">
                                <i class="fas fa-edit"></i>
                            </a>
                            <button @click="confirmDelete(employee)" 
                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr v-if="paginatedEmployees.length === 0">
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-search text-4xl mb-4 text-gray-300"></i>
                        <p>Tidak ada karyawan ditemukan</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="text-sm text-gray-500">
            Menampilkan @{{ startIndex + 1 }} - @{{ endIndex }} dari @{{ filteredEmployees.length }} karyawan
        </div>
        <div class="flex items-center gap-2">
            <button 
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="px-4 py-2 text-sm text-gray-700">
                Halaman @{{ currentPage }} dari @{{ totalPages }}
            </span>
            <button 
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div class="text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Konfirmasi Hapus</h3>
                <p class="text-gray-600 mb-6">
                    Apakah Anda yakin ingin menghapus karyawan <strong>@{{ employeeToDelete?.full_name }}</strong>?
                    Tindakan ini tidak dapat dibatalkan.
                </p>
                <div class="flex justify-center gap-3">
                    <button @click="showDeleteModal = false" 
                            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Batal
                    </button>
                    <form :action="`/employees/${employeeToDelete?.id}`" method="POST">
                        @csrf
                        @method('DELETE')
                        <button type="submit" 
                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Hapus
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const searchQuery = ref('');
            const selectedDepartment = ref('');
            const currentPage = ref(1);
            const itemsPerPage = 10;
            const showDeleteModal = ref(false);
            const employeeToDelete = ref(null);

            // Mock data - in real app, this would come from API
            const employees = ref([
                { id: 1, employee_code: 'EMP001', full_name: 'Budi Santoso', department: 'Customer Service', position: 'Customer Service Representative', join_date: '2022-01-15', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0ea5e9&color=fff' },
                { id: 2, employee_code: 'EMP002', full_name: 'Siti Rahayu', department: 'Customer Service', position: 'Senior Customer Service', join_date: '2021-06-20', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Siti+Rahayu&background=0ea5e9&color=fff' },
                { id: 3, employee_code: 'EMP003', full_name: 'Ahmad Wijaya', department: 'Production', position: 'Machine Operator', join_date: '2022-03-10', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Ahmad+Wijaya&background=0ea5e9&color=fff' },
                { id: 4, employee_code: 'EMP004', full_name: 'Dewi Kusuma', department: 'Production', position: 'Senior Operator', join_date: '2020-08-05', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Dewi+Kusuma&background=0ea5e9&color=fff' },
                { id: 5, employee_code: 'EMP005', full_name: 'Rudi Hartono', department: 'Design', position: 'Graphic Designer', join_date: '2021-11-12', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Rudi+Hartono&background=0ea5e9&color=fff' },
                { id: 6, employee_code: 'EMP006', full_name: 'Maya Indah', department: 'Design', position: 'Senior Designer', join_date: '2020-02-28', is_active: true, photo_url: 'https://ui-avatars.com/api/?name=Maya+Indah&background=0ea5e9&color=fff' },
            ]);

            const departments = computed(() => {
                const depts = [...new Set(employees.value.map(e => e.department))];
                return depts.sort();
            });

            const filteredEmployees = computed(() => {
                let result = employees.value;

                if (searchQuery.value) {
                    const query = searchQuery.value.toLowerCase();
                    result = result.filter(e => 
                        e.full_name.toLowerCase().includes(query) ||
                        e.employee_code.toLowerCase().includes(query) ||
                        e.department.toLowerCase().includes(query) ||
                        e.position.toLowerCase().includes(query)
                    );
                }

                if (selectedDepartment.value) {
                    result = result.filter(e => e.department === selectedDepartment.value);
                }

                return result;
            });

            const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / itemsPerPage));

            const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
            const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage, filteredEmployees.value.length));

            const paginatedEmployees = computed(() => {
                return filteredEmployees.value.slice(startIndex.value, endIndex.value);
            });

            let searchTimeout;
            const debouncedSearch = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage.value = 1;
                }, 300);
            };

            const filterEmployees = () => {
                currentPage.value = 1;
            };

            const confirmDelete = (employee) => {
                employeeToDelete.value = employee;
                showDeleteModal.value = true;
            };

            onMounted(async () => {
                // In real app: const response = await axios.get('/api/employees');
                // employees.value = response.data;
            });

            return {
                searchQuery,
                selectedDepartment,
                currentPage,
                departments,
                paginatedEmployees,
                filteredEmployees,
                totalPages,
                startIndex,
                endIndex,
                showDeleteModal,
                employeeToDelete,
                debouncedSearch,
                filterEmployees,
                confirmDelete,
            };
        }
    }).mount('#employees-app');
</script>
@endpush
