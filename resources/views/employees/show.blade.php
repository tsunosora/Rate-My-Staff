@extends('layouts.app')

@section('title', 'Detail Karyawan')
@section('page-title', 'Detail Karyawan')

@section('content')
<div id="employee-detail-app" v-cloak>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Employee Info -->
        <div class="lg:col-span-1">
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-br from-voliko-500 to-voliko-600 p-6 text-center">
                    <div class="w-32 h-32 mx-auto rounded-full border-4 border-white overflow-hidden bg-white">
                        @if($employee->photo_path)
                            <img src="{{ asset('storage/' . $employee->photo_path) }}" alt="{{ $employee->full_name }}" class="w-full h-full object-cover">
                        @else
                            <img src="https://ui-avatars.com/api/?name={{ urlencode($employee->full_name) }}&background=0ea5e9&color=fff&size=128" alt="{{ $employee->full_name }}" class="w-full h-full object-cover">
                        @endif
                    </div>
                    <h2 class="mt-4 text-xl font-bold text-white">{{ $employee->full_name }}</h2>
                    <p class="text-voliko-100">{{ $employee->position }}</p>
                </div>
                
                <div class="p-6">
                    <div class="space-y-4">
                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-id-card text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Kode Karyawan</p>
                                <p class="font-medium text-gray-900">{{ $employee->employee_code }}</p>
                            </div>
                        </div>

                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-building text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Departemen</p>
                                <p class="font-medium text-gray-900">{{ $employee->department }}</p>
                            </div>
                        </div>

                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-envelope text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Email</p>
                                <p class="font-medium text-gray-900">{{ $employee->email ?? '-' }}</p>
                            </div>
                        </div>

                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-phone text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Telepon</p>
                                <p class="font-medium text-gray-900">{{ $employee->phone ?? '-' }}</p>
                            </div>
                        </div>

                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-calendar-alt text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Bergabung Sejak</p>
                                <p class="font-medium text-gray-900">{{ $employee->join_date?->format('d F Y') ?? '-' }}</p>
                            </div>
                        </div>

                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                                <i class="fas fa-circle text-gray-500"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Status</p>
                                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {{ $employee->is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }}">
                                    {{ $employee->is_active ? 'Aktif' : 'Nonaktif' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                        <a href="{{ route('employees.edit', $employee) }}" 
                           class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                            <i class="fas fa-edit mr-2"></i> Edit
                        </a>
                        <a href="{{ route('assessments.create-single', ['employee_id' => $employee->id]) }}" 
                           class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors">
                            <i class="fas fa-clipboard-check mr-2"></i> Nilai
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column - Assessment History -->
        <div class="lg:col-span-2">
            <!-- Performance Chart -->
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Riwayat Performa</h3>
                <div class="h-64">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>

            <!-- Assessment History Table -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Riwayat Penilaian</h3>
                    <a href="{{ route('history.employee', $employee) }}" class="text-sm text-voliko-600 hover:text-voliko-700">
                        Lihat Detail <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluator</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            @forelse($employee->assessments()->with('template', 'evaluator')->latest()->take(5)->get() as $assessment)
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 text-gray-900">{{ $assessment->assessment_date->format('d M Y') }}</td>
                                    <td class="px-6 py-4 text-gray-600">{{ $assessment->template->name }}</td>
                                    <td class="px-6 py-4 text-gray-600">{{ $assessment->evaluator->name }}</td>
                                    <td class="px-6 py-4 font-semibold text-gray-900">{{ number_format($assessment->total_score, 2) }}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium
                                            @switch($assessment->grade)
                                                @case('Sangat Baik') bg-green-100 text-green-700 @break
                                                @case('Baik') bg-blue-100 text-blue-700 @break
                                                @case('Cukup') bg-yellow-100 text-yellow-700 @break
                                                @case('Kurang') bg-orange-100 text-orange-700 @break
                                                @default bg-red-100 text-red-700
                                            @endswitch">
                                            {{ $assessment->grade }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <a href="{{ route('assessments.show', $assessment) }}" 
                                           class="text-voliko-600 hover:text-voliko-700">
                                            <i class="fas fa-eye"></i>
                                        </a>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                                        <i class="fas fa-clipboard-list text-4xl mb-4 text-gray-300"></i>
                                        <p>Belum ada penilaian</p>
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-voliko-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-clipboard-check text-voliko-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Total Penilaian</p>
                            <p class="text-2xl font-bold text-gray-900">{{ $employee->assessments()->count() }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-star text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Rata-rata Nilai</p>
                            <p class="text-2xl font-bold text-gray-900">{{ number_format($employee->assessments()->avg('total_score') ?? 0, 2) }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-trophy text-purple-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Nilai Tertinggi</p>
                            <p class="text-2xl font-bold text-gray-900">{{ number_format($employee->assessments()->max('total_score') ?? 0, 2) }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        // Sample data - in real app, fetch from API
        const chartData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
            datasets: [{
                label: 'Nilai Penilaian',
                data: [3.5, 3.75, 4.0, 3.8, 4.2, 4.25],
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0ea5e9',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    });
</script>
@endpush
