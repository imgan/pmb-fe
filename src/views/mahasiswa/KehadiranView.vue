<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { mahasiswaDataKampusApi, type RekapKehadiranMahasiswa } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';

const data = ref<RekapKehadiranMahasiswa | null>(null);
const tahunAjaranId = ref<number | string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await mahasiswaDataKampusApi.kehadiran(tahunAjaranId.value ? Number(tahunAjaranId.value) : null);
    tahunAjaranId.value = data.value.tahunAjaranId;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat rekap kehadiran');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

// Kehadiran di bawah 75% ditandai (umumnya syarat ikut ujian).
const kurang = (persen: number | null) => persen !== null && persen < 75;
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Kehadiran</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Rekap kehadiran Anda per mata kuliah yang diambil di KRS.</p>
      </div>
      <div v-if="data?.tahunAjaranOptions.length" class="w-full md:w-64">
        <SelectInput
          v-model="tahunAjaranId"
          label="Tahun Akademik"
          :clearable="false"
          :options="data.tahunAjaranOptions.map((t) => ({ value: t.id, label: `${t.label} (Smt ${t.semester})` }))"
          @change="load"
        />
      </div>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat rekap kehadiran...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div
      v-else-if="!data?.mataKuliah.length"
      class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
    >
      Belum ada mata kuliah di KRS Anda.
    </div>

    <template v-else>
      <div v-if="data.ringkasan" class="grid grid-cols-3 gap-3 mb-6 max-w-xl">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Pertemuan</p>
          <p class="text-headline-md font-semibold text-on-surface">{{ data.ringkasan.pertemuan }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Hadir</p>
          <p class="text-headline-md font-semibold text-on-surface">{{ data.ringkasan.hadir }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Kehadiran</p>
          <p class="text-headline-md font-semibold" :class="kurang(data.ringkasan.persen) ? 'text-error' : 'text-on-surface'">
            {{ data.ringkasan.persen === null ? '-' : `${data.ringkasan.persen}%` }}
          </p>
        </div>
      </div>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th class="px-4 py-2 text-left font-medium">Mata Kuliah</th>
                <th class="px-4 py-2 text-left font-medium">Kelas</th>
                <th class="px-4 py-2 text-center font-medium">Pertemuan</th>
                <th class="px-4 py-2 text-center font-medium">Hadir</th>
                <th class="px-4 py-2 text-center font-medium">Izin</th>
                <th class="px-4 py-2 text-center font-medium">Sakit</th>
                <th class="px-4 py-2 text-center font-medium">Alpa</th>
                <th class="px-4 py-2 text-center font-medium">Kehadiran</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="mk in data.mataKuliah" :key="mk.jadwalKuliahId">
                <td class="px-4 py-2">
                  <span class="block text-on-surface font-medium">[{{ mk.kodeMataKuliah }}] {{ mk.namaMataKuliah }}</span>
                  <span class="block text-label-sm text-on-surface-variant">{{ mk.dosen ?? '-' }}</span>
                </td>
                <td class="px-4 py-2 whitespace-nowrap">{{ mk.kelas }}</td>
                <td class="px-4 py-2 text-center">{{ mk.pertemuan }}</td>
                <td class="px-4 py-2 text-center">{{ mk.hadir }}</td>
                <td class="px-4 py-2 text-center">{{ mk.izin }}</td>
                <td class="px-4 py-2 text-center">{{ mk.sakit }}</td>
                <td class="px-4 py-2 text-center" :class="mk.alpa ? 'text-error font-medium' : ''">{{ mk.alpa }}</td>
                <td class="px-4 py-2 text-center whitespace-nowrap font-medium" :class="kurang(mk.persen) ? 'text-error' : 'text-on-surface'">
                  {{ mk.persen === null ? '-' : `${mk.persen}%` }}
                  <span v-if="mk.belumTercatat" class="block text-label-sm font-normal text-on-surface-variant">{{ mk.belumTercatat }} belum tercatat</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p class="mt-2 text-label-sm text-on-surface-variant">
        Pertemuan dihitung dari realisasi dosen mengajar. Persentase di bawah 75% ditandai merah.
      </p>
    </template>
  </div>
</template>
