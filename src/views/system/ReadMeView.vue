<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul PMB, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'alur',
    judul: 'Alur PMB',
    icon: 'info',
    pengantar: 'Modul PMB dipakai panitia untuk mengelola pendaftaran, mulai dari master data hingga hasil penerimaan.',
    menu: [
      {
        judul: 'Alur Pendaftaran',
        ringkas: 'Urutan proses yang juga tampil pada Status Pendaftaran peserta dan Progress Seleksi admin.',
        langkah: [
          'Calon mahasiswa mendaftar di website publik lalu login ke portal pendaftaran.',
          'Peserta mengisi Biodata dan Data Pendaftaran, lalu mengunggah dokumen.',
          'Panitia menjadwalkan tes di menu Tes Ujian dan menambahkan pesertanya.',
          'Peserta mengikuti tes; panitia menilai dan menetapkan hasil.',
          'Hasil Lulus membuat status penerimaan menjadi Diterima, lalu BAAK men-generate data mahasiswa dan NIM.',
        ],
      },
      {
        judul: 'Portal Peserta',
        ringkas: 'Menu peserta: Status Pendaftaran, Biodata Saya, Data Pendaftaran, Dokumen Pendaftaran, Dokumen Beasiswa, dan Tes Ujian. Menu yang sudah selesai diberi centang hijau.',
        catatan: [
          'Password awal peserta adalah nomor HP. Bila sudah diganti dan lupa, gunakan Reset password ke nomor HP pada Detail Peserta.',
          'Bila satu nomor HP dipakai beberapa akun, peserta harus login memakai email.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    judul: 'Dashboard',
    icon: 'dashboard',
    menu: [
      {
        judul: 'Dashboard',
        to: 'dashboard',
        ringkas: 'Ringkasan PMB pada tahun PMB terpilih. Tombol Atur Target dipakai untuk mengisi target penerimaan.',
      },
    ],
  },
  {
    id: 'master-data',
    judul: 'Master Data',
    icon: 'layers',
    pengantar: 'Data acuan untuk formulir pendaftaran dan website publik. Perubahan di sini langsung memengaruhi pilihan yang tampil.',
    menu: [
      { judul: 'Golongan Kelas', to: 'golongan-kelas', ringkas: 'Kelompok kelas perkuliahan, misalnya Reguler, Karyawan, dan Malam.' },
      {
        judul: 'Jurusan',
        to: 'jurusan',
        ringkas: 'Satu prodi bisa dibuka untuk banyak golongan kelas: centang golongan kelasnya di form. Isian prodi berlaku untuk semua golongan kelas tersebut.',
        catatan: ['Golongan kelas atau prodi yang masih dipakai data lain tidak bisa dilepas atau dihapus.'],
      },
      { judul: 'Sumber Informasi', to: 'sumber-informasi', ringkas: 'Pilihan dari mana calon mahasiswa mengetahui kampus.' },
      { judul: 'Ukuran Almamater', to: 'ukuran-almamater', ringkas: 'Pilihan ukuran jas almamater pada Data Pendaftaran peserta.' },
      {
        judul: 'Dokumen Pendaftaran',
        to: 'dokumen-pendaftaran',
        ringkas: 'Master dokumen pendaftaran.',
      },
      {
        judul: 'Dokumen Kelengkapan',
        to: 'dokumen-kelengkapan',
        ringkas: 'Daftar dokumen yang diunggah peserta. Dokumen bertanda beasiswa tampil di halaman Dokumen Beasiswa, sisanya di Dokumen Pendaftaran.',
        catatan: ['Daftar ini menentukan status Formulir Pendaftaran, Kelengkapan Persyaratan, dan kolom Dokumen pada Tes Ujian.'],
      },
      { judul: 'Profil Kampus', to: 'kampus', ringkas: 'Data yang tampil di header, footer, dan tombol WhatsApp website publik.' },
      { judul: 'Beasiswa', to: 'beasiswa', ringkas: 'Halaman informasi beasiswa pada website publik.' },
      { judul: 'Gambar Beranda', to: 'home-images', ringkas: 'Gambar halaman Beranda website publik. Kosongkan untuk memakai gambar bawaan.' },
      { judul: 'Biaya Kuliah (Halaman)', to: 'biaya-kuliah', ringkas: 'Halaman informasi biaya kuliah pada website publik.' },
      { judul: 'Biaya Kuliah (Jenis Pembayaran)', to: 'pembayaran', ringkas: 'Master jenis pembayaran. Di sidebar menu ini juga bernama Biaya Kuliah.' },
    ],
  },
  {
    id: 'peserta',
    judul: 'Peserta',
    icon: 'group',
    menu: [
      {
        judul: 'Peserta',
        to: 'calon-mahasiswa',
        ringkas: 'Daftar calon mahasiswa beserta kelengkapan persyaratan dan hasil penerimaan. Saring dengan pencarian, Tahun PMB, Gelombang, Golongan Kelas, dan Jurusan.',
        langkah: [
          'Klik ikon mata untuk membuka Detail Peserta dan Progress Seleksi.',
          'Tiga tombol bulat pertama membuka Data Pendidikan, Sumber Informasi, dan Sumber Informasi 2. Hijau berarti lengkap, merah berarti belum.',
          'Dua tombol berikutnya membuka Dokumen Pendaftaran dan Dokumen Pendaftaran 2 (beasiswa). Centang hijau berarti sudah diunggah semua, ikon merah berarti belum.',
          'Klik ikon pensil untuk mengubah data, atau ikon tempat sampah untuk menghapus.',
        ],
        catatan: [
          'Formulir Pendaftaran hijau bila semua Dokumen Pendaftaran sudah diunggah.',
          'Kelengkapan Persyaratan mengikuti dokumen beasiswa. Untuk jalur mandiri, statusnya mengikuti Dokumen Pendaftaran.',
          'Progress Seleksi: Pendaftaran → Kelengkapan Dokumen → Tes Masuk → hasil penerimaan.',
        ],
      },
    ],
  },
  {
    id: 'gelombang-tes',
    judul: 'Gelombang & Tes Ujian',
    icon: 'quiz',
    menu: [
      { judul: 'Gelombang', to: 'gelombang', ringkas: 'Master gelombang pendaftaran.' },
      {
        judul: 'Tes Ujian',
        to: 'tes-ujian',
        ringkas: 'Jadwal tes seleksi per gelombang dan peserta yang berhak mengikuti ujian.',
        langkah: [
          'Klik Tambah Data, lalu isi Nama Ujian, Gelombang, Jurusan (kosong = Semua Jurusan), Tanggal, Waktu, dan Lokasi.',
          'Untuk tes online, pilih Paket Soal Online dari LMS → Kuis & Ujian → Bank Ujian. Kosongkan untuk tes offline.',
          'Klik Daftar Peserta, lalu Tambah Peserta Ujian dan centang pesertanya.',
          'Setelah peserta mengirim jawaban, klik Koreksi untuk melihat jawaban dan mengisi skor essay.',
          'Klik Set Nilai untuk menetapkan nilai dan hasil Lulus/Tidak Lulus.',
        ],
        catatan: [
          'Tambah Peserta hanya menampilkan peserta yang ada di menu Peserta. Pakai pilihan Hanya jurusan dan Hanya peserta gelombang ini untuk menyaring.',
          'Kolom Dokumen: centang hijau berarti lengkap, tulisan merah berarti belum. Peserta yang belum lengkap tetap bisa ditambahkan.',
          'Peserta hanya bisa memulai ujian online pada tanggal tes. Soal PG dinilai otomatis, essay yang belum dikoreksi dihitung 0.',
          'Lulus mengubah status penerimaan menjadi Diterima, Tidak Lulus menjadi Ditolak. Batalkan peserta tidak mengembalikan status ini secara otomatis.',
        ],
      },
    ],
  },
  {
    id: 'master-grafik',
    judul: 'Master (Grafik)',
    icon: 'bar_chart',
    menu: [
      { judul: 'Grafik Tahunan', to: 'grafik-tahunan', ringkas: 'Jumlah tamu, pendaftar, dan daftar ulang PMB per tahun.' },
      { judul: 'Grafik Banding', to: 'grafik-banding', ringkas: 'Perbandingan tahap pendaftaran PMB per bulan.' },
      { judul: 'Grafik Daftar Ulang', to: 'grafik-daftar-ulang', ringkas: 'Jumlah mahasiswa daftar ulang per prodi per tahun masuk.' },
      { judul: 'Grafik Penerimaan', to: 'grafik-penerimaan', ringkas: 'Rekap penerimaan mahasiswa per prodi, status kelas, Dikti, dan pembayaran.' },
    ],
  },
  {
    id: 'sistem',
    judul: 'Sistem & Laporan',
    icon: 'settings',
    menu: [
      { judul: 'Menu Management', to: 'menus', ringkas: 'Struktur menu dan navigasi sidebar. Ubah hanya bila benar-benar perlu.' },
      { judul: 'Reporting', to: 'reporting', ringkas: 'Rekap pendaftar yang bisa disaring per gelombang, jurusan, golongan kelas, dan rentang tanggal, lalu diekspor ke CSV.' },
      { judul: 'Audit Log', to: 'audit-log', ringkas: 'Riwayat tambah, ubah, hapus, dan login di sistem. Bisa disaring dan diekspor ke CSV.' },
    ],
  },
  bagianHakAkses('PMB'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul PMB (Penerimaan Mahasiswa Baru), mengikuti urutan sidebar." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
