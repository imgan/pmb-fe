<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul Prodi, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'beranda',
    judul: 'Beranda & Lulusan',
    icon: 'dashboard',
    pengantar: 'Modul Prodi dipakai kaprodi dan staf program studi. Sebagian data dipakai bersama BAAK, sehingga perubahannya saling terlihat.',
    menu: [
      { judul: 'Beranda', to: 'prodi-dashboard', ringkas: 'Ringkasan kondisi program studi saat masuk ke modul.' },
      { judul: 'Master Lulusan', to: 'prodi-lulusan', ringkas: 'Data mahasiswa yang telah dinyatakan lulus (yudisium).' },
      { judul: 'Yudisium', to: 'prodi-yudisium', ringkas: 'Data kelulusan mahasiswa di program studi ini. Klik Periksa untuk menampilkan data, lalu Update untuk mengubah.' },
    ],
  },
  {
    id: 'sidang',
    judul: 'Sidang',
    icon: 'gavel',
    menu: [
      { judul: 'Periode Pengajuan TA', to: 'prodi-periode-pengajuan-ta', ringkas: 'Atur kapan mahasiswa bisa mendaftarkan judul TA/Skripsi lewat tombol Buka Periode.' },
      { judul: 'Pengajuan TA/Skripsi', to: 'prodi-pengajuan-ta', ringkas: 'Verifikasi pendaftaran judul TA/Skripsi dari portal mahasiswa.' },
      { judul: 'Jadwal Sidang', to: 'prodi-jadwal-sidang', ringkas: 'Jadwal sidang skripsi/tugas akhir per program studi.' },
      { judul: 'Pendaftar Sidang', to: 'prodi-pendaftar-sidang', ringkas: 'Mahasiswa yang terdaftar pada jadwal sidang.' },
      { judul: 'Rekap Bimbingan', to: 'prodi-rekap-bimbingan', ringkas: 'Rekap data bimbingan skripsi/tugas akhir mahasiswa.' },
    ],
  },
  {
    id: 'bimbingan',
    judul: 'Bimbingan',
    icon: 'diversity_3',
    menu: [
      { judul: 'Pembimbing Magang', to: 'prodi-pembimbing-magang', ringkas: 'Master data dosen pembimbing magang.' },
      { judul: 'Bimbingan Magang', to: 'prodi-bimbingan-magang', ringkas: 'Master mahasiswa magang beserta pembimbing, judul, nilai, dan kelas.' },
      { judul: 'Pembimbing TA/Skripsi', to: 'prodi-pembimbing-ta-skripsi', ringkas: 'Penugasan (SK) dosen pembimbing TA/Skripsi per periode.' },
      { judul: 'Pembimbing Akademik', to: 'prodi-pembimbing-akademik', ringkas: 'Master data dosen pembimbing akademik (PA).' },
    ],
  },
  {
    id: 'nilai',
    judul: 'Nilai',
    icon: 'grading',
    menu: [
      { judul: 'Nilai Perkelas', to: 'prodi-nilai-perkelas', ringkas: 'Rekap jumlah FRS, UTS, dan UAS per kelas/jadwal kuliah.' },
      { judul: 'Nilai Mahasiswa', to: 'prodi-nilai-mahasiswa', ringkas: 'Pantau nilai akhir mahasiswa per mata kuliah. Cari lalu klik Periksa.' },
      { judul: 'Nilai Magang', to: 'prodi-nilai-magang', ringkas: 'Input dan rekap nilai magang: judul, lokasi, pembimbing, dan nilai.' },
      { judul: 'Konversi Nilai Pindah/RPL', to: 'prodi-konversi-nilai', ringkas: 'Konversi nilai mahasiswa pindahan atau Rekognisi Pembelajaran Lampau.' },
      { judul: 'Penghapusan Nilai', to: 'prodi-penghapusan-nilai', ringkas: 'Hapus nilai mahasiswa yang salah input.' },
      { judul: 'Update Nilai', to: 'prodi-update-nilai', ringkas: 'Cari dan perbarui komponen nilai mahasiswa per mata kuliah.' },
      { judul: 'Voc Dosen (FTID)', to: 'prodi-voc-dosen-ftid', ringkas: 'Voucher pembuatan soal, koreksi, dan pengawasan UAS untuk dosen FTID.' },
      { judul: 'Bobot OBE', to: 'prodi-bobot-obe', ringkas: 'Bobot penilaian OBE per kelas. Diisi dosen pengampu sebelum input nilai; prodi dapat mengubah atau menghapus.' },
      { judul: 'Voc Ujian (FTID)', to: 'prodi-voc-ujian-ftid', ringkas: 'Pembayaran honor ujian untuk dosen kelompok fakultas FTID.' },
    ],
  },
  {
    id: 'jadwal-kuliah',
    judul: 'Jadwal Kuliah',
    icon: 'event_note',
    menu: [
      { judul: 'Realisasi Dosen', to: 'prodi-realisasi-dosen', ringkas: 'Rekap realisasi kehadiran mengajar dosen per kelas.' },
      { judul: 'Monitoring Jadwal', to: 'prodi-monitoring-jadwal', ringkas: 'Pantau jadwal perkuliahan per program/kelas.' },
      { judul: 'Jadwal Kuliah', to: 'prodi-jadwal-kuliah', ringkas: 'Jadwal perkuliahan dari BAAK. Prodi dapat mengubah dan mengekspor jadwal.' },
      { judul: 'Jadwal Ujian', to: 'prodi-jadwal-ujian', ringkas: 'Jadwal UTS/UAS per kelas dari jadwal kuliah. Isi status, sifat, dan tanggal ujian.' },
    ],
  },
  {
    id: 'perkuliahan',
    judul: 'Perkuliahan',
    icon: 'co_present',
    menu: [
      { judul: 'E-learning', to: 'prodi-e-learning', ringkas: 'Pemantauan e-learning kelas di program studi.' },
      { judul: 'Mata Kuliah', to: 'prodi-perkuliahan-mata-kuliah', ringkas: 'Mata kuliah aktif pada tahun akademik terpilih beserta RPS-nya.' },
      { judul: 'Kelas Kuliah', to: 'prodi-kelas-kuliah', ringkas: 'Kelas kuliah per tahun akademik beserta komposisi nilai kelas.' },
      { judul: 'Aktivitas & Prestasi', to: 'prodi-aktivitas-prestasi', ringkas: 'Data aktivitas dan prestasi mahasiswa program studi.' },
    ],
  },
  {
    id: 'kurikulum',
    judul: 'Kurikulum',
    icon: 'menu_book',
    menu: [
      {
        judul: 'Kurikulum',
        to: 'prodi-kurikulum',
        ringkas: 'Kurikulum per prodi dan tahun; tiap kurikulum memiliki banyak mata kuliah.',
        langkah: ['Klik Tambah Kurikulum untuk membuat kurikulum.', 'Klik Mata Kuliah pada baris kurikulum untuk mengelola isinya.'],
      },
      { judul: 'Matakuliah Aktif', to: 'prodi-matakuliah-aktif', ringkas: 'Mata kuliah yang diaktifkan di sini menjadi pilihan saat BAAK menambah jadwal kuliah.' },
      { judul: 'Konversi Kurikulum', to: 'prodi-konversi-kurikulum', ringkas: 'Petakan mata kuliah kurikulum lama ke penggantinya. Dipakai saat KRS mengulang beda kurikulum; nilai lama dan nilai ulang tidak dihitung ganda.' },
      { judul: 'Manajemen Capaian', to: 'prodi-manajemen-capaian', ringkas: 'Status pengisian Profil Lulusan, CPL, dan pemetaannya per kurikulum (OBE).' },
      { judul: 'Laporan Capaian OBE', to: 'prodi-laporan-capaian', ringkas: 'Laporan capaian OBE per kurikulum, bisa dibuka di tab baru.' },
    ],
  },
  {
    id: 'mahasiswa',
    judul: 'Mahasiswa',
    icon: 'school',
    menu: [
      { judul: 'Generate Mahasiswa Aktif', to: 'prodi-generate-mahasiswa-aktif', ringkas: 'Generate ulang daftar mahasiswa aktif per tahun ajaran.' },
      { judul: 'Mahasiswa Keluar', to: 'prodi-mahasiswa-keluar', ringkas: 'Mahasiswa yang cuti, mengundurkan diri, drop out, atau habis masa studi. Gunakan Tandai Mahasiswa Keluar.' },
      { judul: 'Mahasiswa Cuti', to: 'prodi-mahasiswa-cuti', ringkas: 'Daftar mahasiswa yang mengajukan cuti akademik.' },
      { judul: 'Habis Masa Studi', to: 'prodi-habis-masa-studi', ringkas: 'Monitoring masa studi mahasiswa aktif.' },
      {
        judul: 'KRS Mahasiswa',
        to: 'prodi-krs-mahasiswa',
        ringkas: 'Status pengisian dan persetujuan KRS mahasiswa prodi per semester.',
        catatan: ['Status Semua Status KRS juga menampilkan mahasiswa yang belum mengisi KRS, setelah baris-baris KRS.'],
      },
      { judul: 'Monitoring FRS', to: 'prodi-monitoring-frs', ringkas: 'Periksa FRS mahasiswa berdasarkan NIM atau nama.' },
      { judul: 'Biodata Mahasiswa', to: 'prodi-biodata-mahasiswa', ringkas: 'Kelola biodata lengkap mahasiswa.' },
      {
        judul: 'Evaluasi Studi',
        to: 'prodi-evaluasi-studi',
        ringkas: 'Evaluasi bertahap sesuai Pedoman Akademik untuk menandai mahasiswa yang perlu ditinjau.',
        catatan: ['Keputusan status tetap dilakukan manual.'],
      },
    ],
  },
  {
    id: 'lainnya',
    judul: 'Dosen, Angket & Laporan',
    icon: 'rate_review',
    menu: [
      { judul: 'Dosen', to: 'prodi-dosen', ringkas: 'Daftar dosen homebase dan dosen pengajar di program studi.' },
      { judul: 'Angket Pelayanan', to: 'prodi-angket-pelayanan', ringkas: 'Hasil angket kepuasan pelayanan yang diisi mahasiswa sebelum KRS.' },
      { judul: 'Pertanyaan Angket', to: 'prodi-pertanyaan-angket', ringkas: 'Pertanyaan angket pelayanan yang wajib diisi sebelum KRS. Berlaku untuk semua prodi.' },
      { judul: 'Pertanyaan Angket Dosen', to: 'prodi-angket-dosen-pertanyaan', ringkas: 'Pertanyaan penilaian dosen per periode dan tingkat pendidikan. Gunakan Salin Data untuk menyalin dari periode lain.' },
      { judul: 'Laporan OBE', to: 'prodi-laporan-obe', ringkas: 'Monitoring capaian CPL dan CPMK dari nilai OBE yang diinput dosen.' },
      { judul: 'Setting Prodi', to: 'prodi-setting', ringkas: 'Setting program studi per periode akademik.' },
    ],
  },
  bagianHakAkses('Prodi'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul Prodi (Program Studi), per kelompok menu." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
