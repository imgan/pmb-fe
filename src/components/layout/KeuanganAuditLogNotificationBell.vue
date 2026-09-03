<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { auditLogApi } from '@/api/auditLog';
import { usePermission } from '@/composables/usePermission';
import { formatDateTime } from '@/utils/format';
import { MENU } from '@/constants/menuCodes';
import type { AuditLog } from '@/types/entities';

const POLL_INTERVAL_MS = 60_000;
const FETCH_LIMIT = 20;
const DISPLAY_LIMIT = 5;
const LAST_SEEN_KEY = 'keuangan-audit-log-last-seen-id';

const { canRead } = usePermission(MENU.KEUANGAN_AUDIT_LOG_MANAGEMENT);

const router = useRouter();
const isOpen = ref(false);
const loading = ref(false);
const recent = ref<AuditLog[]>([]);

const readLastSeenId = (): number => {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
};
const lastSeenId = ref(readLastSeenId());

const items = computed(() => recent.value.slice(0, DISPLAY_LIMIT));
const unseenCount = computed(() => recent.value.filter((log) => log.id > lastSeenId.value).length);

const fetchRecent = async () => {
  if (!canRead.value) return;
  loading.value = true;
  try {
    const result = await auditLogApi.list({
      module: 'Keuangan',
      limit: FETCH_LIMIT,
      sortBy: 'createdAt',
      sortDir: 'desc',
    });
    recent.value = result.data;
  } catch {
    // Diam-diam gagal — notifikasi bukan fitur kritis, jangan ganggu halaman lain dengan toast error.
  } finally {
    loading.value = false;
  }
};

const toggleOpen = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await fetchRecent();
    const newestId = recent.value[0]?.id;
    if (newestId && newestId > lastSeenId.value) {
      lastSeenId.value = newestId;
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(newestId));
      } catch {
        // localStorage tidak tersedia (mis. private browsing) — abaikan, badge cukup akurat di sesi ini.
      }
    }
  }
};

const closePanel = () => {
  isOpen.value = false;
};

const goToAuditLog = () => {
  closePanel();
  router.push({ name: 'keuangan-audit-log' });
};

let pollTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  fetchRecent();
  pollTimer = setInterval(fetchRecent, POLL_INTERVAL_MS);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div v-if="canRead" class="fixed top-4 right-4 md:right-8 z-40">
    <button
      type="button"
      class="relative w-11 h-11 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
      title="Notifikasi audit log Keuangan"
      @click="toggleOpen"
    >
      <span class="material-symbols-outlined" style="font-size: 22px">notifications</span>
      <span
        v-if="unseenCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-semibold flex items-center justify-center"
      >
        {{ unseenCount > 9 ? '9+' : unseenCount }}
      </span>
    </button>

    <div v-if="isOpen" class="fixed inset-0 z-30" @click="closePanel" />

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-96 max-w-[90vw] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.12)] z-40 overflow-hidden"
    >
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between">
        <span>Aktivitas Terbaru (Keuangan)</span>
      </div>

      <div v-if="loading" class="p-4 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!items.length" class="p-4 text-center text-body-sm text-on-surface-variant">
        Belum ada aktivitas tercatat.
      </div>
      <div v-else class="max-h-96 overflow-y-auto divide-y divide-outline-variant">
        <div v-for="log in items" :key="log.id" class="w-full text-left px-4 py-3">
          <p class="text-body-sm font-medium text-on-surface">{{ log.actorName ?? 'Sistem' }}</p>
          <p class="text-label-sm text-on-surface-variant mt-0.5">{{ log.description }}</p>
          <p class="text-label-sm text-on-surface-variant mt-0.5">{{ formatDateTime(log.createdAt) }}</p>
        </div>
      </div>

      <div class="p-2 border-t border-outline-variant">
        <button
          type="button"
          class="w-full text-center py-2 text-label-sm text-primary hover:underline"
          @click="goToAuditLog"
        >
          Lihat Semua Audit Log
        </button>
      </div>
    </div>
  </div>
</template>
