<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import {
  mahasiswaTugasAkhirApi,
  namaDosenRingkas,
  STATUS_PENGAJUAN_TA_LABEL,
  STATUS_PENGAJUAN_TA_VARIANT,
  type FormTugasAkhir,
  type PengajuanTa,
} from '@/api/pengajuanTa';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Pendaftaran judul TA/Skripsi: hanya bisa diisi selama periode yang dibuka prodi. Pengajuan yang
 * masih menunggu verifikasi bisa diubah (form terisi ulang) atau dibatalkan.
 */
const data = ref<FormTugasAkhir | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const formOpen = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const batalTarget = ref<PengajuanTa | null>(null);
const membatalkan = ref(false);

const form = reactive({
  noTelepon: '',
  email: '',
  judul: '',
  tempatKkp: '',
  pembimbingUtamaId: null as number | string | null,
  pembimbingPendampingId: null as number | string | null,
});

const load = async () => {
  try {
    data.value = await mahasiswaTugasAkhirApi.form();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data Tugas Akhir/Skripsi');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const sudahDisetujui = computed(() => data.value?.pengajuan.some((p) => p.status === 'DISETUJUI') ?? false);
// Pengajuan yang masih menunggu pada periode yang sedang dibuka -> form mode ubah.
const menunggu = computed(() =>
  data.value?.periode ? (data.value.pengajuan.find((p) => p.status === 'DIAJUKAN' && p.periodePengajuanTaId === data.value!.periode!.id) ?? null) : null
);
const kkpOptions = computed(() => (data.value?.pilihanTempatKkp ?? []).map((l) => ({ value: l, label: l })));

const bukaForm = () => {
  const m = data.value?.mahasiswa;
  const p = menunggu.value;
  form.noTelepon = p?.noTelepon ?? m?.noTelepon ?? '';
  form.email = p?.email ?? m?.email ?? '';
  form.judul = p?.judul ?? '';
  form.tempatKkp = p?.tempatKkp ?? '';
  form.pembimbingUtamaId = p?.pembimbingUtamaId ?? null;
  form.pembimbingPendampingId = p?.pembimbingPendampingId ?? null;
  formError.value = null;
  formOpen.value = true;
};

const simpan = async () => {
  formError.value = null;
  if (form.judul.trim().length < 10) {
    formError.value = 'Judul minimal 10 karakter';
    return;
  }
  if (!form.pembimbingUtamaId) {
    formError.value = 'Pilih pembimbing utama';
    return;
  }
  if (form.pembimbingPendampingId && form.pembimbingPendampingId === form.pembimbingUtamaId) {
    formError.value = 'Pembimbing utama dan pendamping tidak boleh sama';
    return;
  }
  saving.value = true;
  try {
    const res = await mahasiswaTugasAkhirApi.ajukan({
      noTelepon: form.noTelepon.trim() || null,
      email: form.email.trim() || null,
      judul: form.judul.trim(),
      tempatKkp: form.tempatKkp.trim() || null,
      pembimbingUtamaId: Number(form.pembimbingUtamaId),
      pembimbingPendampingId: form.pembimbingPendampingId ? Number(form.pembimbingPendampingId) : null,
    });
    toastSuccess(res.message);
    formOpen.value = false;
    await load();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pengajuan');
  } finally {
    saving.value = false;
  }
};

const batalkan = async () => {
  if (!batalTarget.value) return;
  membatalkan.value = true;
  try {
    await mahasiswaTugasAkhirApi.batalkan(batalTarget.value.id);
    toastSuccess('Pengajuan dibatalkan');
    batalTarget.value = null;
    await load();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membatalkan pengajuan');
    batalTarget.value = null;
  } finally {
    membatalkan.value = false;
  }
};

const inputClass =
  'w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary';
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">
        <template v-if="data?.periode">Periode {{ formatDate(data.periode.tanggalMulai) }} s/d {{ formatDate(data.periode.tanggalSelesai) }}</template>
        <template v-else>Tugas Akhir / Skripsi</template>
      </h1>
      <p class="text-body-md text-on-surface-variant mt-1">Pendaftaran judul Tugas Akhir/Skripsi dan usulan dosen pembimbing.</p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <template v-else-if="data">
      <div
        v-if="!data.periode"
        class="mb-6 px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface-variant"
      >
        Periode pendaftaran Tugas Akhir/Skripsi sedang tidak dibuka. Pantau pengumuman dari prodi.
      </div>
      <div
        v-else-if="sudahDisetujui"
        class="mb-6 px-4 py-3 rounded-lg border border-outline-variant bg-primary-container text-on-primary-container text-body-md"
      >
        Pengajuan Tugas Akhir/Skripsi Anda sudah disetujui prodi.
      </div>
      <div v-else-if="!formOpen" class="mb-6">
        <AppButton icon="add" @click="bukaForm">{{ menunggu ? 'Ubah Pengajuan TA' : 'Input Baru TA' }}</AppButton>
      </div>

      <section v-if="formOpen && data.periode" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
        <form class="space-y-4" @submit.prevent="simpan">
          <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
          <dl class="grid grid-cols-[150px_1fr] md:grid-cols-[200px_1fr] gap-y-2 text-body-md">
            <dt class="text-on-surface-variant">NIM</dt>
            <dd class="text-on-surface">: {{ data.mahasiswa.nim }}</dd>
            <dt class="text-on-surface-variant">Nama</dt>
            <dd class="text-on-surface">: {{ data.mahasiswa.namaLengkap }}</dd>
          </dl>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block">
              <span class="block font-medium text-label-md text-on-surface mb-2">Telp Mahasiswa</span>
              <input v-model="form.noTelepon" inputmode="tel" maxlength="30" :class="inputClass" />
            </label>
            <label class="block">
              <span class="block font-medium text-label-md text-on-surface mb-2">Email Mahasiswa</span>
              <input v-model="form.email" type="email" maxlength="150" :class="inputClass" />
            </label>
          </div>
          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Judul<span class="text-error"> *</span></span>
            <textarea v-model="form.judul" rows="3" maxlength="1000" :class="inputClass"></textarea>
          </label>
          <div>
            <span class="block font-medium text-label-md text-on-surface mb-2">KKP / Observasi di</span>
            <SelectInput v-if="kkpOptions.length" v-model="form.tempatKkp" placeholder="---" :options="kkpOptions" />
            <input v-else v-model="form.tempatKkp" maxlength="200" placeholder="Nama instansi/perusahaan tempat KKP atau observasi" :class="inputClass" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput v-model="form.pembimbingUtamaId" label="Pembimbing Utama" required placeholder="---" :options="data.pilihanPembimbingUtama" />
            <SelectInput v-model="form.pembimbingPendampingId" label="Pembimbing Pendamping" placeholder="---" :options="data.pilihanPembimbingPendamping" />
          </div>
          <p v-if="data.periode.keterangan" class="text-body-md font-medium text-on-surface whitespace-pre-line">{{ data.periode.keterangan }}</p>
          <div class="flex gap-2">
            <AppButton type="submit" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
            <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
          </div>
        </form>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Pengajuan</div>
        <div v-if="!data.pengajuan.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada pengajuan.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th class="px-4 py-2 text-left font-medium">Periode</th>
                <th class="px-4 py-2 text-left font-medium">Judul</th>
                <th class="px-4 py-2 text-left font-medium">KKP/Observasi</th>
                <th class="px-4 py-2 text-left font-medium">Pembimbing</th>
                <th class="px-4 py-2 text-left font-medium">Status</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant align-top">
              <tr v-for="p in data.pengajuan" :key="p.id">
                <td class="px-4 py-2 whitespace-nowrap">
                  <template v-if="p.periode">{{ formatDate(p.periode.tanggalMulai) }} – {{ formatDate(p.periode.tanggalSelesai) }}</template>
                  <template v-else>-</template>
                </td>
                <td class="px-4 py-2 min-w-56 text-on-surface">{{ p.judul }}</td>
                <td class="px-4 py-2">{{ p.tempatKkp || '-' }}</td>
                <td class="px-4 py-2 min-w-48">
                  <span class="block">1. {{ namaDosenRingkas(p.pembimbingUtama) }}</span>
                  <span v-if="p.pembimbingPendamping" class="block">2. {{ namaDosenRingkas(p.pembimbingPendamping) }}</span>
                </td>
                <td class="px-4 py-2">
                  <StatusBadge :label="STATUS_PENGAJUAN_TA_LABEL[p.status]" :variant="STATUS_PENGAJUAN_TA_VARIANT[p.status]" />
                  <span v-if="p.catatanProdi" class="block mt-1 text-label-sm text-on-surface-variant whitespace-pre-line">{{ p.catatanProdi }}</span>
                </td>
                <td class="px-4 py-2 text-right">
                  <button v-if="p.status === 'DIAJUKAN'" type="button" class="text-label-md text-error hover:underline" @click="batalTarget = p">Batalkan</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <ConfirmDialog
      :open="!!batalTarget"
      title="Batalkan Pengajuan"
      message="Batalkan pengajuan Tugas Akhir/Skripsi ini?"
      :loading="membatalkan"
      @confirm="batalkan"
      @cancel="batalTarget = null"
    />
  </div>
</template>
