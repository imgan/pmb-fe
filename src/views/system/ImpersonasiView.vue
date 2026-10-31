<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { impersonasiApi, type ImpersonasiAkun, type ImpersonasiTipe } from '@/api/impersonasi';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { MENU } from '@/constants/menuCodes';
import { startPortalImpersonasi, startStaffImpersonasi } from '@/utils/impersonasi';
import { formatDateTime } from '@/utils/format';

const authStore = useAuthStore();
const canImpersonate = computed(() => authStore.permissionsFor(MENU.IMPERSONASI_MANAGEMENT).canCreate);

const TABS: { key: ImpersonasiTipe; label: string; icon: string }[] = [
  { key: 'staff', label: 'Karyawan (Akun Staff)', icon: 'badge' },
  { key: 'dosen', label: 'Dosen', icon: 'school' },
  { key: 'mahasiswa', label: 'Mahasiswa', icon: 'person' },
];

const COLUMNS: Record<ImpersonasiTipe, DataTableColumn[]> = {
  staff: [
    { key: 'name', label: 'Nama' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Email' },
    { key: 'lastLoginAt', label: 'Login Terakhir' },
    { key: 'isActive', label: 'Status', align: 'center' },
  ],
  dosen: [
    { key: 'namaLengkap', label: 'Nama' },
    { key: 'nik', label: 'NIP' },
    { key: 'nidn', label: 'NIDN' },
    { key: 'email', label: 'Email' },
    { key: 'isActive', label: 'Status', align: 'center' },
  ],
  mahasiswa: [
    { key: 'nim', label: 'NIM' },
    { key: 'namaLengkap', label: 'Nama' },
    { key: 'jurusan', label: 'Program Studi' },
    { key: 'tahunMasuk', label: 'Angkatan', align: 'center' },
    { key: 'email', label: 'Email' },
    { key: 'isActive', label: 'Status', align: 'center' },
  ],
};

const tipe = ref<ImpersonasiTipe>('staff');
const search = ref('');
const items = ref<ImpersonasiAkun[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const page = ref(1);
const pageSize = ref(20);
const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await impersonasiApi.list(tipe.value, { page: page.value, limit: pageSize.value, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat daftar akun');
  } finally {
    loading.value = false;
  }
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});
watch(tipe, () => {
  search.value = '';
  items.value = [];
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
onMounted(fetchItems);

const namaAkun = (item: ImpersonasiAkun) => item.name ?? item.namaLengkap ?? '-';

const target = ref<ImpersonasiAkun | null>(null);
const submitting = ref(false);
const actionError = ref<string | null>(null);
const isSelf = (item: ImpersonasiAkun) => tipe.value === 'staff' && item.id === authStore.user?.id;

const confirmMessage = computed(() => {
  if (!target.value) return '';
  const nama = namaAkun(target.value);
  if (tipe.value === 'staff') {
    return `Anda akan masuk sebagai "${nama}" di console staff. Sesi admin Anda disimpan dan bisa dipulihkan lewat tombol "Kembali ke akun admin". Semua aksi selama impersonasi tercatat atas nama akun tersebut.`;
  }
  return `Portal ${tipe.value === 'dosen' ? 'dosen' : 'mahasiswa'} akan dibuka di tab baru sebagai "${nama}". Sesi admin Anda tetap aktif di tab ini.`;
});

const masuk = async () => {
  if (!target.value) return;
  submitting.value = true;
  actionError.value = null;
  const adminName = authStore.user?.name ?? 'Admin';
  try {
    if (tipe.value === 'staff') {
      await startStaffImpersonasi(await impersonasiApi.staff(target.value.id), adminName);
      return;
    }
    if (tipe.value === 'dosen') {
      const result = await impersonasiApi.dosen(target.value.id);
      startPortalImpersonasi('dosen', result.accessToken, result.dosen.namaLengkap, adminName);
    } else {
      const result = await impersonasiApi.mahasiswa(target.value.id);
      startPortalImpersonasi('mahasiswa', result.accessToken, result.mahasiswa.namaLengkap, adminName);
    }
    target.value = null;
  } catch (err) {
    actionError.value = extractErrorMessage(err, 'Gagal masuk ke akun');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Impersonasi Akun"
      subtitle="Daftar seluruh akun karyawan, dosen, dan mahasiswa. Masuk sebagai akun tersebut untuk melihat & membantu persis seperti yang mereka lihat."
    />

    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-label-md font-medium transition-colors"
        :class="tipe === tab.key ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container'"
        @click="tipe = tab.key"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
        <PageSizeSelect v-model="pageSize" />
        <div class="w-full md:w-80">
          <SearchInput
            v-model="search"
            :placeholder="tipe === 'staff' ? 'Cari nama, username, email...' : tipe === 'dosen' ? 'Cari nama, NIP, NIDN, email...' : 'Cari NIM, nama, email...'"
          />
        </div>
      </div>

      <p v-if="error" class="p-4 text-body-sm text-error">{{ error }}</p>
      <DataTable :columns="COLUMNS[tipe]" :items="items" :loading="loading" empty-message="Tidak ada akun" :show-actions="canImpersonate">
        <template #cell-role="{ item }">{{ item.role?.name ?? '-' }}</template>
        <template #cell-lastLoginAt="{ item }">{{ item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '-' }}</template>
        <template #cell-nik="{ item }">{{ item.nik ?? '-' }}</template>
        <template #cell-email="{ item }">{{ item.email || '-' }}</template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-isActive="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Nonaktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <AppButton
            icon="login"
            variant="secondary"
            :disabled="!item.isActive || isSelf(item)"
            :title="isSelf(item) ? 'Akun Anda sendiri' : !item.isActive ? 'Akun nonaktif' : 'Masuk sebagai akun ini'"
            @click="
              actionError = null;
              target = item;
            "
          >
            Masuk
          </AppButton>
        </template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>

    <ConfirmDialog
      :open="!!target"
      :title="target ? `Masuk sebagai ${namaAkun(target)}?` : ''"
      :message="actionError ?? confirmMessage"
      confirm-label="Masuk"
      :loading="submitting"
      @confirm="masuk"
      @cancel="target = null"
    />
  </div>
</template>
