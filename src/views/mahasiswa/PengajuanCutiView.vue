<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import DateInput from '@/components/ui/DateInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { mahasiswaCutiApi, type FormCuti, type StatusPengajuanCuti } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { confirmAction, toastSuccess } from '@/utils/swal';

/**
 * Pengajuan cuti akademik (Pengajuan → Cuti). Pengajuan masuk ke prodi (menu Master Cuti) untuk
 * disetujui/ditolak; selama belum diproses mahasiswa masih bisa membatalkannya.
 */
const STATUS_LABEL: Record<StatusPengajuanCuti, string> = { DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };
const STATUS_VARIANT: Record<StatusPengajuanCuti, 'warning' | 'success' | 'danger'> = {
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};

const data = ref<FormCuti | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);
const printingId = ref<number | null>(null);

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({
  semester: (data.value?.semesterBerjalan ?? '') as number | '',
  tanggalAwal: hariIni(),
  tanggalAkhir: hariIni(),
  alasan: '',
});
const form = ref(emptyForm());

const load = async () => {
  try {
    data.value = await mahasiswaCutiApi.getForm();
    form.value = emptyForm();
  } catch (err) {
    loadError.value = extractErrorMessage(err, 'Gagal memuat data pengajuan cuti');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const semesterOptions = computed(() => {
  const max = Math.max(data.value?.semesterBerjalan ?? 8, 8);
  return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
});

const adaMenunggu = computed(() => data.value?.riwayat.some((r) => r.status === 'DIAJUKAN') ?? false);
const bisaMengajukan = computed(() => !!data.value && !data.value.sedangCuti && !adaMenunggu.value);

const simpan = async () => {
  const f = form.value;
  if (!f.semester) return (error.value = 'Semester wajib dipilih');
  if (!f.tanggalAwal || !f.tanggalAkhir) return (error.value = 'Tanggal cuti wajib diisi');
  if (f.tanggalAkhir < f.tanggalAwal) return (error.value = 'Tanggal akhir tidak boleh sebelum tanggal awal');
  if (!f.alasan.trim()) return (error.value = 'Alasan wajib diisi');
  saving.value = true;
  error.value = null;
  try {
    const pengajuan = await mahasiswaCutiApi.ajukan({
      semester: Number(f.semester),
      tanggalAwal: f.tanggalAwal,
      tanggalAkhir: f.tanggalAkhir,
      alasan: f.alasan.trim(),
    });
    data.value!.riwayat.unshift(pengajuan);
    form.value = emptyForm();
    toastSuccess('Pengajuan cuti dikirim, menunggu persetujuan prodi');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mengirim pengajuan cuti');
  } finally {
    saving.value = false;
  }
};

const batal = () => {
  form.value = emptyForm();
  error.value = null;
};

const cetak = async (id: number) => {
  printingId.value = id;
  try {
    openBlob(await mahasiswaCutiApi.cetakPdf(id));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mencetak formulir cuti');
  } finally {
    printingId.value = null;
  }
};

const hapus = async (id: number) => {
  const ok = await confirmAction({ title: 'Batalkan pengajuan cuti?', text: 'Pengajuan yang dibatalkan akan dihapus.', confirmLabel: 'Ya, batalkan' });
  if (!ok) return;
  try {
    await mahasiswaCutiApi.batalkan(id);
    data.value!.riwayat = data.value!.riwayat.filter((r) => r.id !== id);
    toastSuccess('Pengajuan cuti dibatalkan');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membatalkan pengajuan cuti');
  }
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pengajuan Cuti</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Cuti akademik<span v-if="data?.tahunAjaran"> &middot; Tahun Ajaran {{ data.tahunAjaran }}</span>
      </p>
    </header>

    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
    <div v-else-if="loadError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ loadError }}</div>

    <template v-else-if="data">
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden max-w-3xl mb-6">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Formulir Pengajuan Cuti</div>

        <dl class="px-4 py-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-body-sm border-b border-outline-variant">
          <dt class="text-on-surface-variant">NPM</dt>
          <dd class="text-on-surface">{{ data.mahasiswa.nim }}</dd>
          <dt class="text-on-surface-variant">Nama</dt>
          <dd class="text-on-surface">{{ data.mahasiswa.namaLengkap }}</dd>
          <dt class="text-on-surface-variant">Program Studi</dt>
          <dd class="text-on-surface">{{ data.mahasiswa.prodi }}</dd>
        </dl>

        <div v-if="!bisaMengajukan" class="p-4 text-body-sm text-on-surface-variant">
          {{
            data.sedangCuti
              ? 'Anda sedang berstatus cuti akademik.'
              : 'Pengajuan cuti Anda sedang menunggu persetujuan prodi. Pengajuan baru bisa dibuat setelah diproses.'
          }}
        </div>

        <form v-else class="p-4 space-y-4" @submit.prevent="simpan">
          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
          <SelectInput v-model="form.semester" label="Semester" placeholder="--pilih--" required :options="semesterOptions" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateInput v-model="form.tanggalAwal" label="Ambil Cuti dari Tanggal" required />
            <DateInput v-model="form.tanggalAkhir" label="s/d Tanggal" required :min="form.tanggalAwal" />
          </div>
          <TextareaInput v-model="form.alasan" label="Alasan" required :rows="3" />
          <div class="flex gap-2 pt-2">
            <AppButton type="submit" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
            <AppButton variant="secondary" type="button" @click="batal">Batal</AppButton>
          </div>
        </form>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Pengajuan Cuti</div>
        <div v-if="error && !bisaMengajukan" class="m-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-[#F1F5F9] border-b border-outline-variant">
              <tr class="text-label-md text-primary font-semibold">
                <th class="p-3 text-center">No</th>
                <th class="p-3">Tanggal Awal</th>
                <th class="p-3">Tanggal Akhir</th>
                <th class="p-3">Tanggal Ajuan</th>
                <th class="p-3">Alasan</th>
                <th class="p-3 text-center">Semester</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Print Out</th>
                <th class="p-3 text-center">#</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
              <tr v-if="!data.riwayat.length">
                <td colspan="9" class="p-6 text-center text-on-surface-variant">Belum ada pengajuan cuti</td>
              </tr>
              <tr v-for="(item, i) in data.riwayat" :key="item.id">
                <td class="p-3 text-center">{{ i + 1 }}</td>
                <td class="p-3 whitespace-nowrap">{{ formatDate(item.tanggalAwal) }}</td>
                <td class="p-3 whitespace-nowrap">{{ formatDate(item.tanggalAkhir) }}</td>
                <td class="p-3 whitespace-nowrap">{{ formatDate(item.tanggalAjuan) }}</td>
                <td class="p-3">
                  <div class="whitespace-pre-line">{{ item.alasan }}</div>
                  <div v-if="item.catatanProdi" class="mt-1 text-label-sm text-on-surface-variant">Catatan prodi: {{ item.catatanProdi }}</div>
                </td>
                <td class="p-3 text-center">{{ item.semester }}</td>
                <td class="p-3 text-center">
                  <StatusBadge :label="STATUS_LABEL[item.status]" :variant="STATUS_VARIANT[item.status]" />
                </td>
                <td class="p-3 text-center">
                  <AppButton variant="secondary" icon="print" :disabled="printingId === item.id" @click="cetak(item.id)">Cetak</AppButton>
                </td>
                <td class="p-3 text-center">
                  <AppButton v-if="item.status === 'DIAJUKAN'" variant="danger" icon="delete" @click="hapus(item.id)">Batal</AppButton>
                  <span v-else class="text-on-surface-variant">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
