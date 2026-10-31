<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';

/** Panduan menu pelaporan Feeder Dikti pada modul SIM. */
const bagian: PanduanBagian[] = [
  {
    id: 'feeder-perkuliahan',
    judul: 'Feeder Perkuliahan',
    icon: 'cloud_upload',
    pengantar: 'Kumpulan menu untuk pelaporan data perkuliahan ke Feeder Dikti.',
    menu: [
      { judul: 'Matakuliah', ringkas: 'Data mata kuliah untuk pelaporan Feeder.' },
      { judul: 'Mahasiswa', ringkas: 'Data mahasiswa untuk pelaporan Feeder.' },
      { judul: 'Kelas', ringkas: 'Data kelas kuliah untuk pelaporan Feeder.' },
      { judul: 'KRS', ringkas: 'Data KRS untuk pelaporan Feeder.' },
      { judul: 'Dosen Ajar', ringkas: 'Data dosen pengajar kelas untuk pelaporan Feeder.' },
      { judul: 'Nilai', ringkas: 'Data nilai perkuliahan untuk pelaporan Feeder.' },
      { judul: 'AKM', ringkas: 'Data Aktivitas Kuliah Mahasiswa untuk pelaporan Feeder.' },
      { judul: 'Kelulusan', ringkas: 'Data kelulusan untuk pelaporan Feeder.' },
      { judul: 'Nilai Transfer', ringkas: 'Data nilai transfer untuk pelaporan Feeder.' },
    ],
  },
  {
    id: 'feeder-aktivitas',
    judul: 'Feeder Aktivitas',
    icon: 'groups',
    pengantar: 'Kumpulan menu untuk pelaporan aktivitas mahasiswa ke Feeder Dikti. Setiap jenis aktivitas memiliki data aktivitas, peserta, dan dosen pembimbing.',
    menu: [
      { judul: 'Aktivitas Mahasiswa Bimbingan', ringkas: 'Data aktivitas bimbingan tugas akhir.' },
      { judul: 'Peserta Aktivitas', ringkas: 'Peserta aktivitas bimbingan tugas akhir.' },
      { judul: 'Dosen Pembimbing', ringkas: 'Dosen pembimbing aktivitas tugas akhir.' },
      { judul: 'Dosen Penguji', ringkas: 'Dosen penguji aktivitas tugas akhir.' },
      { judul: 'Aktivitas Mahasiswa KKP', ringkas: 'Data aktivitas Kuliah Kerja Praktek.' },
      { judul: 'Peserta Aktivitas KKP', ringkas: 'Peserta aktivitas KKP.' },
      { judul: 'Dosen Pembimbing KKP', ringkas: 'Dosen pembimbing aktivitas KKP.' },
      { judul: 'Aktivitas Mahasiswa PA', ringkas: 'Data aktivitas pembimbingan akademik.' },
      { judul: 'Peserta Aktivitas PA', ringkas: 'Peserta aktivitas pembimbingan akademik.' },
      { judul: 'Dosen Pembimbing PA', ringkas: 'Dosen pembimbing aktivitas pembimbingan akademik.' },
    ],
  },
];
</script>

<template>
  <div>
    <PageHeader title="Panduan Akademik" subtitle="Panduan menu pelaporan Feeder Dikti pada modul SIM." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
