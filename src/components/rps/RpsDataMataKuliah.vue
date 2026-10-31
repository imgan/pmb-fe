<script setup lang="ts">
import { computed } from 'vue';
import type { RpsDetail } from '@/api/rps';

/** Menu "Data Mata Kuliah": identitas mata kuliah (baca saja; diubah lewat menu Kurikulum). */
const props = defineProps<{ detail: RpsDetail }>();

const JENIS_MK: Record<string, string> = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori + Praktik' };
const KELOMPOK_KURIKULUM: Record<string, string> = { WAJIB: 'Wajib', PILIHAN: 'Pilihan' };

const baris = computed(() => {
  const m = props.detail.mataKuliah;
  return [
    ['Kode Mata Kuliah', m.kode],
    ['Nama Mata Kuliah', m.mataKuliah],
    ['Nama Mata Kuliah (ENG)', m.mataKuliahEn],
    ['Kurikulum', m.kurikulum],
    ['Semester', m.semester],
    ['SKS Teori / Praktek / Lab / Simulasi', `${m.sksTeori} / ${m.sksPraktek} / ${m.sksLab} / ${m.sksSimulasi}`],
    ['SKS Total', m.sksTotal],
    ['Jenis Mata Kuliah', m.jenisMataKuliah ? JENIS_MK[m.jenisMataKuliah] : null],
    ['Kelompok Mata Kuliah', m.kelompokMataKuliah],
    ['Sifat', m.kelompokKurikulum ? KELOMPOK_KURIKULUM[m.kelompokKurikulum] : null],
    ['Metode Pembelajaran', m.metodePembelajaran],
    ['Jenis Kurikulum', m.isObe ? 'OBE' : 'Non OBE'],
    ['Target CPL / CPMK', m.isObe ? `${m.targetCpl ?? '-'}% / ${m.targetCpmk ?? '-'}%` : null],
    ['Level Pemetaan CPL', m.levelPemetaanCplMk === 'IK' ? 'Indikator Kinerja (IK)' : 'CPL'],
  ] as [string, string | number | null][];
});
</script>

<template>
  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <h2 class="px-4 py-3 border-b border-outline-variant font-semibold text-primary">Data Mata Kuliah</h2>
    <dl class="divide-y divide-outline-variant text-body-sm">
      <div v-for="[label, nilai] in baris" :key="label" class="grid grid-cols-1 sm:grid-cols-[16rem_1fr] gap-1 px-4 py-2.5">
        <dt class="font-medium text-primary">{{ label }}</dt>
        <dd>{{ nilai ?? '-' }}</dd>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-[16rem_1fr] gap-1 px-4 py-2.5">
        <dt class="font-medium text-primary">Silabus</dt>
        <dd class="whitespace-pre-line">{{ detail.mataKuliah.silabus || '-' }}</dd>
      </div>
    </dl>
    <p class="px-4 py-3 border-t border-outline-variant text-label-sm text-on-surface-variant">
      Data mata kuliah diubah lewat menu Kurikulum. Level pemetaan CPL diatur di Manajemen Capaian → Pemetaan CPL → MK.
    </p>
  </section>
</template>
