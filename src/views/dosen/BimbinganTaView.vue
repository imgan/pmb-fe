<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { dosenBimbinganTaApi, type MahasiswaBimbinganTa } from '@/api/dosenPortal';
import type { KartuBimbingan } from '@/api/mahasiswaPortal';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate, formatDateTime } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Form Pembimbing TA/Skripsi: mahasiswa yang mengusulkan dosen ini sebagai pembimbing (sejak diajukan),
 * per periode pengajuan, beserta status bimbingan/bayar/sidang. Setelah disetujui prodi, dosen
 * mengisi catatan konsultasi di Kartu Bimbingan (tampil di portal mahasiswa); catatan hanya bisa
 * diubah penginputnya.
 */
const dosenAuthStore = useDosenAuthStore();
const daftar = ref<MahasiswaBimbinganTa[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const kartu = ref<KartuBimbingan | null>(null);
const kartuLoading = ref(false);

const periodeOptions = ref<{ value: number; label: string }[]>([]);
const periodeId = ref<number | string | null>('');
const appliedPeriodeId = ref<number | null>(null);
const search = ref('');

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    daftar.value = await dosenBimbinganTaApi.listMahasiswa(appliedPeriodeId.value);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat mahasiswa bimbingan');
  } finally {
    loading.value = false;
  }
};
onMounted(async () => {
  try {
    const periode = await dosenBimbinganTaApi.listPeriode();
    periodeOptions.value = periode.map((p) => ({ value: p.id, label: formatDate(p.tanggalMulai) + ' s/d ' + formatDate(p.tanggalSelesai) }));
  } catch {
    periodeOptions.value = [];
  }
  load();
});
const tampilkan = () => {
  appliedPeriodeId.value = periodeId.value ? Number(periodeId.value) : null;
  load();
};
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return daftar.value;
  return daftar.value.filter((m) => [m.nim, m.namaLengkap, m.judul].some((v) => v?.toLowerCase().includes(q)));
});
const STATUS_VARIANT: Record<MahasiswaBimbinganTa['status'], 'success' | 'warning' | 'danger'> = {
  DISETUJUI: 'success',
  DIAJUKAN: 'warning',
  DITOLAK: 'danger',
};

const bukaKartu = async (pengajuanId: number) => {
  kartuLoading.value = true;
  try {
    kartu.value = await dosenBimbinganTaApi.kartu(pengajuanId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kartu bimbingan');
  } finally {
    kartuLoading.value = false;
  }
};

const tutupKartu = () => {
  kartu.value = null;
  load();
};

// ---- Form catatan ----
const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formOpen = ref(false);
const editId = ref<number | null>(null);
const form = reactive({ tanggal: '', pokokPembahasan: '', keterangan: '' });
const formError = ref<string | null>(null);
const saving = ref(false);

const bukaForm = (c?: KartuBimbingan['catatan'][number]) => {
  editId.value = c?.id ?? null;
  form.tanggal = c?.tanggal ?? hariIni();
  form.pokokPembahasan = c?.pokokPembahasan ?? '';
  form.keterangan = c?.keterangan ?? '';
  formError.value = null;
  formOpen.value = true;
};

const simpan = async () => {
  if (!kartu.value) return;
  formError.value = null;
  if (!form.tanggal) {
    formError.value = 'Tanggal wajib diisi';
    return;
  }
  if (form.pokokPembahasan.trim().length < 3) {
    formError.value = 'Pokok pembahasan wajib diisi';
    return;
  }
  const payload = { tanggal: form.tanggal, pokokPembahasan: form.pokokPembahasan.trim(), keterangan: form.keterangan.trim() || null };
  saving.value = true;
  try {
    kartu.value = editId.value
      ? await dosenBimbinganTaApi.ubah(editId.value, payload)
      : await dosenBimbinganTaApi.tambah(kartu.value.pengajuanId, payload);
    toastSuccess(editId.value ? 'Catatan diperbarui' : 'Catatan ditambahkan');
    formOpen.value = false;
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan catatan');
  } finally {
    saving.value = false;
  }
};

const hapusId = ref<number | null>(null);
const menghapus = ref(false);
const hapus = async () => {
  if (!hapusId.value) return;
  menghapus.value = true;
  try {
    kartu.value = await dosenBimbinganTaApi.hapus(hapusId.value);
    toastSuccess('Catatan dihapus');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus catatan');
  } finally {
    hapusId.value = null;
    menghapus.value = false;
  }
};

const inputClass =
  'w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary';
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Form Pembimbing TA/Skripsi</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Dosen / Sidang TA / Pembimbing TA/Skripsi</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <!-- Mahasiswa yang mengajukan dosen ini sebagai pembimbing -->
    <section v-if="!kartu" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 md:items-end bg-surface-bright">
        <div class="w-full md:w-72">
          <SelectInput v-model="periodeId" placeholder="Pilih Periode (semua)" :options="periodeOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="tampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <div class="w-full md:w-72 md:ml-auto">
          <SearchInput v-model="search" placeholder="Cari NIM, nama, judul..." />
        </div>
      </div>

      <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="!filtered.length" class="p-6 text-center text-body-sm text-on-surface-variant">
        Belum ada mahasiswa yang mengajukan Anda sebagai pembimbing<template v-if="appliedPeriodeId"> pada periode ini</template>.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 text-center">No</th>
              <th class="p-3 text-left">NIM</th>
              <th class="p-3 text-left">Nama</th>
              <th class="p-3 text-left">Judul</th>
              <th class="p-3 text-left">Kontak</th>
              <th class="p-3 text-left">Pemb. Ke</th>
              <th class="p-3 text-left">Status Bimb</th>
              <th class="p-3 text-left">Status Bayar</th>
              <th class="p-3 text-left">Status Sidang</th>
              <th class="p-3 text-center">Kartu Bimbingan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant align-top">
            <tr v-for="(m, i) in filtered" :key="m.pengajuanId">
              <td class="p-3 text-center">{{ i + 1 }}</td>
              <td class="p-3 whitespace-nowrap">{{ m.nim }}</td>
              <td class="p-3 min-w-40">
                <span class="block text-on-surface">{{ m.namaLengkap }}</span>
                <span class="block text-label-sm text-on-surface-variant">{{ m.prodi ?? '-' }}</span>
              </td>
              <td class="p-3 min-w-56">{{ m.judul }}</td>
              <td class="p-3 min-w-40">
                <a v-if="m.noTelepon" :href="'tel:' + m.noTelepon" class="block text-primary hover:underline">{{ m.noTelepon }}</a>
                <a v-if="m.email" :href="'mailto:' + m.email" class="block text-primary hover:underline break-all">{{ m.email }}</a>
                <span v-if="!m.noTelepon && !m.email" class="text-on-surface-variant">-</span>
              </td>
              <td class="p-3 whitespace-nowrap">{{ m.peran === 'UTAMA' ? '1 (Utama)' : '2 (Pendamping)' }}</td>
              <td class="p-3 min-w-36">
                <StatusBadge :label="m.statusLabel" :variant="STATUS_VARIANT[m.status]" />
                <span v-if="m.status === 'DISETUJUI'" class="block mt-1 text-label-sm text-on-surface-variant">{{ m.jumlahBimbingan }}x bimbingan</span>
                <span v-else-if="m.catatanProdi" class="block mt-1 text-label-sm text-on-surface-variant">{{ m.catatanProdi }}</span>
              </td>
              <td class="p-3 whitespace-nowrap">
                <template v-if="m.statusBayar.lunas">
                  <span class="block text-on-surface">Sudah bayar</span>
                  <span class="block text-label-sm text-on-surface-variant">{{ formatCurrencyIdr(m.statusBayar.dibayar) }}</span>
                </template>
                <span v-else class="text-error">Belum bayar</span>
              </td>
              <td class="p-3 whitespace-nowrap">
                {{ m.statusSidang.label }}
                <span v-if="m.statusSidang.tanggal" class="block text-label-sm text-on-surface-variant">{{ formatDate(m.statusSidang.tanggal) }}</span>
              </td>
              <td class="p-3 text-center">
                <AppButton v-if="m.status === 'DISETUJUI'" variant="secondary" icon="forum" :disabled="kartuLoading" @click="bukaKartu(m.pengajuanId)">
                  Kartu
                </AppButton>
                <span v-else class="text-label-sm text-on-surface-variant">Setelah disetujui prodi</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Kartu bimbingan satu mahasiswa -->
    <template v-else>
      <div class="mb-4 flex flex-wrap gap-2 justify-between">
        <AppButton variant="secondary" icon="arrow_back" @click="tutupKartu">Kembali</AppButton>
        <AppButton icon="add" @click="bukaForm()">Tambah Catatan</AppButton>
      </div>
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
        <dl class="grid grid-cols-[170px_1fr] gap-y-2 text-body-md">
          <dt class="text-on-surface-variant">NIM / Nama</dt>
          <dd class="text-on-surface">: {{ kartu.mahasiswa.nim }} — {{ kartu.mahasiswa.namaLengkap }}</dd>
          <dt class="text-on-surface-variant">Jenjang / Prodi</dt>
          <dd class="text-on-surface">: {{ [kartu.mahasiswa.jenjang, kartu.mahasiswa.prodi].filter(Boolean).join(' / ') || '-' }}</dd>
          <dt class="text-on-surface-variant">Judul</dt>
          <dd class="text-on-surface">: {{ kartu.judul }}</dd>
          <dt class="text-on-surface-variant">Periode bimbingan</dt>
          <dd class="text-on-surface">
            : {{ kartu.tanggalAwal ? formatDate(kartu.tanggalAwal) : '-' }} s/d {{ kartu.tanggalAkhir ? formatDate(kartu.tanggalAkhir) : '-' }}
          </dd>
        </dl>
      </section>
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead class="bg-surface-container text-label-md text-on-surface-variant">
              <tr>
                <th class="px-4 py-3 text-center font-medium w-12">No</th>
                <th class="px-4 py-3 text-left font-medium">Tanggal</th>
                <th class="px-4 py-3 text-left font-medium">Pokok Pembahasan</th>
                <th class="px-4 py-3 text-left font-medium">Keterangan</th>
                <th class="px-4 py-3 text-left font-medium">Tanggal Input</th>
                <th class="px-4 py-3 text-left font-medium">Pembimbing</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant align-top">
              <tr v-if="!kartu.catatan.length">
                <td colspan="7" class="px-4 py-6 text-center text-on-surface-variant">Belum ada catatan bimbingan.</td>
              </tr>
              <tr v-for="(c, i) in kartu.catatan" :key="c.id">
                <td class="px-4 py-2 text-center">{{ i + 1 }}</td>
                <td class="px-4 py-2 whitespace-nowrap">{{ formatDate(c.tanggal) }}</td>
                <td class="px-4 py-2 min-w-56 whitespace-pre-line text-on-surface">{{ c.pokokPembahasan }}</td>
                <td class="px-4 py-2 min-w-48 whitespace-pre-line">{{ c.keterangan || '-' }}</td>
                <td class="px-4 py-2 whitespace-nowrap">{{ formatDateTime(c.tanggalInput) }}</td>
                <td class="px-4 py-2 min-w-40">{{ c.pembimbing ?? '-' }}</td>
                <td class="px-4 py-2 whitespace-nowrap text-right">
                  <template v-if="c.dosenId === dosenAuthStore.dosen?.id">
                    <button type="button" class="text-label-md text-primary hover:underline mr-3" @click="bukaForm(c)">Ubah</button>
                    <button type="button" class="text-label-md text-error hover:underline" @click="hapusId = c.id">Hapus</button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <Modal :model-value="formOpen" :title="editId ? 'Ubah Catatan Bimbingan' : 'Tambah Catatan Bimbingan'" @update:model-value="(v: boolean) => (formOpen = v)">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Bimbingan<span class="text-error"> *</span></span>
          <input v-model="form.tanggal" type="date" :class="inputClass" />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Pokok Pembahasan<span class="text-error"> *</span></span>
          <textarea v-model="form.pokokPembahasan" rows="3" maxlength="2000" :class="inputClass"></textarea>
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Keterangan</span>
          <textarea v-model="form.keterangan" rows="3" maxlength="2000" placeholder="Saran perbaikan, tugas berikutnya, dll." :class="inputClass"></textarea>
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!hapusId"
      title="Hapus Catatan"
      message="Hapus catatan bimbingan ini?"
      :loading="menghapus"
      @confirm="hapus"
      @cancel="hapusId = null"
    />
  </div>
</template>
