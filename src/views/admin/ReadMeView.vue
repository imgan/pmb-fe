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
      { judul: 'Tahun Ajaran', to: 'tahun-ajaran', ringkas: 'Kelola tahun ajaran. Hanya tahun ajaran aktif yang bisa dipilih saat generate NIM dan membuat jadwal kuliah.' },
    ],
  },
  {
    id: 'master',
    judul: 'Master',
    icon: 'layers',
    menu: [
      { judul: 'Ruangan', to: 'admin-master-ruangan', ringkas: 'Data ruang kuliah, lab, dan ruang pertemuan per kampus.' },
      { judul: 'Agama', to: 'admin-master-agama', ringkas: 'Master data agama.' },
      { judul: 'Tahun (Prodi, BAAK, MHS, Dosen, Pos & SDM)', to: 'admin-master-tahun', ringkas: 'Tahun aktif untuk modul Prodi, BAAK, portal mahasiswa dan dosen, Pos, serta SDM.' },
      { judul: 'Tahun (Kasir & Keuangan)', to: 'admin-master-tahun-keuangan', ringkas: 'Tahun aktif untuk Kasir dan Keuangan.' },
      { judul: 'Tahun (PMB)', to: 'admin-master-tahun-pmb', ringkas: 'Tahun aktif untuk modul PMB.' },
      { judul: 'Tahun (FRS)', to: 'admin-master-tahun-frs', ringkas: 'Tahun untuk pengisian FRS.' },
      { judul: 'Tahun TA/Skripsi', to: 'admin-master-tahun-ta-skripsi', ringkas: 'Tahun untuk proses TA/Skripsi.' },
      { judul: 'Tahun SP', to: 'admin-master-tahun-sp', ringkas: 'Tahun untuk semester pendek.' },
      {
        judul: 'Prodi',
        to: 'admin-master-prodi',
        ringkas: 'Master jurusan per golongan kelas.',
        catatan: ['Nama prodi yang muncul lebih dari sekali adalah varian golongan kelas. Jangan dihapus sebagai data ganda.'],
      },
      { judul: 'Karyawan', to: 'admin-master-karyawan', ringkas: 'Data karyawan, sama dengan menu Karyawan di modul SDI.' },
      { judul: 'Dosen', to: 'admin-master-dosen', ringkas: 'Data dosen, sama dengan menu Dosen di modul SDI.' },
      { judul: 'Mahasiswa', to: 'admin-master-mahasiswa', ringkas: 'Master data mahasiswa.' },
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
