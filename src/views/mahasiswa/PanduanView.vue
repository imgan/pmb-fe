<script setup lang="ts">
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';

/** Panduan Portal Mahasiswa, disusun mengikuti urutan menu di bar navigasi atas. */
const bagian: PanduanBagian[] = [
  {
    id: 'umum',
    judul: 'Umum & Profil',
    icon: 'info',
    pengantar: 'Portal Mahasiswa untuk mengurus perkuliahan secara mandiri: KRS, presensi, nilai, pengajuan, hingga pembayaran.',
    menu: [
      {
        judul: 'Login',
        ringkas: 'Masuk memakai NIM atau email beserta password.',
        catatan: [
          'Password awal mahasiswa baru adalah NIM. Segera ganti setelah login pertama.',
          'Lupa password? Minta BAAK/Prodi untuk mereset; password akan kembali menjadi NIM.',
        ],
      },
      {
        judul: 'Profil Saya',
        ringkas: 'Klik nama/foto di pojok kanan atas untuk mengganti foto profil dan password.',
      },
      {
        judul: 'Dashboard',
        to: 'mahasiswa-dashboard',
        ringkas: 'Ringkasan profil akademik Anda: biodata singkat (NIM, prodi, kelas, tahun masuk, status) dan daftar matakuliah beserta nilainya.',
      },
      {
        judul: 'Biodata',
        to: 'mahasiswa-biodata',
        ringkas: 'Lengkapi dan perbarui biodata (data pribadi, alamat, kontak, orang tua/wali), lalu klik Simpan.',
        catatan: ['Biodata dipakai untuk pelaporan PDDIKTI dan surat-menyurat, pastikan sesuai KTP/KK.'],
      },
    ],
  },
  {
    id: 'jadwal',
    judul: 'Jadwal',
    icon: 'event_note',
    menu: [
      {
        judul: 'Pengumuman',
        to: 'mahasiswa-pengumuman',
        ringkas: 'Informasi perkuliahan dari BAAK untuk mahasiswa (semua prodi atau prodi Anda). Pengumuman penting tampil paling atas.',
      },
      {
        judul: 'Kalender Akademik',
        to: 'mahasiswa-kalender-akademik',
        ringkas: 'Jadwal kegiatan akademik dari BAAK (perkuliahan, KRS, ujian, libur, wisuda, dll.) dalam tampilan kalender bulanan atau daftar.',
        langkah: ['Pilih tahun akademik (default tahun aktif).', 'Klik kegiatan pada kalender untuk melihat tanggal & keterangannya; warna menunjukkan kategori kegiatan.'],
      },
      {
        judul: 'Jadwal Kuliah & Presensi',
        to: 'mahasiswa-jadwal',
        ringkas: 'Jadwal kelas sesuai KRS yang disetujui, sekaligus tempat mengisi presensi mandiri.',
        langkah: [
          'Klik Detail pada matakuliah untuk melihat realisasi mengajar dosen per pertemuan.',
          'Saat dosen sudah memulai kelas, klik tombol Hadir pada pertemuan tersebut.',
        ],
        catatan: ['Presensi baru bisa diisi setelah KRS Anda disetujui dosen PA/BAAK.'],
      },
    ],
  },
  {
    id: 'akademik',
    judul: 'Akademik',
    icon: 'school',
    menu: [
      {
        judul: 'KRS',
        to: 'mahasiswa-krs',
        ringkas: 'Kartu Rencana Studi — pilih matakuliah semester berjalan, atau matakuliah semester lain yang belum diambil / perlu diulang.',
        langkah: [
          'Centang matakuliah (gunakan filter semester untuk melihat semester lain).',
          'Perhatikan total SKS terhadap batas maksimal: semester 1–2 = 20 SKS, semester 3 ke atas = 24 SKS.',
          'Klik Ajukan. Status menjadi Diajukan sampai disetujui dosen PA/BAAK.',
        ],
        catatan: [
          'Matakuliah dengan nilai di bawah C wajib diulang dan bisa diambil kembali di KRS. Matakuliah mengulang boleh bentrok jadwal.',
          'Satu periode hanya punya satu KRS; matakuliah mengulang masuk ke KRS yang sama.',
          'KRS bisa terhambat bila masih ada tunggakan tagihan melewati batas yang ditentukan keuangan.',
        ],
      },
      {
        judul: 'E-learning',
        to: 'mahasiswa-elearning',
        ringkas: 'Materi, video, kuis, dan tugas dari dosen di kelas Anda.',
        langkah: ['Buka My Class dan pilih kelas.', 'Pelajari materi, kerjakan kuis, atau kumpulkan tugas. Jawaban kuis bisa disimpan sebagai draf sebelum dikirim.'],
        catatan: ['Tersedia juga My Team untuk tugas kelompok, Timeline, Learning History, Obrolan, dan Jelajah materi kelas lain.'],
      },
      {
        judul: 'Cuti',
        to: 'mahasiswa-pengajuan-cuti',
        ringkas: 'Ajukan cuti akademik. Pengajuan diproses prodi (disetujui/ditolak); selama belum diproses masih bisa dibatalkan.',
      },
      {
        judul: 'Kurikulum',
        to: 'mahasiswa-kurikulum',
        ringkas: 'Daftar matakuliah kurikulum prodi per semester beserta status kelulusan Anda di tiap matakuliah.',
      },
      {
        judul: 'Kehadiran',
        to: 'mahasiswa-kehadiran',
        ringkas: 'Rekap kehadiran Anda per matakuliah yang diambil di KRS: jumlah hadir, izin, sakit, alpa dan persentasenya.',
      },
      {
        judul: 'Angket Dosen',
        to: 'mahasiswa-angket-dosen',
        ringkas: 'Penilaian setiap dosen pengajar pada mata kuliah di KRS Anda yang sudah disetujui (tahun akademik aktif).',
        langkah: [
          'Buka Akademik → Angket Dosen; setiap mata kuliah menampilkan dosen pengajarnya dan kehadiran Anda.',
          'Klik Isi Angket pada dosen, pilih jawaban untuk setiap pertanyaan (pertanyaan isian boleh dikosongkan), tambahkan saran bila ada.',
          'Klik Kirim Angket. Status dosen berubah menjadi Sudah dinilai.',
        ],
        catatan: ['Satu angket per dosen per mata kuliah dan tidak bisa diubah setelah dikirim. Jawaban bersifat rahasia.'],
      },
      {
        judul: 'Bimbingan DPA',
        to: 'mahasiswa-bimbingan',
        ringkas: 'Catatan konsultasi bimbingan TA/Skripsi yang diinput dosen pembimbing Anda. Hanya bisa dilihat.',
      },
      {
        judul: 'Cetak Surat',
        to: 'mahasiswa-surat-keterangan',
        ringkas: 'Ajukan surat keterangan (mis. aktif kuliah, izin penelitian) dan pantau statusnya.',
        langkah: ['Klik Ajukan Surat, pilih jenis surat dan isi keperluannya.', 'Pantau statusnya di daftar pengajuan sampai diproses BAAK.'],
      },
    ],
  },
  {
    id: 'tingkat-akhir',
    judul: 'Tingkat Akhir',
    icon: 'workspace_premium',
    menu: [
      {
        judul: 'Informasi Dosen',
        to: 'mahasiswa-informasi-dosen',
        ringkas: 'Daftar dosen beserta kontak (No Telp & WhatsApp) untuk keperluan bimbingan. Klik nomor WhatsApp untuk langsung chat.',
      },
    ],
  },
  {
    id: 'hasil-studi',
    judul: 'Hasil Studi',
    icon: 'grading',
    menu: [
      {
        judul: 'Nilai (KHS)',
        to: 'mahasiswa-nilai',
        ringkas: 'Kartu Hasil Studi per semester: nilai angka, huruf, IP semester. Pilih semester lalu Cetak KHS bila perlu.',
        catatan: ['Skala: A ≥ 85, A- ≥ 80, B+ ≥ 75, B ≥ 70, B- ≥ 65, C+ ≥ 60, C ≥ 55, D ≥ 45, E di bawahnya.'],
      },
      {
        judul: 'Transkrip',
        to: 'mahasiswa-transkrip',
        ringkas: 'Rekap seluruh nilai dari semester pertama hingga saat ini beserta total SKS lulus dan IPK.',
      },
      {
        judul: 'Pendaftaran Judul TA',
        to: 'mahasiswa-pengajuan-judul',
        ringkas: 'Ajukan judul TA/Skripsi dan usulan dosen pembimbing.',
        langkah: [
          'Form hanya bisa diisi selama periode pengajuan yang dibuka prodi.',
          'Pengajuan yang masih menunggu verifikasi bisa diubah atau dibatalkan.',
        ],
      },
      {
        judul: 'KKP',
        to: 'mahasiswa-pengajuan-kkp',
        ringkas: 'Pendaftaran Kuliah Kerja Praktek: satu pendaftaran per tahun ajaran aktif; bisa diubah selama nilai belum diisi.',
      },
      {
        judul: 'Sidang',
        to: 'mahasiswa-pengajuan-sidang',
        ringkas: 'Pengajuan sidang TA/Skripsi setelah judul disetujui.',
        langkah: [
          'Pilih jadwal sidang yang dibuka prodi lalu ajukan.',
          'Pantau jadwal, nilai sidang, dan lembar koreksi/revisi dari dosen penguji di halaman yang sama.',
        ],
      },
    ],
  },
  {
    id: 'keuangan',
    judul: 'Pembayaran & KTM',
    icon: 'payments',
    menu: [
      {
        judul: 'Pembayaran',
        to: 'mahasiswa-pembayaran',
        ringkas: 'Riwayat tagihan dan pembayaran kuliah per semester serta nomor Virtual Account (VA) Anda.',
        langkah: [
          'Salin nomor VA (tombol salin) lalu bayar melalui bank/aplikasi sesuai instruksi keuangan.',
          'Setelah pembayaran tercatat, cetak kwitansi dari baris pembayaran.',
        ],
        catatan: ['Bila nomor VA belum tersedia, hubungi bagian keuangan.'],
      },
      {
        judul: 'Cetak KTM',
        to: 'mahasiswa-ktm',
        ringkas: 'Cetak Kartu Tanda Mahasiswa. Bila ada data yang kurang (mis. foto), halaman menampilkan daftarnya — foto diatur lewat menu profil di pojok kanan atas.',
      },
    ],
  },
];
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Panduan</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Panduan penggunaan Portal Mahasiswa, mengikuti urutan menu.</p>
    </header>
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
