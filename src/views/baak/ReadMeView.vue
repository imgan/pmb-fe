<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul BAAK, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'mahasiswa-baru',
    judul: 'Dashboard & Mahasiswa',
    icon: 'school',
    pengantar: 'Modul BAAK dipakai staf akademik untuk mengelola mahasiswa dan proses akademik, mulai dari peserta PMB yang diterima hingga yudisium.',
    menu: [
      { judul: 'Dashboard', to: 'baak-dashboard', ringkas: 'Ringkasan data akademik saat masuk ke modul BAAK.' },
      {
        judul: 'Mahasiswa',
        to: 'baak-mahasiswa',
        ringkas: 'Master data mahasiswa aktif yang digenerate dari peserta PMB yang lulus ujian dan diterima.',
        langkah: ['Klik Generate dari Peserta Lulus.', 'Periksa ringkasan peserta per jurusan dan lengkapi isian yang diminta.', 'Jalankan generate; data mahasiswa dan NIM masuk ke tabel.'],
        catatan: ['Biodata lengkap format PDDIKTI dibuka dari tombol Biodata pada baris mahasiswa.'],
      },
      {
        judul: 'Generate NIM',
        to: 'baak-generate-nim',
        ringkas: 'Pilih kelas mahasiswa baru, lalu generate KRS dan status aktif semester 1 per kelas.',
        catatan: ['Tagihan tidak dibuat di sini; tagihan diimpor bagian keuangan.'],
      },
      { judul: 'Masa Studi', to: 'baak-masa-studi', ringkas: 'Monitoring masa studi mahasiswa aktif.' },
    ],
  },
  {
    id: 'perkuliahan',
    judul: 'Jadwal & Perkuliahan',
    icon: 'event_note',
    menu: [
      { judul: 'Master Monitoring', to: 'baak-monitoring', ringkas: 'Pantau jadwal perkuliahan per program/kelas. Pilih kelas lalu klik Periksa, kemudian buka detail jadwal.' },
      { judul: 'Monitoring Kehadiran Dosen', to: 'baak-kehadiran-dosen', ringkas: 'Realisasi kehadiran mengajar dosen per sesi jadwal kuliah. Saring dengan Periksa, atau catat lewat Tambah Data.' },
      {
        judul: 'Jadwal Kuliah',
        to: 'baak-jadwal-kuliah',
        ringkas: 'Kelola jadwal perkuliahan per kelas dan mata kuliah melalui Tambah Data.',
        catatan: ['Pilihan mata kuliah berasal dari mata kuliah yang diaktifkan prodi di Kurikulum → Matakuliah Aktif.'],
      },
      { judul: 'Mata Kuliah', to: 'baak-mata-kuliah', ringkas: 'Mata kuliah per kurikulum yang dipakai saat membuat jadwal. Datanya dikelola prodi di menu Kurikulum.' },
      {
        judul: 'KRS Mahasiswa',
        to: 'baak-krs',
        ringkas: 'Kartu Rencana Studi: kelas kuliah yang diambil mahasiswa per semester. Tambahkan lewat Tambah KRS.',
        catatan: [
          'Tombol Cetak membuat PDF dari seluruh data sesuai filter dan pencarian yang sedang aktif, bukan hanya halaman yang tampil.',
          'Satu mahasiswa hanya punya satu KRS per periode. Menambah KRS pada periode yang sudah ada akan menggabungkan kelasnya, dan semester memakai yang terbesar.',
          'Mata kuliah mengulang boleh bentrok jadwal dan ditandai "semester lain / mengulang" pada form Ubah bila semesternya berbeda.',
          'Status Semua Status KRS juga menampilkan mahasiswa yang belum mengisi KRS, setelah baris-baris KRS.',
        ],
      },
    ],
  },
  {
    id: 'nilai-kelulusan',
    judul: 'Nilai & Kelulusan',
    icon: 'grading',
    menu: [
      { judul: 'Monitoring Nilai', to: 'baak-monitoring-nilai', ringkas: 'Pantau nilai akhir mahasiswa per mata kuliah. Cari NIM atau nama, klik Periksa, lalu buka detailnya.' },
      { judul: 'Laporan Yudisium', to: 'baak-yudisium', ringkas: 'Kelola No. SK, tanggal yudisium, PIN, dan judul skripsi mahasiswa. Klik Periksa untuk menampilkan data, lalu Update untuk mengubah.' },
    ],
  },
  {
    id: 'laporan',
    judul: 'Laporan',
    icon: 'summarize',
    menu: [
      { judul: 'Ijazah & Transkrip', to: 'baak-laporan-ijazah-transkrip', ringkas: 'Cetak ijazah, transkrip, dan dokumen kelulusan mahasiswa.' },
      {
        judul: 'Cetak Surat',
        to: 'baak-laporan-cetak-surat',
        ringkas: 'Kelola dan cetak surat keterangan mahasiswa.',
        catatan: ['Periksa kelengkapan data seperti NIK dan alamat sebelum mencetak PDF.'],
      },
      { judul: 'Cetak Realisasi', to: 'baak-laporan-cetak-realisasi', ringkas: 'Rekap realisasi mengajar dosen per jadwal kuliah.' },
      { judul: 'Cetak Mahasiswa Perkelas', to: 'baak-laporan-cetak-mahasiswa-perkelas', ringkas: 'Unduh rekap daftar mahasiswa per program studi dan kelas dalam format Excel.' },
      { judul: 'Template Kehadiran', to: 'baak-laporan-cetak-kehadiran-mengajar', ringkas: 'Cetak daftar hadir mengajar dan rekap realisasi per jadwal kuliah.' },
      { judul: 'Cetak KHS', to: 'baak-laporan-cetak-khs', ringkas: 'Cetak Kartu Hasil Studi mahasiswa per semester.' },
    ],
  },
  {
    id: 'informasi',
    judul: 'Informasi & Sistem',
    icon: 'campaign',
    menu: [
      { judul: 'Pengumuman', to: 'baak-pengumuman', ringkas: 'Pengumuman akademik yang tampil di portal mahasiswa. Tambahkan lewat Tambah Pengumuman.' },
      { judul: 'Kalender Akademik', to: 'baak-kalender-akademik', ringkas: 'Jadwal kegiatan per tahun akademik: perkuliahan, registrasi/KRS, ujian, libur, wisuda, dan lainnya.' },
      { judul: 'Audit Log', to: 'baak-audit-log', ringkas: 'Riwayat tambah, ubah, hapus, dan login. Bisa disaring dan diekspor ke CSV.' },
    ],
  },
  bagianHakAkses('BAAK'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul BAAK (Biro Administrasi Akademik & Kemahasiswaan), per kelompok menu." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
