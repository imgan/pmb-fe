<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FileInput from '@/components/ui/FileInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { toastSuccess, toastError } from '@/utils/swal';
import type { AksiImportTagihan, ImportTagihanSummary, ImportVaRow } from '@/types/entities';

/**
 * Import Virtual Account dari file bank: VA berganti tiap bulan, jadi tiap baris = satu VA mahasiswa
 * untuk satu periode (periode_open s.d. periode_close). NIM + periode_open yang sama diperbarui.
 */
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>();

const AKSI_LABEL: Record<AksiImportTagihan, string> = { BARU: 'Baru', UBAH: 'Diperbarui', TETAP: 'Tetap', GAGAL: 'Gagal' };
const AKSI_VARIANT: Record<AksiImportTagihan, 'success' | 'warning' | 'danger' | 'neutral'> = {
  BARU: 'success',
  UBAH: 'warning',
  TETAP: 'neutral',
  GAGAL: 'danger',
};

const file = ref<string | null>(null);
const fileName = ref<string | null>(null);
const previewing = ref(false);
const committing = ref(false);
const error = ref<string | null>(null);
const preview = ref<{ summary: ImportTagihanSummary; rows: ImportVaRow[] } | null>(null);
const filter = ref<'' | AksiImportTagihan>('');

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    file.value = null;
    fileName.value = null;
    preview.value = null;
    error.value = null;
    filter.value = '';
  }
);
watch(file, () => {
  preview.value = null;
  error.value = null;
});

const close = () => emit('update:modelValue', false);

const downloadTemplate = async () => {
  try {
    downloadBlob(await tagihanKuliahApi.importVaTemplate(), 'template-import-va.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh template'));
  }
};

const handlePreview = async () => {
  if (!file.value) {
    error.value = 'Pilih file Excel terlebih dahulu';
    return;
  }
  previewing.value = true;
  error.value = null;
  try {
    preview.value = await tagihanKuliahApi.importVaPreview(file.value);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membaca file');
  } finally {
    previewing.value = false;
  }
};

const rows = computed(() => (preview.value?.rows ?? []).filter((r) => !filter.value || r.aksi === filter.value));
const jumlahProses = computed(() => (preview.value ? preview.value.summary.baru + preview.value.summary.ubah : 0));

const handleCommit = async () => {
  if (!file.value || !preview.value) return;
  committing.value = true;
  error.value = null;
  try {
    const { summary: s } = await tagihanKuliahApi.importVaCommit(file.value);
    toastSuccess(`Import VA selesai: ${s.baru} baru, ${s.ubah} diperbarui, ${s.tetap} tetap, ${s.gagal} gagal`);
    emit('done');
    close();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memproses import VA');
  } finally {
    committing.value = false;
  }
};

const FILTERS = ['', 'BARU', 'UBAH', 'TETAP', 'GAGAL'] as const;
const jumlah = (k: (typeof FILTERS)[number]) => {
  if (!preview.value) return 0;
  const s = preview.value.summary;
  return k === '' ? s.totalRows : { BARU: s.baru, UBAH: s.ubah, TETAP: s.tetap, GAGAL: s.gagal }[k];
};
const tanggal = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v) : v || '-');
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="Import Virtual Account"
    subtitle="Nomor VA bank per mahasiswa per periode"
    size="lg"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="space-y-4">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div class="text-body-sm text-on-surface-variant space-y-1">
        <p>
          Kolom: <strong>No VA, Nim</strong>, Name, Prodi, <strong>periode_open, periode_close</strong> (DD/MM/YYYY), Tagihan.
        </p>
        <p>
          VA berganti tiap bulan: setiap baris disimpan sebagai VA untuk periodenya. NIM + periode_open yang sudah ada akan
          <strong>diperbarui</strong>. Mahasiswa melihat VA yang sedang berlaku di halaman Pembayaran.
        </p>
        <p>Format kolom No VA &amp; Nim sebagai <strong>Text</strong> di Excel agar nomor panjang tidak berubah.</p>
      </div>
      <button type="button" class="inline-flex items-center gap-1.5 text-label-md text-primary hover:underline" @click="downloadTemplate">
        <span class="material-symbols-outlined" style="font-size: 18px">description</span>
        Download Template
      </button>
      <FileInput v-model="file" v-model:file-name="fileName" accept=".xlsx" hint="File Excel (.xlsx)" />

      <template v-if="preview">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          <button
            v-for="k in FILTERS"
            :key="k"
            type="button"
            class="p-2 rounded-md border text-label-sm"
            :class="filter === k ? 'border-primary bg-surface-container' : 'border-outline-variant'"
            @click="filter = k"
          >
            <span class="block text-title-sm font-semibold" :class="k === 'GAGAL' && preview.summary.gagal ? 'text-error' : 'text-on-surface'">
              {{ jumlah(k) }}
            </span>
            {{ k === '' ? 'Semua baris' : AKSI_LABEL[k] }}
          </button>
        </div>
        <div class="border border-outline-variant rounded-md max-h-80 overflow-auto">
          <table class="w-full text-left text-label-sm">
            <thead class="bg-surface-container-low sticky top-0">
              <tr>
                <th class="p-2 font-semibold">Baris</th>
                <th class="p-2 font-semibold">NIM / Nama</th>
                <th class="p-2 font-semibold">No VA</th>
                <th class="p-2 font-semibold">Periode</th>
                <th class="p-2 font-semibold text-right">Tagihan</th>
                <th class="p-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="r in rows" :key="r.rowNumber" :class="r.aksi === 'GAGAL' ? 'bg-error-container/40' : ''">
                <td class="p-2">{{ r.rowNumber }}</td>
                <td class="p-2">
                  {{ r.nim || '-' }}
                  <span v-if="r.namaLengkap" class="block text-on-surface-variant">{{ r.namaLengkap }}</span>
                </td>
                <td class="p-2 tabular-nums whitespace-nowrap">{{ r.noVirtualAccount || '-' }}</td>
                <td class="p-2 whitespace-nowrap">{{ tanggal(r.periodeOpen) }} – {{ tanggal(r.periodeClose) }}</td>
                <td class="p-2 text-right whitespace-nowrap">{{ r.nominal != null ? formatCurrencyIdr(r.nominal) : '-' }}</td>
                <td class="p-2">
                  <StatusBadge :label="AKSI_LABEL[r.aksi]" :variant="AKSI_VARIANT[r.aksi]" />
                  <span v-if="r.error" class="block mt-1 text-error">{{ r.error }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="preview.summary.gagal" class="text-body-sm text-error">
          {{ preview.summary.gagal }} baris gagal tidak akan diproses. Perbaiki di file lalu import ulang, atau lanjutkan untuk memproses
          baris yang valid saja.
        </p>
      </template>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="close">Batal</AppButton>
      <AppButton v-if="!preview" icon="preview" :disabled="previewing || !file" @click="handlePreview">
        {{ previewing ? 'Memeriksa...' : 'Preview' }}
      </AppButton>
      <AppButton v-else icon="upload" :disabled="committing || !jumlahProses" @click="handleCommit">
        {{ committing ? 'Memproses...' : jumlahProses ? `Proses ${jumlahProses} Baris` : 'Tidak ada perubahan' }}
      </AppButton>
    </template>
  </Modal>
</template>
