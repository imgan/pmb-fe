<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { biodataMahasiswaApi } from '@/api/biodataMahasiswa';
import { mahasiswaApi, type MahasiswaBiodataPayload } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { BiodataMahasiswaItem, StatusMasukMahasiswa } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const STATUS_MASUK_LABELS: Record<StatusMasukMahasiswa, string> = {
  BARU: 'Baru',
  TRANSFER_LUAR: 'Transfer Luar',
  TRANSFER_DALAM: 'Transfer Dalam',
  TRANSFER_LUAR_KARYAWAN: 'Transfer Luar Karyawan',
  TRANSFER_DALAM_KARYAWAN: 'Transfer Dalam Karyawan',
};

const nimInput = ref('');
const appliedNim = ref('');

const items = ref<BiodataMahasiswaItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await biodataMahasiswaApi.list({ page: page.value, limit: 10, nim: appliedNim.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data biodata mahasiswa');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedNim.value = nimInput.value.trim();
  page.value = 1;
  fetchItems();
};

watch(page, fetchItems);
fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama lengkap' },
  { key: 'hp', label: 'HP' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin', align: 'center' },
  { key: 'status', label: 'Status' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

// ---- Modal: Biodata Mahasiswa (sama seperti modal di modul BAAK) ----
const agamaOptions = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen', label: 'Kristen' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Khonghucu', label: 'Khonghucu' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const jenisTinggalOptions = [
  { value: 'Orang Tua', label: 'Orang Tua' },
  { value: 'Wali', label: 'Wali' },
  { value: 'Kos/Asrama', label: 'Kos/Asrama' },
  { value: 'Rumah Sendiri', label: 'Rumah Sendiri' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const alatTransportasiOptions = [
  { value: 'Jalan Kaki', label: 'Jalan Kaki' },
  { value: 'Kendaraan Pribadi', label: 'Kendaraan Pribadi' },
  { value: 'Angkutan Umum', label: 'Angkutan Umum' },
  { value: 'Kendaraan Sekolah/Kampus', label: 'Kendaraan Sekolah/Kampus' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const waktuKuliahOptions = [
  { value: 'Pagi', label: 'Pagi' },
  { value: 'Siang', label: 'Siang' },
  { value: 'Malam', label: 'Malam' },
];
const statusBelajarOptions = [
  { value: 'Non Shift', label: 'Non Shift' },
  { value: 'Shift', label: 'Shift' },
];
const statusKuliahBiodataOptions = [
  { value: 'Baru', label: 'Baru' },
  { value: 'Lama', label: 'Lama' },
  { value: 'Pindahan', label: 'Pindahan' },
];
const statusDiktiOptions = [
  { value: 'Mahasiswa Reguler', label: 'Mahasiswa Reguler' },
  { value: 'Mahasiswa Asing', label: 'Mahasiswa Asing' },
  { value: 'Mahasiswa Pindahan', label: 'Mahasiswa Pindahan' },
  { value: 'Mahasiswa Melanjutkan', label: 'Mahasiswa Melanjutkan' },
];

const isBiodataOpen = ref(false);
const biodataTarget = ref<BiodataMahasiswaItem | null>(null);
const biodataLoading = ref(false);
const biodataError = ref<string | null>(null);
const biodataSubmitting = ref(false);

const emptyBiodataForm = (): Record<string, string> => ({
  tempatLahir: '',
  tanggalLahir: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  noKtp: '',
  npwp: '',
  jalan: '',
  dusun: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kodePos: '',
  propinsi: '',
  jenisTinggal: '',
  alatTransportasi: '',
  kelas: '',
  programStudi: '',
  waktuKuliah: '',
  statusBelajar: '',
  statusKuliah: '',
  statusDikti: '',
  email: '',
  hp: '',
  almamater: '',
  namaAyah: '',
  pekerjaanAyah: '',
  namaIbu: '',
  pekerjaanIbu: '',
});

const biodataForm = reactive(emptyBiodataForm());

const openBiodata = async (item: BiodataMahasiswaItem) => {
  biodataTarget.value = item;
  isBiodataOpen.value = true;
  biodataError.value = null;
  biodataLoading.value = true;
  Object.assign(biodataForm, emptyBiodataForm());
  try {
    const biodata = await mahasiswaApi.getBiodata(item.id);
    if (biodata) {
      Object.keys(biodataForm).forEach((key) => {
        const value = (biodata as unknown as Record<string, string | null>)[key];
        (biodataForm as Record<string, string>)[key] = value ?? '';
      });
      biodataForm.tanggalLahir = biodata.tanggalLahir?.slice(0, 10) ?? '';
    } else if (item.jurusan) {
      biodataForm.programStudi = item.jurusan.namaJurusan;
    }
  } catch (err) {
    biodataError.value = extractErrorMessage(err, 'Gagal memuat biodata mahasiswa');
  } finally {
    biodataLoading.value = false;
  }
};

const closeBiodata = () => {
  isBiodataOpen.value = false;
  biodataTarget.value = null;
};

const handleSaveBiodata = async () => {
  if (!biodataTarget.value) return;
  biodataSubmitting.value = true;
  biodataError.value = null;
  try {
    const payload: MahasiswaBiodataPayload = {};
    Object.entries(biodataForm).forEach(([key, value]) => {
      (payload as Record<string, string | null>)[key] = value.trim() || null;
    });
    await mahasiswaApi.saveBiodata(biodataTarget.value.id, payload);
    toastSuccess('Biodata mahasiswa berhasil disimpan');
    closeBiodata();
    fetchItems();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan biodata mahasiswa');
    biodataError.value = message;
    toastError(message);
  } finally {
    biodataSubmitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Biodata Mahasiswa" subtitle="Kelola biodata lengkap mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Biodata Mahasiswa</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data mahasiswa">
        <template #cell-hp="{ item }">{{ item.biodata?.hp || '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.biodata?.kelas || '-' }}</template>
        <template #cell-jenisKelamin="{ item }">{{ item.peserta?.biodata?.jenisKelamin ?? '-' }}</template>
        <template #cell-status="{ item }">
          {{ item.jurusan?.namaJurusan ?? item.jurusan?.kodeProdi ?? '-' }} / {{ STATUS_MASUK_LABELS[item.statusMasuk] }}
        </template>
        <template #actions="{ item }">
          <button type="button" class="text-primary hover:opacity-80" title="Edit Biodata" @click="openBiodata(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <!-- Modal: Biodata Mahasiswa -->
    <Modal
      :model-value="isBiodataOpen"
      title="Biodata Mahasiswa"
      :subtitle="biodataTarget ? `${biodataTarget.namaLengkap} — ${biodataTarget.nim}` : undefined"
      size="lg"
      @update:model-value="closeBiodata"
    >
      <div v-if="biodataLoading" class="text-center py-12 text-on-surface-variant">Memuat biodata...</div>
      <form v-else class="space-y-4" @submit.prevent="handleSaveBiodata">
        <div v-if="biodataError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ biodataError }}
        </div>

        <TextInput v-model="biodataForm.tempatLahir" label="Tempat Lahir" />
        <DateInput v-model="biodataForm.tanggalLahir" label="Tanggal Lahir" />
        <SelectInput v-model="biodataForm.agama" label="Agama" placeholder="Pilih agama..." :options="agamaOptions" />
        <TextInput v-model="biodataForm.kewarganegaraan" label="Kewarganegaraan" />
        <TextInput v-model="biodataForm.noKtp" label="No KTP" />
        <TextInput v-model="biodataForm.npwp" label="NPWP" />
        <TextInput v-model="biodataForm.jalan" label="Jalan" />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput v-model="biodataForm.dusun" label="Dusun" />
          <TextInput v-model="biodataForm.rt" label="RT" />
          <TextInput v-model="biodataForm.rw" label="RW" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.kelurahan" label="Kelurahan" />
          <TextInput v-model="biodataForm.kodePos" label="Kode Pos" />
        </div>
        <TextInput v-model="biodataForm.propinsi" label="Propinsi" />

        <SelectInput
          v-model="biodataForm.jenisTinggal"
          label="Jenis Tinggal"
          placeholder="Pilih jenis tinggal..."
          :options="jenisTinggalOptions"
        />
        <SelectInput
          v-model="biodataForm.alatTransportasi"
          label="Alat Transportasi"
          placeholder="Pilih alat transportasi..."
          :options="alatTransportasiOptions"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.kelas" label="Kelas" placeholder="mis. B" />
          <TextInput v-model="biodataForm.programStudi" label="Program Studi" />
        </div>

        <SelectInput v-model="biodataForm.waktuKuliah" label="Waktu Kuliah" placeholder="Pilih waktu..." :options="waktuKuliahOptions" />
        <SelectInput
          v-model="biodataForm.statusBelajar"
          label="Status Belajar"
          placeholder="Pilih status belajar..."
          :options="statusBelajarOptions"
        />
        <SelectInput
          v-model="biodataForm.statusKuliah"
          label="Status Kuliah"
          placeholder="Pilih status kuliah..."
          :options="statusKuliahBiodataOptions"
        />
        <SelectInput
          v-model="biodataForm.statusDikti"
          label="Status Dikti"
          placeholder="Pilih status dikti..."
          :options="statusDiktiOptions"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.email" label="E-mail" type="email" />
          <TextInput v-model="biodataForm.hp" label="HP" />
        </div>
        <TextInput v-model="biodataForm.almamater" label="Almamater" />

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Orang Tua</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.namaAyah" label="Nama Ayah" />
            <TextInput v-model="biodataForm.pekerjaanAyah" label="Pekerjaan Ayah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.namaIbu" label="Nama Ibu" />
            <TextInput v-model="biodataForm.pekerjaanIbu" label="Pekerjaan Ibu" />
          </div>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeBiodata">Batal</AppButton>
        <AppButton :disabled="biodataLoading || biodataSubmitting" @click="handleSaveBiodata">
          {{ biodataSubmitting ? 'Menyimpan...' : 'Simpan Biodata' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>
