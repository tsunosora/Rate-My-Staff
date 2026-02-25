@extends('layouts.app')

@section('title', 'Tambah Karyawan')
@section('page-title', 'Tambah Karyawan')

@section('content')
<div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-xl shadow-sm">
        <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Informasi Karyawan</h3>
            <p class="text-sm text-gray-500 mt-1">Isi data karyawan dengan lengkap</p>
        </div>

        <form action="{{ route('employees.store') }}" method="POST" enctype="multipart/form-data" class="p-6">
            @csrf

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Employee Code -->
                <div>
                    <label for="employee_code" class="block text-sm font-medium text-gray-700 mb-2">
                        Kode Karyawan <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="employee_code" 
                           name="employee_code" 
                           required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('employee_code') border-red-500 @enderror"
                           placeholder="Contoh: EMP001"
                           value="{{ old('employee_code') }}">
                    @error('employee_code')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Full Name -->
                <div>
                    <label for="full_name" class="block text-sm font-medium text-gray-700 mb-2">
                        Nama Lengkap <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="full_name" 
                           name="full_name" 
                           required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('full_name') border-red-500 @enderror"
                           placeholder="Nama lengkap karyawan"
                           value="{{ old('full_name') }}">
                    @error('full_name')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Department -->
                <div>
                    <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
                        Departemen <span class="text-red-500">*</span>
                    </label>
                    <select id="department" 
                            name="department" 
                            required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('department') border-red-500 @enderror">
                        <option value="">Pilih Departemen</option>
                        <option value="Customer Service" {{ old('department') == 'Customer Service' ? 'selected' : '' }}>Customer Service</option>
                        <option value="Production" {{ old('department') == 'Production' ? 'selected' : '' }}>Production</option>
                        <option value="Design" {{ old('department') == 'Design' ? 'selected' : '' }}>Design</option>
                        <option value="HR" {{ old('department') == 'HR' ? 'selected' : '' }}>HR</option>
                        <option value="Finance" {{ old('department') == 'Finance' ? 'selected' : '' }}>Finance</option>
                        <option value="IT" {{ old('department') == 'IT' ? 'selected' : '' }}>IT</option>
                    </select>
                    @error('department')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Position -->
                <div>
                    <label for="position" class="block text-sm font-medium text-gray-700 mb-2">
                        Posisi/Jabatan <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="position" 
                           name="position" 
                           required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('position') border-red-500 @enderror"
                           placeholder="Posisi atau jabatan"
                           value="{{ old('position') }}">
                    @error('position')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <input type="email" 
                           id="email" 
                           name="email"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('email') border-red-500 @enderror"
                           placeholder="email@company.com"
                           value="{{ old('email') }}">
                    @error('email')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Phone -->
                <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
                        Nomor Telepon
                    </label>
                    <input type="tel" 
                           id="phone" 
                           name="phone"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('phone') border-red-500 @enderror"
                           placeholder="081234567890"
                           value="{{ old('phone') }}">
                    @error('phone')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Join Date -->
                <div>
                    <label for="join_date" class="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Bergabung <span class="text-red-500">*</span>
                    </label>
                    <input type="date" 
                           id="join_date" 
                           name="join_date" 
                           required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent @error('join_date') border-red-500 @enderror"
                           value="{{ old('join_date') }}">
                    @error('join_date')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Photo -->
                <div>
                    <label for="photo" class="block text-sm font-medium text-gray-700 mb-2">
                        Foto Karyawan
                    </label>
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden" id="photo-preview">
                            <i class="fas fa-user text-gray-400 text-2xl"></i>
                        </div>
                        <div class="flex-1">
                            <input type="file" 
                                   id="photo" 
                                   name="photo"
                                   accept="image/*"
                                   class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-voliko-50 file:text-voliko-700 hover:file:bg-voliko-100 @error('photo') border-red-500 @enderror"
                                   onchange="previewPhoto(this)">
                            <p class="mt-1 text-xs text-gray-500">Format: JPG, PNG. Maks: 2MB</p>
                        </div>
                    </div>
                    @error('photo')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <a href="{{ route('employees.index') }}" 
                   class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    Batal
                </a>
                <button type="submit" 
                        class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors">
                    <i class="fas fa-save mr-2"></i>
                    Simpan
                </button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
    function previewPhoto(input) {
        const preview = document.getElementById('photo-preview');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }
</script>
@endpush
