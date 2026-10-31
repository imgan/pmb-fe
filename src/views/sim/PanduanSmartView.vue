<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan menu pemantauan modul SIM (SMART). Menu Feeder ada di Panduan Akademik. */
const bagian: PanduanBagian[] = [
  {
    id: 'dashboard',
    judul: 'Dashboard',
    icon: 'dashboard',
    pengantar: 'SMART adalah bagian modul SIM untuk memantau data akademik: mahasiswa, kehadiran, hasil studi, hingga kelulusan.',
    menu: [{ judul: 'Dashboard', to: 'sim-dashboard', ringkas: 'Ringkasan modul SIM.' }],
  },
  {
    id: 'master',
    judul: 'Master',
    icon: 'monitoring',
    menu: [
      { judul: 'Student Body', to: 'sim-student-body', ringkas: 'Rekap mahasiswa terdaftar, lulus, dan keluar/DO per program studi dan tahun masuk.' },
      { judul: 'Presentase Kehadiran', to: 'sim-presentase-kehadiran', ringkas: 'Rekap persentase kehadiran mahasiswa.' },
      { judul: 'Kehadiran Kelas', to: 'sim-kehadiran-kelas', ringkas: 'Rekap kehadiran mahasiswa per kelas.' },
      { judul: 'FRS', to: 'sim-frs', ringkas: 'Rekap Formulir Rencana Studi per program studi.' },
      { judul: 'Ujian', to: 'sim-ujian', ringkas: 'Rekap kehadiran ujian UTS/UAS per program studi.' },
      { judul: 'Aktif', to: 'sim-aktif', ringkas: 'Rekap status keaktifan mahasiswa per program studi dan SMT.' },
      { judul: 'IPK', to: 'sim-ipk', ringkas: 'Rekap rata-rata IPK dan IPS per program studi.' },
      { judul: 'Lulusan', to: 'sim-lulusan', ringkas: 'Rekap mahasiswa yang sudah yudisium.' },
      { judul: 'Nilai D & E', to: 'sim-nilai-d-e', ringkas: 'Rekap mahasiswa dengan nilai D dan E.' },
    ],
  },
  {
    id: 'transaksi',
    judul: 'Transaksi',
    icon: 'print',
    menu: [
      { judul: 'Cetak Kehadiran Mengajar', to: 'sim-cetak-kehadiran-mengajar', ringkas: 'Daftar realisasi kehadiran mengajar dosen, dapat dicetak.' },
      { judul: 'Rekapitulasi Pengajaran', to: 'sim-rekapitulasi-pengajaran', ringkas: 'Rekap jumlah pertemuan mengajar per dosen.' },
    ],
  },
  {
    id: 'layanan',
    judul: 'Layanan',
    icon: 'support_agent',
    menu: [{ judul: 'Tiket Mahasiswa', to: 'sim-tiket-mahasiswa', ringkas: 'Pengajuan bantuan dari portal mahasiswa: perangkat, jaringan, sistem informasi, dan data.' }],
  },
  bagianHakAkses('SIM'),
];
</script>

<template>
  <div>
    <PageHeader title="Panduan SMART" subtitle="Panduan menu pemantauan modul SIM (Sistem Monitoring Akademik Real-Time)." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
