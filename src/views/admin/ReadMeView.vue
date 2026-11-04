<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul Admin, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'akun',
    judul: 'Akun & Akses',
    icon: 'admin_panel_settings',
    menu: [
      {
        judul: 'Impersonasi Akun',
        to: 'impersonasi',
        ringkas: 'Daftar akun karyawan, dosen, dan mahasiswa. Klik Masuk untuk melihat dan membantu persis seperti tampilan akun tersebut.',
      },
      { judul: 'User Management', to: 'users', ringkas: 'Kelola akun admin dan staf yang dapat mengakses sistem.' },
      { judul: 'Role Management', to: 'roles', ringkas: 'Kelola role dan atur izin Lihat, Tambah, Ubah, dan Hapus per menu untuk setiap role.' },
      {
        judul: 'Tahun',
        to: 'tahun',
        ringkas: 'Semua pengaturan tahun dalam satu halaman bertab: Akademik, PMB, Kasir & Keuangan, FRS, TA/Skripsi, dan Semester Pendek.',
        catatan: ['Tiap tab punya tahun aktif sendiri, dan keterangan pengaruhnya tampil di bagian atas tab.', 'Tab mengikuti izin role; tab yang tidak diizinkan tidak ditampilkan.'],
      },
    ],
  },
  {
    id: 'master',
    judul: 'Master',
    icon: 'layers',
    menu: [
      { judul: 'Ruangan', to: 'admin-master-ruangan', ringkas: 'Data ruang kuliah, lab, dan ruang pertemuan per kampus.' },
      { judul: 'Agama', to: 'admin-master-agama', ringkas: 'Master data agama.' },
      {
        judul: 'Prodi',
        to: 'admin-master-prodi',
        ringkas: 'Satu prodi bisa dibuka untuk banyak golongan kelas: centang golongan kelasnya di form. Isian prodi berlaku untuk semua golongan kelas tersebut.',
        catatan: ['Golongan kelas atau prodi yang masih dipakai data lain tidak bisa dilepas atau dihapus.'],
      },
      { judul: 'Karyawan', to: 'admin-master-karyawan', ringkas: 'Data karyawan, sama dengan menu Karyawan di modul SDI.' },
      { judul: 'Dosen', to: 'admin-master-dosen', ringkas: 'Data dosen, sama dengan menu Dosen di modul SDI. Ikon pensil untuk mengubah data, ikon gembok untuk reset password portal ke NIP.' },
      { judul: 'Mahasiswa', to: 'admin-master-mahasiswa', ringkas: 'Data mahasiswa, sama dengan menu Mahasiswa di modul BAAK. Saring dengan pencarian, Jurusan, Golongan Kelas, Status, dan Tahun Masuk. Tersedia biodata, ubah data, dan reset password portal ke NIM.' },
    ],
  },
  bagianHakAkses('Admin'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul Admin, mengikuti urutan sidebar." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
