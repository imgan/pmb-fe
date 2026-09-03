<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { extractErrorMessage } from '@/api/http';
import { toastInfo } from '@/utils/swal';

interface ModuleTile {
  key: string;
  label: string;
  icon: string;
  available: boolean;
}

const modules: ModuleTile[] = [
  { key: 'pmb', label: 'PMB', icon: 'school', available: true },
  { key: 'baak', label: 'BAAK', icon: 'domain', available: true },
  { key: 'sdi', label: 'SDI', icon: 'groups', available: true },
  { key: 'prodi', label: 'Prodi', icon: 'auto_stories', available: true },
  { key: 'keuangan', label: 'Keuangan', icon: 'payments', available: true },
  { key: 'sim', label: 'SIM', icon: 'monitoring', available: true },
  { key: 'dosen', label: 'Dosen', icon: 'co_present', available: false },
  { key: 'mahasiswa', label: 'Mahasiswa', icon: 'group', available: false },
];

type ModuleKey = 'pmb' | 'baak' | 'sdi' | 'prodi' | 'keuangan' | 'sim';

const step = ref<'modules' | 'login'>('modules');
const selectedModule = ref<ModuleKey>('pmb');

const selectModule = (mod: ModuleTile) => {
  if (!mod.available) {
    toastInfo(`Modul ${mod.label} segera hadir`);
    return;
  }
  selectedModule.value = mod.key as ModuleKey;
  step.value = 'login';
};

const consoleInfo = computed(() => {
  if (selectedModule.value === 'baak') {
    return { icon: 'domain', title: 'BAAK Console', subtitle: 'Biro Administrasi Akademik & Kemahasiswaan' };
  }
  if (selectedModule.value === 'sdi') {
    return { icon: 'groups', title: 'SDI Console', subtitle: 'Sumber Daya Insani' };
  }
  if (selectedModule.value === 'prodi') {
    return { icon: 'auto_stories', title: 'Prodi Console', subtitle: 'Program Studi' };
  }
  if (selectedModule.value === 'keuangan') {
    return { icon: 'payments', title: 'Keuangan Console', subtitle: 'Manajemen Keuangan' };
  }
  if (selectedModule.value === 'sim') {
    return { icon: 'monitoring', title: 'SIM Console', subtitle: 'Sistem Informasi Manajemen Akademik' };
  }
  return { icon: 'school', title: 'Admin Console', subtitle: 'University PMB System' };
});

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login(username.value, password.value);
    const FALLBACK_BY_MODULE: Record<ModuleKey, string> = {
      pmb: '/admin/dashboard',
      baak: '/baak/dashboard',
      sdi: '/sdi/dashboard',
      prodi: '/prodi/beranda',
      keuangan: '/keuangan/dashboard',
      sim: '/sim/dashboard',
    };
    const fallback = FALLBACK_BY_MODULE[selectedModule.value];
    const redirect = (route.query.redirect as string) || fallback;
    router.push(redirect);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Username atau password salah');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <!-- Module chooser -->
    <div v-if="step === 'modules'" class="flex-1 flex flex-col">
      <section
        class="relative w-full py-10 px-4 md:px-12 bg-gradient-to-br from-on-primary-fixed-variant via-primary to-inverse-primary"
      >
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-8">
            <h1 class="font-semibold text-headline-lg text-on-primary">Pilih Modul</h1>
            <p class="text-body-md text-on-primary/80 mt-1">University System Portal</p>
          </div>
          <div class="flex flex-wrap justify-center gap-4 md:gap-6">
            <button
              v-for="mod in modules"
              :key="mod.key"
              type="button"
              class="relative w-24 md:w-28 flex flex-col items-center gap-2 group"
              @click="selectModule(mod)"
            >
              <div
                class="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-on-primary/15 border border-on-primary/25 flex items-center justify-center backdrop-blur-sm transition-all group-hover:bg-on-primary/25 group-hover:scale-105"
                :class="{ 'opacity-60': !mod.available }"
              >
                <span class="material-symbols-outlined text-on-primary" style="font-size: 32px">{{ mod.icon }}</span>
              </div>
              <span class="text-label-md font-semibold text-on-primary text-center leading-tight">{{ mod.label }}</span>
              <span
                v-if="!mod.available"
                class="absolute -top-1.5 -right-1.5 bg-secondary-container text-on-secondary-container text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              >
                Segera Hadir
              </span>
            </button>
          </div>
        </div>
      </section>

      <div class="flex-1 flex items-center justify-center px-4 py-10 text-center">
        <p class="text-body-sm text-on-surface-variant max-w-sm">
          Pilih modul <span class="font-semibold text-on-surface">PMB</span> untuk masuk ke Admin Console Penerimaan Mahasiswa Baru.
        </p>
      </div>
    </div>

    <!-- Login form -->
    <div v-else class="flex-1 flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined" style="font-size: 28px">{{ consoleInfo.icon }}</span>
          </div>
          <h1 class="font-semibold text-headline-lg text-primary">{{ consoleInfo.title }}</h1>
          <p class="text-body-md text-on-surface-variant mt-1">
            {{ consoleInfo.subtitle }}
          </p>
        </div>

        <form
          class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ error }}
          </div>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Username</span>
            <input
              v-model="username"
              type="text"
              required
              autocomplete="username"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <label class="block">
            <div class="flex items-center justify-between mb-2">
              <span class="block font-medium text-label-md text-on-surface">Password</span>
              <RouterLink to="/admin/forgot-password" class="text-label-sm text-primary hover:underline">
                Lupa password?
              </RouterLink>
            </div>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <button
          type="button"
          class="w-full text-center mt-4 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
          @click="step = 'modules'"
        >
          &larr; Kembali ke Pilihan Modul
        </button>
      </div>
    </div>
  </div>
</template>
