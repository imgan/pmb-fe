<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { useKampusStore } from '@/stores/kampus';
import MahasiswaProfileSettingsModal from '@/components/layout/MahasiswaProfileSettingsModal.vue';
import NotifikasiBell from '@/components/layout/NotifikasiBell.vue';

interface NavItem {
  icon: string;
  label: string;
  /** Route tujuan; parent dropdown tidak punya route sendiri. */
  name?: string;
  children?: { icon: string; label: string; name: string }[];
}

// Nav horizontal tetap (hardcoded), BUKAN menu dinamis dari database — portal Mahasiswa
// sengaja tidak memakai sistem Role/Menu/Permission admin, mengikuti pola portal Dosen.
const NAV_ITEMS: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', name: 'mahasiswa-dashboard' },
  { icon: 'badge', label: 'Biodata', name: 'mahasiswa-biodata' },
  {
    icon: 'event_note',
    label: 'Jadwal',
    children: [
      { icon: 'campaign', label: 'Pengumuman', name: 'mahasiswa-pengumuman' },
      { icon: 'event_note', label: 'Jadwal Kuliah', name: 'mahasiswa-jadwal' },
      { icon: 'calendar_month', label: 'Kalender Akademik', name: 'mahasiswa-kalender-akademik' },
    ],
  },
  {
    icon: 'school',
    label: 'Akademik',
    children: [
      { icon: 'assignment', label: 'KRS', name: 'mahasiswa-krs' },
      { icon: 'cast_for_education', label: 'E-learning', name: 'mahasiswa-elearning' },
      { icon: 'event_busy', label: 'Cuti', name: 'mahasiswa-pengajuan-cuti' },
      { icon: 'menu_book', label: 'Kurikulum', name: 'mahasiswa-kurikulum' },
      { icon: 'fact_check', label: 'Kehadiran', name: 'mahasiswa-kehadiran' },
      { icon: 'rate_review', label: 'Angket Dosen', name: 'mahasiswa-angket-dosen' },
      { icon: 'forum', label: 'Bimbingan DPA', name: 'mahasiswa-bimbingan' },
      { icon: 'mail', label: 'Cetak Surat', name: 'mahasiswa-surat-keterangan' },
    ],
  },
  {
    icon: 'workspace_premium',
    label: 'Tingkat Akhir',
    children: [{ icon: 'groups', label: 'Informasi Dosen', name: 'mahasiswa-informasi-dosen' }],
  },
  {
    icon: 'grading',
    label: 'Hasil Studi',
    children: [
      { icon: 'grading', label: 'Nilai', name: 'mahasiswa-nilai' },
      { icon: 'description', label: 'Transkrip', name: 'mahasiswa-transkrip' },
      { icon: 'edit_note', label: 'Pendaftaran Judul TA', name: 'mahasiswa-pengajuan-judul' },
      { icon: 'work', label: 'KKP', name: 'mahasiswa-pengajuan-kkp' },
      { icon: 'record_voice_over', label: 'Sidang', name: 'mahasiswa-pengajuan-sidang' },
    ],
  },
  { icon: 'payments', label: 'Pembayaran', name: 'mahasiswa-pembayaran' },
  { icon: 'id_card', label: 'Cetak KTM', name: 'mahasiswa-ktm' },
  { icon: 'help', label: 'Panduan', name: 'mahasiswa-panduan' },
];

const mahasiswaAuthStore = useMahasiswaAuthStore();
// Logo & nama kampus di pojok kiri header (master Kampus, endpoint publik).
const kampusStore = useKampusStore();
kampusStore.load();
const route = useRoute();
const router = useRouter();

const mobileOpen = ref(false);
const isProfileOpen = ref(false);

const isItemActive = (item: NavItem) =>
  item.children ? item.children.some((c) => c.name === route.name) : route.name === item.name;

// Dropdown parent menu (mis. Data Kampus); tertutup otomatis saat pindah halaman.
const openDropdown = ref<string | null>(null);
watch(
  () => route.name,
  () => {
    openDropdown.value = null;
  }
);

const goTo = (name: string) => {
  mobileOpen.value = false;
  openDropdown.value = null;
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
          <NotifikasiBell portal="mahasiswa" />
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
        class="max-w-screen-2xl mx-auto px-4 md:px-8 flex flex-col md:flex-row md:items-center gap-1 py-2 max-h-[calc(100vh-4rem)] overflow-y-auto md:max-h-none md:overflow-visible"
        :class="mobileOpen ? 'flex' : 'hidden md:flex'"
      >
        <template v-for="item in NAV_ITEMS" :key="item.label">
          <div v-if="item.children" class="relative w-full md:w-auto">
            <button
              type="button"
              class="w-full md:w-auto flex items-center gap-2 px-4 py-2.5 rounded-md text-label-md transition-colors"
              :class="
                isItemActive(item)
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              "
              :aria-expanded="openDropdown === item.label"
              @click="openDropdown = openDropdown === item.label ? null : item.label"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span
                class="material-symbols-outlined transition-transform ml-auto md:ml-0"
                style="font-size: 18px"
                :class="{ 'rotate-180': openDropdown === item.label }"
              >
                expand_more
              </span>
            </button>
            <!-- Klik di luar menutup dropdown (desktop). -->
            <div v-if="openDropdown === item.label" class="hidden md:block fixed inset-0 z-10" @click="openDropdown = null" />
            <div
              v-if="openDropdown === item.label"
              class="md:absolute md:left-0 md:top-full md:mt-1 md:min-w-52 z-20 md:bg-surface-container-lowest md:border md:border-outline-variant md:rounded-lg md:shadow-lg py-1 pl-6 md:pl-0"
            >
              <button
                v-for="child in item.children"
                :key="child.name"
                type="button"
                class="w-full flex items-center gap-2 px-4 py-2.5 text-label-md text-left transition-colors rounded-md md:rounded-none"
                :class="
                  route.name === child.name
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                "
                @click="goTo(child.name)"
              >
                <span class="material-symbols-outlined" style="font-size: 20px">{{ child.icon }}</span>
                <span>{{ child.label }}</span>
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="w-full md:w-auto flex items-center gap-2 px-4 py-2.5 rounded-md text-label-md transition-colors"
            :class="
              isItemActive(item)
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            "
            @click="goTo(item.name!)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </nav>
    </div>

    <main class="flex-1 max-w-screen-2xl w-full mx-auto p-4 md:p-8">
      <RouterView />
    </main>

    <MahasiswaProfileSettingsModal v-model="isProfileOpen" />
  </div>
</template>
