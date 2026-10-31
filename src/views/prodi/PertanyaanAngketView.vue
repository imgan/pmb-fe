<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { pertanyaanAngketApi, type PertanyaanAngket } from '@/api/angketPelayanan';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Prodi → Pertanyaan Angket: kelola pertanyaan angket pelayanan yang wajib diisi mahasiswa sebelum
 * mengisi KRS (berlaku untuk semua prodi). Pertanyaan nonaktif tidak tampil di form mahasiswa;
 * pertanyaan yang sudah pernah dijawab tidak bisa dihapus (agar rekap lama tetap utuh).
 */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PERTANYAAN_ANGKET_MANAGEMENT);

const columns: DataTableColumn[] = [
  { key: 'urutan', label: 'Urutan', align: 'center' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'pertanyaan', label: 'Pertanyaan' },
  { key: 'jumlahJawaban', label: 'Dijawab', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
];

const items = ref<PertanyaanAngket[]>([]);
const kategoriList = ref<string[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');
const kategori = ref('');
const status = ref('');
const page = ref(1);
const pageSize = ref(10);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await pertanyaanAngketApi.list({ kategori: kategori.value || undefined, status: status.value || undefined });
    items.value = res.data;
    kategoriList.value = res.kategoriList;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pertanyaan angket');
  } finally {
    loading.value = false;
  }
};
onMounted(fetchData);
watch([kategori, status], () => {
  page.value = 1;
  fetchData();
});
watch([search, pageSize], () => (page.value = 1));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? items.value.filter((p) => [p.pertanyaan, p.kategori].some((v) => (v ?? '').toLowerCase().includes(q))) : items.value;
});
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const jumlahAktif = computed(() => items.value.filter((p) => p.isActive).length);

const kategoriOptions = computed(() => kategoriList.value.map((k) => ({ value: k, label: k })));
const statusOptions = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
];

// ---- Form tambah / ubah ----
const formOpen = ref(false);
const editing = ref<PertanyaanAngket | null>(null);
const form = reactive({ kategori: '', pertanyaan: '', urutan: '' as string | number | null, isActive: true });
const formErrors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const openForm = (row: PertanyaanAngket | null = null) => {
  editing.value = row;
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  Object.assign(form, {
    kategori: row?.kategori ?? '',
    pertanyaan: row?.pertanyaan ?? '',
    urutan: row?.urutan ?? '',
    isActive: row?.isActive ?? true,
  });
  formOpen.value = true;
};

const simpan = async () => {
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  if (form.pertanyaan.trim().length < 3) formErrors.pertanyaan = 'Pertanyaan wajib diisi (minimal 3 karakter)';
  const urutan = form.urutan === '' || form.urutan === null ? null : Number(form.urutan);
  if (urutan !== null && (!Number.isInteger(urutan) || urutan < 0)) formErrors.urutan = 'Urutan harus bilangan bulat ≥ 0';
  if (Object.keys(formErrors).length) return;
  saving.value = true;
  try {
    const payload = { kategori: form.kategori.trim() || null, pertanyaan: form.pertanyaan.trim(), urutan, isActive: form.isActive };
    if (editing.value) await pertanyaanAngketApi.update(editing.value.id, payload);
    else await pertanyaanAngketApi.create(payload);
    toastSuccess(editing.value ? 'Pertanyaan diperbarui' : 'Pertanyaan ditambahkan');
    formOpen.value = false;
    fetchData();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pertanyaan');
  } finally {
    saving.value = false;
  }
};

// Aktif/nonaktif langsung dari tabel.
const togglingId = ref<number | null>(null);
const toggleAktif = async (row: PertanyaanAngket) => {
  togglingId.value = row.id;
  try {
    await pertanyaanAngketApi.update(row.id, { isActive: !row.isActive });
    toastSuccess(row.isActive ? 'Pertanyaan dinonaktifkan' : 'Pertanyaan diaktifkan');
    fetchData();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah status'));
  } finally {
    togglingId.value = null;
  }
};

// ---- Hapus ----
const deleting = ref<PertanyaanAngket | null>(null);
const deleteLoading = ref(false);
const confirmDelete = async () => {
  if (!deleting.value) return;
  deleteLoading.value = true;
  try {
    await pertanyaanAngketApi.remove(deleting.value.id);
    toastSuccess('Pertanyaan dihapus');
    fetchData();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus pertanyaan'));
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Pertanyaan Angket"
      subtitle="Pertanyaan angket pelayanan yang wajib diisi mahasiswa sebelum mengisi KRS (berlaku untuk semua prodi)."
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openForm()">Tambah Pertanyaan</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
        <SelectInput v-model="kategori" label="Kategori" :options="kategoriOptions" placeholder="Semua Kategori" />
        <SelectInput v-model="status" label="Status" :options="statusOptions" placeholder="Semua Status" />
        <SearchInput v-model="search" placeholder="Cari pertanyaan / kategori..." />
      </div>

      <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
        <PageSizeSelect v-model="pageSize" />
        <p class="text-body-sm text-on-surface-variant">
          <strong class="text-on-surface">{{ jumlahAktif }}</strong> pertanyaan aktif tampil di form angket mahasiswa.
        </p>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="pageItems" :loading="loading" actions-align="center" empty-message="Belum ada pertanyaan">
        <template #cell-kategori="{ item }">{{ item.kategori ?? '-' }}</template>
        <template #cell-pertanyaan="{ item }">
          <span class="block max-w-xl whitespace-normal">{{ item.pertanyaan }}</span>
        </template>
        <template #cell-jumlahJawaban="{ item }"><span class="tabular-nums">{{ item.jumlahJawaban }}</span></template>
        <template #cell-status="{ item }">
          <button
            v-if="canUpdate"
            type="button"
            :disabled="togglingId === item.id"
            :title="item.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'"
            @click="toggleAktif(item)"
          >
            <StatusBadge :label="item.isActive ? 'Aktif' : 'Nonaktif'" :variant="item.isActive ? 'success' : 'neutral'" />
          </button>
          <StatusBadge v-else :label="item.isActive ? 'Aktif' : 'Nonaktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <div class="flex items-center justify-center gap-3">
            <button v-if="canUpdate" type="button" class="text-on-surface-variant hover:text-primary" title="Ubah" @click="openForm(item)">
              <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="text-on-surface-variant hover:text-error disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="item.jumlahJawaban > 0"
              :title="item.jumlahJawaban > 0 ? 'Sudah dijawab — nonaktifkan saja' : 'Hapus'"
              @click="deleting = item"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
            </button>
          </div>
        </template>
      </DataTable>

      <Pagination v-if="!loading && filtered.length" v-model="page" :meta="meta" />
    </section>

    <Modal v-model="formOpen" :title="editing ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'" size="md">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <!-- Input biasa (bukan TextInput) supaya atribut list/datalist sampai ke elemen input. -->
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-1">Kategori</span>
          <input
            v-model="form.kategori"
            list="kategori-angket"
            maxlength="100"
            placeholder="Pilih kategori yang ada atau ketik kategori baru"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <datalist id="kategori-angket">
            <option v-for="k in kategoriList" :key="k" :value="k" />
          </datalist>
        </label>
        <TextareaInput v-model="form.pertanyaan" label="Pertanyaan" required :rows="3" :error="formErrors.pertanyaan" />
        <TextInput
          v-model="form.urutan"
          type="number"
          label="Urutan Tampil"
          min="0"
          :error="formErrors.urutan"
          hint="Kosongkan untuk menaruh di urutan terakhir"
        />
        <CheckboxToggle v-model="form.isActive" label="Aktif" description="Tampil di form angket mahasiswa saat mengisi KRS" />
        <p v-if="editing && editing.jumlahJawaban" class="text-label-sm text-on-surface-variant">
          Pertanyaan ini sudah dijawab {{ editing.jumlahJawaban }} mahasiswa; perubahan teks ikut tampil di rekap hasil sebelumnya.
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleting"
      title="Hapus Pertanyaan"
      :message="`Hapus pertanyaan &quot;${deleting?.pertanyaan ?? ''}&quot;?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>
