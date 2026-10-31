<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul LMS, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'pemantauan',
    judul: 'Dashboard & Kelas',
    icon: 'dashboard',
    pengantar: 'Modul LMS dipakai staf untuk memantau e-learning seluruh kampus per tahun akademik. Konten kelas dibuat dosen dari Portal Dosen.',
    menu: [
      { judul: 'Dashboard', to: 'lms-dashboard', ringkas: 'Ringkasan pemantauan e-learning seluruh kampus.' },
      { judul: 'Kelas Online', to: 'lms-kelas', ringkas: 'E-learning tiap kelas perkuliahan. Buka kelas untuk melihat konten dan progres pesertanya.' },
    ],
  },
  {
    id: 'konten',
    judul: 'Konten',
    icon: 'library_books',
    menu: [
      { judul: 'Materi Pembelajaran', to: 'lms-materi', ringkas: 'Materi dan video dari dosen. Klik status untuk menerbitkan atau menyembunyikan konten.' },
      { judul: 'Tugas', to: 'lms-tugas', ringkas: 'Pengumpulan dan penilaian tugas mahasiswa.' },
      {
        judul: 'Kuis & Ujian',
        to: 'lms-kuis',
        ringkas: 'Tab Kuis Kelas memantau kuis dari dosen. Tab Bank Ujian berisi paket soal pilihan ganda dan essay buatan admin.',
        langkah: [
          'Buka tab Bank Ujian, lalu klik Tambah Ujian.',
          'Isi judul, durasi, dan petunjuk. Aktifkan acak soal bila perlu.',
          'Tambahkan Soal PG (tandai jawaban benar) dan Soal Essay, atur bobotnya, lalu Simpan.',
          'Pilih paket ini di PMB → Tes Ujian → Paket Soal Online.',
        ],
        catatan: [
          'Saat ini Bank Ujian baru dipakai untuk tes seleksi PMB. Penugasan ke kelas mahasiswa belum tersedia.',
          'Soal tetap bisa diubah setelah dikerjakan. Skor PG dihitung ulang, tetapi nilai yang sudah ditetapkan Lulus/Tidak Lulus tidak berubah.',
          'Paket yang masih dipakai tes PMB tidak bisa dihapus.',
        ],
      },
      { judul: 'Forum Diskusi', to: 'lms-forum', ringkas: 'Percakapan dosen dan mahasiswa pada konten kelas. Admin dapat menghapus komentar.' },
    ],
  },
  {
    id: 'informasi',
    judul: 'Informasi & Laporan',
    icon: 'campaign',
    menu: [
      { judul: 'Pengumuman', to: 'lms-pengumuman', ringkas: 'Berita kampus yang tampil di portal dan timeline e-learning dosen serta mahasiswa.' },
      { judul: 'Laporan Aktivitas', to: 'lms-laporan', ringkas: 'Rekap e-learning per prodi dan per kelas, dapat diekspor ke Excel.' },
    ],
  },
  bagianHakAkses('LMS'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul LMS (Learning Management System), mengikuti urutan sidebar." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
