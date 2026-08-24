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
  { id: 'master-data', title: 'Master Data', icon: 'layers' },
  { id: 'calon-mahasiswa', title: 'Data Calon Mahasiswa Baru', icon: 'group' },
  { id: 'reporting', title: 'Reporting', icon: 'bar_chart' },
  { id: 'manajemen-pengguna', title: 'Manajemen Pengguna', icon: 'admin_panel_settings' },
  { id: 'audit-log', title: 'Audit Log', icon: 'history' },
  { id: 'hak-akses', title: 'Hak Akses (Permission)', icon: 'lock' },
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan lengkap penggunaan modul PMB (Penerimaan Mahasiswa Baru)." />

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
          <strong class="text-on-surface">Modul PMB</strong> (Penerimaan Mahasiswa Baru) adalah Admin Console utama
          yang digunakan panitia/staf pendaftaran untuk mengelola seluruh siklus pendaftaran calon mahasiswa: mulai
          dari master data yang dipakai formulir pendaftaran publik, pemantauan calon mahasiswa yang mendaftar,
          hingga laporan rekap pendaftar.
        </p>
        <p class="text-body-md text-on-surface-variant mb-3">
          Modul PMB dapat diakses melalui menu sidebar di sisi kiri layar. Setiap menu memiliki hak akses
          (permission) sendiri yang diatur oleh Superadmin — lihat bagian
          <a href="#hak-akses" class="text-primary hover:underline">Hak Akses</a> di bawah untuk detailnya.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Alur data singkat: calon mahasiswa mendaftar lewat <strong class="text-on-surface">website publik</strong>
          menggunakan pilihan-pilihan yang berasal dari <strong class="text-on-surface">Master Data</strong> (jurusan,
          golongan kelas, gelombang, dst). Setiap pendaftar yang masuk tercatat di menu
          <strong class="text-on-surface">Data Calon Mahasiswa Baru</strong>, dan setelah dinyatakan
          lulus &amp; diterima, datanya di-generate menjadi <strong class="text-on-surface">Mahasiswa</strong> (dengan
          NIM) melalui modul BAAK.
        </p>
      </section>

      <!-- Dashboard -->
      <section id="dashboard" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Dashboard</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Halaman pertama saat masuk ke modul PMB. Berisi ringkasan cepat tanpa perlu melakukan aksi apa pun:
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant">
          <li><strong class="text-on-surface">Kartu statistik</strong>: Total Peserta, Total Jurusan, dan jumlah Gelombang Aktif (gelombang yang tanggal berjalannya mencakup hari ini).</li>
          <li><strong class="text-on-surface">Grafik "Pendaftaran per Bulan"</strong>: tren jumlah peserta baru dalam 6 bulan terakhir.</li>
          <li><strong class="text-on-surface">Grafik "Peserta per Kelas Perkuliahan"</strong>: distribusi peserta terdaftar per golongan kelas (donat).</li>
          <li><strong class="text-on-surface">Grafik "Status Kelulusan Calon Mahasiswa"</strong>: proporsi Lulus, Sedang Proses, dan Ditolak (donat).</li>
          <li><strong class="text-on-surface">Grafik "Peserta per Program Studi"</strong>: jurusan dengan jumlah pendaftar terbanyak (batang horizontal).</li>
          <li><strong class="text-on-surface">Tabel "Peserta Terbaru"</strong>: 5 peserta yang paling baru mendaftar (Nama, Email, Jurusan, Tanggal Daftar, Status).</li>
        </ul>
      </section>

      <!-- Master Data -->
      <section id="master-data" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Master Data</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Kumpulan data acuan yang dipakai formulir pendaftaran publik dan menu-menu lain. Setiap sub-menu berupa
          tabel dengan pencarian, tombol <strong class="text-on-surface">Tambah</strong>, serta ikon ubah/hapus per
          baris (kecuali disebutkan lain), mengikuti pola CRUD yang sama:
        </p>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant mb-3">
          <li><strong class="text-on-surface">Golongan Kelas</strong> — kelompok kelas perkuliahan (mis. Reguler, Karyawan, Kelas Malam).</li>
          <li><strong class="text-on-surface">Jurusan</strong> — program studi, masing-masing terhubung ke satu Golongan Kelas; punya foto dan daftar prospek karir yang tampil di website publik.</li>
          <li><strong class="text-on-surface">Sumber Informasi</strong> — daftar pilihan "dari mana calon mahasiswa tahu kampus ini" pada formulir pendaftaran (mis. Instagram, Teman, Sekolah).</li>
          <li><strong class="text-on-surface">Ukuran Almamater</strong> — daftar ukuran jas almamater yang bisa dipilih peserta saat mendaftar.</li>
          <li><strong class="text-on-surface">Pembayaran</strong> — jenis-jenis pembayaran pendaftaran (bisa ditandai sebagai skema beasiswa).</li>
          <li><strong class="text-on-surface">Dokumen Pendaftaran</strong> &amp; <strong class="text-on-surface">Dokumen Kelengkapan</strong> — daftar dokumen yang wajib diunggah peserta (KTP, ijazah, dll), termasuk mana yang wajib dan mana yang khusus jalur beasiswa.</li>
          <li><strong class="text-on-surface">Gelombang</strong> — periode/gelombang pendaftaran beserta tanggal mulai &amp; berakhirnya.</li>
          <li><strong class="text-on-surface">Profil Kampus</strong> — data satu-satunya (bukan tabel): nama, alamat, kontak, dan tautan sosial media yang tampil di header/footer website publik.</li>
          <li><strong class="text-on-surface">Beasiswa</strong> &amp; <strong class="text-on-surface">Biaya Kuliah</strong> — halaman konten (pakai editor teks kaya) yang tampil di menu Beasiswa/Biaya Kuliah pada website publik.</li>
          <li><strong class="text-on-surface">Gambar Beranda</strong> — mengganti gambar-gambar yang tampil di halaman Beranda website publik (kosongkan untuk memakai gambar bawaan).</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Perubahan pada Master Data langsung memengaruhi tampilan formulir pendaftaran dan website publik — mis.
          menghapus pilihan Jurusan akan menghilangkannya dari formulir pendaftaran baru.
        </p>
      </section>

      <!-- Calon Mahasiswa -->
      <section id="calon-mahasiswa" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Data Calon Mahasiswa Baru</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Daftar seluruh calon mahasiswa yang mendaftar lewat website publik, beserta status kelengkapan persyaratan
          dan hasil penerimaan.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Gunakan pencarian dan filter untuk menyaring berdasarkan gelombang, skema pembiayaan, atau status kuliah.</li>
          <li>Klik ikon mata untuk melihat <strong class="text-on-surface">Detail</strong> data pendaftaran calon mahasiswa.</li>
          <li>Klik ikon WhatsApp untuk <strong class="text-on-surface">membagikan status</strong> pendaftaran langsung ke nomor calon mahasiswa.</li>
          <li>Klik ikon pensil untuk mengubah data, termasuk menetapkan status Diterima/Ditolak dan status beasiswa.</li>
          <li>Klik ikon tempat sampah untuk menghapus data (akan diminta konfirmasi).</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Calon mahasiswa yang berstatus <em>diterima</em> di sinilah yang nantinya di-generate menjadi Mahasiswa
          (NIM) lewat modul BAAK.
        </p>
      </section>

      <!-- Reporting -->
      <section id="reporting" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Reporting</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Rekap pendaftar PMB yang bisa difilter per <strong class="text-on-surface">Gelombang</strong>,
          <strong class="text-on-surface">Jurusan</strong>, <strong class="text-on-surface">Golongan Kelas</strong>,
          dan rentang tanggal — berguna untuk memantau performa tiap gelombang pendaftaran atau mengubah status
          kelulusan secara massal.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Klik pada baris peserta untuk membuka form <strong class="text-on-surface">Ubah Status Pendaftaran</strong>.
        </p>
      </section>

      <!-- Manajemen Pengguna -->
      <section id="manajemen-pengguna" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Manajemen Pengguna</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Tiga menu yang mengatur siapa saja yang bisa login ke sistem dan apa saja yang boleh mereka lakukan:
        </p>
        <ul class="list-disc pl-6 space-y-1.5 text-body-md text-on-surface-variant mb-3">
          <li><strong class="text-on-surface">Manajemen User</strong> — kelola akun admin &amp; staf yang dapat mengakses sistem (username, email, role, status aktif).</li>
          <li><strong class="text-on-surface">Manajemen Role</strong> — kelola daftar role (mis. Superadmin, Admin). Klik ikon <span class="material-symbols-outlined align-middle" style="font-size: 16px">key</span> "Hak Akses" pada sebuah role untuk mengatur izin Lihat/Tambah/Ubah/Hapus per menu untuk role tersebut.</li>
          <li><strong class="text-on-surface">Manajemen Menu</strong> — kelola struktur menu &amp; navigasi sidebar itu sendiri (nama, ikon, urutan, menu induk). Hanya diubah jika benar-benar perlu menambah/menata ulang menu di sistem.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Setiap console (PMB, BAAK, SDI) punya kumpulan menunya masing-masing, tapi role &amp; user dikelola di satu
          tempat yang sama di sini.
        </p>
      </section>

      <!-- Audit Log -->
      <section id="audit-log" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Audit Log</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Riwayat seluruh aktivitas (tambah, ubah, hapus, login) yang terjadi di seluruh sistem — termasuk aktivitas
          publik seperti pendaftaran peserta — berguna untuk menelusuri siapa mengubah data apa dan kapan.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Gunakan kolom pencarian, serta filter <strong class="text-on-surface">Modul</strong>, <strong class="text-on-surface">Aksi</strong> (create/update/delete/login/dll), <strong class="text-on-surface">Tipe Aktor</strong>, dan rentang tanggal untuk mempersempit hasil.</li>
          <li>Klik <strong class="text-on-surface">"Reset Filter"</strong> untuk mengembalikan ke tampilan semua data.</li>
          <li>Klik ikon mata pada baris untuk melihat detail lengkap perubahan data (perbandingan nilai sebelum &amp; sesudah).</li>
          <li>Klik <strong class="text-on-surface">"Export CSV"</strong> untuk mengunduh data yang sedang tampil.</li>
        </ul>
      </section>

      <!-- Hak Akses -->
      <section id="hak-akses" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Hak Akses (Permission)</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Setiap menu di modul PMB memiliki 4 jenis izin yang diatur per role oleh Superadmin melalui menu
          <a href="#manajemen-pengguna" class="text-primary hover:underline">Manajemen Role</a>:
          <strong class="text-on-surface">Lihat (Read)</strong>, <strong class="text-on-surface">Tambah (Create)</strong>,
          <strong class="text-on-surface">Ubah (Update)</strong>, dan <strong class="text-on-surface">Hapus (Delete)</strong>.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Jika role Anda tidak memiliki izin <strong class="text-on-surface">Lihat</strong> pada suatu menu, menu tersebut tidak akan muncul di sidebar dan halaman akan menampilkan pesan akses ditolak jika diakses langsung lewat tautan.</li>
          <li>Tombol "Tambah" hanya muncul jika role Anda memiliki izin <strong class="text-on-surface">Tambah</strong>.</li>
          <li>Ikon ubah (pensil) dan hapus (tempat sampah) pada setiap baris tabel hanya muncul sesuai izin <strong class="text-on-surface">Ubah</strong>/<strong class="text-on-surface">Hapus</strong> yang dimiliki role Anda.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Jika Anda merasa perlu akses tambahan ke suatu menu, hubungi Superadmin untuk mengatur ulang hak akses
          role Anda.
        </p>
      </section>
    </div>
  </div>
</template>
