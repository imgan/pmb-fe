<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { useKampusStore } from '@/stores/kampus';
import { publicApi } from '@/api/public';
import type { Beasiswa, BiayaKuliah, Menu } from '@/types/entities';

interface DropdownItem {
  id: number | string;
  to: string;
  title: string;
}

const pesertaAuthStore = usePesertaAuthStore();
const kampusStore = useKampusStore();
const mobileMenuOpen = ref(false);
const openDropdown = ref<string | null>(null);
const mobileOpenDropdown = ref<string | null>(null);
const accountMenuOpen = ref(false);

const fallbackNavLinks = [
  { label: 'Beranda', href: '/' },
  { label: 'Program Studi', href: '/#program' },
  { label: 'Beasiswa', href: '/#beasiswa' },
  { label: 'Biaya Kuliah', href: '/#biaya-kuliah' },
  { label: 'Fasilitas', href: '/#fasilitas' },
];

const publicMenus = ref<Menu[]>([]);
const topLevelMenus = computed(() => publicMenus.value.filter((m) => !m.parentId));
const navLinks = computed(() =>
  topLevelMenus.value.length > 0
    ? topLevelMenus.value.map((menu) => ({ label: menu.name, href: menu.path || '/' }))
    : fallbackNavLinks
);

/** Sub-menus (is_public menus with a parent) grouped by their parent menu's name, e.g. "Informasi". */
const menuChildrenByParentLabel = computed(() => {
  const byId = new Map(publicMenus.value.map((m) => [m.id, m]));
  const grouped: Record<string, DropdownItem[]> = {};
  publicMenus.value.forEach((menu) => {
    if (!menu.parentId) return;
    const parent = byId.get(menu.parentId);
    if (!parent) return;
    (grouped[parent.name] ??= []).push({ id: menu.id, to: menu.path || '/', title: menu.name });
  });
  return grouped;
});

const beasiswaList = ref<Beasiswa[]>([]);
const biayaKuliahList = ref<BiayaKuliah[]>([]);

/** Nav labels that resolve to a dropdown instead of a plain link: CMS-slug pages first, else DB sub-menus. */
const dropdownItems = computed<Record<string, DropdownItem[]>>(() => ({
  ...menuChildrenByParentLabel.value,
  Beasiswa: beasiswaList.value.map((b) => ({ id: b.id, to: `/beasiswa/${b.slug}`, title: b.namaBeasiswa })),
  'Biaya Kuliah': biayaKuliahList.value.map((b) => ({ id: b.id, to: `/biaya-kuliah/${b.slug}`, title: b.judul })),
}));

onMounted(async () => {
  kampusStore.load();
  try {
    publicMenus.value = await publicApi.menus();
  } catch {
    publicMenus.value = [];
  }
  try {
    beasiswaList.value = await publicApi.beasiswaList();
  } catch {
    beasiswaList.value = [];
  }
  try {
    biayaKuliahList.value = await publicApi.biayaKuliahList();
  } catch {
    biayaKuliahList.value = [];
  }
});
</script>

<template>
  <header class="sticky top-0 z-50 bg-surface border-b border-outline-variant">
    <div class="flex justify-between items-center w-full px-4 md:px-12 max-w-7xl mx-auto h-20">
      <RouterLink to="/" class="text-headline-md font-bold text-primary flex items-center gap-2 min-w-0">
        <img
          v-if="kampusStore.kampus?.logoUrl"
          :src="kampusStore.kampus.logoUrl"
          :alt="kampusStore.kampus?.namaKampus || 'Logo'"
          class="h-14 w-auto max-w-[260px] object-contain shrink-0"
        />
        <template v-else>
          <span class="material-symbols-outlined filled text-primary shrink-0" style="font-size: 28px">school</span>
          <span class="truncate">{{ kampusStore.kampus?.namaKampus ?? 'Politeknik Bhakti Kartini' }}</span>
        </template>
      </RouterLink>

      <nav class="hidden md:flex items-center h-full gap-8">
        <template v-for="link in navLinks" :key="link.label">
          <div
            v-if="(dropdownItems[link.label]?.length ?? 0) > 0"
            class="relative h-full flex items-center"
            @mouseenter="openDropdown = link.label"
            @mouseleave="openDropdown = null"
          >
            <button
              type="button"
              class="text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold flex items-center gap-1 h-full border-b-2 border-transparent hover:border-surface-variant"
            >
              {{ link.label }}
              <span class="material-symbols-outlined transition-transform" style="font-size: 18px" :class="{ 'rotate-180': openDropdown === link.label }">
                expand_more
              </span>
            </button>
            <Transition name="dropdown-fade">
              <div
                v-if="openDropdown === link.label"
                class="absolute top-full left-0 w-72 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.15)] py-2 mt-0"
              >
                <template v-for="item in dropdownItems[link.label]" :key="item.id">
                  <a
                    v-if="item.to.includes('#')"
                    :href="item.to"
                    class="block px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                  >
                    {{ item.title }}
                  </a>
                  <RouterLink
                    v-else
                    :to="item.to"
                    class="block px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                  >
                    {{ item.title }}
                  </RouterLink>
                </template>
              </div>
            </Transition>
          </div>
          <a
            v-else
            :href="link.href"
            class="text-on-surface-variant hover:text-primary transition-colors text-label-md font-semibold flex items-center h-full border-b-2 border-transparent hover:border-surface-variant"
          >
            {{ link.label }}
          </a>
        </template>
      </nav>

      <div class="flex items-center gap-3">
        <template v-if="pesertaAuthStore.isAuthenticated">
          <div
            class="relative"
            @mouseenter="accountMenuOpen = true"
            @mouseleave="accountMenuOpen = false"
          >
            <button
              type="button"
              class="bg-primary text-on-primary text-label-md font-semibold px-6 py-2.5 rounded hover:bg-primary-container transition-all shadow-sm flex items-center gap-2"
            >
              Halo, {{ pesertaAuthStore.peserta?.namaLengkap.split(' ')[0] }}
              <span class="material-symbols-outlined transition-transform" style="font-size: 18px" :class="{ 'rotate-180': accountMenuOpen }">
                expand_more
              </span>
            </button>
            <Transition name="dropdown-fade">
              <div
                v-if="accountMenuOpen"
                class="absolute top-full right-0 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.15)] py-2 mt-0 z-10"
              >
                <RouterLink to="/pendaftaran/status" class="flex items-center gap-2 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
                  <span class="material-symbols-outlined" style="font-size: 18px">timeline</span>
                  Status Pendaftaran
                </RouterLink>
                <RouterLink to="/pendaftaran/biodata" class="flex items-center gap-2 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
                  <span class="material-symbols-outlined" style="font-size: 18px">person</span>
                  Biodata Saya
                </RouterLink>
                <RouterLink to="/pendaftaran/dokumen" class="flex items-center gap-2 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
                  <span class="material-symbols-outlined" style="font-size: 18px">upload_file</span>
                  Dokumen Saya
                </RouterLink>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <RouterLink
            to="/pendaftaran"
            class="hidden sm:flex bg-secondary-container text-on-secondary-container text-label-md font-semibold px-6 py-2.5 rounded hover:bg-secondary-fixed transition-all shadow-sm items-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">school</span>
            Daftar
          </RouterLink>
          <RouterLink
            to="/pendaftaran/masuk"
            class="bg-surface-container-high text-primary text-label-md font-semibold px-6 py-2.5 rounded hover:bg-surface-container-highest transition-all flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">login</span>
            Masuk
          </RouterLink>
        </template>
        <button
          aria-label="Buka menu"
          class="md:hidden text-on-surface p-2"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span class="material-symbols-outlined">{{ mobileMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </div>

    <nav v-if="mobileMenuOpen" class="md:hidden flex flex-col gap-1 px-4 pb-4 bg-surface border-t border-outline-variant">
      <template v-for="link in navLinks" :key="link.label">
        <div v-if="(dropdownItems[link.label]?.length ?? 0) > 0">
          <button
            type="button"
            class="w-full flex items-center justify-between text-on-surface-variant hover:text-primary text-label-md font-semibold py-2.5"
            @click="mobileOpenDropdown = mobileOpenDropdown === link.label ? null : link.label"
          >
            {{ link.label }}
            <span
              class="material-symbols-outlined transition-transform"
              style="font-size: 18px"
              :class="{ 'rotate-180': mobileOpenDropdown === link.label }"
            >
              expand_more
            </span>
          </button>
          <div v-if="mobileOpenDropdown === link.label" class="pl-4 flex flex-col gap-1 pb-1">
            <template v-for="item in dropdownItems[link.label]" :key="item.id">
              <a
                v-if="item.to.includes('#')"
                :href="item.to"
                class="text-on-surface-variant hover:text-primary text-body-sm py-2"
                @click="mobileMenuOpen = false"
              >
                {{ item.title }}
              </a>
              <RouterLink
                v-else
                :to="item.to"
                class="text-on-surface-variant hover:text-primary text-body-sm py-2"
                @click="mobileMenuOpen = false"
              >
                {{ item.title }}
              </RouterLink>
            </template>
          </div>
        </div>
        <a
          v-else
          :href="link.href"
          class="text-on-surface-variant hover:text-primary text-label-md font-semibold py-2.5"
          @click="mobileMenuOpen = false"
        >
          {{ link.label }}
        </a>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
