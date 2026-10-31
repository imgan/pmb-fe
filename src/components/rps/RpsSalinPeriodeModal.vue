<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { useRpsApi } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/** Salin rencana pembelajaran / evaluasi dari periode lain (mata kuliah ini atau mata kuliah lain) ke periode terpilih. */
const props = defineProps<{
  jenis: 'pertemuan' | 'evaluasi';
  mkId: number;
  tahunAjaranId: number;
  mkOptions: SelectOption[];
  tahunAjaranOptions: SelectOption[];
}>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ disalin: [] }>();

const dariMk = ref<string | number | null>(props.mkId);
const dariTa = ref<string | number | null>('');
watch(open, (v) => {
  if (!v) return;
  dariMk.value = props.mkId;
  dariTa.value = '';
});
const taOptions = computed(() => props.tahunAjaranOptions.filter((o) => Number(dariMk.value) !== props.mkId || o.value !== props.tahunAjaranId));
const label = computed(() => (props.jenis === 'pertemuan' ? 'Rencana Pembelajaran' : 'Rencana Evaluasi'));

const menyalin = ref(false);
const salin = async () => {
  if (!dariMk.value || !dariTa.value) return toastError('Pilih mata kuliah & periode sumber');
  menyalin.value = true;
  try {
    toastSuccess(
      await rpsApi.salin(props.jenis, props.mkId, { dariMataKuliahId: Number(dariMk.value), dariTahunAjaranId: Number(dariTa.value), tahunAjaranId: props.tahunAjaranId }),
    );
    open.value = false;
    emit('disalin');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyalin data'));
  } finally {
    menyalin.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" :title="`Salin ${label}`" size="md">
    <div class="space-y-3 text-body-sm">
      <p class="text-on-surface-variant">
        Salin {{ label.toLowerCase() }} dari periode lain ke periode yang sedang dipilih.
        <template v-if="jenis === 'pertemuan'">Sesi yang sudah ada dilewati.</template>
        <template v-else>Periode tujuan harus masih kosong; metode, sub metode &amp; nilai CPMK ikut disalin.</template>
        CPMK dari mata kuliah lain dicocokkan lewat kode.
      </p>
      <SearchableSelect v-model="dariMk" label="Mata Kuliah Sumber" placeholder="-- Pilih Mata Kuliah --" :options="mkOptions" />
      <SelectInput v-model="dariTa" label="Periode Sumber" placeholder="-- Pilih Periode --" :options="taOptions" />
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton icon="content_copy" :disabled="menyalin" @click="salin">{{ menyalin ? 'Menyalin...' : 'Salin' }}</AppButton>
    </template>
  </Modal>
</template>
