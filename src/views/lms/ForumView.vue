<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import LmsFilterBar from '@/components/lms/LmsFilterBar.vue';
import KontenDetailModal from '@/components/lms/KontenDetailModal.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { useLmsData } from '@/composables/useLmsFilter';
import { usePaginasi } from '@/composables/usePaginasi';
import { usePermission } from '@/composables/usePermission';
import { lmsConsoleApi, type LmsKomentar } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatDateTime } from '@/utils/format';
import { JENIS_KONTEN, waktuRelatif } from '@/utils/lmsKonten';

/**
 * LMS → Forum Diskusi: komentar dosen & mahasiswa pada konten e-learning seluruh kelas (tahun akademik terpilih),
 * terbaru di atas. Admin bisa menghapus komentar yang tidak pantas (moderasi).
 */
const route = useRoute();
const { canDelete } = usePermission(route.meta.menuCode as string);
const search = ref('');
const peran = ref<'' | 'DOSEN' | 'MAHASISWA'>('');
const { data, loading, error, muat } = useLmsData<{ ringkasan: { komentar: number; pengirim: number; konten: number }; rows: LmsKomentar[] }>(
  lmsConsoleApi.forum,
  () => ({ search: search.value, peran: peran.value }),
  'Gagal memuat forum',
);
const rows = computed(() => data.value?.rows ?? []);
const { page, limit, meta, halaman } = usePaginasi(rows);

const hapus = async (r: LmsKomentar) => {
  const ok = await confirmAction({ title: 'Hapus komentar?', text: `Komentar ${r.nama ?? ''}: "${r.isi.slice(0, 80)}"`, confirmLabel: 'Hapus' });
  if (!ok) return;
  try {
    await lmsConsoleApi.hapusKomentar(r.id);
    toastSuccess('Komentar dihapus');
    muat();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus komentar'));
  }
};
const detailOpen = ref(false);
const detailId = ref<number | null>(null);
const buka = (id: number) => {
  detailId.value = id;
  detailOpen.value = true;
};
const inisial = (nama: string | null) => (nama ?? '?').trim().charAt(0).toUpperCase();
</script>

<template>
  <div>
    <PageHeader title="Forum Diskusi" subtitle="LMS / Forum Diskusi — percakapan dosen & mahasiswa pada konten kelas." />
    <LmsFilterBar v-model:search="search" placeholder="Cari isi komentar, nama, konten...">
      <div class="flex rounded-lg border border-outline-variant overflow-hidden text-label-md h-10">
        <button
          v-for="s in [
            { key: '', label: 'Semua' },
            { key: 'DOSEN', label: 'Dosen' },
            { key: 'MAHASISWA', label: 'Mahasiswa' },
          ] as const"
          :key="s.key"
          type="button"
          class="px-3 transition-colors"
          :class="peran === s.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'"
          @click="peran = s.key"
        >
          {{ s.label }}
        </button>
      </div>
    </LmsFilterBar>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <PageSizeSelect v-model="limit" />
      <p v-if="data" class="text-body-sm text-on-surface-variant">
        {{ data.ringkasan.komentar }} komentar · {{ data.ringkasan.pengirim }} pengirim · {{ data.ringkasan.konten }} konten didiskusikan
      </p>
    </div>

    <div class="space-y-3" :class="{ 'opacity-60': loading }">
      <div
        v-if="!loading && !rows.length"
        class="p-10 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl"
      >
        Belum ada diskusi.
      </div>
      <article v-for="r in halaman" :key="r.id" class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex gap-3">
        <span
          class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold"
          :class="r.peran === 'DOSEN' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'"
        >
          {{ inisial(r.nama) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-body-sm">
            <span class="font-semibold text-on-surface">{{ r.nama ?? '-' }}</span>
            <span
              class="ml-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold"
              :class="r.peran === 'DOSEN' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
            >
              {{ r.peran === 'DOSEN' ? 'Dosen' : (r.nim ?? 'Mahasiswa') }}
            </span>
            <span class="ml-2 text-label-sm text-on-surface-variant" :title="formatDateTime(r.createdAt)">{{ waktuRelatif(r.createdAt) }}</span>
          </p>
          <p class="mt-1 text-body-md text-on-surface whitespace-pre-line break-words">{{ r.isi }}</p>
          <p class="mt-2 flex flex-wrap items-center gap-1.5 text-label-sm text-on-surface-variant">
            <span class="material-symbols-outlined rounded p-0.5" :class="JENIS_KONTEN[r.konten.jenis].kelas" style="font-size: 14px">
              {{ JENIS_KONTEN[r.konten.jenis].icon }}
            </span>
            <button type="button" class="font-medium text-on-surface hover:text-primary hover:underline" @click="buka(r.konten.id)">
              {{ r.konten.judul }}
            </button>
            ·
            <RouterLink :to="{ name: 'lms-kelas-detail', params: { id: r.kelas.id } }" class="hover:text-primary hover:underline">
              {{ r.kelas.namaMataKuliah }} {{ r.kelas.kelas }}
            </RouterLink>
          </p>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="self-start p-1.5 rounded-md text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
          title="Hapus komentar"
          @click="hapus(r)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
        </button>
      </article>
      <div v-if="rows.length" class="rounded-xl border border-outline-variant overflow-hidden">
        <Pagination v-model="page" :meta="meta" class="!border-t-0" />
      </div>
    </div>

    <KontenDetailModal v-model="detailOpen" :konten-id="detailId" />
  </div>
</template>
