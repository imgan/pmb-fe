<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { mahasiswaDataKampusApi, type KurikulumMahasiswa, type StatusMkKurikulum } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';

const data = ref<KurikulumMahasiswa | null>(null);
const tahunKurikulum = ref<number | string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const STATUS: Record<StatusMkKurikulum, { label: string; cls: string }> = {
  LULUS: { label: 'Lulus', cls: 'bg-primary-container text-on-primary-container' },
  MENGULANG: { label: 'Mengulang', cls: 'bg-error-container text-on-error-container' },
  BELUM: { label: 'Belum diambil', cls: 'bg-surface-container text-on-surface-variant' },
};
const JENIS: Record<string, string> = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori & Praktik' };

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await mahasiswaDataKampusApi.kurikulum(tahunKurikulum.value ? Number(tahunKurikulum.value) : null);
    tahunKurikulum.value = data.value.tahunKurikulum;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kurikulum');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Kurikulum</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Mata kuliah kurikulum prodi Anda per semester beserta status kelulusannya.</p>
      </div>
      <div v-if="data?.tahunKurikulumOptions.length" class="w-full md:w-56">
        <SelectInput
          v-model="tahunKurikulum"
          label="Tahun Kurikulum"
          :clearable="false"
          :options="data.tahunKurikulumOptions.map((t) => ({ value: t, label: `Kurikulum ${t}` }))"
          @change="load"
        />
      </div>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat kurikulum...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div
      v-else-if="!data?.semester.length"
      class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
    >
      Kurikulum prodi Anda belum tersedia.
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Total SKS kurikulum</p>
          <p class="text-headline-md font-semibold text-on-surface">{{ data.ringkasan.totalSks }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">SKS sudah lulus</p>
          <p class="text-headline-md font-semibold text-on-surface">{{ data.ringkasan.sksLulus }}</p>
        </div>
      </div>

      <div class="space-y-6">
        <section
          v-for="s in data.semester"
          :key="s.semester ?? 'lain'"
          class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
        >
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex justify-between">
            <span>{{ s.semester ? `Semester ${s.semester}` : 'Semester belum ditentukan' }}</span>
            <span>{{ s.totalSks }} SKS</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-body-sm">
              <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th class="px-4 py-2 text-left font-medium">Kode</th>
                  <th class="px-4 py-2 text-left font-medium">Mata Kuliah</th>
                  <th class="px-4 py-2 text-left font-medium">Jenis</th>
                  <th class="px-4 py-2 text-center font-medium">Teori</th>
                  <th class="px-4 py-2 text-center font-medium">Praktik</th>
                  <th class="px-4 py-2 text-center font-medium">SKS</th>
                  <th class="px-4 py-2 text-center font-medium">Nilai</th>
                  <th class="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="mk in s.mataKuliah" :key="mk.kode">
                  <td class="px-4 py-2 whitespace-nowrap">{{ mk.kode }}</td>
                  <td class="px-4 py-2 text-on-surface">
                    {{ mk.mataKuliah }}
                    <span v-if="!mk.wajib" class="text-label-sm text-on-surface-variant">(pilihan)</span>
                  </td>
                  <td class="px-4 py-2 whitespace-nowrap">{{ mk.jenisMataKuliah ? JENIS[mk.jenisMataKuliah] : '-' }}</td>
                  <td class="px-4 py-2 text-center">{{ mk.sksTeori }}</td>
                  <td class="px-4 py-2 text-center">{{ mk.sksPraktek }}</td>
                  <td class="px-4 py-2 text-center font-medium">{{ mk.sksTotal }}</td>
                  <td class="px-4 py-2 text-center">{{ mk.grade ?? '-' }}</td>
                  <td class="px-4 py-2">
                    <span class="px-2 py-0.5 rounded-full text-label-sm whitespace-nowrap" :class="STATUS[mk.status].cls">{{ STATUS[mk.status].label }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
