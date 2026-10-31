<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess } from '@/utils/swal';

/**
 * Buat cicilan bulanan sekaligus untuk semua tagihan satu tahun akademik (opsional satu prodi):
 * total tagihan dibagi rata per bulan, No VA cicilan diambil dari No VA tagihan.
 */
const props = defineProps<{ tahunAjaranOptions: { value: number; label: string }[]; defaultTahunAjaranId?: number | null }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ done: [] }>();

const prodiOptions = ref<{ value: number; label: string }[]>([]);
const form = reactive({
  tahunAjaranId: null as number | string | null,
  jurusanId: null as number | string | null,
  jumlahBulan: 6,
  bulanMulai: '',
  hariJatuhTempo: 10 as number | null,
  timpa: false,
});
const saving = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const res = await jurusanApi.list({ limit: 100 });
    prodiOptions.value = res.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  } catch {
    prodiOptions.value = [];
  }
});

watch(open, (v) => {
  if (!v) return;
  error.value = null;
  form.tahunAjaranId = props.defaultTahunAjaranId ?? null;
  if (!form.bulanMulai) {
    const d = new Date();
    form.bulanMulai = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
});

const submit = async () => {
  error.value = null;
  if (!form.tahunAjaranId) {
    error.value = 'Pilih tahun akademik';
    return;
  }
  if (!form.bulanMulai || !(form.jumlahBulan >= 1 && form.jumlahBulan <= 12)) {
    error.value = 'Isi bulan mulai dan jumlah bulan (1-12)';
    return;
  }
  saving.value = true;
  try {
    const res = await tagihanKuliahApi.generateCicilan({
      tahunAjaranId: Number(form.tahunAjaranId),
      jurusanId: form.jurusanId ? Number(form.jurusanId) : null,
      jumlahBulan: form.jumlahBulan,
      bulanMulai: form.bulanMulai,
      hariJatuhTempo: form.hariJatuhTempo || null,
      timpa: form.timpa,
    });
    toastSuccess(res.message);
    emit('done');
    open.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membuat cicilan');
  } finally {
    saving.value = false;
  }
};

const inputClass =
  'w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary';
</script>

<template>
  <Modal v-model="open" title="Buat Cicilan Massal" subtitle="Bagi rata tagihan satu tahun akademik menjadi cicilan bulanan" size="md">
    <form class="space-y-4" @submit.prevent="submit">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <SelectInput v-model="form.tahunAjaranId" label="Tahun Akademik" required :options="tahunAjaranOptions" />
      <SelectInput v-model="form.jurusanId" label="Prodi" placeholder="Semua prodi" :options="prodiOptions" />
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Jumlah bulan</span>
          <input v-model.number="form.jumlahBulan" type="number" min="1" max="12" :class="inputClass" />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Mulai bulan</span>
          <input v-model="form.bulanMulai" type="month" :class="inputClass" />
        </label>
      </div>
      <label class="block">
        <span class="block font-medium text-label-md text-on-surface mb-2">Jatuh tempo tiap tanggal</span>
        <input v-model.number="form.hariJatuhTempo" type="number" min="1" max="31" :class="inputClass" />
      </label>
      <CheckboxToggle
        v-model="form.timpa"
        label="Timpa cicilan yang sudah ada"
        description="Jika tidak dicentang, tagihan yang sudah punya cicilan dilewati."
      />
      <p class="text-label-sm text-on-surface-variant">
        No Virtual Account tiap cicilan diambil dari No VA tagihan; bisa diubah per tagihan lewat tombol Cicilan.
      </p>
    </form>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton :disabled="saving" @click="submit">{{ saving ? 'Memproses...' : 'Buat Cicilan' }}</AppButton>
    </template>
  </Modal>
</template>
