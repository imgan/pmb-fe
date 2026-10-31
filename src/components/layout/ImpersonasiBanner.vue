<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  activePortalImpersonasi,
  activeStaffImpersonasi,
  stopPortalImpersonasi,
  stopStaffImpersonasi,
  type PortalTipe,
} from '@/utils/impersonasi';

// Penanda "sedang impersonasi" di console staff & portal dosen/mahasiswa (lihat utils/impersonasi.ts).
const route = useRoute();
const STAFF_PREFIXES = ['/admin', '/baak', '/sdi', '/prodi', '/keuangan', '/sim', '/modul-admin'];

const sesi = computed(() => {
  const path = route.path;
  if (path.endsWith('/login')) return null;
  const portal: PortalTipe | null = path.startsWith('/mahasiswa') ? 'mahasiswa' : path.startsWith('/dosen') ? 'dosen' : null;
  if (portal) {
    const flag = activePortalImpersonasi(portal);
    return flag ? { ...flag, keluar: () => stopPortalImpersonasi(portal), label: 'Akhiri & tutup tab' } : null;
  }
  if (STAFF_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const backup = activeStaffImpersonasi();
    return backup ? { ...backup, keluar: stopStaffImpersonasi, label: `Kembali ke akun ${backup.adminName}` } : null;
  }
  return null;
});
</script>

<template>
  <div
    v-if="sesi"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-full bg-inverse-surface text-inverse-on-surface shadow-lg text-body-sm"
  >
    <span class="material-symbols-outlined shrink-0" style="font-size: 20px">switch_account</span>
    <span class="truncate">
      Mode impersonasi: masuk sebagai <strong>{{ sesi.targetName }}</strong>
    </span>
    <button
      type="button"
      class="shrink-0 px-3 py-1 rounded-full bg-primary text-on-primary text-label-sm font-medium hover:opacity-90"
      @click="sesi.keluar()"
    >
      {{ sesi.label }}
    </button>
  </div>
</template>
