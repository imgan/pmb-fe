<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';

interface DocSection {
  id: string;
  title: string;
  icon: string;
}

const sections: DocSection[] = [
  { id: 'pendahuluan', title: 'Pendahuluan', icon: 'info' },
  { id: 'dashboard', title: 'Beranda', icon: 'dashboard' },
  { id: 'lulusan-yudisium', title: 'Lulusan & Yudisium', icon: 'workspace_premium' },
  { id: 'sidang', title: 'Sidang', icon: 'gavel' },
  { id: 'bimbingan', title: 'Bimbingan', icon: 'diversity_3' },
  { id: 'nilai', title: 'Nilai', icon: 'grading' },
  { id: 'jadwal-kuliah', title: 'Jadwal Kuliah', icon: 'event_note' },
  { id: 'kurikulum', title: 'Kurikulum', icon: 'menu_book' },
  { id: 'mahasiswa', title: 'Mahasiswa', icon: 'school' },
  { id: 'laporan', title: 'Laporan', icon: 'summarize' },
  { id: 'hak-akses', title: 'Hak Akses (Permission)', icon: 'lock' },
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan lengkap penggunaan modul Prodi (Program Studi)." />

    <!-- Daftar isi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6">
      <p class="font-semibold text-label-md text-on-surface mb-3">Daftar Isi</p>
      <nav class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="`#${s.id}`"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">{{ s.icon }}</span>
          {{ s.title }}
        </a>
      </nav>
    </section>

    <div class="space-y-6">
      <!-- Pendahuluan -->
      <section id="pendahuluan" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Pendahuluan</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          <strong class="text-on-surface">Modul Prodi</strong> (Program Studi) adalah konsol terpisah dari Admin PMB
          dan BAAK, digunakan oleh kaprodi/staf program studi untuk mengelola proses akademik yang sifatnya spesifik
          per program studi: sidang, bimbingan tugas akhir/magang, nilai, jadwal kuliah, kurikulum, hingga status
          keaktifan mahasiswa.
        </p>
        <p class="text-body-md text-on-surface-variant mb-3">
          Modul Prodi dapat diakses melalui menu sidebar di sisi kiri layar. Setiap menu memiliki hak akses
          (permission) sendiri yang diatur oleh Superadmin — lihat bagian
          <a href="#hak-akses" class="text-primary hover:underline">Hak Akses</a> di bawah untuk detailnya.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Beberapa menu di modul ini (mis. Mahasiswa, Cetak Surat, Biodata) mengelola data yang sama dengan modul
          BAAK — perubahan yang dilakukan dari Prodi maupun BAAK akan saling terlihat karena keduanya mengakses satu
          sumber data yang sama.
        </p>
      </section>

      <!-- Dashboard -->
      <section id="dashboard" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Beranda</h2>
        <p class="text-body-md text-on-surface-variant">
          Halaman pertama saat masuk ke modul Prodi. Menampilkan ringkasan cepat kondisi program studi tanpa perlu
          melakukan aksi apa pun, seperti jumlah mahasiswa aktif dan aktivitas akademik terbaru.
        </p>
      </section>

      <!-- Lulusan & Yudisium -->
      <section id="lulusan-yudisium" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Lulusan &amp; Yudisium</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Master Lulusan</strong> — daftar mahasiswa yang telah dinyatakan lulus dari program studi.</li>
          <li><strong class="text-on-surface">Yudisium</strong> — mengelola data kelulusan: nomor SK, tanggal SK, tanggal yudisium, PIN ijazah, judul tugas akhir/skripsi, dan dosen pembimbing. Data yudisium dibuat otomatis oleh sistem saat mahasiswa dinyatakan lulus; menu ini hanya untuk melihat dan mengubah data yang sudah ada.</li>
        </ul>
      </section>

      <!-- Sidang -->
      <section id="sidang" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Sidang</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Jadwal Sidang</strong> — menentukan periode (tahun ajaran + semester) dan jurusan pelaksanaan sidang tugas akhir/skripsi, beserta tanggal, jam, ruangan, nomor SK, dan dosen penguji.</li>
          <li><strong class="text-on-surface">Pendaftar Sidang</strong> — daftar mahasiswa yang mendaftar sidang pada suatu Jadwal Sidang, lengkap dengan judul tugas akhir dan dosen pembimbing 1 &amp; 2.</li>
        </ul>
      </section>

      <!-- Bimbingan -->
      <section id="bimbingan" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Bimbingan</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Rekap Bimbingan</strong> &amp; <strong class="text-on-surface">Bimbingan</strong> — mencatat sesi bimbingan tugas akhir/skripsi mahasiswa dengan dosen pembimbing.</li>
          <li><strong class="text-on-surface">Pembimbing Magang</strong> &amp; <strong class="text-on-surface">Bimbingan Magang</strong> — master data dosen pembimbing magang beserta pencatatan sesi bimbingannya.</li>
          <li><strong class="text-on-surface">Pembimbing TA/Skripsi</strong> — master data dosen pembimbing tugas akhir/skripsi per periode.</li>
          <li><strong class="text-on-surface">Pembimbing Akademik</strong> — master data dosen wali/pembimbing akademik, termasuk jumlah mahasiswa bimbingan per dosen.</li>
        </ul>
      </section>

      <!-- Nilai -->
      <section id="nilai" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Nilai</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Nilai Perkelas</strong> — input/lihat nilai seluruh mahasiswa dalam satu kelas kuliah sekaligus.</li>
          <li><strong class="text-on-surface">Nilai Mahasiswa</strong> — cari seorang mahasiswa untuk melihat transkrip nilainya per mata kuliah.</li>
          <li><strong class="text-on-surface">Nilai Magang</strong> — nilai kegiatan magang mahasiswa dari pembimbing magang.</li>
          <li><strong class="text-on-surface">Konversi Nilai</strong>, <strong class="text-on-surface">Penghapusan Nilai</strong>, <strong class="text-on-surface">Update Nilai</strong> — perkakas untuk mengoreksi nilai yang sudah terlanjur tersimpan (mis. hasil konversi mata kuliah, koreksi kesalahan input).</li>
          <li><strong class="text-on-surface">VOC Dosen FTID</strong>, <strong class="text-on-surface">Bobot OBE</strong>, <strong class="text-on-surface">VOC Ujian FTID</strong> — pengaturan bobot penilaian berbasis Outcome Based Education (OBE) dan validasi soal ujian.</li>
        </ul>
      </section>

      <!-- Jadwal Kuliah -->
      <section id="jadwal-kuliah" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Jadwal Kuliah</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Realisasi Dosen</strong> — rekap realisasi kehadiran mengajar dosen per kelas.</li>
          <li><strong class="text-on-surface">Monitoring Jadwal</strong> — pemantauan (read-only) seluruh jadwal kuliah yang terdaftar.</li>
          <li><strong class="text-on-surface">Jadwal Kuliah</strong> — master jadwal perkuliahan: kelas, mata kuliah, dosen kordinator/pengampu, hari, jam, dan ruangan. Mendukung import/export Excel.</li>
          <li><strong class="text-on-surface">Jadwal Ujian</strong> — jadwal pelaksanaan ujian per kelas/mata kuliah.</li>
        </ul>
      </section>

      <!-- Kurikulum -->
      <section id="kurikulum" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Kurikulum</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Kurikulum</strong> — master data mata kuliah per kurikulum: prodi, tahun kurikulum, semester, kelompok &amp; jenis mata kuliah, SKS (Teori/Praktek/Lab/Simulasi), kelompok kompetensi, dan minat.</li>
          <li><strong class="text-on-surface">Matakuliah Aktif</strong> — mata kuliah dari kurikulum yang benar-benar dijadwalkan (punya Jadwal Kuliah) pada tahun ajaran &amp; semester yang dipilih.</li>
          <li><strong class="text-on-surface">Konversi Kurikulum</strong> — pemetaan mata kuliah antar kurikulum lama dan baru untuk mahasiswa pindah kurikulum.</li>
        </ul>
      </section>

      <!-- Mahasiswa -->
      <section id="mahasiswa" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Mahasiswa</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Generate Mahasiswa Aktif</strong> — regenerasi daftar mahasiswa aktif per tahun ajaran.</li>
          <li><strong class="text-on-surface">Mahasiswa Keluar</strong> — daftar &amp; penandaan mahasiswa yang cuti, mengundurkan diri, drop out, atau habis masa studi. Klik <strong class="text-on-surface">"Tandai Mahasiswa Keluar"</strong> untuk memilih mahasiswa aktif dan menetapkan status keluarnya.</li>
          <li><strong class="text-on-surface">Mahasiswa Cuti</strong> &amp; <strong class="text-on-surface">Habis Masa Studi</strong> — pemantauan status aktivitas dan masa studi mahasiswa, termasuk riwayat SKS per semester.</li>
          <li><strong class="text-on-surface">Monitoring FRS</strong> (Master Frs) — cari mahasiswa lewat NIM/nama untuk memeriksa Formulir Rencana Studi (kelas yang diambil, status, dan waktu kuliah).</li>
          <li><strong class="text-on-surface">Biodata Mahasiswa</strong> — kelola biodata lengkap mahasiswa (alamat, data orang tua, data pendukung sesuai format PDDIKTI), sama seperti menu Biodata di modul BAAK.</li>
        </ul>
      </section>

      <!-- Laporan -->
      <section id="laporan" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Laporan</h2>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant mb-3">
          <li><strong class="text-on-surface">Ijazah &amp; Transkrip</strong> — cetak laporan ijazah dan transkrip nilai mahasiswa.</li>
          <li><strong class="text-on-surface">Cetak Surat</strong> — kelola dan cetak surat keterangan mahasiswa (aktif kuliah, lulus menunggu ijazah, dll), sama seperti menu Cetak Surat di modul BAAK.</li>
          <li><strong class="text-on-surface">Cetak Realisasi</strong>, <strong class="text-on-surface">Cetak Mahasiswa Perkelas</strong>, <strong class="text-on-surface">Cetak Kehadiran Mengajar</strong>, <strong class="text-on-surface">Cetak KHS</strong> — laporan cetak pendukung lainnya.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Khusus menu <strong class="text-on-surface">Cetak Surat</strong>: selalu klik <strong class="text-on-surface">"View"</strong> untuk memeriksa kelengkapan data (NIK, alamat) sebelum mengklik <strong class="text-on-surface">"Cetak PDF"</strong>, agar dokumen yang dihasilkan tidak berisi data kosong.
        </p>
      </section>

      <!-- Hak Akses -->
      <section id="hak-akses" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Hak Akses (Permission)</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Setiap menu di modul Prodi memiliki 4 jenis izin yang diatur per role oleh Superadmin melalui menu
          Manajemen Role di Admin Console: <strong class="text-on-surface">Lihat (Read)</strong>,
          <strong class="text-on-surface">Tambah (Create)</strong>, <strong class="text-on-surface">Ubah (Update)</strong>,
          dan <strong class="text-on-surface">Hapus (Delete)</strong>.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Jika role Anda tidak memiliki izin <strong class="text-on-surface">Lihat</strong> pada suatu menu, menu tersebut tidak akan muncul di sidebar dan halaman akan menampilkan pesan akses ditolak jika diakses langsung lewat tautan.</li>
          <li>Tombol "Tambah Data" hanya muncul jika role Anda memiliki izin <strong class="text-on-surface">Tambah</strong>.</li>
          <li>Ikon ubah (pensil) dan hapus (tempat sampah) pada setiap baris tabel hanya muncul sesuai izin <strong class="text-on-surface">Ubah</strong>/<strong class="text-on-surface">Hapus</strong> yang dimiliki role Anda.</li>
          <li>Menu yang datanya dipakai bersama dengan modul BAAK (mis. Mahasiswa, Biodata, Cetak Surat) memakai data yang sama persis — mengubahnya dari Prodi akan langsung terlihat juga di BAAK, dan sebaliknya.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Jika Anda merasa perlu akses tambahan ke suatu menu, hubungi Superadmin untuk mengatur ulang hak akses
          role Anda.
        </p>
      </section>
    </div>
  </div>
</template>
