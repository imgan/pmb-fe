<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { useKampusStore } from '@/stores/kampus';
import DosenProfileSettingsModal from '@/components/layout/DosenProfileSettingsModal.vue';
import NotifikasiBell from '@/components/layout/NotifikasiBell.vue';
import RingkasanDosenModal from '@/components/elearning/RingkasanDosenModal.vue';
import { RINGKASAN_DOSEN_KEY } from '@/api/elearning';
import { dosenTahunAkademikStorage } from '@/api/dosenHttp';

// Tahun akademik pilihan Profil → Setting Tahun Akademik (berubah lewat reload halaman).
const tahunAkademikTerpilih = dosenTahunAkademikStorage.get();

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
// tidak memakai sistem Role/Menu/Permission admin. Item dengan `children` tampil sebagai dropdown.
const NAV_ITEMS: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', name: 'dosen-dashboard' },
  {
    icon: 'supervisor_account',
    label: 'Bimbingan',
    children: [
      { name: 'dosen-mahasiswa-pa', label: 'Mahasiswa Bimbingan Akademik' },
      { name: 'dosen-bimbingan-ta', label: 'Pembimbing TA' },
      { name: 'dosen-nilai-sidang', label: 'Nilai Sidang' },
      { name: 'dosen-referensi-judul', label: 'Referensi Judul TA' },
    ],
  },
  {
    icon: 'co_present',
    label: 'Perkuliahan',
    children: [
      { name: 'dosen-elearning', label: 'E-learning' },
      { name: 'dosen-kelas-kuliah', label: 'Kelas Kuliah' },
      { name: 'dosen-kehadiran-mengajar', label: 'Kehadiran Mengajar' },
      { name: 'dosen-pengumuman', label: 'Pengumuman' },
      { name: 'dosen-jadwal-ujian', label: 'Jadwal Ujian' },
      { name: 'dosen-periodik', label: 'Input Nilai' },
    ],
  },
  { icon: 'article', label: 'Silabus', name: 'dosen-silabus-matakuliah' },
  { icon: 'event_available', label: 'Kesediaan Mengajar', name: 'dosen-kesediaan-mengajar' },
  {
    icon: 'summarize',
    label: 'Laporan',
    children: [
      { name: 'dosen-rekap', label: 'Rekap Mahasiswa' },
      { name: 'dosen-laporan-elearning', label: 'Laporan E-learning' },
      { name: 'dosen-lembar-koreksi', label: 'Lembar Koreksi' },
      { name: 'dosen-krs-bimbingan', label: 'KRS Bimbingan' },
    ],
  },
  { icon: 'help', label: 'Panduan', name: 'dosen-panduan-sistem' },
];

const dosenAuthStore = useDosenAuthStore();
// Logo kampus di pojok kiri header (master Kampus, endpoint publik).
const kampusStore = useKampusStore();
kampusStore.load();
const route = useRoute();
const router = useRouter();

const openGroup = ref<string | null>(null);
const mobileOpen = ref(false);
const isProfileOpen = ref(false);

// Popup "Ringkasan Minggu Ini" (jadwal & tugas) — sekali setelah login.
const ringkasanOpen = ref(false);
onMounted(() => {
  try {
    if (sessionStorage.getItem(RINGKASAN_DOSEN_KEY)) {
      sessionStorage.removeItem(RINGKASAN_DOSEN_KEY);
      ringkasanOpen.value = true;
    }
  } catch {
    // penyimpanan sesi tidak tersedia — popup dilewati.
  }
});

const toggleGroup = (label: string) => {
  openGroup.value = openGroup.value === label ? null : label;
};

// Halaman turunan (mis. dosen-mata-kuliah-rps) ikut menandai menu induknya.
const isChildActive = (child: NavChild) => route.name === child.name || String(route.name ?? '').startsWith(`${child.name}-`);
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
    <!-- Header + menu atas tetap terlihat (sticky) saat halaman di-scroll -->
    <div class="sticky top-0 z-40 shadow-sm">
    <header class="bg-primary text-on-primary">
      <div class="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button type="button" class="md:hidden" @click="mobileOpen = !mobileOpen">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <!-- Logo kampus sudah memuat nama kampus; teks nama hanya tampil bila logo belum diisi. -->
          <img
            v-if="kampusStore.kampus?.logoUrl"
            :src="kampusStore.kampus.logoUrl"
            :alt="kampusStore.kampus.namaKampus || 'Logo kampus'"
            class="h-11 w-auto max-w-[200px] object-contain shrink-0"
          />
          <template v-else>
            <span class="material-symbols-outlined" style="font-size: 24px">school</span>
            <span class="font-semibold text-headline-md truncate">{{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</span>
          </template>
        </div>
        <div class="flex items-center gap-3">
          <!-- Lonceng notifikasi: chat, komentar, tugas, konten baru, nilai. -->
          <NotifikasiBell portal="dosen" />
          <button
            type="button"
            class="flex items-center gap-3 hover:opacity-90 transition-opacity"
            title="Profil Saya (tahun akademik, foto & password)"
            @click="isProfileOpen = true"
          >
            <div class="hidden sm:flex flex-col items-end leading-tight">
              <span class="text-label-md font-medium">{{ dosenAuthStore.dosen?.namaLengkap ?? '-' }}</span>
              <span class="text-body-sm opacity-80">
                NIDN {{ dosenAuthStore.dosen?.nidn ?? '-' }}<template v-if="tahunAkademikTerpilih"> &middot; TA {{ tahunAkademikTerpilih.label }}</template>
              </span>
            </div>
            <div
              v-if="dosenAuthStore.dosen?.photo"
              class="w-9 h-9 rounded-full bg-cover bg-center shrink-0"
              :style="{ backgroundImage: `url(${dosenAuthStore.dosen.photo})` }"
            />
            <div v-else class="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center font-semibold shrink-0">
              {{ dosenAuthStore.dosen?.namaLengkap?.charAt(0)?.toUpperCase() ?? 'D' }}
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
        class="max-w-screen-2xl mx-auto px-4 md:px-8 flex flex-col md:flex-row md:items-center gap-1 py-2 max-h-[calc(100vh-4rem)] overflow-y-auto md:max-h-none md:overflow-visible"
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
    </div>

    <main class="flex-1 max-w-screen-2xl w-full mx-auto p-4 md:p-8">
      <RouterView />
    </main>

    <DosenProfileSettingsModal v-model="isProfileOpen" />
    <RingkasanDosenModal v-if="ringkasanOpen" v-model="ringkasanOpen" />
  </div>
</template>
