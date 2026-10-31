<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { mahasiswaNilaiApi } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { KhsSemester } from '@/types/entities';

const perSemester = ref<KhsSemester[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// ---- Cetak KHS ----
// Pilihan semester hanya yang sudah punya nilai (perSemester berasal dari nilai yang tercatat).
const semesterOptions = computed(() =>
  perSemester.value
    .filter((s) => s.nilai.length)
    .map((s) => ({ value: s.semester as number | 'semua', label: `Semester ${s.semester}` }))
    .concat(perSemester.value.filter((s) => s.nilai.length).length > 1 ? [{ value: 'semua', label: 'Semua Semester' }] : [])
);
const selectedSemester = ref<number | 'semua' | ''>('');
const printing = ref(false);

onMounted(async () => {
  try {
    perSemester.value = await mahasiswaNilaiApi.list();
    const perSmt = semesterOptions.value.filter((o) => o.value !== 'semua');
    const last = perSmt[perSmt.length - 1];
    if (last) selectedSemester.value = last.value;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat nilai');
  } finally {
    loading.value = false;
  }
});

const handleCetakKhs = async () => {
  if (!selectedSemester.value) {
    toastError('Pilih semester terlebih dahulu');
    return;
  }
  printing.value = true;
  try {
    const blob = await mahasiswaNilaiApi.cetakKhsPdf(selectedSemester.value === 'semua' ? 'semua' : Number(selectedSemester.value));
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen KHS'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Nilai (KHS)</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Kartu Hasil Studi per semester.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>

    <div
      v-if="!loading && semesterOptions.length"
      class="mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg flex items-end gap-3 flex-wrap"
    >
      <div class="w-full sm:w-56">
        <SelectInput
          v-model="selectedSemester"
          label="Cetak KHS Semester"
          :options="semesterOptions"
          placeholder="Pilih semester"
        />
      </div>
      <AppButton icon="print" :disabled="!selectedSemester || printing" @click="handleCetakKhs">
        {{ printing ? 'Membuka...' : 'Cetak KHS' }}
      </AppButton>
    </div>

    <div v-if="!loading" class="space-y-6">
      <section
        v-for="s in perSemester"
        :key="s.semester"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
      >
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between flex-wrap gap-2">
          <span>Semester {{ s.semester }}</span>
          <span>IP Semester: {{ s.ipSemester.toFixed(2) }}</span>
        </div>
        <div v-if="s.terkunciEdom" class="px-4 py-2.5 bg-surface-container text-body-sm text-on-surface flex items-start gap-2">
          <span class="material-symbols-outlined text-primary shrink-0" style="font-size: 18px">info</span>
          <span>
            Sebagian nilai belum tampil. Isi kuesioner dosen untuk mata kuliah tersebut terlebih dahulu — angket hanya diisi satu kali.
            IP semester & cetak KHS menunggu semua kuesioner diisi.
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-[#F1F5F9] border-b border-outline-variant">
              <tr class="text-label-md text-primary font-semibold">
                <th class="p-3">Kode MK</th>
                <th class="p-3">Mata Kuliah</th>
                <th class="p-3 text-center">SKS</th>
                <th class="p-3 text-center">Nilai</th>
                <th class="p-3 text-center">Grade</th>
                <th class="p-3 text-center">Mutu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
              <tr v-for="n in s.nilai" :key="n.kodeMataKuliah">
                <td class="p-3">{{ n.kodeMataKuliah }}</td>
                <td class="p-3">{{ n.namaMataKuliah }}</td>
                <td class="p-3 text-center">{{ n.sks }}</td>
                <td class="p-3 text-center">
                  <RouterLink
                    v-if="n.perluIsiAngket"
                    :to="{ name: 'mahasiswa-angket-dosen', query: n.jadwalKuliahId ? { jadwal: String(n.jadwalKuliahId) } : {} }"
                    class="inline-flex items-center gap-1 whitespace-nowrap text-on-surface hover:underline"
                  >
                    Isi Kuesioner <span class="font-semibold text-[#059669]">Dosen</span>
                  </RouterLink>
                  <template v-else>{{ n.nilai }}</template>
                </td>
                <td class="p-3 text-center font-semibold">{{ n.grade ?? '-' }}</td>
                <td class="p-3 text-center">{{ n.perluIsiAngket ? '-' : n.mutu.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-outline-variant font-semibold text-body-sm">
              <tr>
                <td class="p-3" colspan="2">Total</td>
                <td class="p-3 text-center">{{ s.totalSks }}</td>
                <td class="p-3" colspan="2"></td>
                <td class="p-3 text-center">{{ s.totalMutu.toFixed(2) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p v-if="!perSemester.length" class="text-center py-12 text-body-sm text-on-surface-variant">
        Belum ada nilai yang tercatat.
      </p>
    </div>
  </div>
</template>
