<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import { mahasiswaAngketPelayananApi, type AngketPelayananPertanyaan } from '@/api/mahasiswaAngketPelayanan';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

const props = defineProps<{
  tahunAjaranId: number;
  pertanyaan: AngketPelayananPertanyaan[];
}>();

const emit = defineEmits<{ submitted: [] }>();

const SKALA = [
  { value: 1, label: 'Sangat Tidak Puas' },
  { value: 2, label: 'Tidak Puas' },
  { value: 3, label: 'Cukup' },
  { value: 4, label: 'Puas' },
  { value: 5, label: 'Sangat Puas' },
];

const skor = reactive<Record<number, number>>({});
const saran = ref('');
const submitting = ref(false);
const showErrors = ref(false);

// Pertanyaan dikelompokkan per kategori, urutan mengikuti urutan dari server.
const grouped = computed(() => {
  const groups: { kategori: string; items: AngketPelayananPertanyaan[] }[] = [];
  props.pertanyaan.forEach((p) => {
    const kategori = p.kategori ?? 'Umum';
    const last = groups[groups.length - 1];
    if (last && last.kategori === kategori) last.items.push(p);
    else groups.push({ kategori, items: [p] });
  });
  return groups;
});

const nomor = (p: AngketPelayananPertanyaan) => props.pertanyaan.indexOf(p) + 1;
const jumlahTerjawab = computed(() => props.pertanyaan.filter((p) => skor[p.id]).length);

const handleSubmit = async () => {
  if (jumlahTerjawab.value < props.pertanyaan.length) {
    showErrors.value = true;
    toastError('Seluruh pertanyaan angket wajib dijawab');
    return;
  }
  const confirmed = await confirmAction({
    title: 'Kirim angket?',
    text: 'Angket yang sudah dikirim tidak dapat diubah.',
  });
  if (!confirmed) return;

  submitting.value = true;
  try {
    await mahasiswaAngketPelayananApi.submit({
      tahunAjaranId: props.tahunAjaranId,
      jawaban: props.pertanyaan.map((p) => ({ pertanyaanId: p.id, skor: skor[p.id] })),
      saran: saran.value.trim() || null,
    });
    toastSuccess('Terima kasih, angket pelayanan berhasil dikirim');
    emit('submitted');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim angket'));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="p-4 border-b border-outline-variant bg-surface-container text-body-sm text-on-surface flex items-start gap-2">
      <span class="material-symbols-outlined text-primary" style="font-size: 20px">assignment</span>
      <div>
        <p class="font-medium">Isi angket pelayanan terlebih dahulu</p>
        <p class="text-on-surface-variant">
          Angket ini menilai kepuasan Anda terhadap layanan kampus selama periode ini. KRS baru bisa diisi setelah angket dikirim.
          Jawaban bersifat rahasia dan dipakai untuk peningkatan mutu layanan.
        </p>
      </div>
    </div>

    <div v-for="g in grouped" :key="g.kategori">
      <p class="px-4 pt-4 pb-1 text-label-md font-semibold text-primary">{{ g.kategori }}</p>
      <fieldset
        v-for="p in g.items"
        :key="p.id"
        class="px-4 py-3 border-b border-outline-variant"
        :class="showErrors && !skor[p.id] ? 'bg-error-container' : ''"
      >
        <legend class="sr-only">{{ p.pertanyaan }}</legend>
        <p class="text-body-md text-on-surface mb-2">
          <span class="text-on-surface-variant">{{ nomor(p) }}.</span> {{ p.pertanyaan }}
        </p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in SKALA"
            :key="opt.value"
            class="px-3 py-1.5 rounded-full border text-label-sm cursor-pointer transition-colors"
            :class="
              skor[p.id] === opt.value
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant text-on-surface hover:bg-surface-container'
            "
          >
            <input v-model="skor[p.id]" type="radio" class="sr-only" :name="`angket-${p.id}`" :value="opt.value" />
            {{ opt.value }} &middot; {{ opt.label }}
          </label>
        </div>
      </fieldset>
    </div>

    <div class="p-4">
      <TextareaInput v-model="saran" label="Saran / Masukan (opsional)" :rows="3" placeholder="Tulis saran untuk perbaikan layanan kampus..." />
    </div>

    <div class="p-4 border-t border-outline-variant flex items-center justify-between gap-3 flex-wrap">
      <p class="text-body-sm text-on-surface-variant">Terjawab {{ jumlahTerjawab }} dari {{ pertanyaan.length }} pertanyaan</p>
      <AppButton type="submit" icon="send" :disabled="submitting">
        {{ submitting ? 'Mengirim...' : 'Kirim Angket' }}
      </AppButton>
    </div>
  </form>
</template>
