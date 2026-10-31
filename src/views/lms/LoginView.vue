<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import PasswordInput from '@/components/ui/PasswordInput.vue';
import { useAuthStore } from '@/stores/auth';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { useKampusStore } from '@/stores/kampus';
import { STAFF_MODULES } from '@/constants/staffModules';
import { extractErrorMessage } from '@/api/http';
import { toastInfo } from '@/utils/swal';

/**
 * Halaman login modul LMS (gaya portal e-learning): ilustrasi di kiri, panel login di kanan.
 * - "Siakad": masuk dengan akun SIAKAD — Dosen (NIP / NIDN / email) → E-learning dosen, Mahasiswa (NIM / email)
 *   → E-learning mahasiswa.
 * - Form email: email dosen / mahasiswa dikenali otomatis; username tanpa "@" = akun staf LMS (console /lms).
 * - Google: belum dikonfigurasi (info saja).
 */
const router = useRouter();
const authStore = useAuthStore();
const dosenAuthStore = useDosenAuthStore();
const mahasiswaAuthStore = useMahasiswaAuthStore();
const kampusStore = useKampusStore();
kampusStore.load();

const mode = ref<'email' | 'siakad'>('email');
const peran = ref<'dosen' | 'mahasiswa'>('mahasiswa');
const identitas = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const keElearningDosen = () => router.push({ name: 'dosen-elearning' });
const keElearningMahasiswa = () => router.push({ name: 'mahasiswa-elearning' });

/** Login akun staf LMS (username) — harus punya akses Dashboard LMS. */
const loginStaf = async (username: string) => {
  await authStore.login(username, password.value, { module: 'lms' });
  if (!authStore.permissionsFor(STAFF_MODULES.lms.dashboardMenuCode).canRead) {
    authStore.logout();
    throw new Error('Akun ini tidak memiliki akses ke modul LMS.');
  }
  router.push(STAFF_MODULES.lms.home);
};

const masuk = async () => {
  const id = identitas.value.trim();
  error.value = null;
  if (!id || !password.value) return (error.value = mode.value === 'siakad' ? 'Isi identitas SIAKAD dan kata sandi' : 'Isi alamat email dan kata sandi');
  loading.value = true;
  try {
    if (mode.value === 'siakad') {
      const isEmail = id.includes('@');
      if (peran.value === 'dosen') {
        await dosenAuthStore.login({ ...(isEmail ? { email: id } : { nip: id }), password: password.value });
        return keElearningDosen();
      }
      await mahasiswaAuthStore.login({ ...(isEmail ? { email: id } : { nim: id }), password: password.value });
      return keElearningMahasiswa();
    }
    // Form email: username tanpa "@" = staf LMS; email dicoba sebagai dosen lalu mahasiswa.
    if (!id.includes('@')) return await loginStaf(id);
    try {
      await dosenAuthStore.login({ email: id, password: password.value });
      return keElearningDosen();
    } catch {
      await mahasiswaAuthStore.login({ email: id, password: password.value });
      return keElearningMahasiswa();
    }
  } catch (err) {
    error.value = err instanceof Error && !('response' in err) ? err.message : extractErrorMessage(err, 'Akun atau kata sandi salah');
  } finally {
    loading.value = false;
  }
};

const pilihSiakad = () => {
  mode.value = mode.value === 'siakad' ? 'email' : 'siakad';
  identitas.value = '';
  error.value = null;
};
const google = () => toastInfo('Masuk dengan Google belum tersedia. Gunakan akun SIAKAD atau email.');
const LABEL_IDENTITAS = { dosen: 'NIP / NIDN / Email Dosen', mahasiswa: 'NIM / Email Mahasiswa' };
</script>

<template>
  <div class="min-h-screen flex bg-surface-container-lowest">
    <!-- Kiri: ilustrasi -->
    <section class="hidden lg:flex relative flex-1 overflow-hidden bg-gradient-to-br from-primary-container/60 via-surface to-surface-container-low">
      <div class="relative z-10 w-full max-w-2xl mx-auto px-12 pt-14">
        <h1 class="text-[2.4rem] leading-tight font-bold text-primary">Permudah interaksi Anda &amp; Mahasiswa secara Online.</h1>
        <p class="mt-3 text-body-md text-on-surface-variant max-w-lg">Materi, video, dan kuis dalam satu tempat — terhubung langsung dengan data kelas di SIAKAD.</p>

        <!-- Mockup aplikasi -->
        <div class="relative mt-10 flex items-end gap-8">
          <div class="relative w-64 rounded-[2rem] border-[6px] border-on-surface/80 bg-surface-container-lowest shadow-2xl overflow-hidden">
            <div class="bg-primary px-4 pt-3 pb-4 text-on-primary">
              <div class="flex justify-between text-[10px] opacity-90"><span>9:41</span><span class="material-symbols-outlined" style="font-size: 12px">signal_cellular_alt</span></div>
              <!-- Logo kampus (Politeknik Bhakti Kartini) + label LMS; tanpa logo → ikon. -->
              <div class="mt-2 flex items-center gap-2">
                <img
                  v-if="kampusStore.kampus?.logoUrl"
                  :src="kampusStore.kampus.logoUrl"
                  :alt="kampusStore.kampus.namaKampus || 'Logo kampus'"
                  class="h-8 w-auto max-w-[9rem] object-contain shrink-0"
                />
                <span v-else class="material-symbols-outlined" style="font-size: 20px">cast_for_education</span>
                <span class="font-semibold text-label-md" :class="kampusStore.kampus?.logoUrl ? 'pl-2 border-l border-on-primary/40' : ''">LMS</span>
              </div>
            </div>
            <div class="p-3 space-y-2.5">
              <div v-for="(c, i) in [
                { icon: 'smart_display', warna: 'bg-[#d83b3b]/10 text-[#a32020]', judul: 'Video: Pengantar Komunikasi', sub: 'Pertemuan 1 · Wajib' },
                { icon: 'library_books', warna: 'bg-[#2563eb]/10 text-[#1e40af]', judul: 'Materi Pertemuan 2', sub: 'PDF · 12 halaman' },
                { icon: 'quiz', warna: 'bg-[#7c3aed]/10 text-[#5b21b6]', judul: 'Kuis Bab 1', sub: '10 soal · Skor 85' },
              ]" :key="i" class="flex items-center gap-2 rounded-lg border border-outline-variant p-2">
                <span class="material-symbols-outlined rounded-md p-1.5" :class="c.warna" style="font-size: 18px">{{ c.icon }}</span>
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold text-on-surface truncate">{{ c.judul }}</p>
                  <p class="text-[10px] text-on-surface-variant">{{ c.sub }}</p>
                </div>
                <span v-if="i !== 1" class="material-symbols-outlined ml-auto text-[#059669]" style="font-size: 16px; font-variation-settings: 'FILL' 1">check_circle</span>
              </div>
              <div class="rounded-lg bg-primary-container/50 p-2.5">
                <p class="text-[11px] font-semibold text-on-surface">Pengumuman Kelas</p>
                <!-- Contoh pengumuman: thumbnail berikon + judul, keterangan & pengirim. -->
                <div class="mt-1.5 flex gap-2 rounded-md bg-surface-container-lowest/80 p-2">
                  <div class="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
                    <span class="material-symbols-outlined text-on-primary" style="font-size: 26px">campaign</span>
                    <span class="absolute bottom-0 inset-x-0 bg-black/25 text-[8px] font-semibold text-white text-center py-px">PENTING</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold text-on-surface leading-tight">Jadwal UTS dimajukan ke Senin</p>
                    <p class="text-[10px] text-on-surface-variant leading-snug mt-0.5">Ruang B.204 pukul 08.00 WIB. Jangan lupa bawa kartu ujian.</p>
                    <p class="text-[9px] text-primary font-medium mt-0.5">Dosen Pengampu · 2 jam lalu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mb-6 rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant p-4 w-56">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary bg-primary-container/60 rounded-full p-2" style="font-size: 22px">insights</span>
              <div>
                <p class="text-label-md font-semibold">Progres Belajar</p>
                <p class="text-label-sm text-on-surface-variant">Minggu ini</p>
              </div>
            </div>
            <div class="mt-3 h-2 rounded-full bg-surface-container overflow-hidden"><div class="h-full w-3/4 rounded-full bg-[#059669]" /></div>
            <p class="mt-1.5 text-label-sm text-on-surface-variant">8 dari 11 konten selesai</p>
          </div>
        </div>

        <!-- Ilustrasi: mahasiswa belajar online (laptop, buku, video kelas) — melambangkan LMS. -->
        <div class="mt-12 max-w-xl text-primary">
          <svg viewBox="0 0 560 250" class="w-full h-auto" role="img" aria-label="Ilustrasi mahasiswa sedang belajar online">
            <ellipse cx="280" cy="236" rx="250" ry="10" fill="currentColor" opacity=".12" />

            <!-- Layar video kelas melayang -->
            <g>
              <path d="M215 120 C 225 80, 250 70, 262 62" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" opacity=".5" />
              <path d="M372 112 C 360 80, 330 70, 318 62" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" opacity=".5" />
              <rect x="240" y="8" width="100" height="62" rx="8" fill="#fff" stroke="currentColor" stroke-width="2" />
              <rect x="248" y="16" width="84" height="40" rx="4" fill="currentColor" opacity=".15" />
              <circle cx="290" cy="36" r="13" fill="currentColor" />
              <path d="M286 29 L297 36 L286 43 Z" fill="#fff" />
              <rect x="248" y="61" width="52" height="3" rx="1.5" fill="currentColor" opacity=".35" />
              <rect x="304" y="61" width="12" height="3" rx="1.5" fill="#059669" />
            </g>

            <!-- Ikon melayang: wifi, topi wisuda, bintang -->
            <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".75">
              <path d="M110 52 a26 26 0 0 1 36 0" />
              <path d="M117 60 a16 16 0 0 1 22 0" />
            </g>
            <circle cx="128" cy="68" r="3.5" fill="currentColor" opacity=".75" />
            <g transform="translate(430 40)">
              <path d="M0 12 L24 2 L48 12 L24 22 Z" fill="currentColor" />
              <path d="M10 16 v10 c8 6 20 6 28 0 v-10 L24 22 Z" fill="currentColor" opacity=".8" />
              <path d="M44 13 v14" stroke="#d97706" stroke-width="2" />
              <circle cx="44" cy="28" r="2.5" fill="#d97706" />
            </g>
            <path d="M190 30 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#d97706" opacity=".8" />

            <!-- Mahasiswa 1: jaket almamater + laptop -->
            <g>
              <rect x="150" y="128" width="78" height="62" rx="26" fill="currentColor" />
              <path d="M178 128 L189 146 L200 128 Z" fill="#fff" />
              <rect x="181" y="112" width="16" height="16" rx="4" fill="#c68a5e" />
              <circle cx="189" cy="98" r="21" fill="#c68a5e" />
              <path d="M168 96 C 168 74, 210 72, 210 94 C 202 86, 184 84, 168 96 Z" fill="#2b1d14" />
              <circle cx="182" cy="100" r="2" fill="#2b1d14" />
              <circle cx="196" cy="100" r="2" fill="#2b1d14" />
              <path d="M184 108 q5 4 10 0" fill="none" stroke="#2b1d14" stroke-width="1.8" stroke-linecap="round" />
              <!-- laptop (tampak belakang) -->
              <path d="M200 176 L214 132 L268 132 L254 176 Z" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.5" />
              <circle cx="234" cy="154" r="5" fill="currentColor" opacity=".6" />
              <ellipse cx="208" cy="174" rx="9" ry="6" fill="#c68a5e" />
            </g>

            <!-- Mahasiswi 2: hijab + buku terbuka -->
            <g>
              <rect x="336" y="128" width="78" height="62" rx="26" fill="currentColor" />
              <path d="M353 120 C 353 66, 397 66, 397 120 L 404 140 L 346 140 Z" fill="#0f766e" />
              <circle cx="375" cy="100" r="17" fill="#b97a50" />
              <path d="M358 96 C 360 76, 390 76, 392 96 C 384 88, 366 88, 358 96 Z" fill="#0f766e" />
              <circle cx="369" cy="102" r="2" fill="#2b1d14" />
              <circle cx="382" cy="102" r="2" fill="#2b1d14" />
              <path d="M371 109 q4 3 8 0" fill="none" stroke="#2b1d14" stroke-width="1.8" stroke-linecap="round" />
              <!-- buku terbuka -->
              <path d="M340 166 L374 158 L374 182 L340 190 Z" fill="#fff" stroke="#9ca3af" stroke-width="1.5" />
              <path d="M408 166 L374 158 L374 182 L408 190 Z" fill="#fef3c7" stroke="#9ca3af" stroke-width="1.5" />
              <path d="M346 170 l22 -5 M346 176 l22 -5 M380 165 l22 5 M380 171 l22 5" stroke="#9ca3af" stroke-width="1.2" />
              <ellipse cx="340" cy="182" rx="8" ry="6" fill="#b97a50" />
              <ellipse cx="408" cy="182" rx="8" ry="6" fill="#b97a50" />
            </g>

            <!-- Meja, bendera Merah Putih, tumpukan buku -->
            <rect x="90" y="186" width="380" height="12" rx="6" fill="#8a6a3b" />
            <rect x="112" y="198" width="9" height="34" rx="3" fill="#6f532c" />
            <rect x="439" y="198" width="9" height="34" rx="3" fill="#6f532c" />
            <rect x="296" y="146" width="2.5" height="40" fill="#6b7280" />
            <rect x="298.5" y="146" width="24" height="8" fill="#dc2626" />
            <rect x="298.5" y="154" width="24" height="8" fill="#fff" stroke="#e5e7eb" stroke-width=".8" />
            <rect x="290" y="183" width="15" height="4" rx="2" fill="#6b7280" />
            <rect x="428" y="176" width="36" height="10" rx="2" fill="#2563eb" />
            <rect x="432" y="166" width="30" height="10" rx="2" fill="#d97706" />
            <rect x="426" y="156" width="34" height="10" rx="2" fill="#059669" />
          </svg>
          <p class="mt-2 text-center text-body-sm font-medium text-on-surface-variant">Belajar di mana saja, kapan saja — bersama dosen &amp; teman sekelas.</p>
        </div>
      </div>
      <!-- Ornamen -->
      <div class="absolute -bottom-24 -left-16 w-72 h-72 rounded-full border-[28px] border-primary/15" />
      <div class="absolute bottom-16 right-10 grid grid-cols-6 gap-3 opacity-40">
        <span v-for="n in 30" :key="n" class="w-1.5 h-1.5 rounded-full bg-primary" />
      </div>
    </section>

    <!-- Kanan: panel login -->
    <section class="w-full lg:w-[34rem] flex flex-col px-6 sm:px-14 py-10">
      <div class="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto">
        <div class="mb-6">
          <img v-if="kampusStore.kampus?.logoUrl" :src="kampusStore.kampus.logoUrl" :alt="kampusStore.kampus.namaKampus || 'Logo kampus'" class="h-14 w-auto object-contain" />
          <span v-else class="font-bold text-headline-md text-primary">{{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</span>
        </div>
        <h2 class="text-headline-md font-semibold text-on-surface mb-4">Masuk ke LMS</h2>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex items-center justify-center gap-2 py-2.5 rounded-lg border font-semibold text-label-md transition-colors"
            :class="mode === 'siakad' ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant hover:bg-surface-container'"
            @click="pilihSiakad"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">school</span>Siakad
          </button>
          <button type="button" class="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-outline-variant font-semibold text-label-md hover:bg-surface-container" @click="google">
            <svg viewBox="0 0 48 48" class="w-5 h-5" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Google
          </button>
        </div>

        <div class="my-5 flex items-center gap-3 text-label-sm text-on-surface-variant">
          <span class="flex-1 h-px bg-outline-variant" />{{ mode === 'siakad' ? 'Akun SIAKAD' : 'Atau' }}<span class="flex-1 h-px bg-outline-variant" />
        </div>

        <form class="space-y-4" @submit.prevent="masuk">
          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

          <!-- Siakad: pilih peran -->
          <div v-if="mode === 'siakad'" class="grid grid-cols-2 rounded-lg border border-outline-variant overflow-hidden text-label-md">
            <button
              v-for="p in [
                { key: 'mahasiswa', label: 'Mahasiswa', icon: 'group' },
                { key: 'dosen', label: 'Dosen', icon: 'co_present' },
              ] as const"
              :key="p.key"
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 transition-colors"
              :class="peran === p.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
              @click="peran = p.key"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">{{ p.icon }}</span>{{ p.label }}
            </button>
          </div>

          <label class="block">
            <span class="block text-label-md font-medium text-on-surface mb-1.5">{{ mode === 'siakad' ? LABEL_IDENTITAS[peran] : 'Alamat Email' }}</span>
            <span class="relative block">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size: 20px">{{ mode === 'siakad' ? 'badge' : 'mail' }}</span>
              <input
                v-model="identitas"
                type="text"
                :autocomplete="mode === 'siakad' ? 'username' : 'email'"
                class="w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-md focus:border-primary focus:outline-none"
                :placeholder="mode === 'siakad' ? (peran === 'dosen' ? 'Contoh: 0412345678' : 'Contoh: 134612610001') : 'Contoh: email@example.com'"
              />
            </span>
          </label>

          <label class="block">
            <span class="block text-label-md font-medium text-on-surface mb-1.5">Kata Sandi</span>
            <PasswordInput v-model="password" autocomplete="current-password" placeholder="Masukkan kata sandi" />
          </label>

          <div class="flex justify-end">
            <RouterLink to="/admin/forgot-password" class="text-label-md font-semibold text-primary hover:underline">Lupa kata sandi</RouterLink>
          </div>

          <button type="submit" class="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:opacity-90 disabled:opacity-60" :disabled="loading">
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <p class="mt-5 text-center text-body-sm text-on-surface-variant">
          <template v-if="mode === 'email'">Dosen &amp; mahasiswa juga bisa masuk lewat tombol <button type="button" class="font-semibold text-primary hover:underline" @click="pilihSiakad">Siakad</button>.</template>
          <template v-else>Staf LMS? <button type="button" class="font-semibold text-primary hover:underline" @click="pilihSiakad">Masuk dengan username</button>.</template>
        </p>
        <p class="mt-4 text-center text-label-sm text-on-surface-variant">
          <RouterLink to="/admin/login" class="hover:underline">← Kembali ke pilihan modul</RouterLink>
        </p>
      </div>
      <p class="text-center text-label-sm text-on-surface-variant mt-8">Copyright © {{ new Date().getFullYear() }} {{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</p>
    </section>
  </div>
</template>
