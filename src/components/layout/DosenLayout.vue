<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDosenAuthStore } from '@/stores/dosenAuth';

interface NavChild {
  name: string;
  label: string;
}

interface NavItem {
  icon: string;
  label: string;
  name?: string;
  children?: NavChild[];
}

// Nav horizontal tetap (hardcoded), BUKAN menu dinamis dari database — portal Dosen sengaja
// tidak memakai sistem Role/Menu/Permission admin. "Harian" adalah satu-satunya grup dengan
// dropdown sungguhan; Periodik & Lain-Lain adalah halaman placeholder tunggal (tetap tampil
// sebagai tombol dengan chevron demi konsistensi visual, tapi tidak benar-benar bercabang).
const NAV_ITEMS: NavItem[] = [
  {
    icon: 'folder',
    label: 'Harian',
    children: [
      { name: 'dosen-kehadiran-mengajar', label: 'Kehadiran Mengajar' },
      { name: 'dosen-rekap-mahasiswa', label: 'Rekap Mahasiswa' },
    ],
  },
  { icon: 'description', label: 'Periodik', name: 'dosen-periodik' },
  { icon: 'grid_view', label: 'Lain-Lain', name: 'dosen-lain-lain' },
  { icon: 'download', label: 'Panduan Sistem', name: 'dosen-panduan-sistem' },
  { icon: 'article', label: 'Silabus Matakuliah', name: 'dosen-silabus-matakuliah' },
];

const dosenAuthStore = useDosenAuthStore();
const route = useRoute();
const router = useRouter();

const openGroup = ref<string | null>(null);
const mobileOpen = ref(false);

const toggleGroup = (label: string) => {
  openGroup.value = openGroup.value === label ? null : label;
};

const isChildActive = (child: NavChild) => route.name === child.name;
const isItemActive = (item: NavItem) =>
  item.name ? route.name === item.name : (item.children ?? []).some(isChildActive);

const goTo = (name: string) => {
  openGroup.value = null;
  mobileOpen.value = false;
  router.push({ name });
};

const handleLogout = () => {
  dosenAuthStore.logout();
  window.location.href = '/dosen/login';
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
          <span class="material-symbols-outlined" style="font-size: 24px">school</span>
          <span class="font-semibold text-headline-md">Dosen</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex flex-col items-end leading-tight">
            <span class="text-label-md font-medium">{{ dosenAuthStore.dosen?.namaLengkap ?? '-' }}</span>
            <span class="text-body-sm opacity-80">NIDN {{ dosenAuthStore.dosen?.nidn ?? '-' }}</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center font-semibold shrink-0">
            {{ dosenAuthStore.dosen?.namaLengkap?.charAt(0)?.toUpperCase() ?? 'D' }}
          </div>
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
        <div v-for="item in NAV_ITEMS" :key="item.label" class="relative">
          <button
            type="button"
            class="w-full md:w-auto flex items-center gap-2 px-4 py-2.5 rounded-md text-label-md transition-colors"
            :class="
              isItemActive(item)
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            "
            @click="item.children ? toggleGroup(item.label) : item.name && goTo(item.name)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span
              v-if="item.children"
              class="material-symbols-outlined transition-transform"
              style="font-size: 18px"
              :class="{ 'rotate-180': openGroup === item.label }"
            >
              expand_more
            </span>
          </button>

          <!-- Dropdown panel (Harian only) -->
          <div
            v-if="item.children && openGroup === item.label"
            class="md:absolute md:top-full md:left-0 md:mt-1 md:w-64 bg-surface-container-lowest md:border md:border-outline-variant md:rounded-lg md:shadow-[0px_8px_24px_rgba(27,54,93,0.12)] py-1 ml-4 md:ml-0"
          >
            <button
              v-for="child in item.children"
              :key="child.name"
              type="button"
              class="w-full flex items-center justify-between px-4 py-2.5 text-label-md text-left transition-colors"
              :class="
                isChildActive(child)
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              "
              @click="goTo(child.name)"
            >
              <span>{{ child.label }}</span>
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-1 max-w-screen-2xl w-full mx-auto p-4 md:p-8">
      <RouterView />
    </main>
  </div>
</template>
