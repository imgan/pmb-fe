<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { extractErrorMessage } from '@/api/http';
import type { DetailKelasDosenPengajar } from '@/api/dosenPortal';

/**
 * Popup detail kelas + tim Dosen Pengajar (Penanggung Jawab, SKS, jadwal, Isi Kuesioner).
 * Dipakai portal dosen (Kelas Kuliah) dan modul Prodi (Jadwal Kuliah); `load` menentukan endpoint.
 */
const props = defineProps<{ jadwalKuliahId: number | null; load: (id: number) => Promise<DetailKelasDosenPengajar> }>();
const detailOpen = defineModel<boolean>({ default: false });

const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const detail = ref<DetailKelasDosenPengajar | null>(null);

watch(detailOpen, async (v) => {
  if (!v || !props.jadwalKuliahId) return;
  detailLoading.value = true;
  detailError.value = null;
  detail.value = null;
  try {
    detail.value = await props.load(props.jadwalKuliahId);
  } catch (err) {
    detailError.value = extractErrorMessage(err, 'Gagal memuat detail kelas');
  } finally {
    detailLoading.value = false;
  }
});

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const formatJadwal = (hari?: string[] | null, jam?: number | null) => {
  const h = (hari ?? []).map(titleCase).join(', ');
  return [h, jam ? `Jam ke-${jam}` : ''].filter(Boolean).join(', ') || '-';
};
const infoRows = computed(() => {
  const k = detail.value?.kelas;
  if (!k) return [];
  return [
    ['Program Studi', k.programStudi ?? '-', 'Periode', k.tahunAjaran ?? '-'],
    ['Mata Kuliah', `${k.kodeMataKuliah} - ${k.namaMataKuliah} - ${k.sks ?? 0} SKS`, 'Nama Kelas', k.kelas],
    ['Kurikulum', k.kurikulum ? String(k.kurikulum) : '-', 'Semester', k.semester ? String(k.semester) : '-'],
    ['Jadwal', formatJadwal(k.hari, k.jam), 'Peserta', String(k.peserta)],
  ];
});
const formatSks = (n: number | null) => (n === null ? '-' : n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
</script>

<template>
  <Modal v-model="detailOpen" title="Dosen Pengajar" subtitle="Dosen Pengajar Kelas" size="lg">
    <div v-if="detailLoading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <div v-else-if="detailError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ detailError }}</div>
    <template v-else-if="detail">
      <div class="rounded-md bg-surface-container-low p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-body-sm mb-6">
        <template v-for="row in infoRows" :key="row[0]">
          <div class="flex gap-3">
            <span class="w-28 shrink-0 font-semibold text-primary">{{ row[0] }}</span>
            <span class="text-on-surface">{{ row[1] }}</span>
          </div>
          <div class="flex gap-3">
            <span class="w-28 shrink-0 font-semibold text-primary">{{ row[2] }}</span>
            <span class="text-on-surface">{{ row[3] }}</span>
          </div>
        </template>
      </div>

      <p v-if="!detail.dosenPengajar.length" class="text-center text-body-sm text-on-surface-variant">Belum ada dosen pengajar.</p>
      <div v-for="d in detail.dosenPengajar" :key="d.dosenId" class="mb-6 last:mb-0">
        <h3 class="font-semibold text-title-md text-[#059669] pb-1.5 mb-3 border-b-2 border-[#059669]">
          Dosen Pengajar {{ d.urutan }}
          <span v-if="d.saya" class="ml-2 align-middle px-2 py-0.5 rounded-full text-label-sm bg-primary-container text-on-primary-container font-medium">Anda</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 items-start text-body-sm">
          <div>
            <p class="text-on-surface font-medium">{{ d.nidn ?? '-' }} - {{ d.nama }}</p>
            <p class="mt-1 flex items-center gap-1 text-on-surface-variant">
              <span class="material-symbols-outlined text-[#059669]" style="font-size: 16px">schedule</span>
              {{ formatJadwal(d.hari, d.jam) }}<template v-if="d.ruangan"> · {{ d.ruangan }}</template>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="tabular-nums">{{ formatSks(d.sks) }}</span>
            <span class="px-2 py-1 rounded border border-outline-variant bg-surface-container text-label-sm">SKS</span>
          </div>
          <ul class="space-y-1">
            <li class="flex items-center gap-1">
              <span class="material-symbols-outlined" :class="d.penanggungJawab ? 'text-[#059669]' : 'text-error'" style="font-size: 18px">
                {{ d.penanggungJawab ? 'check' : 'close' }}
              </span>
              Penanggung Jawab
            </li>
            <li class="flex items-center gap-1">
              <span class="material-symbols-outlined" :class="d.isiKuesioner ? 'text-[#059669]' : 'text-error'" style="font-size: 18px">
                {{ d.isiKuesioner ? 'check' : 'close' }}
              </span>
              Isi Kuesioner
            </li>
          </ul>
        </div>
      </div>
      <p class="mt-4 text-label-sm text-on-surface-variant">
        Isi Kuesioner = dosen dinilai mahasiswa melalui kuesioner kelas. Susunan dosen pengajar diatur di Jadwal Kuliah (BAAK/Prodi).
      </p>
    </template>
  </Modal>
</template>
