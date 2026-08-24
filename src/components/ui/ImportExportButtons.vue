<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import FileInput from '@/components/ui/FileInput.vue';
import { downloadBlob } from '@/utils/download';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError } from '@/utils/swal';
import type { ImportResult } from '@/types/common';

const props = defineProps<{
  exportFn: () => Promise<Blob>;
  importFn: (file: string) => Promise<ImportResult>;
  templateFn: () => Promise<Blob>;
  filename: string;
  templateFilename: string;
  canImport?: boolean;
}>();

const emit = defineEmits<{ imported: [] }>();

const exporting = ref(false);
const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await props.exportFn();
    downloadBlob(blob, props.filename);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal export data'));
  } finally {
    exporting.value = false;
  }
};

const isImportOpen = ref(false);
const file = ref<string | null>(null);
const importing = ref(false);
const importError = ref<string | null>(null);
const result = ref<ImportResult | null>(null);
const downloadingTemplate = ref(false);

const handleDownloadTemplate = async () => {
  downloadingTemplate.value = true;
  try {
    const blob = await props.templateFn();
    downloadBlob(blob, props.templateFilename);
  } catch (err) {
    importError.value = extractErrorMessage(err, 'Gagal mengunduh template');
  } finally {
    downloadingTemplate.value = false;
  }
};

const openImport = () => {
  isImportOpen.value = true;
  file.value = null;
  importError.value = null;
  result.value = null;
};

const closeImport = () => {
  isImportOpen.value = false;
};

const handleImport = async () => {
  if (!file.value) {
    importError.value = 'Pilih file Excel (.xlsx) terlebih dahulu';
    return;
  }
  importing.value = true;
  importError.value = null;
  result.value = null;
  try {
    result.value = await props.importFn(file.value);
    if (result.value.successCount > 0) {
      toastSuccess(`${result.value.successCount} baris berhasil diimport`);
      emit('imported');
    }
    if (result.value.errorCount === 0) {
      closeImport();
    }
  } catch (err) {
    importError.value = extractErrorMessage(err, 'Gagal import data');
  } finally {
    importing.value = false;
  }
};
</script>

<template>
  <div class="flex items-center gap-2">
    <AppButton variant="secondary" icon="download" :disabled="exporting" @click="handleExport">
      {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
    </AppButton>
    <AppButton v-if="canImport !== false" variant="secondary" icon="upload" @click="openImport">Import Excel</AppButton>

    <Modal :model-value="isImportOpen" title="Import Excel" size="md" @update:model-value="closeImport">
      <div class="space-y-4">
        <div v-if="importError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ importError }}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          Unduh template di bawah, isi datanya, lalu upload kembali. Header kolom pada baris pertama harus sesuai
          template. Baris yang valid akan disimpan, baris yang tidak valid akan dilewati dan dilaporkan di bawah.
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-label-md text-primary hover:underline disabled:opacity-60 disabled:no-underline"
          :disabled="downloadingTemplate"
          @click="handleDownloadTemplate"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          {{ downloadingTemplate ? 'Mengunduh template...' : 'Download Template' }}
        </button>
        <FileInput v-model="file" accept=".xlsx" hint="File Excel (.xlsx)" />

        <div v-if="result" class="space-y-2">
          <p class="text-body-sm text-on-surface">
            <strong class="text-success">{{ result.successCount }} berhasil</strong>
            <span v-if="result.errorCount > 0"> &middot; <strong class="text-error">{{ result.errorCount }} gagal</strong></span>
          </p>
          <div v-if="result.errors.length" class="border border-outline-variant rounded-md max-h-48 overflow-y-auto">
            <table class="w-full text-left text-label-sm">
              <thead class="bg-surface-container-low sticky top-0">
                <tr>
                  <th class="p-2 font-semibold text-on-surface-variant">Baris</th>
                  <th class="p-2 font-semibold text-on-surface-variant">Pesan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="err in result.errors" :key="err.row">
                  <td class="p-2 text-on-surface-variant">{{ err.row }}</td>
                  <td class="p-2 text-on-surface">{{ err.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeImport">Tutup</AppButton>
        <AppButton :disabled="importing" @click="handleImport">{{ importing ? 'Mengimport...' : 'Import' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
