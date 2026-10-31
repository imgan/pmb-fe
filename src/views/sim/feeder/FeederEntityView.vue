<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import RowActions from '@/components/ui/RowActions.vue';
import RemoteLookupInput from '@/components/ui/RemoteLookupInput.vue';
import { simFeederApi, type FeederField, type FeederMeta, type FeederRow } from '@/api/simFeeder';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { downloadBlob } from '@/utils/download';
import { toastError, toastSuccess, confirmAction } from '@/utils/swal';
import type { PagingMeta } from '@/types/common';

// Halaman generik untuk semua menu Feeder PDDIKTI: key entitas & menu code datang dari meta
// route (lihat FEEDER_ENTITIES), kolom/form/aksi dari backend.
const route = useRoute();
const entityKey = computed(() => route.meta.feederEntity ?? '');
// Dihitung dari route aktif (bukan sekali saat setup) karena semua menu Feeder memakai instance
// komponen yang sama.
const authStore = useAuthStore();
const permissions = computed(() => authStore.permissionsFor(route.meta.menuCode ?? ''));
const canCreate = computed(() => permissions.value.canCreate);
const canUpdate = computed(() => permissions.value.canUpdate);
const canDelete = computed(() => permissions.value.canDelete);

const meta = ref<FeederMeta | null>(null);
const metaError = ref<string | null>(null);

const items = ref<FeederRow[]>([]);
const paging = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const search = ref('');
// Nilai filter tambahan per entitas (meta.filters), kosong = semua.
const filterValues = ref<Record<string, string>>({});
const activeFilters = () => Object.fromEntries(Object.entries(filterValues.value).filter(([, v]) => v !== '' && v != null));
const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};
const loading = ref(false);
const listError = ref<string | null>(null);

const showActions = computed(() => Boolean(meta.value?.editable) && (canUpdate.value || canDelete.value));

const fetchItems = async () => {
  if (!meta.value) return;
  loading.value = true;
  listError.value = null;
  try {
    const result = await simFeederApi.list(entityKey.value, {
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      ...activeFilters(),
    });
    items.value = result.data;
    paging.value = result.meta;
  } catch (err) {
    listError.value = extractErrorMessage(err, 'Gagal memuat data');
  } finally {
    loading.value = false;
  }
};

const loadEntity = async () => {
  meta.value = null;
  metaError.value = null;
  items.value = [];
  page.value = 1;
  search.value = '';
  filterValues.value = {};
  try {
    meta.value = await simFeederApi.meta(entityKey.value);
    filterValues.value = Object.fromEntries((meta.value.filters ?? []).map((f) => [f.key, '']));
    fetchItems();
  } catch (err) {
    metaError.value = extractErrorMessage(err, 'Gagal memuat menu Feeder');
  }
};

// Semua menu Feeder memakai komponen yang sama, jadi muat ulang saat pindah menu.
watch(entityKey, loadEntity, { immediate: true });
watch(page, fetchItems);
watch(pageSize, () => {
  page.value = 1;
  fetchItems();
});
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

const displayCell = (value: unknown) => (value === null || value === undefined || value === '' ? '-' : String(value));

// ---- Export & aksi massal ----
const exporting = ref(false);
const handleExport = async () => {
  exporting.value = true;
  try {
    const { blob, filename } = await simFeederApi.exportExcel(entityKey.value, activeFilters());
    downloadBlob(blob, filename);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal export data'));
  } finally {
    exporting.value = false;
  }
};

const runningAction = ref<string | null>(null);
const handleAction = async (action: FeederMeta['actions'][number]) => {
  if (action.confirm && !(await confirmAction({ title: action.label, text: action.confirm, danger: false }))) return;
  runningAction.value = action.key;
  try {
    const result = await simFeederApi.runAction(entityKey.value, action.key);
    toastSuccess(result.message);
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, `Gagal menjalankan ${action.label}`));
  } finally {
    runningAction.value = null;
  }
};

// ---- Form tambah / ubah ----
const formOpen = ref(false);
const editingId = ref<string | number | null>(null);
const form = reactive<Record<string, string | number | null>>({});
const lookupLabels = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const resetForm = () => {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.keys(lookupLabels).forEach((k) => delete lookupLabels[k]);
  meta.value?.fields.forEach((f) => {
    form[f.key] = f.type === 'lookup' ? null : '';
  });
  formError.value = null;
};

const openCreate = () => {
  editingId.value = null;
  resetForm();
  formOpen.value = true;
};

const openEdit = async (row: FeederRow) => {
  editingId.value = row.id;
  resetForm();
  formOpen.value = true;
  try {
    const record = await simFeederApi.get(entityKey.value, row.id);
    Object.entries(record.values).forEach(([k, v]) => {
      form[k] = v ?? (meta.value?.fields.find((f) => f.key === k)?.type === 'lookup' ? null : '');
    });
    Object.assign(lookupLabels, record.lookupLabels);
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal memuat data');
  }
};

const handleSave = async () => {
  saving.value = true;
  formError.value = null;
  try {
    const payload = { ...form };
    if (editingId.value !== null) {
      await simFeederApi.update(entityKey.value, editingId.value, payload);
      toastSuccess('Data berhasil diperbarui');
    } else {
      await simFeederApi.create(entityKey.value, payload);
      toastSuccess('Data berhasil ditambahkan');
    }
    formOpen.value = false;
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data');
  } finally {
    saving.value = false;
  }
};

const lookupSearch = (field: FeederField) => (term: string) => simFeederApi.lookup(field.lookup ?? '', term);
const wideField = (field: FeederField) => field.type === 'textarea' || field.type === 'lookup';

// ---- Hapus ----
const deleteTarget = ref<FeederRow | null>(null);
const deleting = ref(false);
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await simFeederApi.remove(entityKey.value, deleteTarget.value.id);
    toastSuccess('Data berhasil dihapus');
    deleteTarget.value = null;
    if (items.value.length === 1 && page.value > 1) page.value -= 1;
    else fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus data'));
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader :title="meta ? `Feeder ${meta.title}` : 'Feeder'" :subtitle="meta ? `Feeder PDDIKTI / ${meta.group}` : ''">
      <template v-if="meta" #actions>
        <div class="flex flex-wrap gap-2">
          <AppButton
            v-for="action in canCreate ? meta.actions : []"
            :key="action.key"
            variant="secondary"
            icon="autorenew"
            :disabled="runningAction !== null"
            @click="handleAction(action)"
          >
            {{ runningAction === action.key ? 'Memproses...' : action.label }}
          </AppButton>
          <AppButton variant="secondary" icon="download" :disabled="exporting" @click="handleExport">
            {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
          </AppButton>
          <AppButton v-if="meta.editable && canCreate" icon="add" @click="openCreate">Tambah</AppButton>
        </div>
      </template>
    </PageHeader>

    <div v-if="metaError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ metaError }}
    </div>

    <section v-if="meta" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <p v-if="meta.source" class="px-4 py-3 text-body-sm text-on-surface-variant border-b border-outline-variant flex items-start gap-2">
        <span class="material-symbols-outlined shrink-0" style="font-size: 18px">info</span>
        <span>{{ meta.source }}</span>
      </p>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto md:items-center">
          <div v-for="f in meta.filters ?? []" :key="f.key" class="w-full sm:w-56">
            <SelectInput
              v-model="filterValues[f.key]"
              :placeholder="`Semua ${f.label}`"
              :options="f.options"
              :aria-label="f.label"
              @change="onFilterChange"
            />
          </div>
          <div class="w-full md:w-72">
            <SearchInput v-model="search" placeholder="Cari NIM / nama / kode..." />
          </div>
        </div>
      </div>

      <div v-if="listError" class="p-4 text-body-sm text-error bg-error-container">{{ listError }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant">
            <tr class="text-label-md text-primary font-semibold">
              <th class="p-3 whitespace-nowrap">No</th>
              <th v-for="col in meta.columns" :key="col.key" class="p-3 whitespace-nowrap">{{ col.header }}</th>
              <th v-if="showActions" class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-on-surface">
            <tr v-if="loading">
              <td :colspan="meta.columns.length + 2" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <template v-else>
              <tr v-for="(row, idx) in items" :key="row.id" class="hover:bg-surface-container-low">
                <td class="p-3">{{ (paging.page - 1) * paging.limit + idx + 1 }}</td>
                <td v-for="col in meta.columns" :key="col.key" class="p-3 max-w-xs">
                  <span class="line-clamp-2" :title="displayCell(row[col.key])">{{ displayCell(row[col.key]) }}</span>
                </td>
                <td v-if="showActions" class="p-3 text-right whitespace-nowrap">
                  <div class="inline-flex gap-3">
                    <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(row)" @delete="deleteTarget = row" />
                  </div>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td :colspan="meta.columns.length + 2" class="p-8 text-center text-on-surface-variant">Belum ada data</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <Pagination v-model="page" :meta="paging" />
    </section>

    <Modal
      v-if="meta?.editable"
      v-model="formOpen"
      :title="`${editingId !== null ? 'Ubah' : 'Tambah'} ${meta.title}`"
      size="lg"
    >
      <div v-if="formError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ formError }}
      </div>
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSave">
        <div v-for="field in meta.fields" :key="field.key" :class="wideField(field) ? 'md:col-span-2' : ''">
          <RemoteLookupInput
            v-if="field.type === 'lookup'"
            v-model="form[field.key]"
            :label="field.label"
            :required="field.required"
            :initial-label="lookupLabels[field.key] ?? ''"
            :search="lookupSearch(field)"
          />
          <SelectInput
            v-else-if="field.type === 'select'"
            v-model="form[field.key]"
            :label="field.label"
            :required="field.required"
            :options="field.options ?? []"
          />
          <DateInput v-else-if="field.type === 'date'" v-model="form[field.key] as string" :label="field.label" :required="field.required" />
          <TextareaInput
            v-else-if="field.type === 'textarea'"
            v-model="form[field.key] as string"
            :label="field.label"
            :required="field.required"
            :rows="2"
          />
          <TextInput
            v-else
            v-model="form[field.key]"
            :label="field.label"
            :required="field.required"
            :type="field.type === 'number' ? 'number' : 'text'"
            :min="field.min"
            :max="field.max"
            :step="field.step"
          />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="handleSave">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Data"
      message="Yakin ingin menghapus data ini?"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
