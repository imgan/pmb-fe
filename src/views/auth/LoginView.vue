<script setup lang="ts">
import PasswordInput from '@/components/ui/PasswordInput.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { extractErrorMessage, staffModuleStorage } from '@/api/http';
import { authApi } from '@/api/auth';
import type { ProdiOption, TahunAkademikOption } from '@/types/entities';
import { toastInfo } from '@/utils/swal';
import { STAFF_MODULES, type StaffModuleKey } from '@/constants/staffModules';

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
  { key: 'admin', label: 'Admin', icon: 'admin_panel_settings', available: true },
  { key: 'dosen', label: 'Dosen', icon: 'co_present', available: true },
  { key: 'mahasiswa', label: 'Mahasiswa', icon: 'group', available: true },
  { key: 'lms', label: 'LMS', icon: 'cast_for_education', available: true },
];

type ModuleKey = StaffModuleKey;

const step = ref<'modules' | 'login'>('modules');
const selectedModule = ref<ModuleKey>('pmb');

const selectModule = (mod: ModuleTile) => {
  if (!mod.available) {
    toastInfo(`Modul ${mod.label} segera hadir`);
    return;
  }
  // Modul Mahasiswa & Dosen punya portal & alur login tersendiri (login pakai NIM / NIDN,
  // bukan username staff) di /mahasiswa/login & /dosen/login — bukan bagian dari step 2
  // (form login staff) di halaman ini, jadi langsung diarahkan ke sana.
  if (mod.key === 'mahasiswa') {
    router.push('/mahasiswa/login');
    return;
  }
  // LMS punya halaman login sendiri (Siakad / email / username staf).
  if (mod.key === 'lms') {
    router.push('/lms/login');
    return;
  }
  if (mod.key === 'dosen') {
    router.push('/dosen/login');
    return;
  }
  selectedModule.value = mod.key as ModuleKey;
  pilihTahunBawaan();
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
  if (selectedModule.value === 'lms') {
    return { icon: 'cast_for_education', title: 'LMS Console', subtitle: 'Learning Management System' };
  }
  if (selectedModule.value === 'admin') {
    return { icon: 'admin_panel_settings', title: 'Modul Admin', subtitle: 'Superadmin · Pengelolaan Akun' };
  }
  return { icon: 'school', title: 'Admin Console', subtitle: 'University PMB System' };
});

const username = ref('');
const password = ref('');

// Tahun akademik acuan sesi (bisa pilih tahun lalu untuk melihat data lama) & prodi (modul Prodi).
const tahunAkademikOptions = ref<TahunAkademikOption[]>([]);
const prodiOptions = ref<ProdiOption[]>([]);
const tahunAjaranId = ref<number | ''>('');
const kodeProdi = ref('');
onMounted(async () => {
  try {
    const options = await authApi.loginOptions();
    tahunAkademikOptions.value = options.tahunAkademik;
    prodiOptions.value = options.prodi;
    if (options.bawaan) bawaanModul.value = options.bawaan;
    pilihTahunBawaan();
  } catch {
    // Form tetap bisa dipakai; backend menerima login tanpa konteks.
  }
});
/**
 * Tahun bawaan form login: PMB & Keuangan memakai padanan Tahun Ajaran PMB / Keuangan aktif (Modul Admin), modul lain
 * tahun akademik aktif.
 */
const bawaanModul = ref<{ pmb: number | null; keuangan: number | null }>({ pmb: null, keuangan: null });
const pilihTahunBawaan = () => {
  const list = tahunAkademikOptions.value;
  const modul = selectedModule.value === 'pmb' || selectedModule.value === 'keuangan' ? bawaanModul.value[selectedModule.value] : null;
  tahunAjaranId.value = (modul && list.some((t) => t.id === modul) ? modul : null) ?? list.find((t) => t.isActive)?.id ?? list[0]?.id ?? '';
};
const loading = ref(false);
const error = ref<string | null>(null);

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

// Sesi staff yang masih aktif: tampilkan pintasan ke modul pertama yang bisa diakses akun tsb.
const activeSession = computed(() => {
  if (!authStore.user) return null;
  // Utamakan modul yang dipilih saat login terakhir (bukan sekadar modul pertama yang bisa diakses).
  const terakhir = STAFF_MODULES[staffModuleStorage.get() as ModuleKey];
  const module =
    terakhir && authStore.permissionsFor(terakhir.dashboardMenuCode).canRead
      ? terakhir
      : Object.values(STAFF_MODULES).find((m) => authStore.permissionsFor(m.dashboardMenuCode).canRead);
  return module ? { name: authStore.user.name, label: module.label, home: module.home } : null;
});

/**
 * `?redirect=` hanya dipakai bila masih di modul yang dipilih DAN halamannya bisa diakses akun
 * baru. Sebelumnya redirect selalu menang, jadi sesi Prodi yang kedaluwarsa (redirect=/prodi/...)
 * lalu login sebagai Keuangan malah mendarat di Prodi.
 */
const resolveRedirect = (module: (typeof STAFF_MODULES)[ModuleKey]): string | null => {
  const redirect = route.query.redirect;
  if (typeof redirect !== 'string' || !redirect.startsWith(`${module.prefix}/`)) return null;
  const target = router.resolve(redirect);
  const menuCode = target.meta.menuCode as string | undefined;
  if (target.matched.length === 0 || (menuCode && !authStore.permissionsFor(menuCode).canRead)) return null;
  return redirect;
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login(username.value, password.value, {
      tahunAjaranId: tahunAjaranId.value || null,
      module: selectedModule.value,
      kodeProdi: selectedModule.value === 'prodi' ? kodeProdi.value || null : null,
    });
    const module = STAFF_MODULES[selectedModule.value];
    if (!authStore.permissionsFor(module.dashboardMenuCode).canRead) {
      authStore.logout();
      error.value = `Akun ini tidak memiliki akses ke modul ${module.label}. Pilih modul yang sesuai dengan akun Anda.`;
      return;
    }
    router.push(resolveRedirect(module) ?? module.home);
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
      <!-- Judul tetap terlihat (sticky) saat halaman di-scroll; gradien bg-fixed agar menyambung dengan bagian modul. -->
      <header class="sticky top-0 z-30 w-full pt-10 pb-6 px-4 md:px-12 text-center shadow-sm bg-fixed bg-gradient-to-br from-on-primary-fixed-variant via-primary to-inverse-primary">
        <h1 class="font-semibold text-headline-lg text-on-primary tracking-wide">SMART</h1>
        <p class="text-body-md text-on-primary/80 mt-1">Sistem Manajemen Akademik Terintegrasi</p>
      </header>
      <section class="relative w-full pt-2 pb-10 px-4 md:px-12 bg-fixed bg-gradient-to-br from-on-primary-fixed-variant via-primary to-inverse-primary">
        <div class="max-w-5xl mx-auto">
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

      <div class="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div
          v-if="activeSession"
          class="w-full max-w-md px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface flex flex-col sm:flex-row sm:items-center gap-3 text-left"
        >
          <span class="material-symbols-outlined text-primary" style="font-size: 22px">account_circle</span>
          <span class="flex-1">
            Anda masih login sebagai <span class="font-semibold">{{ activeSession.name }}</span>. Pilih modul di atas untuk
            login dengan akun lain.
          </span>
          <button type="button" class="text-primary font-medium whitespace-nowrap hover:underline" @click="router.push(activeSession.home)">
            Lanjut ke {{ activeSession.label }}
          </button>
        </div>
        <p class="max-w-md text-body-sm text-on-surface-variant">Pilih modul di atas untuk masuk ke aplikasi.</p>
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
            <PasswordInput v-model="password" required autocomplete="current-password" />
          </label>

          <label v-if="selectedModule === 'prodi'" class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Prodi</span>
            <select
              v-model="kodeProdi"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="">Semua Prodi (Direktur/Wadir/Admin)</option>
              <option v-for="p in prodiOptions" :key="p.kodeProdi" :value="p.kodeProdi">{{ p.nama }}</option>
            </select>
          </label>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Tahun Akademik</span>
            <select
              v-model="tahunAjaranId"
              required
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="" disabled>-- Pilih Tahun --</option>
              <option v-for="t in tahunAkademikOptions" :key="t.id" :value="t.id">
                {{ t.label }}{{ t.isActive ? ' (aktif)' : '' }}
              </option>
            </select>
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
