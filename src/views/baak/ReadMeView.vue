<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';

interface DocSection {
  id: string;
  title: string;
  icon: string;
}

const sections: DocSection[] = [
  { id: 'pendahuluan', title: 'Pendahuluan', icon: 'info' },
  { id: 'dashboard', title: 'Dashboard', icon: 'dashboard' },
  { id: 'mahasiswa', title: 'Mahasiswa', icon: 'school' },
  { id: 'jadwal-kuliah', title: 'Jadwal Kuliah', icon: 'event_note' },
  { id: 'kehadiran-dosen', title: 'Monitoring Kehadiran Dosen', icon: 'fact_check' },
  { id: 'master-monitoring', title: 'Master Monitoring', icon: 'monitoring' },
  { id: 'monitoring-nilai', title: 'Monitoring Nilai', icon: 'grading' },
  { id: 'yudisium', title: 'Laporan Yudisium', icon: 'workspace_premium' },
  { id: 'audit-log', title: 'Audit Log', icon: 'history' },
  { id: 'hak-akses', title: 'Hak Akses (Permission)', icon: 'lock' },
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan lengkap penggunaan modul BAAK (Biro Administrasi Akademik & Kemahasiswaan)." />

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
          <strong class="text-on-surface">Modul BAAK</strong> (Biro Administrasi Akademik &amp; Kemahasiswaan) adalah
          konsol terpisah dari admin PMB, digunakan oleh staf akademik untuk mengelola data mahasiswa aktif beserta
          seluruh proses akademik pendukungnya: jadwal kuliah, kehadiran dosen, nilai, hingga yudisium kelulusan.
        </p>
        <p class="text-body-md text-on-surface-variant mb-3">
          Modul BAAK dapat diakses melalui menu sidebar di sisi kiri layar. Setiap menu memiliki hak akses
          (permission) sendiri yang diatur oleh Superadmin — lihat bagian
          <a href="#hak-akses" class="text-primary hover:underline">Hak Akses</a> di bawah untuk detailnya.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Alur data singkat: peserta PMB yang <em>lulus ujian &amp; diterima</em> di-generate menjadi
          <strong class="text-on-surface">Mahasiswa</strong> (dengan NIM) melalui menu Mahasiswa. Setelah menjadi
          mahasiswa, data akademiknya (jadwal, kehadiran dosen pengajar, nilai, hingga yudisium) dikelola melalui
          menu-menu lain di modul ini.
        </p>
      </section>

      <!-- Dashboard -->
      <section id="dashboard" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Dashboard</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Halaman pertama saat masuk ke modul BAAK. Berisi ringkasan cepat tanpa perlu melakukan aksi apa pun:
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Kartu statistik</strong>: Total Mahasiswa, Mahasiswa Aktif, dan jumlah Peserta Siap Digenerate (peserta PMB yang sudah lulus ujian namun belum memiliki NIM).</li>
          <li><strong class="text-on-surface">Grafik "Peserta Lulus per Jurusan"</strong>: menampilkan jumlah calon mahasiswa yang lulus ujian, dikelompokkan per jurusan.</li>
          <li><strong class="text-on-surface">Tabel "Mahasiswa Terbaru"</strong>: 5 mahasiswa yang paling baru terdaftar (NIM, Nama, Jurusan, Tanggal Daftar, Status).</li>
        </ul>
      </section>

      <!-- Mahasiswa -->
      <section id="mahasiswa" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Mahasiswa</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Master data mahasiswa aktif. Data di sini <em>tidak diisi manual satu-per-satu</em>, melainkan
          digenerate dari peserta PMB yang sudah lulus ujian dan diterima.
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Cara generate mahasiswa baru:</p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-4">
          <li>Klik tombol <strong class="text-on-surface">"Generate dari Peserta Lulus"</strong> di kanan atas.</li>
          <li>Sistem menampilkan ringkasan jumlah peserta lulus per jurusan yang belum punya NIM.</li>
          <li>Isi <strong class="text-on-surface">Tahun Masuk</strong> dan <strong class="text-on-surface">Prefix NIM</strong> untuk masing-masing jurusan (mis. "TI" untuk Teknik Informatika, sehingga NIM menjadi <code>TI20260001</code>).</li>
          <li>Klik <strong class="text-on-surface">"Generate Mahasiswa"</strong> — seluruh peserta lulus pada jurusan tersebut otomatis dibuatkan NIM dan masuk ke tabel mahasiswa dalam satu proses.</li>
        </ol>
        <p class="font-medium text-label-md text-on-surface mb-2">Mengelola data yang sudah ada:</p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-4">
          <li>Gunakan kolom pencarian untuk mencari NIM/nama/email, atau filter berdasarkan Jurusan, Golongan Kelas, Status, dan Tahun Masuk.</li>
          <li>Klik ikon pensil pada baris untuk <strong class="text-on-surface">mengubah</strong> data mahasiswa (nama, email, jurusan, golongan kelas, status aktif, dll).</li>
          <li>Klik ikon <span class="material-symbols-outlined align-middle" style="font-size: 16px">contact_page</span> (Biodata) untuk mengisi/mengubah <strong class="text-on-surface">biodata lengkap</strong> mahasiswa: alamat, data orang tua, status kuliah, dan data pendukung lain sesuai format PDDIKTI.</li>
          <li>Klik ikon tempat sampah untuk <strong class="text-on-surface">menghapus</strong> data mahasiswa (akan diminta konfirmasi terlebih dahulu).</li>
          <li>Klik judul kolom (mis. NIM, Nama, Tahun Masuk) untuk <strong class="text-on-surface">mengurutkan</strong> data berdasarkan kolom tersebut.</li>
        </ul>
      </section>

      <!-- Jadwal Kuliah -->
      <section id="jadwal-kuliah" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Jadwal Kuliah</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Master jadwal perkuliahan: menentukan kelas mana belajar mata kuliah apa, diampu dosen siapa, pada hari
          dan jam berapa.
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Menambah jadwal baru:</p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-4">
          <li>Klik <strong class="text-on-surface">"Tambah Data"</strong>.</li>
          <li>Isi <strong class="text-on-surface">Kelas</strong> (mis. "TI4AM"), <strong class="text-on-surface">SKS</strong>, <strong class="text-on-surface">Kode Mata Kuliah</strong>, dan <strong class="text-on-surface">Mata Kuliah</strong>.</li>
          <li>Pilih <strong class="text-on-surface">Dosen Kordinator</strong> (wajib, penanggung jawab utama mata kuliah).</li>
          <li>Centang satu atau lebih nama pada daftar <strong class="text-on-surface">Dosen Pengampu</strong> jika ada dosen pengajar tambahan/pendamping.</li>
          <li>Pilih <strong class="text-on-surface">Hari</strong> — bisa memilih lebih dari satu hari sekaligus (klik beberapa tombol hari, mis. Senin &amp; Rabu, jika kelas berjalan di dua hari yang sama setiap minggunya).</li>
          <li>Isi <strong class="text-on-surface">Jam Ke-</strong>, <strong class="text-on-surface">Ruangan</strong>, dan (opsional) kode/tautan <strong class="text-on-surface">GCR</strong> (Google Classroom).</li>
          <li>Klik <strong class="text-on-surface">Simpan</strong>.</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">
          Gunakan kolom pencarian untuk mencari berdasarkan kelas/kode/nama mata kuliah, dan filter Status untuk
          menampilkan jadwal Aktif/Non-aktif saja. Klik judul kolom untuk mengurutkan data.
        </p>
      </section>

      <!-- Monitoring Kehadiran Dosen -->
      <section id="kehadiran-dosen" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Monitoring Kehadiran Dosen</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Mencatat realisasi kehadiran dosen pada setiap sesi jadwal kuliah — apakah dosen benar-benar hadir
          mengajar sesuai jadwal, izin, sakit, atau tidak hadir.
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Mencatat kehadiran dosen:</p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-4">
          <li>(Opsional) Pilih <strong class="text-on-surface">Program/Kelas</strong> di bagian atas lalu klik <strong class="text-on-surface">"Periksa"</strong> untuk mempersempit daftar ke satu kelas saja.</li>
          <li>Klik <strong class="text-on-surface">"Tambah Data"</strong>.</li>
          <li>Pilih <strong class="text-on-surface">Jadwal Kuliah</strong> (kelas — kode MK — nama MK) dan <strong class="text-on-surface">Dosen</strong> yang bersangkutan.</li>
          <li>Isi <strong class="text-on-surface">Tanggal Realisasi</strong> (tanggal sesi tersebut benar-benar berlangsung).</li>
          <li>Pilih <strong class="text-on-surface">Status</strong>: Hadir, Tidak Hadir, Izin, atau Sakit.</li>
          <li>Isi <strong class="text-on-surface">Keterangan</strong> jika perlu (mis. alasan izin/sakit), lalu <strong class="text-on-surface">Simpan</strong>.</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">
          Status ditampilkan dengan label warna: <strong class="text-on-surface">hijau</strong> untuk Hadir,
          <strong class="text-on-surface">merah</strong> untuk Tidak Hadir, dan <strong class="text-on-surface">kuning</strong>
          untuk Izin/Sakit. Gunakan kolom pencarian untuk mencari berdasarkan nama dosen atau mata kuliah. Klik ikon
          pensil/tempat sampah pada baris untuk mengubah atau menghapus catatan kehadiran.
        </p>
      </section>

      <!-- Master Monitoring -->
      <section id="master-monitoring" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Master Monitoring</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Halaman pemantauan (read-only) seluruh jadwal kuliah yang terdaftar di sistem, digunakan untuk melihat
          gambaran umum jadwal per program/kelas.
        </p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>(Opsional) Pilih <strong class="text-on-surface">Program/Kelas</strong> pada dropdown, lalu klik <strong class="text-on-surface">"Periksa"</strong> untuk memfilter tabel ke kelas tersebut.</li>
          <li>Gunakan kolom pencarian dan pengaturan "Show N entries" untuk menyaring/menyesuaikan jumlah baris yang tampil.</li>
          <li>Klik ikon <span class="material-symbols-outlined align-middle" style="font-size: 16px">description</span> Detail pada baris untuk membuka halaman detail jadwal tersebut (menampilkan info mata kuliah, kelas, dan dosen).</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">
          <em
            >Catatan: tabel kehadiran mahasiswa per sesi pada halaman detail saat ini masih berupa tampilan kosong,
            karena fitur presensi mahasiswa per sesi belum tersedia di sistem.</em
          >
        </p>
      </section>

      <!-- Monitoring Nilai -->
      <section id="monitoring-nilai" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Monitoring Nilai</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Halaman pemantauan nilai akhir mahasiswa (read-only, tidak bisa menambah/mengubah nilai dari sini).
        </p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Ketik <strong class="text-on-surface">NIM atau Nama Mahasiswa</strong> pada kolom pencarian, lalu klik <strong class="text-on-surface">"Periksa"</strong> (atau tekan Enter).</li>
          <li>Sistem menampilkan daftar mahasiswa yang cocok beserta kelasnya.</li>
          <li>Klik ikon <span class="material-symbols-outlined align-middle" style="font-size: 16px">description</span> Detail pada baris mahasiswa yang dituju untuk membuka transkrip nilainya.</li>
          <li>Halaman detail menampilkan seluruh mata kuliah yang pernah diambil mahasiswa tersebut, lengkap dengan komponen nilai (Partisipatif, Proyek, Quiz, Tugas, UTS, UAS), Nilai akhir, dan Grade (A/B/C/D/E).</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">Klik judul kolom pada tabel transkrip untuk mengurutkan data, misalnya berdasarkan Semester atau Nilai.</p>
      </section>

      <!-- Yudisium -->
      <section id="yudisium" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Laporan Yudisium</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Mengelola data kelulusan (yudisium) mahasiswa: nomor SK, tanggal SK, tanggal yudisium, PIN ijazah, judul
          tugas akhir/skripsi, dan dosen pembimbing. Menu ini hanya untuk <strong class="text-on-surface">melihat dan mengubah</strong>
          data yang sudah ada — data yudisium baru dibuat secara otomatis oleh sistem saat mahasiswa dinyatakan lulus,
          bukan diinput manual dari menu ini.
        </p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>(Opsional) Filter daftar berdasarkan <strong class="text-on-surface">Jurusan</strong>, atau cari dengan NIM/nama pada kolom pencarian.</li>
          <li>Tabel menampilkan NPM/Nama, No. SK, Tanggal SK, Tanggal Yudisium, PIN, dan Judul tugas akhir.</li>
          <li>Klik ikon pensil pada baris untuk membuka form dan mengubah No. SK, Tanggal SK, Tanggal Yudisium, PIN, Judul, serta Pembimbing 1 &amp; 2.</li>
        </ol>
      </section>

      <!-- Audit Log -->
      <section id="audit-log" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Audit Log</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Riwayat seluruh aktivitas (tambah, ubah, hapus, login) yang terjadi khusus di modul BAAK — berguna untuk
          menelusuri siapa mengubah data apa dan kapan.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Gunakan kolom pencarian, serta filter <strong class="text-on-surface">Modul</strong>, <strong class="text-on-surface">Aksi</strong> (create/update/delete/login/dll), <strong class="text-on-surface">Tipe Aktor</strong>, dan rentang tanggal untuk mempersempit hasil.</li>
          <li>Klik <strong class="text-on-surface">"Reset Filter"</strong> untuk mengembalikan ke tampilan semua data.</li>
          <li>Klik ikon mata pada baris untuk melihat detail lengkap perubahan data (perbandingan nilai sebelum &amp; sesudah).</li>
        </ul>
      </section>

      <!-- Hak Akses -->
      <section id="hak-akses" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Hak Akses (Permission)</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Setiap menu di modul BAAK memiliki 4 jenis izin yang diatur per role oleh Superadmin melalui menu
          Manajemen Role di Admin Console: <strong class="text-on-surface">Lihat (Read)</strong>,
          <strong class="text-on-surface">Tambah (Create)</strong>, <strong class="text-on-surface">Ubah (Update)</strong>,
          dan <strong class="text-on-surface">Hapus (Delete)</strong>.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Jika role Anda tidak memiliki izin <strong class="text-on-surface">Lihat</strong> pada suatu menu, menu tersebut tidak akan muncul di sidebar dan halaman akan menampilkan pesan akses ditolak jika diakses langsung lewat tautan.</li>
          <li>Tombol "Tambah Data" hanya muncul jika role Anda memiliki izin <strong class="text-on-surface">Tambah</strong>.</li>
          <li>Ikon ubah (pensil) dan hapus (tempat sampah) pada setiap baris tabel hanya muncul sesuai izin <strong class="text-on-surface">Ubah</strong>/<strong class="text-on-surface">Hapus</strong> yang dimiliki role Anda.</li>
          <li>Menu <strong class="text-on-surface">Master Monitoring</strong> dan <strong class="text-on-surface">Monitoring Nilai</strong> bersifat khusus lihat saja (read-only) — tidak ada tombol tambah/ubah/hapus sama sekali pada menu tersebut, untuk siapa pun.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Jika Anda merasa perlu akses tambahan ke suatu menu, hubungi Superadmin untuk mengatur ulang hak akses
          role Anda.
        </p>
      </section>
    </div>
  </div>
</template>
