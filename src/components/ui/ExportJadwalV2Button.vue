<script setup lang="ts">
import { computed, ref } from 'vue';
import axios from 'axios';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { authApi } from '@/api/auth';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { ProdiOption, TahunAkademikOption } from '@/types/entities';

/**
 * Export Excel V2: jadwal satu prodi + semester dalam format cetak prodi (judul, per hari, SKS T/P,
 * tanda tangan Kaprodi). Prodi & tahun akademik awal diambil dari konteks sesi; akun ber-role
 * PRODI terkunci ke prodinya (backend juga memaksanya).
 */
const authStore = useAuthStore();
const prodiLocked = computed(() => authStore.isProdiScoped && !!authStore.context.prodi);

const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

const open = ref(false);
const loadingOptions = ref(false);
const exporting = ref(false);
const prodiOptions = ref<ProdiOption[]>([]);
const tahunOptions = ref<TahunAkademikOption[]>([]);
const kodeProdi = ref('');
const semester = ref<number | ''>('');
const tahunAjaranId = ref<number | ''>('');
const errors = ref<{ kodeProdi?: string; semester?: string }>({});

const openModal = async () => {
  open.value = true;
  errors.value = {};
  kodeProdi.value = authStore.context.prodi?.kodeProdi ?? kodeProdi.value;
  tahunAjaranId.value = authStore.context.tahunAkademik?.id ?? tahunAjaranId.value;
  if (prodiOptions.value.length) return;
  loadingOptions.value = true;
  try {
    const options = await authApi.loginOptions();
    prodiOptions.value = options.prodi;
    tahunOptions.value = options.tahunAkademik;
    if (!tahunAjaranId.value) tahunAjaranId.value = options.tahunAkademik.find((t) => t.isActive)?.id ?? '';
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat pilihan prodi'));
  } finally {
    loadingOptions.value = false;
  }
};

/** Respons error dari request blob berupa Blob JSON — ambil pesannya. */
const blobErrorMessage = async (err: unknown) => {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      return JSON.parse(await err.response.data.text())?.message ?? null;
    } catch {
      return null;
    }
  }
  return null;
};

const handleExport = async () => {
  errors.value = {};
  if (!kodeProdi.value) errors.value.kodeProdi = 'Prodi wajib dipilih';
  if (!semester.value) errors.value.semester = 'Semester wajib dipilih';
  if (Object.keys(errors.value).length) return;

  exporting.value = true;
  try {
    const blob = await jadwalKuliahApi.exportExcelV2({
      kodeProdi: kodeProdi.value,
      semester: Number(semester.value),
      tahunAjaranId: tahunAjaranId.value ? Number(tahunAjaranId.value) : undefined,
    });
    const prodi = prodiOptions.value.find((p) => p.kodeProdi === kodeProdi.value)?.nama ?? kodeProdi.value;
    const tahun = tahunOptions.value.find((t) => t.id === tahunAjaranId.value)?.nama ?? '';
    downloadBlob(blob, `jadwal-${prodi}-semester-${semester.value}${tahun ? `-${tahun}` : ''}.xlsx`.replace(/[\s/]+/g, '-').toLowerCase());
    open.value = false;
  } catch (err) {
    toastError((await blobErrorMessage(err)) ?? extractErrorMessage(err, 'Gagal export jadwal'));
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <AppButton variant="secondary" icon="download" @click="openModal">Export Excel V2</AppButton>

  <Modal v-model="open" title="Export Excel V2" subtitle="Jadwal per prodi & semester, format cetak prodi" size="md">
    <div class="space-y-4">
      <SelectInput
        v-model="kodeProdi"
        label="Prodi"
        placeholder="Pilih prodi..."
        required
        :disabled="prodiLocked || loadingOptions"
        :error="errors.kodeProdi"
        :options="prodiOptions.map((p) => ({ value: p.kodeProdi, label: p.nama }))"
      />
      <SelectInput
        v-model="semester"
        label="Semester"
        placeholder="Pilih semester..."
        required
        :error="errors.semester"
        :options="SEMESTER_OPTIONS"
      />
      <SelectInput
        v-model="tahunAjaranId"
        label="Tahun Akademik"
        placeholder="Tahun akademik aktif"
        :disabled="loadingOptions"
        :options="tahunOptions.map((t) => ({ value: t.id, label: t.label }))"
      />
      <p class="text-label-sm text-on-surface-variant">
        Satu sheet per kelas. Jam kuliah diambil dari keterangan jam di kolom Ruangan (mis. "Offline/Blended,
        Lab/Project (09.00-12.30)"); bila tidak ada, ditampilkan "Jam ke-".
      </p>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton icon="download" :disabled="exporting || loadingOptions" @click="handleExport">
        {{ exporting ? 'Mengekspor...' : 'Export' }}
      </AppButton>
    </template>
  </Modal>
</template>
