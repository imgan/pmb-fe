<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { ukuranAlmamaterOptions } from '@/utils/almamater';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { biodataMahasiswaApi } from '@/api/biodataMahasiswa';
import { mahasiswaApi, type MahasiswaBiodataPayload } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import { formatDate } from '@/utils/format';
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
const pageSize = ref(10);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await biodataMahasiswaApi.list({ page: page.value, limit: pageSize.value, nim: appliedNim.value || undefined });
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
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama lengkap' },
  { key: 'jenisKelamin', label: 'JK', align: 'center' },
  { key: 'tempatTanggalLahir', label: 'Tempat/Tgl Lahir' },
  { key: 'nik', label: 'NIK' },
  { key: 'hp', label: 'No HP' },
  { key: 'kelas', label: 'Kelas' },
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

const DATE_BIODATA_KEYS = ['tanggalLahir', 'tanggalMasukKuliah', 'tanggalLahirAyah', 'tanggalLahirIbu', 'tanggalLahirWali'];

const emptyBiodataForm = (): Record<string, string> => ({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  noKtp: '',
  nisn: '',
  jalurPendaftaran: '',
  npwp: '',
  jenisPendaftaran: '',
  tanggalMasukKuliah: '',
  mulaiSemester: '',
  jalan: '',
  dusun: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: '',
  kodePos: '',
  propinsi: '',
  jenisTinggal: '',
  alatTransportasi: '',
  teleponRumah: '',
  kelas: '',
  programStudi: '',
  waktuKuliah: '',
  statusBelajar: '',
  statusKuliah: '',
  statusDikti: '',
  email: '',
  hp: '',
  almamater: '',
  terimaKps: '',
  noKps: '',
  nikAyah: '',
  namaAyah: '',
  tanggalLahirAyah: '',
  pendidikanAyah: '',
  pekerjaanAyah: '',
  penghasilanAyah: '',
  nikIbu: '',
  namaIbu: '',
  tanggalLahirIbu: '',
  pendidikanIbu: '',
  pekerjaanIbu: '',
  penghasilanIbu: '',
  namaWali: '',
  tanggalLahirWali: '',
  pendidikanWali: '',
  pekerjaanWali: '',
  penghasilanWali: '',
  jenisPembiayaan: '',
  biayaMasuk: '',
  sksDiakui: '',
  perguruanTinggiAsal: '',
  programStudiAsal: '',
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
        const value = (biodata as unknown as Record<string, string | number | null>)[key];
        (biodataForm as Record<string, string>)[key] = value === null || value === undefined ? '' : String(value);
      });
      DATE_BIODATA_KEYS.forEach((key) => {
        const value = (biodata as unknown as Record<string, string | null>)[key];
        biodataForm[key] = value?.slice(0, 10) ?? '';
      });
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

// No KPS hanya tampil & wajib kalau "Terima KPS" = Ya.
const noKpsError = ref<string | null>(null);

const handleSaveBiodata = async () => {
  if (!biodataTarget.value) return;
  noKpsError.value = null;
  if (biodataForm.terimaKps !== 'Ya') biodataForm.noKps = '';
  else if (!biodataForm.noKps.trim()) {
    noKpsError.value = 'No KPS wajib diisi untuk penerima KPS';
    toastError(noKpsError.value);
    return;
  }
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

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data mahasiswa">
        <template #cell-jenisKelamin="{ item }">{{ item.biodata?.jenisKelamin ?? '-' }}</template>
        <template #cell-tempatTanggalLahir="{ item }">
          {{ item.biodata?.tempatLahir ?? '-' }}<span v-if="item.biodata?.tanggalLahir">, {{ formatDate(item.biodata.tanggalLahir) }}</span>
        </template>
        <template #cell-nik="{ item }">{{ item.biodata?.noKtp || '-' }}</template>
        <template #cell-hp="{ item }">{{ item.biodata?.hp || '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.biodata?.kelas || '-' }}</template>
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.tempatLahir" label="Tempat Lahir" />
          <DateInput v-model="biodataForm.tanggalLahir" label="Tanggal Lahir" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="biodataForm.jenisKelamin"
            label="Jenis Kelamin"
            placeholder="Pilih jenis kelamin..."
            :options="[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]"
          />
          <SelectInput v-model="biodataForm.agama" label="Agama" placeholder="Pilih agama..." :options="agamaOptions" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.noKtp" label="NIK" />
          <TextInput v-model="biodataForm.nisn" label="NISN" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.kewarganegaraan" label="Kewarganegaraan" />
          <TextInput v-model="biodataForm.npwp" label="NPWP" />
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Pendaftaran</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.jalurPendaftaran" label="Jalur Pendaftaran" />
            <TextInput v-model="biodataForm.jenisPendaftaran" label="Jenis Pendaftaran" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalMasukKuliah" label="Tgl Masuk Kuliah" />
            <TextInput v-model="biodataForm.mulaiSemester" label="Mulai Semester" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Alamat</p>
          <TextInput v-model="biodataForm.jalan" label="Jalan" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <TextInput v-model="biodataForm.dusun" label="Dusun" />
            <TextInput v-model="biodataForm.rt" label="RT" />
            <TextInput v-model="biodataForm.rw" label="RW" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.kelurahan" label="Kelurahan" />
            <TextInput v-model="biodataForm.kecamatan" label="Kecamatan" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.kodePos" label="Kode Pos" />
            <TextInput v-model="biodataForm.propinsi" label="Propinsi" />
          </div>
        </div>

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

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput v-model="biodataForm.email" label="E-mail" type="email" />
          <TextInput v-model="biodataForm.hp" label="No HP" />
          <TextInput v-model="biodataForm.teleponRumah" label="Telp Rumah" />
        </div>
        <SelectInput v-model="biodataForm.almamater" label="Almamater (Ukuran)" placeholder="Pilih ukuran..." :options="ukuranAlmamaterOptions(biodataForm.almamater)" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="biodataForm.terimaKps"
            label="Terima KPS"
            placeholder="Pilih..."
            :options="[{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }]"
          />
          <TextInput
            v-if="biodataForm.terimaKps === 'Ya'"
            v-model="biodataForm.noKps"
            label="No KPS"
            required
            :error="noKpsError"
          />
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Ayah</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.nikAyah" label="NIK Ayah" />
            <TextInput v-model="biodataForm.namaAyah" label="Nama Ayah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirAyah" label="Tgl Lahir Ayah" />
            <TextInput v-model="biodataForm.pendidikanAyah" label="Pendidikan Ayah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanAyah" label="Pekerjaan Ayah" />
            <TextInput v-model="biodataForm.penghasilanAyah" label="Penghasilan Ayah" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Ibu</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.nikIbu" label="NIK Ibu" />
            <TextInput v-model="biodataForm.namaIbu" label="Nama Ibu" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirIbu" label="Tanggal Lahir Ibu" />
            <TextInput v-model="biodataForm.pendidikanIbu" label="Pendidikan Ibu" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanIbu" label="Pekerjaan Ibu" />
            <TextInput v-model="biodataForm.penghasilanIbu" label="Penghasilan Ibu" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Wali</p>
          <TextInput v-model="biodataForm.namaWali" label="Nama Wali" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirWali" label="Tanggal Lahir Wali" />
            <TextInput v-model="biodataForm.pendidikanWali" label="Pendidikan Wali" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanWali" label="Pekerjaan Wali" />
            <TextInput v-model="biodataForm.penghasilanWali" label="Penghasilan Wali" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Pembiayaan &amp; Transfer</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.jenisPembiayaan" label="Jenis Pembiayaan" />
            <TextInput v-model="biodataForm.biayaMasuk" label="Biaya Masuk" type="number" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.sksDiakui" label="SKS Diakui" type="number" />
            <TextInput v-model="biodataForm.perguruanTinggiAsal" label="Perguruan Tinggi Asal" />
          </div>
          <TextInput v-model="biodataForm.programStudiAsal" label="Program Studi Asal" class="mt-4" />
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
