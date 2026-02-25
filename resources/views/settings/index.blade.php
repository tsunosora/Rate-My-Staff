@extends('layouts.app')

@section('title', 'Pengaturan')
@section('page-title', 'Pengaturan')

@section('content')
<div id="settings-app" v-cloak>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Sidebar Navigation -->
        <div class="lg:col-span-1">
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <nav class="flex flex-col">
                    <button @click="activeTab = 'profile'" 
                            :class="{'bg-voliko-50 border-l-4 border-voliko-600 text-voliko-700': activeTab === 'profile', 'border-l-4 border-transparent hover:bg-gray-50': activeTab !== 'profile'}"
                            class="px-6 py-4 text-left font-medium transition-colors flex items-center">
                        <i class="fas fa-user w-6"></i> Profil
                    </button>
                    <button @click="activeTab = 'password'" 
                            :class="{'bg-voliko-50 border-l-4 border-voliko-600 text-voliko-700': activeTab === 'password', 'border-l-4 border-transparent hover:bg-gray-50': activeTab !== 'password'}"
                            class="px-6 py-4 text-left font-medium transition-colors flex items-center">
                        <i class="fas fa-lock w-6"></i> Password
                    </button>
                    <button @click="activeTab = 'notifications'" 
                            :class="{'bg-voliko-50 border-l-4 border-voliko-600 text-voliko-700': activeTab === 'notifications', 'border-l-4 border-transparent hover:bg-gray-50': activeTab !== 'notifications'}"
                            class="px-6 py-4 text-left font-medium transition-colors flex items-center">
                        <i class="fas fa-bell w-6"></i> Notifikasi
                    </button>
                    @hasrole('Admin|Owner')
                    <button @click="activeTab = 'smtp'" 
                            :class="{'bg-voliko-50 border-l-4 border-voliko-600 text-voliko-700': activeTab === 'smtp', 'border-l-4 border-transparent hover:bg-gray-50': activeTab !== 'smtp'}"
                            class="px-6 py-4 text-left font-medium transition-colors flex items-center">
                        <i class="fas fa-envelope w-6"></i> SMTP Email
                    </button>
                    @endhasrole
                </nav>
            </div>
        </div>

        <!-- Content -->
        <div class="lg:col-span-2">
            <!-- Profile Settings -->
            <div v-if="activeTab === 'profile'" class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Profil Pengguna</h3>
                
                <form @submit.prevent="updateProfile">
                    <div class="flex items-center mb-6">
                        <div class="w-20 h-20 rounded-full bg-voliko-100 flex items-center justify-center mr-6">
                            <span class="text-2xl font-bold text-voliko-600">{{ substr(Auth::user()->name, 0, 1) }}</span>
                        </div>
                        <div>
                            <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                                Ganti Foto
                            </button>
                            <p class="text-xs text-gray-500 mt-2">Format: JPG, PNG. Maks: 2MB</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                            <input type="text" v-model="profile.name" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" v-model="profile.email" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label>
                            <input type="tel" v-model="profile.phone" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <input type="text" :value="profile.role" disabled
                                   class="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500">
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button type="submit" :disabled="isSaving"
                                class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                            <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
                            <i v-else class="fas fa-save mr-2"></i>
                            @{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Password Settings -->
            <div v-if="activeTab === 'password'" class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Ubah Password</h3>
                
                <form @submit.prevent="updatePassword">
                    <div class="space-y-6 max-w-md">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password Saat Ini</label>
                            <input type="password" v-model="password.current" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                            <input type="password" v-model="password.new" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                            <p class="text-xs text-gray-500 mt-1">Minimal 8 karakter</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password Baru</label>
                            <input type="password" v-model="password.confirm" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <button type="submit" :disabled="isSaving || password.new !== password.confirm"
                                class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                            <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
                            <i v-else class="fas fa-key mr-2"></i>
                            @{{ isSaving ? 'Menyimpan...' : 'Ubah Password' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Notification Settings -->
            <div v-if="activeTab === 'notifications'" class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Pengaturan Notifikasi</h3>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">Notifikasi Email</p>
                            <p class="text-sm text-gray-500">Terima notifikasi melalui email</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="notifications.email" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-voliko-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-voliko-600"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">Penilaian Baru</p>
                            <p class="text-sm text-gray-500">Notifikasi saat ada penilaian baru</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="notifications.newAssessment" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-voliko-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-voliko-600"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">Pengingat Penilaian</p>
                            <p class="text-sm text-gray-500">Pengingat untuk penilaian yang tertunda</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="notifications.reminder" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-voliko-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-voliko-600"></div>
                        </label>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button @click="saveNotifications" :disabled="isSaving"
                            class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                        <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
                        <i v-else class="fas fa-save mr-2"></i>
                        @{{ isSaving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
                    </button>
                </div>
            </div>

            <!-- SMTP Settings (Admin Only) -->
            @hasrole('Admin|Owner')
            <div v-if="activeTab === 'smtp'" class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Pengaturan SMTP Email</h3>
                
                <form @submit.prevent="saveSmtp">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mail Driver</label>
                            <select v-model="smtp.driver" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                                <option value="smtp">SMTP</option>
                                <option value="sendmail">Sendmail</option>
                                <option value="mailgun">Mailgun</option>
                                <option value="ses">Amazon SES</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mail Host</label>
                            <input type="text" v-model="smtp.host" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                                   placeholder="smtp.gmail.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mail Port</label>
                            <input type="number" v-model="smtp.port" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                                   placeholder="587">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
                            <select v-model="smtp.encryption" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent">
                                <option value="tls">TLS</option>
                                <option value="ssl">SSL</option>
                                <option value="">None</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                            <input type="text" v-model="smtp.username" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                                   placeholder="your@email.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input type="password" v-model="smtp.password" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                                   placeholder="••••••••">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">From Address</label>
                            <input type="email" v-model="smtp.from_address" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-voliko-500 focus:border-transparent"
                                   placeholder="noreply@yourcompany.com">
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" @click="testSmtp" :disabled="isTesting"
                                class="px-6 py-2 border border-voliko-600 text-voliko-600 rounded-lg hover:bg-voliko-50 transition-colors disabled:opacity-50">
                            <i v-if="isTesting" class="fas fa-spinner fa-spin mr-2"></i>
                            <i v-else class="fas fa-paper-plane mr-2"></i>
                            @{{ isTesting ? 'Mengirim...' : 'Test Koneksi' }}
                        </button>
                        <button type="submit" :disabled="isSaving"
                                class="px-6 py-2 bg-voliko-600 text-white rounded-lg hover:bg-voliko-700 transition-colors disabled:opacity-50">
                            <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
                            <i v-else class="fas fa-save mr-2"></i>
                            @{{ isSaving ? 'Menyimpan...' : 'Simpan SMTP' }}
                        </button>
                    </div>
                </form>
            </div>
            @endhasrole
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const { createApp, ref, onMounted } = Vue;

    createApp({
        setup() {
            const activeTab = ref('profile');
            const isSaving = ref(false);
            const isTesting = ref(false);

            const profile = ref({
                name: '{{ Auth::user()->name }}',
                email: '{{ Auth::user()->email }}',
                phone: '',
                role: '{{ Auth::user()->roles->first()->name ?? "User" }}',
            });

            const password = ref({
                current: '',
                new: '',
                confirm: '',
            });

            const notifications = ref({
                email: true,
                newAssessment: true,
                reminder: false,
            });

            const smtp = ref({
                driver: 'smtp',
                host: '',
                port: 587,
                encryption: 'tls',
                username: '',
                password: '',
                from_address: '',
            });

            const updateProfile = async () => {
                isSaving.value = true;
                try {
                    // await axios.post('/settings/profile', profile.value);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    alert('Profil berhasil diperbarui!');
                } catch (error) {
                    alert('Terjadi kesalahan saat menyimpan profil.');
                } finally {
                    isSaving.value = false;
                }
            };

            const updatePassword = async () => {
                if (password.value.new !== password.value.confirm) {
                    alert('Password baru dan konfirmasi tidak cocok!');
                    return;
                }
                isSaving.value = true;
                try {
                    // await axios.post('/settings/password', password.value);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    alert('Password berhasil diubah!');
                    password.value = { current: '', new: '', confirm: '' };
                } catch (error) {
                    alert('Terjadi kesalahan saat mengubah password.');
                } finally {
                    isSaving.value = false;
                }
            };

            const saveNotifications = async () => {
                isSaving.value = true;
                try {
                    // await axios.post('/settings/notifications', notifications.value);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    alert('Pengaturan notifikasi berhasil disimpan!');
                } catch (error) {
                    alert('Terjadi kesalahan saat menyimpan pengaturan.');
                } finally {
                    isSaving.value = false;
                }
            };

            const saveSmtp = async () => {
                isSaving.value = true;
                try {
                    // await axios.post('/settings/smtp', smtp.value);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    alert('Pengaturan SMTP berhasil disimpan!');
                } catch (error) {
                    alert('Terjadi kesalahan saat menyimpan pengaturan SMTP.');
                } finally {
                    isSaving.value = false;
                }
            };

            const testSmtp = async () => {
                isTesting.value = true;
                try {
                    // await axios.post('/settings/smtp-test', smtp.value);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    alert('Email test berhasil dikirim! Periksa inbox Anda.');
                } catch (error) {
                    alert('Gagal mengirim email test. Periksa pengaturan SMTP.');
                } finally {
                    isTesting.value = false;
                }
            };

            onMounted(() => {
                // Load settings from API
            });

            return {
                activeTab,
                isSaving,
                isTesting,
                profile,
                password,
                notifications,
                smtp,
                updateProfile,
                updatePassword,
                saveNotifications,
                saveSmtp,
                testSmtp,
            };
        }
    }).mount('#settings-app');
</script>
@endpush
