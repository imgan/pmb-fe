<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul SDI, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'dashboard',
    judul: 'Dashboard',
    icon: 'dashboard',
    pengantar: 'Modul SDI dipakai staf kepegawaian untuk mengelola data dosen dan karyawan serta kehadiran dari mesin fingerprint.',
    menu: [{ judul: 'Dashboard', to: 'sdi-dashboard', ringkas: 'Halaman pertama saat masuk ke modul SDI.' }],
  },
  {
    id: 'master',
    judul: 'Master',
    icon: 'badge',
    menu: [
      {
        judul: 'Dosen',
        to: 'sdi-dosen',
        ringkas: 'Kelola biodata dosen. Saring dengan pencarian dan Kelompok Fakultas.',
        catatan: ['Untuk data massal, gunakan Import/Export Excel dan unduh templatenya terlebih dahulu.'],
      },
      {
        judul: 'Karyawan',
        to: 'sdi-karyawan',
        ringkas: 'Kelola biodata karyawan non-dosen. Saring dengan pencarian dan Status.',
        catatan: ['Untuk data massal, gunakan Import/Export Excel dan unduh templatenya terlebih dahulu.'],
      },
      {
        judul: 'Sync Finger A1',
        to: 'sdi-sync-finger-a1',
        ringkas: 'Memasukkan log absensi mesin A1 lewat file Excel hasil ekspor mesin.',
        langkah: [
          'Klik Tarik Data Dari Mesin dan unggah file Excel (kolom NIK dan Tanggal).',
          'Periksa hasilnya. Baris yang gagal ditampilkan dengan nomor baris dan pesannya.',
          'Klik Masukan Data Ke Database untuk mencocokkan dengan master dosen/karyawan.',
        ],
      },
      { judul: 'Sync Finger A2', to: 'sdi-sync-finger-a2', ringkas: 'Cara kerjanya sama dengan Sync Finger A1, untuk data mesin A2.' },
    ],
  },
  {
    id: 'kehadiran',
    judul: 'Kehadiran',
    icon: 'fingerprint',
    menu: [
      {
        judul: 'Tugas Dinas/Cuti/Lupa Finger',
        to: 'sdi-dinas-cuti-lupa-finger',
        ringkas: 'Catat dinas luar, cuti, cuti spesial, cuti bersama, dan lupa finger agar rekap kehadiran tidak salah.',
        langkah: ['Klik Tambah Data dan pilih pegawai.', 'Isi Tanggal, Status, dan Keperluan.', 'Lampirkan dokumen bila ada (PDF/PNG/JPEG, maks. 5 MB), lalu Simpan.'],
      },
      {
        judul: 'Report Finger',
        to: 'sdi-report-finger',
        ringkas: 'Cetak rekap kehadiran seorang pegawai dari data finger yang sudah disinkronkan.',
        langkah: ['Pilih Pegawai.', 'Isi Periode Awal dan Periode Akhir, lalu pilih Shift.', 'Klik Periksa untuk membuka rekap PDF.'],
      },
    ],
  },
  bagianHakAkses('SDI'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul SDI (Sumber Daya Insani), mengikuti urutan sidebar." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
