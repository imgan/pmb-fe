<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { dosenKoreksiSidangApi, dosenNilaiSidangApi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { toastError, toastSuccess } from '@/utils/swal';
import type { KoreksiSidangItem, NilaiSidangRow, PeranSidang } from '@/types/entities';

const PERAN_LABELS: Record<PeranSidang, string> = {
  PEMBIMBING_1: 'Pembimbing I',
  PEMBIMBING_2: 'Pembimbing II',
  PENGUJI_1: 'Penguji I',
  PENGUJI_2: 'Penguji II',
};

// Daftar mahasiswa sidang = baris (pendaftar x peran dosen) yang sama dengan halaman Nilai Sidang.
const sidangList = ref<NilaiSidangRow[]>([]);
const loadingList = ref(false);
const listError = ref<string | null>(null);
const rowKey = (row: NilaiSidangRow) => `${row.pendaftarSidangId}-${row.peran}`;
const selectedKey = ref<string | null>(null);
const selected = computed(() => sidangList.value.find((r) => rowKey(r) === selectedKey.value) ?? null);

const items = ref<KoreksiSidangItem[]>([]);
const loadingItems = ref(false);

const fetchSidang = async () => {
  loadingList.value = true;
  listError.value = null;
  try {
    sidangList.value = await dosenNilaiSidangApi.list();
    if (sidangList.value.length && !selected.value) selectRow(sidangList.value[0]);
  } catch (err) {
    listError.value = extractErrorMessage(err, 'Gagal memuat data sidang');
  } finally {
    loadingList.value = false;
  }
};

const fetchItems = async () => {
  if (!selected.value) return;
  loadingItems.value = true;
  try {
    items.value = await dosenKoreksiSidangApi.list(selected.value.pendaftarSidangId, selected.value.peran);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat butir koreksi'));
  } finally {
    loadingItems.value = false;
  }
};

const selectRow = (row: NilaiSidangRow) => {
  selectedKey.value = rowKey(row);
  cancelEdit();
  fetchItems();
};

onMounted(fetchSidang);

// ---- Tambah / ubah butir koreksi ----
const form = reactive({ babHalaman: '', uraian: '' });
const editingId = ref<number | null>(null);
const saving = ref(false);

const cancelEdit = () => {
  editingId.value = null;
  form.babHalaman = '';
  form.uraian = '';
};

const startEdit = (item: KoreksiSidangItem) => {
  editingId.value = item.id;
  form.babHalaman = item.babHalaman ?? '';
  form.uraian = item.uraian;
};

const handleSave = async () => {
  if (!selected.value) return;
  if (!form.uraian.trim()) {
    toastError('Uraian koreksi wajib diisi');
    return;
  }
  saving.value = true;
  try {
    const payload = { babHalaman: form.babHalaman.trim() || null, uraian: form.uraian.trim() };
    if (editingId.value) {
      await dosenKoreksiSidangApi.update(editingId.value, payload);
      toastSuccess('Butir koreksi diperbarui');
    } else {
      await dosenKoreksiSidangApi.create(selected.value.pendaftarSidangId, { ...payload, peran: selected.value.peran });
      toastSuccess('Butir koreksi ditambahkan');
    }
    cancelEdit();
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan butir koreksi'));
  } finally {
    saving.value = false;
  }
};

const toggleSelesai = async (item: KoreksiSidangItem) => {
  try {
    const updated = await dosenKoreksiSidangApi.update(item.id, { isSelesai: !item.isSelesai });
    item.isSelesai = updated.isSelesai;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memperbarui status revisi'));
  }
};

// ---- Hapus ----
const deleteTarget = ref<KoreksiSidangItem | null>(null);
const deleting = ref(false);
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await dosenKoreksiSidangApi.remove(deleteTarget.value.id);
    if (editingId.value === deleteTarget.value.id) cancelEdit();
    deleteTarget.value = null;
    toastSuccess('Butir koreksi dihapus');
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus butir koreksi'));
  } finally {
    deleting.value = false;
  }
};

// ---- Cetak ----
const printing = ref(false);
const handleCetak = async () => {
  if (!selected.value) return;
  printing.value = true;
  try {
    const { blob, filename } = await dosenKoreksiSidangApi.cetakPdf(selected.value.pendaftarSidangId, selected.value.peran);
    downloadBlob(blob, filename);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh lembar koreksi'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Lembar Koreksi Sidang" subtitle="Dosen / Laporan / Lembar Koreksi" />

    <div v-if="listError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ listError }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <!-- Daftar mahasiswa sidang -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden self-start">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Mahasiswa Sidang</div>
        <div v-if="loadingList" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
        <p v-else-if="!sidangList.length" class="p-6 text-center text-body-sm text-on-surface-variant">
          Belum ada mahasiswa sidang yang Anda bimbing atau uji.
        </p>
        <button
          v-for="row in sidangList"
          v-else
          :key="rowKey(row)"
          type="button"
          class="w-full text-left px-4 py-3 border-b border-outline-variant last:border-b-0 transition-colors"
          :class="rowKey(row) === selectedKey ? 'bg-surface-container' : 'hover:bg-surface-container-low'"
          @click="selectRow(row)"
        >
          <p class="text-body-md font-medium text-on-surface">{{ row.mahasiswa.namaLengkap }}</p>
          <p class="text-body-sm text-on-surface-variant">{{ row.mahasiswa.nim }} &middot; {{ PERAN_LABELS[row.peran] }}</p>
          <p v-if="row.jadwalSidang" class="text-label-sm text-on-surface-variant mt-0.5">
            Sidang {{ formatDate(row.jadwalSidang.tanggal) }}
          </p>
        </button>
      </section>

      <!-- Butir koreksi -->
      <section v-if="selected" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div class="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 class="text-headline-md font-semibold text-primary">{{ selected.mahasiswa.namaLengkap }}</h2>
            <p class="text-body-sm text-on-surface-variant">{{ selected.judul }}</p>
            <p class="text-body-sm text-on-surface-variant">Sebagai {{ PERAN_LABELS[selected.peran] }}</p>
          </div>
          <AppButton icon="print" :disabled="printing" @click="handleCetak">
            {{ printing ? 'Mengunduh...' : 'Cetak Lembar Koreksi' }}
          </AppButton>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 mb-3">
          <TextInput v-model="form.babHalaman" label="Bab / Halaman" placeholder="mis. Bab II, hal. 12" />
          <TextareaInput v-model="form.uraian" label="Uraian Koreksi" required :rows="2" />
        </div>
        <div class="flex gap-3 mb-6">
          <AppButton :icon="editingId ? 'save' : 'add'" :disabled="saving" @click="handleSave">
            {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Koreksi' }}
          </AppButton>
          <AppButton v-if="editingId" variant="secondary" @click="cancelEdit">Batal</AppButton>
        </div>

        <div class="overflow-x-auto border border-outline-variant rounded-md">
          <table class="w-full text-left border-collapse text-body-sm">
            <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
              <tr>
                <th class="p-3 w-12">No</th>
                <th class="p-3 w-40">Bab / Halaman</th>
                <th class="p-3">Uraian Koreksi</th>
                <th class="p-3 text-center w-28">Revisi Selesai</th>
                <th class="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-on-surface">
              <tr v-if="loadingItems">
                <td colspan="5" class="p-6 text-center text-on-surface-variant">Memuat butir koreksi...</td>
              </tr>
              <template v-else>
                <tr v-for="(item, idx) in items" :key="item.id" :class="editingId === item.id ? 'bg-surface-container-low' : ''">
                  <td class="p-3">{{ idx + 1 }}</td>
                  <td class="p-3">{{ item.babHalaman || '-' }}</td>
                  <td class="p-3 whitespace-pre-line">{{ item.uraian }}</td>
                  <td class="p-3 text-center">
                    <input type="checkbox" class="w-4 h-4 cursor-pointer" :checked="item.isSelesai" @change="toggleSelesai(item)" />
                  </td>
                  <td class="p-3 text-right whitespace-nowrap">
                    <button type="button" class="text-on-surface-variant hover:text-primary mr-3" title="Ubah" @click="startEdit(item)">
                      <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
                    </button>
                    <button type="button" class="text-on-surface-variant hover:text-error" title="Hapus" @click="deleteTarget = item">
                      <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
                    </button>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="5" class="p-6 text-center text-on-surface-variant">Belum ada butir koreksi.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Butir Koreksi"
      message="Yakin ingin menghapus butir koreksi ini?"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
