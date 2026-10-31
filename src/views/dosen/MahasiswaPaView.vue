<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import {
  dosenMahasiswaPaApi,
  type BiodataMahasiswaPa,
  type KrsMahasiswaPa,
  type MahasiswaPa,
} from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Lain-Lain → Mahasiswa Bimbingan Akademik: mahasiswa yang pembimbing akademiknya dosen login,
 * dengan kontak, IPK, KRS terakhir (FRS), biodata, dan cetak KHS.
 */
const items = ref<MahasiswaPa[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const page = ref(1);
const limit = ref(10);

onMounted(async () => {
  try {
    items.value = await dosenMahasiswaPaApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat mahasiswa bimbingan akademik');
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((m) => [m.nim, m.namaLengkap, m.prodi ?? '', m.noTelepon ?? ''].some((v) => v.toLowerCase().includes(q)));
});
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: limit.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / limit.value)),
}));
const paged = computed(() => filtered.value.slice((page.value - 1) * limit.value, page.value * limit.value));
watch([search, limit], () => {
  page.value = 1;
});

const waLink = (no: string) => {
  const digit = no.replace(/\D/g, '');
  return `https://wa.me/${digit.startsWith('0') ? `62${digit.slice(1)}` : digit}`;
};
const STATUS_KRS: Record<string, string> = { DRAFT: 'Draft', DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

// ---- Modal biodata & KRS ----
const target = ref<MahasiswaPa | null>(null);
const biodata = ref<BiodataMahasiswaPa | null>(null);
const krs = ref<KrsMahasiswaPa | null>(null);
const modal = ref<'biodata' | 'krs' | null>(null);
const modalLoading = ref(false);

const bukaBiodata = async (m: MahasiswaPa) => {
  target.value = m;
  modal.value = 'biodata';
  modalLoading.value = true;
  biodata.value = null;
  try {
    biodata.value = await dosenMahasiswaPaApi.biodata(m.id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat biodata'));
    modal.value = null;
  } finally {
    modalLoading.value = false;
  }
};
const bukaKrs = async (m: MahasiswaPa) => {
  target.value = m;
  modal.value = 'krs';
  modalLoading.value = true;
  krs.value = null;
  try {
    krs.value = await dosenMahasiswaPaApi.krs(m.id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat KRS'));
    modal.value = null;
  } finally {
    modalLoading.value = false;
  }
};

const printingId = ref<number | null>(null);
const cetakKhs = async (m: MahasiswaPa) => {
  printingId.value = m.id;
  try {
    openBlob(await dosenMahasiswaPaApi.khsPdf(m.id));
  } catch (err) {
    toastError(extractErrorMessage(err, 'KHS belum bisa dicetak'));
  } finally {
    printingId.value = null;
  }
};

const BIODATA_FIELDS: { key: keyof BiodataMahasiswaPa; label: string }[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'prodi', label: 'Program Studi' },
  { key: 'angkatan', label: 'Angkatan' },
  { key: 'tempatLahir', label: 'Tempat Lahir' },
  { key: 'tanggalLahir', label: 'Tanggal Lahir' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin' },
  { key: 'agama', label: 'Agama' },
  { key: 'hp', label: 'HP' },
  { key: 'email', label: 'Email' },
  { key: 'teleponRumah', label: 'Telepon Rumah' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'namaAyah', label: 'Nama Ayah' },
  { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
  { key: 'namaIbu', label: 'Nama Ibu' },
  { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
  { key: 'namaWali', label: 'Nama Wali' },
];
const nilaiBiodata = (key: keyof BiodataMahasiswaPa) => {
  const v = biodata.value?.[key];
  if (v === null || v === undefined || v === '') return '-';
  if (key === 'tanggalLahir') return formatDate(String(v));
  if (key === 'jenisKelamin') return v === 'L' ? 'Laki-laki' : v === 'P' ? 'Perempuan' : String(v);
  return String(v);
};
</script>

<template>
  <div>
    <PageHeader title="Form Pembimbing Akademik" subtitle="Dosen / Bimbingan / Mahasiswa Bimbingan Akademik" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-surface-bright">
        <PageSizeSelect v-model="limit" />
        <div class="w-full md:w-80">
          <SearchInput v-model="search" placeholder="Cari NIM, nama, prodi, HP..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat mahasiswa bimbingan...</div>
      <div v-else-if="!filtered.length" class="p-6 text-center text-body-sm text-on-surface-variant">
        {{ items.length ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada mahasiswa bimbingan akademik. Penetapan dosen PA dilakukan prodi (Bimbingan → Pembimbing Akademik).' }}
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 text-center w-12">No</th>
              <th class="p-3 text-left">NIM</th>
              <th class="p-3 text-left">Nama</th>
              <th class="p-3 text-left">Hp</th>
              <th class="p-3 text-left">Prodi</th>
              <th class="p-3 text-center">IPK</th>
              <th class="p-3 text-center">FRS / KRS</th>
              <th class="p-3 text-center">KHS</th>
              <th class="p-3 text-center">Biodata</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant align-top">
            <tr v-for="(m, i) in paged" :key="m.id">
              <td class="p-3 text-center">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="p-3 whitespace-nowrap">{{ m.nim }}</td>
              <td class="p-3 min-w-48">
                <span class="block text-on-surface">{{ m.namaLengkap }}</span>
                <span class="block text-label-sm text-on-surface-variant">Angkatan {{ m.angkatan ?? '-' }}<template v-if="m.kelas"> · {{ m.kelas }}</template></span>
              </td>
              <td class="p-3 whitespace-nowrap">
                <a v-if="m.noTelepon" :href="waLink(m.noTelepon)" target="_blank" rel="noopener" class="text-primary hover:underline">{{ m.noTelepon }}</a>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
              <td class="p-3">{{ m.prodi ?? '-' }}</td>
              <td class="p-3 text-center tabular-nums">
                {{ m.totalSks ? (m.ipk ?? 0).toFixed(2) : '-' }}
                <span v-if="m.totalSks" class="block text-label-sm text-on-surface-variant">{{ m.totalSks }} SKS</span>
              </td>
              <td class="p-3 text-center whitespace-nowrap">
                <button v-if="m.krsTerakhir" type="button" class="text-primary hover:underline" title="Lihat KRS terakhir" @click="bukaKrs(m)">
                  Smt {{ m.krsTerakhir.semester }} · {{ STATUS_KRS[m.krsTerakhir.status] ?? m.krsTerakhir.status }}
                </button>
                <span v-else class="text-on-surface-variant">Belum KRS</span>
              </td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  class="text-on-surface-variant hover:text-primary disabled:opacity-50"
                  title="Cetak KHS semua semester"
                  :disabled="printingId === m.id"
                  @click="cetakKhs(m)"
                >
                  <span class="material-symbols-outlined">menu_book</span>
                </button>
              </td>
              <td class="p-3 text-center">
                <button type="button" class="text-on-surface-variant hover:text-primary" title="Lihat biodata" @click="bukaBiodata(m)">
                  <span class="material-symbols-outlined">person</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model="page" :meta="meta" />
      </div>
    </section>

    <!-- Modal biodata -->
    <Modal
      :model-value="modal === 'biodata'"
      title="Biodata Mahasiswa"
      :subtitle="target ? `${target.nim} — ${target.namaLengkap}` : ''"
      size="lg"
      @update:model-value="(v: boolean) => { if (!v) modal = null; }"
    >
      <div v-if="modalLoading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat biodata...</div>
      <dl v-else-if="biodata" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-body-md">
        <div v-for="f in BIODATA_FIELDS" :key="f.key" class="grid grid-cols-[130px_1fr] gap-x-2" :class="f.key === 'alamat' ? 'md:col-span-2 md:grid-cols-[130px_1fr]' : ''">
          <dt class="text-on-surface-variant">{{ f.label }}</dt>
          <dd class="text-on-surface break-words">: {{ nilaiBiodata(f.key) }}</dd>
        </div>
      </dl>
      <template #footer>
        <AppButton variant="secondary" @click="modal = null">Tutup</AppButton>
      </template>
    </Modal>

    <!-- Modal KRS -->
    <Modal
      :model-value="modal === 'krs'"
      title="KRS Terakhir"
      :subtitle="target ? `${target.nim} — ${target.namaLengkap}` : ''"
      size="lg"
      @update:model-value="(v: boolean) => { if (!v) modal = null; }"
    >
      <div v-if="modalLoading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat KRS...</div>
      <div v-else-if="!krs" class="py-8 text-center text-body-sm text-on-surface-variant">Mahasiswa ini belum mengisi KRS.</div>
      <template v-else>
        <p class="text-body-md mb-3">
          Semester {{ krs.semester }} · {{ krs.tahunAjaran ?? '-' }} · <span class="font-medium">{{ STATUS_KRS[krs.status] ?? krs.status }}</span> ·
          {{ krs.totalSks }} SKS
        </p>
        <table class="w-full text-body-sm border border-outline-variant">
          <thead class="bg-surface-container text-label-md text-on-surface-variant">
            <tr>
              <th class="px-3 py-2 text-left font-medium">Kode</th>
              <th class="px-3 py-2 text-left font-medium">Mata Kuliah</th>
              <th class="px-3 py-2 text-left font-medium">Kelas</th>
              <th class="px-3 py-2 text-center font-medium">SKS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="mk in krs.mataKuliah" :key="mk.kodeMataKuliah + mk.kelas">
              <td class="px-3 py-1.5 whitespace-nowrap">{{ mk.kodeMataKuliah }}</td>
              <td class="px-3 py-1.5">{{ mk.namaMataKuliah }}</td>
              <td class="px-3 py-1.5">{{ mk.kelas }}</td>
              <td class="px-3 py-1.5 text-center">{{ mk.sks }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <template #footer>
        <AppButton variant="secondary" @click="modal = null">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>
