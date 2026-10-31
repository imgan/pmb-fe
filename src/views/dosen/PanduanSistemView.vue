<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';

/** Panduan Portal Dosen, disusun mengikuti urutan menu di bar navigasi atas. */
const bagian: PanduanBagian[] = [
  {
    id: 'umum',
    judul: 'Umum & Profil',
    icon: 'info',
    pengantar:
      'Portal Dosen adalah layanan mandiri khusus dosen, terpisah dari konsol staf (BAAK, Prodi, SDM, Keuangan). Menu ada di bar navigasi atas.',
    menu: [
      {
        judul: 'Login',
        ringkas: 'Masuk memakai NIDN atau email beserta password yang diberikan admin.',
        catatan: ['Lupa password? Hubungi admin/BAAK untuk direset.'],
      },
      {
        judul: 'Profil, Foto, Password & Tahun Akademik',
        ringkas: 'Klik nama/foto Anda di pojok kanan atas untuk membuka pengaturan profil.',
        langkah: [
          'Ganti foto profil dan ubah password dari jendela profil.',
          'Pilih Setting Tahun Akademik untuk melihat data periode lain (Jadwal Ujian, Kesediaan Mengajar, Dashboard, dll.).',
          'Halaman dimuat ulang otomatis; tahun akademik terpilih tampil di bawah nama Anda.',
        ],
      },
      {
        judul: 'Dashboard',
        to: 'dosen-dashboard',
        ringkas: 'Ringkasan statistik (mahasiswa aktif, kehadiran mengajar, lulusan), pengumuman BAAK, dan biodata Anda pada SDM.',
        langkah: [
          'Ubah data pribadi & kontak (No Telp, WhatsApp, email) lalu simpan.',
          'Tambah/ubah/hapus riwayat pendidikan.',
        ],
        catatan: [
          'No Telp & WhatsApp tampil di menu Informasi Dosen portal mahasiswa.',
          'Nama, NIDN, jabatan & KUM dikelola SDM dan tidak bisa diubah dari sini.',
        ],
      },
    ],
  },
  {
    id: 'bimbingan',
    judul: 'Bimbingan',
    icon: 'supervisor_account',
    menu: [
      {
        judul: 'Mahasiswa Bimbingan Akademik',
        to: 'dosen-mahasiswa-pa',
        ringkas: 'Daftar mahasiswa yang dosen pembimbing akademiknya (DPA) adalah Anda, lengkap dengan kontak dan IPK.',
        langkah: ['Cari mahasiswa berdasarkan NIM/nama.', 'Lihat biodata, KRS terakhir, atau cetak KHS dari tombol aksi.'],
      },
      {
        judul: 'Pembimbing TA',
        to: 'dosen-bimbingan-ta',
        ringkas: 'Mahasiswa yang mengusulkan Anda sebagai pembimbing TA/Skripsi, per periode pengajuan, beserta status bimbingan, pembayaran & sidang.',
        langkah: [
          'Setelah usulan disetujui prodi, buka Kartu Bimbingan mahasiswa tsb.',
          'Isi catatan konsultasi setiap kali bimbingan; catatan langsung tampil di portal mahasiswa (menu Bimbingan DPA).',
        ],
        catatan: ['Catatan hanya bisa diubah oleh dosen yang menginputnya.'],
      },
      {
        judul: 'Nilai Sidang',
        to: 'dosen-nilai-sidang',
        ringkas: 'Input nilai sidang TA/Skripsi mahasiswa yang Anda uji/bimbing sesuai jadwal sidang prodi.',
        langkah: ['Cari mahasiswa pada daftar sidang.', 'Isi nilai lalu simpan per mahasiswa.'],
      },
      {
        judul: 'Referensi Judul TA',
        to: 'dosen-referensi-judul',
        ringkas: 'Daftar referensi judul TA/Skripsi yang diinput BAAK, sebagai bahan arahan judul untuk mahasiswa. Hanya bisa dilihat.',
      },
    ],
  },
  {
    id: 'perkuliahan',
    judul: 'Perkuliahan',
    icon: 'co_present',
    menu: [
      {
        judul: 'E-learning',
        to: 'dosen-elearning',
        ringkas: 'Bagikan materi, video, kuis, dan tugas ke mahasiswa kelas Anda.',
        langkah: [
          'Buka My Class dan pilih kelas.',
          'Gunakan Tambah Materi, Tambah Video, Tambah Kuis, atau Tambah Tugas.',
          'Pantau hasil kuis dan tugas dari halaman kelas.',
        ],
        catatan: ['Tersedia juga Timeline, Obrolan, Jelajah materi kelas lain, dan Laporan Tugas (unduh Excel).'],
      },
      {
        judul: 'Kelas Kuliah',
        to: 'dosen-kelas-kuliah',
        ringkas: 'Daftar kelas yang Anda ampu pada tahun akademik terpilih beserta jadwal dan ruangnya.',
        langkah: ['Klik Detail pada kelas untuk melihat info kelas dan tim Dosen Pengajar: NIDN, SKS, jadwal, Penanggung Jawab, dan Isi Kuesioner.'],
        catatan: ['Hanya lihat — susunan dosen pengajar diatur BAAK/Prodi di Jadwal Kuliah.'],
      },
      {
        judul: 'Kehadiran Mengajar',
        to: 'dosen-kehadiran-mengajar',
        ringkas: 'Mencatat realisasi mengajar (jam masuk/keluar, pertemuan, materi) dan presensi mahasiswa.',
        langkah: [
          'Di kartu Mulai Kelas, pilih matakuliah (pertemuan otomatis = pertemuan berikutnya), isi Uraian & Rincian Materi bila perlu, lalu klik Mulai Kelas. Jam masuk tercatat saat itu.',
          'Selama kelas berlangsung, lengkapi uraian/rincian materi lalu klik Selesai Kelas — jam keluar tercatat otomatis.',
          'Atau gunakan tombol Mulai (hijau) / Berhenti (merah) langsung di tabel Realisasi Mengajar.',
          'Klik ikon presensi pada baris realisasi untuk mengisi kehadiran mahasiswa (Hadir/Izin/Sakit/Alpa).',
          'Pilih matakuliah lalu Tampilkan untuk melihat ringkasan kelas dan Cetak Realisasi (PDF).',
        ],
        catatan: [
          'Hanya satu kelas yang bisa berlangsung pada satu waktu.',
          'Realisasi yang salah bisa diubah (ikon pensil) atau dihapus (ikon silang).',
          'Rincian Materi tampil di kolom Rincian pada cetak realisasi.',
        ],
      },
      {
        judul: 'Pengumuman',
        to: 'dosen-pengumuman',
        ringkas: 'Pengumuman dari BAAK yang ditujukan untuk dosen (semua prodi atau prodi Anda). Pengumuman penting tampil paling atas.',
      },
      {
        judul: 'Jadwal Ujian',
        to: 'dosen-jadwal-ujian',
        ringkas: 'Kelas yang Anda ampu pada tahun akademik terpilih; Anda mengisi sendiri status, sifat & tanggal ujian.',
      },
      {
        judul: 'Input Nilai',
        to: 'dosen-periodik',
        ringkas: 'Input nilai komponen mahasiswa per kelas; nilai akhir & huruf dihitung otomatis memakai Bobot OBE kelas.',
        langkah: [
          'Pilih kelas lalu klik Tampilkan.',
          'Wajib: klik Isi Bobot OBE dan lengkapi tabel Komponen Evaluasi — Metode, Jenis Evaluasi, Bobot (%) dan Syarat Lulus. Total harus 100%. Gunakan + untuk menambah baris.',
          'Isi nilai 0–100 pada kolom komponen yang berbobot (kolom kosong dihitung 0); pratinjau nilai akhir & huruf tampil langsung.',
          'Klik Simpan Nilai, lalu Cetak Daftar Nilai bila perlu.',
        ],
        catatan: [
          'Metode berjenis sama (mis. Tugas Individu + Tugas Kelompok) dijumlahkan bobotnya ke kolom Tugas.',
          'Mengubah Bobot OBE akan menghitung ulang nilai yang sudah tersimpan. Prodi juga dapat mengubah/menghapus Bobot OBE.',
          'Tombol Bobot Nilai menampilkan rentang nilai → huruf (A ≥ 85, A- ≥ 80, B+ ≥ 75, … , di bawah C wajib mengulang).',
        ],
      },
    ],
  },
  {
    id: 'silabus-kesediaan',
    judul: 'Silabus & Kesediaan Mengajar',
    icon: 'article',
    menu: [
      {
        judul: 'Silabus',
        to: 'dosen-silabus-matakuliah',
        ringkas: 'Mata kuliah yang Anda ampu (kordinator maupun pengampu) beserta kode, SKS dan silabus dari Program Studi. Hanya bisa dilihat.',
      },
      {
        judul: 'Kesediaan Mengajar',
        to: 'dosen-kesediaan-mengajar',
        ringkas: 'Isi matakuliah yang bersedia Anda ajar dan jam kesediaan per hari untuk tahun akademik terpilih.',
        catatan: ['Biasanya diisi setelah UAS sebagai bahan penyusunan jadwal periode berikutnya.'],
      },
    ],
  },
  {
    id: 'laporan',
    judul: 'Laporan',
    icon: 'summarize',
    menu: [
      {
        judul: 'Rekap Mahasiswa',
        to: 'dosen-rekap',
        ringkas: 'Dua tab: Rekap Mahasiswa (kehadiran tiap mahasiswa per pertemuan, H/I/S/A, total & persentase) dan Rekap Realisasi (jumlah realisasi mengajar per kelas terhadap 16 pertemuan).',
        langkah: ['Pilih kelas lalu Tampilkan.', 'Cetak PDF rekap kehadiran atau cetak realisasi per kelas.'],
      },
      {
        judul: 'Laporan E-learning',
        to: 'dosen-laporan-elearning',
        ringkas: 'Skor kuis per mahasiswa dan jumlah mahasiswa yang melihat video atau materi di kelas Anda.',
      },
      {
        judul: 'Lembar Koreksi',
        to: 'dosen-lembar-koreksi',
        ringkas: 'Catatan koreksi/revisi sidang untuk mahasiswa: tambah butir koreksi per Bab/Halaman beserta uraiannya.',
        catatan: ['Butir koreksi tampil di menu Sidang portal mahasiswa sebagai daftar revisi.'],
      },
      {
        judul: 'KRS Bimbingan',
        to: 'dosen-krs-bimbingan',
        ringkas: 'Persetujuan KRS mahasiswa bimbingan akademik Anda.',
        langkah: [
          'Periksa matakuliah yang diajukan mahasiswa.',
          'Setujui atau tolak per mahasiswa, atau centang beberapa KRS berstatus Diajukan lalu klik Setujui (massal).',
        ],
        catatan: ['Mahasiswa dengan KRS disetujui terhitung Aktif pada statistik semester tsb dan bisa mengisi presensi.'],
      },
    ],
  },
];
</script>

<template>
  <div>
    <PageHeader title="Panduan" subtitle="Panduan penggunaan Portal Dosen, mengikuti urutan menu." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
