<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TahunAjaranView from '@/views/baak/TahunAjaranView.vue';
import TahunModulView from '@/views/admin/master/TahunModulView.vue';
import { useAuthStore } from '@/stores/auth';
import { MENU } from '@/constants/menuCodes';
import type { ModulTahun } from '@/api/tahunModul';

/**
 * Modul Admin › Tahun: seluruh pengaturan tahun dalam satu halaman bertab. Tiap tab tetap memakai izin menu asalnya,
 * jadi tab yang tidak boleh dilihat role tidak ditampilkan. Tab aktif tersimpan di URL (?tab=).
 */
interface TabTahun {
  key: string;
  label: string;
  title: string;
  menuCode: string;
  modul?: ModulTahun;
}
const SEMUA_TAB: TabTahun[] = [
  { key: 'akademik', label: 'Akademik', title: 'Prodi, BAAK, portal mahasiswa & dosen, Pos, dan SDM', menuCode: MENU.TAHUN_AJARAN_MANAGEMENT },
  { key: 'pmb', label: 'PMB', title: 'Penerimaan mahasiswa baru', menuCode: MENU.ADMIN_MASTER_TAHUN_PMB_MANAGEMENT, modul: 'pmb' },
  { key: 'keuangan', label: 'Kasir & Keuangan', title: 'Tagihan kasir & keuangan', menuCode: MENU.ADMIN_MASTER_TAHUN_KEUANGAN_MANAGEMENT, modul: 'keuangan' },
  { key: 'frs', label: 'FRS', title: 'Pengisian FRS', menuCode: MENU.ADMIN_MASTER_TAHUN_FRS_MANAGEMENT, modul: 'frs' },
  { key: 'ta-skripsi', label: 'TA/Skripsi', title: 'Proses Tugas Akhir/Skripsi', menuCode: MENU.ADMIN_MASTER_TAHUN_TA_SKRIPSI_MANAGEMENT, modul: 'ta-skripsi' },
  { key: 'sp', label: 'Semester Pendek', title: 'Semester Pendek', menuCode: MENU.ADMIN_MASTER_TAHUN_SP_MANAGEMENT, modul: 'sp' },
];

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const tabs = computed(() => SEMUA_TAB.filter((t) => authStore.permissionsFor(t.menuCode).canRead));
const aktif = computed(() => tabs.value.find((t) => t.key === route.query.tab) ?? tabs.value[0]);
const pilih = (key: string) => router.replace({ query: { ...route.query, tab: key } });
</script>

<template>
  <div>
    <div class="flex gap-1 mb-6 border-b border-outline-variant overflow-x-auto" role="tablist" aria-label="Jenis tahun">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="aktif?.key === t.key"
        :title="t.title"
        class="px-4 py-2.5 text-label-md whitespace-nowrap border-b-2 -mb-px transition-colors"
        :class="aktif?.key === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'"
        @click="pilih(t.key)"
      >
        {{ t.label }}
      </button>
    </div>
    <template v-if="aktif">
      <TahunModulView v-if="aktif.modul" :key="aktif.key" :modul="aktif.modul" :menu-code="aktif.menuCode" />
      <TahunAjaranView v-else />
    </template>
  </div>
</template>
