<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import MahasiswaProfileSettingsModal from '@/components/layout/MahasiswaProfileSettingsModal.vue';

interface NavItem {
  icon: string;
  label: string;
  name: string;
}

// Nav horizontal tetap (hardcoded), BUKAN menu dinamis dari database — portal Mahasiswa
// sengaja tidak memakai sistem Role/Menu/Permission admin, mengikuti pola portal Dosen.
const NAV_ITEMS: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', name: 'mahasiswa-dashboard' },
  { icon: 'assignment', label: 'KRS', name: 'mahasiswa-krs' },
  { icon: 'event_note', label: 'Jadwal Kuliah', name: 'mahasiswa-jadwal' },
  { icon: 'grading', label: 'Nilai (KHS)', name: 'mahasiswa-nilai' },
  { icon: 'description', label: 'Transkrip', name: 'mahasiswa-transkrip' },
  { icon: 'mail', label: 'Cetak Surat', name: 'mahasiswa-surat-keterangan' },
];

const mahasiswaAuthStore = useMahasiswaAuthStore();
const route = useRoute();
const router = useRouter();

const mobileOpen = ref(false);
const isProfileOpen = ref(false);

const isItemActive = (item: NavItem) => route.name === item.name;

const goTo = (name: string) => {
  mobileOpen.value = false;
  router.push({ name });
};

const handleLogout = () => {
  mahasiswaAuthStore.logout();
  window.location.href = '/mahasiswa/login';
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <!-- Top app bar -->
    <header class="bg-primary text-on-primary">
      <div class="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button type="button" class="md:hidden" @click="mobileOpen = !mobileOpen">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <span class="material-symbols-outlined" style="font-size: 24px">group</span>
          <span class="font-semibold text-headline-md">Mahasiswa</span>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-3 hover:opacity-90 transition-opacity"
            title="Profil Saya"
            @click="isProfileOpen = true"
          >
            <div class="hidden sm:flex flex-col items-end leading-tight">
              <span class="text-label-md font-medium">{{ mahasiswaAuthStore.mahasiswa?.namaLengkap ?? '-' }}</span>
              <span class="text-body-sm opacity-80">NIM {{ mahasiswaAuthStore.mahasiswa?.nim ?? '-' }}</span>
            </div>
            <div
              v-if="mahasiswaAuthStore.mahasiswa?.photo"
              class="w-9 h-9 rounded-full bg-cover bg-center shrink-0"
              :style="{ backgroundImage: `url(${mahasiswaAuthStore.mahasiswa.photo})` }"
            />
            <div v-else class="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center font-semibold shrink-0">
              {{ mahasiswaAuthStore.mahasiswa?.namaLengkap?.charAt(0)?.toUpperCase() ?? 'M' }}
            </div>
          </button>
          <button
            type="button"
            class="flex items-center gap-1 px-3 py-1.5 rounded-md border border-on-primary/40 hover:bg-on-primary/10 transition-colors text-label-sm"
            @click="handleLogout"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">logout</span>
            <span class="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Horizontal top-nav -->
    <nav class="bg-surface-container-lowest border-b border-outline-variant relative z-20">
      <div
        class="max-w-screen-2xl mx-auto px-4 md:px-8 flex flex-col md:flex-row md:items-center gap-1 py-2"
        :class="mobileOpen ? 'flex' : 'hidden md:flex'"
      >
        <button
          v-for="item in NAV_ITEMS"
          :key="item.name"
          type="button"
          class="w-full md:w-auto flex items-center gap-2 px-4 py-2.5 rounded-md text-label-md transition-colors"
          :class="
            isItemActive(item)
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant hover:bg-surface-container-highest'
          "
          @click="goTo(item.name)"
        >
          <span class="material-symbols-outlined" style="font-size: 20px">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <main class="flex-1 max-w-screen-2xl w-full mx-auto p-4 md:p-8">
      <RouterView />
    </main>

    <MahasiswaProfileSettingsModal v-model="isProfileOpen" />
  </div>
</template>
