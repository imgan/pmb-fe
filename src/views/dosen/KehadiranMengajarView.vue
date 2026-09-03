<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import { dosenJadwalApi, dosenPresensiApi, dosenRealisasiApi, type RealisasiMengajarPayload } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError } from '@/utils/swal';
import type {
  DosenPortalJadwal,
  PresensiMahasiswaRow,
  RealisasiMengajar,
  StatusKehadiranDosen,
  StatusKehadiranMahasiswa,
} from '@/types/entities';
import type { PagingMeta } from '@/types/common';

// ---- Opsi dropdown ----

const jadwalList = ref<DosenPortalJadwal[]>([]);
const jadwalOptions = computed(() =>
  jadwalList.value.map((j) => ({ value: j.id, label: `[${j.kodeMataKuliah}]${j.namaMataKuliah}-${j.kelas}` }))
);

// "Waktu Kuliah" adalah dropdown tampilan slot jam kuliah standar — model JadwalKuliah/KehadiranDosen
// tidak punya konsep "slot waktu" tersendiri (hanya field `jam` berupa angka urutan), jadi field ini
// murni bantu UI (meniru tata letak pada rancangan) dan tidak dikirim ke backend; jam masuk/keluar
// yang sesungguhnya sudah tercatat lewat dua dropdown jam & menit di bawahnya.
const WAKTU_KULIAH_OPTIONS = [
  { value: '07:00-08:40', label: '07:00 - 08:40' },
  { value: '08:40-10:20', label: '08:40 - 10:20' },
  { value: '10:20-12:00', label: '10:20 - 12:00' },
  { value: '13:00-14:40', label: '13:00 - 14:40' },
  { value: '14:40-16:20', label: '14:40 - 16:20' },
  { value: '16:20-18:00', label: '16:20 - 18:00' },
  { value: '18:30-20:10', label: '18:30 - 20:10' },
  { value: '20:10-21:50', label: '20:10 - 21:50' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const PERTEMUAN_OPTIONS = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Pertemuan ke-${i + 1}` }));
const STATUS_OPTIONS: { value: StatusKehadiranDosen; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'TIDAK_HADIR', label: 'Tidak Hadir' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
];
const statusLabel = (status: StatusKehadiranDosen) => STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
const STATUS_VARIANTS: Record<StatusKehadiranDosen, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HADIR: 'success',
  TIDAK_HADIR: 'danger',
  IZIN: 'warning',
  SAKIT: 'warning',
};

const PRESENSI_STATUS_OPTIONS: { value: StatusKehadiranMahasiswa; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'ALPA', label: 'Alpa' },
];

onMounted(async () => {
  try {
    jadwalList.value = await dosenJadwalApi.listMine();
  } catch {
    jadwalList.value = [];
  }
  fetchItems();
});

// ---- Form tambah realisasi ----

interface FormState {
  tanggalPertemuan: string;
  waktuKuliah: string;
  jadwalKuliahId: number | '';
  masukJam: string;
  masukMenit: string;
  pertemuanKe: number | '';
  keluarJam: string;
  keluarMenit: string;
  status: StatusKehadiranDosen | '';
}

const emptyForm = (): FormState => ({
  tanggalPertemuan: '',
  waktuKuliah: '',
  jadwalKuliahId: '',
  masukJam: '',
  masukMenit: '',
  pertemuanKe: '',
  keluarJam: '',
  keluarMenit: '',
  status: '',
});

const form = reactive(emptyForm());
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);

const validateForm = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tanggalPertemuan) errors.tanggalPertemuan = 'Tanggal pertemuan wajib diisi';
  if (!form.waktuKuliah) errors.waktuKuliah = 'Waktu kuliah wajib dipilih';
  if (!form.jadwalKuliahId) errors.jadwalKuliahId = 'Matakuliah wajib dipilih';
  if (!form.masukJam || !form.masukMenit) errors.masuk = 'Jam masuk wajib diisi';
  if (!form.pertemuanKe) errors.pertemuanKe = 'Pertemuan wajib dipilih';
  if (!form.keluarJam || !form.keluarMenit) errors.keluar = 'Jam keluar wajib diisi';
  if (!form.status) errors.status = 'Status wajib dipilih';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: RealisasiMengajarPayload = {
      jadwalKuliahId: Number(form.jadwalKuliahId),
      tanggalRealisasi: form.tanggalPertemuan,
      jamMasuk: `${form.masukJam}:${form.masukMenit}:00`,
      jamKeluar: `${form.keluarJam}:${form.keluarMenit}:00`,
      pertemuanKe: Number(form.pertemuanKe),
      status: form.status as StatusKehadiranDosen,
    };
    await dosenRealisasiApi.create(payload);
    toastSuccess('Realisasi mengajar berhasil disimpan');
    Object.assign(form, emptyForm());
    page.value = 1;
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan realisasi mengajar');
  } finally {
    submitting.value = false;
  }
};

// ---- Filter & tabel realisasi ----

const filterJadwalId = ref<number | ''>('');
const appliedFilterJadwalId = ref<number | ''>('');

const items = ref<RealisasiMengajar[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(false);
const listError = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  listError.value = null;
  try {
    const result = await dosenRealisasiApi.list({
      page: page.value,
      limit: 10,
      jadwalKuliahId: appliedFilterJadwalId.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    listError.value = extractErrorMessage(err, 'Gagal memuat realisasi mengajar');
  } finally {
    loading.value = false;
  }
};

const handleTampilkan = () => {
  appliedFilterJadwalId.value = filterJadwalId.value;
  page.value = 1;
  fetchItems();
};

watch(page, fetchItems);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'mengajar', label: 'Mengajar' },
  { key: 'sks', label: 'SKS', align: 'center' },
  { key: 'pertemuanKe', label: 'Pertemuan Ke', align: 'center' },
  { key: 'ruang', label: 'Ruang' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'status', label: 'Status', align: 'center' },
];

const formatTanggalJam = (item: RealisasiMengajar) => {
  const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(item.tanggalRealisasi)
  );
  const masuk = item.jamMasuk ?? '-';
  const keluar = item.jamKeluar ?? '-';
  return `${tanggal} / ${masuk}-${keluar}`;
};

// ---- Hapus realisasi ----

const deleteTarget = ref<RealisasiMengajar | null>(null);
const deleting = ref(false);

const requestDelete = (item: RealisasiMengajar) => {
  deleteTarget.value = item;
};

const cancelDelete = () => {
  deleteTarget.value = null;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await dosenRealisasiApi.remove(deleteTarget.value.id);
    toastSuccess('Realisasi mengajar berhasil dihapus');
    deleteTarget.value = null;
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus realisasi mengajar'));
  } finally {
    deleting.value = false;
  }
};

// ---- Presensi mahasiswa (per realisasi/pertemuan) ----

const presensiOpen = ref(false);
const presensiTarget = ref<RealisasiMengajar | null>(null);
const presensiRows = ref<PresensiMahasiswaRow[]>([]);
const presensiLoading = ref(false);
const presensiSaving = ref(false);
const presensiError = ref<string | null>(null);

const openPresensi = async (item: RealisasiMengajar) => {
  presensiTarget.value = item;
  presensiOpen.value = true;
  presensiRows.value = [];
  presensiError.value = null;
  presensiLoading.value = true;
  try {
    presensiRows.value = await dosenPresensiApi.get(item.id);
  } catch (err) {
    presensiError.value = extractErrorMessage(err, 'Gagal memuat presensi mahasiswa');
  } finally {
    presensiLoading.value = false;
  }
};

const closePresensi = () => {
  presensiOpen.value = false;
  presensiTarget.value = null;
};

const handleSavePresensi = async () => {
  if (!presensiTarget.value) return;
  const belumDiisi = presensiRows.value.filter((r) => !r.status);
  if (belumDiisi.length) {
    toastError('Isi status kehadiran untuk semua mahasiswa terlebih dahulu');
    return;
  }

  presensiSaving.value = true;
  try {
    presensiRows.value = await dosenPresensiApi.save(
      presensiTarget.value.id,
      presensiRows.value.map((r) => ({ mahasiswaId: r.mahasiswaId, status: r.status as StatusKehadiranMahasiswa, keterangan: r.keterangan }))
    );
    toastSuccess('Presensi mahasiswa berhasil disimpan');
    closePresensi();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan presensi mahasiswa'));
  } finally {
    presensiSaving.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Kehadiran Mengajar" subtitle="Dosen / Harian / Kehadiran Mengajar" />

    <!-- Form tambah -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-6">
      <h2 class="text-headline-md font-semibold text-primary mb-4">Tambah Realisasi Mengajar</h2>

      <div v-if="formError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ formError }}
      </div>

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Pertemuan <span class="text-error">*</span></span>
          <input
            v-model="form.tanggalPertemuan"
            type="date"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="errors.tanggalPertemuan ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
          />
          <p v-if="errors.tanggalPertemuan" class="mt-1 text-label-sm text-error">{{ errors.tanggalPertemuan }}</p>
        </label>

        <SelectInput
          v-model="form.waktuKuliah"
          label="Waktu Kuliah"
          required
          placeholder="--Waktu Kuliah--"
          :options="WAKTU_KULIAH_OPTIONS"
          :error="errors.waktuKuliah"
        />

        <SelectInput
          v-model="form.jadwalKuliahId"
          label="Matakuliah"
          required
          placeholder="--Matakuliah--"
          :options="jadwalOptions"
          :error="errors.jadwalKuliahId"
        />

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Pertemuan <span class="text-error">*</span></span>
          <select
            v-model="form.pertemuanKe"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="errors.pertemuanKe ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
          >
            <option value="">--Pertemuan--</option>
            <option v-for="o in PERTEMUAN_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p v-if="errors.pertemuanKe" class="mt-1 text-label-sm text-error">{{ errors.pertemuanKe }}</p>
        </label>

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Masuk <span class="text-error">*</span></span>
          <div class="flex items-center gap-2">
            <select
              v-model="form.masukJam"
              class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none"
              :class="errors.masuk ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
            >
              <option value="">Jam</option>
              <option v-for="o in HOUR_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <span class="text-on-surface-variant">:</span>
            <select
              v-model="form.masukMenit"
              class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none"
              :class="errors.masuk ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
            >
              <option value="">Menit</option>
              <option v-for="o in MINUTE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <p v-if="errors.masuk" class="mt-1 text-label-sm text-error">{{ errors.masuk }}</p>
        </div>

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Keluar <span class="text-error">*</span></span>
          <div class="flex items-center gap-2">
            <select
              v-model="form.keluarJam"
              class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none"
              :class="errors.keluar ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
            >
              <option value="">Jam</option>
              <option v-for="o in HOUR_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <span class="text-on-surface-variant">:</span>
            <select
              v-model="form.keluarMenit"
              class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none"
              :class="errors.keluar ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
            >
              <option value="">Menit</option>
              <option v-for="o in MINUTE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <p v-if="errors.keluar" class="mt-1 text-label-sm text-error">{{ errors.keluar }}</p>
        </div>

        <SelectInput
          v-model="form.status"
          label="Status"
          required
          placeholder="--Status--"
          :options="STATUS_OPTIONS"
          :error="errors.status"
        />
      </form>

      <div class="mt-4">
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </div>
    </section>

    <!-- Tabel realisasi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-6 pt-6">
        <h2 class="text-headline-md font-semibold text-primary mb-4">Realisasi Mengajar</h2>
      </div>

      <div class="px-6 pb-4 flex flex-col md:flex-row gap-3">
        <div class="w-full md:w-96">
          <SelectInput v-model="filterJadwalId" placeholder="-- Semua Matakuliah --" :options="jadwalOptions" />
        </div>
        <AppButton icon="filter_alt" @click="handleTampilkan">Tampilkan</AppButton>
      </div>

      <div v-if="listError" class="p-4 text-body-sm text-error bg-error-container">{{ listError }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada realisasi mengajar"
        actions-align="center"
      >
        <template #cell-no="{ item }">{{ (meta.page - 1) * meta.limit + items.indexOf(item) + 1 }}</template>
        <template #cell-tanggal="{ item }">{{ formatTanggalJam(item) }}</template>
        <template #cell-mengajar="{ item }">
          <div class="flex items-center gap-2">
            <span>{{ item.jadwalKuliah?.namaMataKuliah ?? '-' }}</span>
            <StatusBadge label="Offline" variant="neutral" />
          </div>
        </template>
        <template #cell-sks="{ item }">{{ item.jadwalKuliah?.sks ?? '-' }}</template>
        <template #cell-pertemuanKe="{ item }">{{ item.pertemuanKe ?? '-' }}</template>
        <template #cell-ruang="{ item }">{{ item.jadwalKuliah?.ruangan ?? '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.jadwalKuliah?.kelas ?? '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="STATUS_VARIANTS[item.status]" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors mr-3"
            title="Isi Presensi Mahasiswa"
            @click="openPresensi(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">fact_check</span>
          </button>
          <button type="button" class="text-on-surface-variant hover:text-error transition-colors" title="Hapus" @click="requestDelete(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">close</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Realisasi Mengajar"
      :message="`Yakin ingin menghapus realisasi mengajar tanggal ${deleteTarget ? formatTanggalJam(deleteTarget) : ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <Modal
      v-model="presensiOpen"
      title="Presensi Mahasiswa"
      :subtitle="presensiTarget ? `${presensiTarget.jadwalKuliah?.namaMataKuliah ?? '-'} · Pertemuan ke-${presensiTarget.pertemuanKe ?? '-'}` : ''"
      size="lg"
      @close="closePresensi"
    >
      <div v-if="presensiError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ presensiError }}
      </div>

      <div v-if="presensiLoading" class="text-center py-8 text-body-sm text-on-surface-variant">Memuat data mahasiswa...</div>

      <p v-else-if="!presensiRows.length" class="text-center py-8 text-body-sm text-on-surface-variant">
        Belum ada mahasiswa dengan KRS disetujui pada kelas ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3">NIM</th>
              <th class="p-3">Nama Mahasiswa</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="row in presensiRows" :key="row.mahasiswaId">
              <td class="p-3">{{ row.nim }}</td>
              <td class="p-3">{{ row.namaLengkap }}</td>
              <td class="p-3">
                <div class="flex gap-3 flex-wrap">
                  <label v-for="opt in PRESENSI_STATUS_OPTIONS" :key="opt.value" class="flex items-center gap-1.5 cursor-pointer">
                    <input v-model="row.status" type="radio" :value="opt.value" class="w-4 h-4" />
                    <span class="text-body-sm text-on-surface">{{ opt.label }}</span>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="closePresensi">Batal</AppButton>
        <AppButton :disabled="presensiSaving || presensiLoading || !presensiRows.length" @click="handleSavePresensi">
          {{ presensiSaving ? 'Menyimpan...' : 'Simpan Presensi' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>
