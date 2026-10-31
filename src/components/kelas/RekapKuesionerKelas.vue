<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useKelasKuliahApi, type RekapKuesionerKelas } from '@/api/kelasKuliah';
import { extractErrorMessage } from '@/api/http';

/**
 * Detail Kelas → Rekap Kuesioner: hasil angket dosen (EDOM) yang diisi mahasiswa kelas ini, per dosen:
 * responden, rata-rata per pertanyaan & keseluruhan, distribusi jawaban, jawaban terbuka & saran (anonim).
 * Portal Dosen hanya menampilkan rekap dosen yang login.
 */
const props = defineProps<{ kelasId: number }>();
const kelasKuliahApi = useKelasKuliahApi();

const data = ref<RekapKuesionerKelas | null>(null);
const error = ref<string | null>(null);
const load = async () => {
  error.value = null;
  try {
    data.value = await kelasKuliahApi.rekapKuesioner(props.kelasId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat rekap kuesioner');
  }
};
onMounted(load);
watch(() => props.kelasId, load);

const angka = (v: number | null) => (v === null ? '-' : v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
/** Predikat sederhana dari persentase rata-rata terhadap skala maksimum. */
const predikat = (p: number | null) =>
  p === null ? null : p >= 85 ? 'Sangat Baik' : p >= 70 ? 'Baik' : p >= 55 ? 'Cukup' : p >= 40 ? 'Kurang' : 'Sangat Kurang';
const warna = (p: number | null) => (p === null ? 'bg-outline-variant' : p >= 70 ? 'bg-[#059669]' : p >= 55 ? 'bg-[#eda100]' : 'bg-error');
const persenSkala = (v: number | null) => (v === null || !data.value?.skalaMaks ? 0 : Math.round((v / data.value.skalaMaks) * 100));
</script>

<template>
  <div class="space-y-4">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <template v-if="data">
      <p class="text-body-sm text-on-surface-variant">
        Hasil angket dosen (EDOM) dari mahasiswa peserta kelas ini ({{ data.peserta }} peserta). Identitas responden tidak ditampilkan.
        <template v-if="data.skala.length">Skala: {{ data.skala.map((s) => `${s.nilai} = ${s.jawaban}`).join(', ') }}.</template>
      </p>

      <div v-if="!data.dosen.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        Tidak ada dosen yang dinilai pada kelas ini.
      </div>

      <section v-for="d in data.dosen" :key="d.id" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <!-- Ringkasan dosen -->
        <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-4">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-on-surface">{{ d.nama }}</p>
            <p class="text-body-sm text-on-surface-variant">
              {{ d.nidn }} · {{ d.peran }}
              <span v-if="!d.dinilai" class="ml-1 px-1.5 py-0.5 rounded bg-surface-container text-label-sm">Tidak diisi kuesioner</span>
            </p>
          </div>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-label-sm text-on-surface-variant">Responden</p>
              <p class="text-headline-sm font-semibold">{{ d.responden }}<span class="text-body-sm font-normal text-on-surface-variant">/{{ data.peserta }}</span></p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Rata-rata</p>
              <p class="text-headline-sm font-semibold">{{ angka(d.rataRata) }}<span v-if="data.skalaMaks" class="text-body-sm font-normal text-on-surface-variant">/{{ data.skalaMaks }}</span></p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Predikat</p>
              <p class="text-body-md font-semibold mt-1">{{ predikat(d.persen) ?? '-' }}</p>
            </div>
          </div>
        </div>
        <div v-if="d.persen !== null" class="px-4 pt-3">
          <div class="h-2 rounded-full bg-surface-container overflow-hidden">
            <div class="h-full rounded-full" :class="warna(d.persen)" :style="{ width: `${d.persen}%` }" />
          </div>
          <p class="mt-1 text-label-sm text-on-surface-variant text-right">{{ d.persen }}% dari skala maksimum</p>
        </div>

        <div v-if="!d.responden" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada mahasiswa yang mengisi kuesioner untuk dosen ini.</div>
        <template v-else>
          <!-- Per pertanyaan -->
          <div class="overflow-x-auto">
            <table class="w-full text-body-sm border-collapse">
              <thead class="bg-[#F1F5F9] text-label-md text-primary">
                <tr>
                  <th class="p-2.5 text-left w-10">No</th>
                  <th class="p-2.5 text-left min-w-64">Pertanyaan</th>
                  <th v-for="s in data.skala" :key="s.nilai" class="p-2 text-center whitespace-nowrap" :title="s.jawaban">{{ s.nilai }}</th>
                  <th class="p-2.5 text-center min-w-40">Rata-rata</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="(q, i) in d.pertanyaan" :key="i">
                  <td class="p-2.5">{{ i + 1 }}</td>
                  <td class="p-2.5">{{ q.pertanyaan }}</td>
                  <td v-for="s in data.skala" :key="s.nilai" class="p-2 text-center tabular-nums text-on-surface-variant">{{ q.distribusi[s.nilai] ?? 0 }}</td>
                  <td class="p-2.5">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div class="h-full rounded-full" :class="warna(persenSkala(q.rataRata))" :style="{ width: `${persenSkala(q.rataRata)}%` }" />
                      </div>
                      <span class="tabular-nums font-medium w-10 text-right">{{ angka(q.rataRata) }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Jawaban terbuka & saran -->
          <div v-if="d.terbuka.length || d.saran.length" class="p-4 border-t border-outline-variant grid grid-cols-1 lg:grid-cols-2 gap-4 text-body-sm">
            <div v-if="d.terbuka.length">
              <p class="font-semibold text-primary mb-2">Jawaban Terbuka</p>
              <ul class="space-y-2">
                <li v-for="(t, i) in d.terbuka" :key="i" class="px-3 py-2 rounded-md bg-surface-container-low">
                  <p class="text-label-sm text-on-surface-variant">{{ t.pertanyaan }}</p>
                  <p>{{ t.teks }}</p>
                </li>
              </ul>
            </div>
            <div v-if="d.saran.length">
              <p class="font-semibold text-primary mb-2">Saran ({{ d.saran.length }})</p>
              <ul class="space-y-2">
                <li v-for="(s, i) in d.saran" :key="i" class="px-3 py-2 rounded-md bg-surface-container-low whitespace-pre-line">{{ s }}</li>
              </ul>
            </div>
          </div>
        </template>
      </section>
    </template>
    <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat rekap kuesioner...</div>
  </div>
</template>
