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
  { id: 'dosen', title: 'Dosen', icon: 'school' },
  { id: 'karyawan', title: 'Karyawan', icon: 'badge' },
  { id: 'sync-finger', title: 'Sync Finger A1 / A2', icon: 'fingerprint' },
  { id: 'dinas-cuti-lupa-finger', title: 'Dinas/Cuti/Lupa Finger', icon: 'event_busy' },
  { id: 'report-finger', title: 'Report Finger', icon: 'summarize' },
  { id: 'hak-akses', title: 'Hak Akses (Permission)', icon: 'lock' },
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan lengkap penggunaan modul SDI (Sumber Daya Insani)." />

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
          <strong class="text-on-surface">Modul SDI</strong> (Sumber Daya Insani) adalah konsol terpisah dari admin PMB
          dan BAAK, digunakan oleh staf kepegawaian untuk mengelola data dosen &amp; karyawan, serta memantau
          kehadiran mereka lewat mesin fingerprint.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Modul SDI dapat diakses melalui menu sidebar di sisi kiri layar, terbagi dalam grup
          <strong class="text-on-surface">Master</strong> (Dosen, Karyawan, Sync Finger A1/A2) dan
          <strong class="text-on-surface">Kehadiran</strong> (Tugas Dinas/Cuti/Lupa Finger, Report Finger). Setiap
          menu memiliki hak akses (permission) sendiri yang diatur oleh Superadmin — lihat bagian
          <a href="#hak-akses" class="text-primary hover:underline">Hak Akses</a> di bawah untuk detailnya.
        </p>
      </section>

      <!-- Dashboard -->
      <section id="dashboard" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Dashboard</h2>
        <p class="text-body-md text-on-surface-variant">
          Halaman pertama saat masuk ke modul SDI. Saat ini masih berupa halaman
          <strong class="text-on-surface">dalam pengembangan</strong> — ringkasan data SDI (statistik dosen,
          karyawan, dan kehadiran) akan tersedia di sini pada pembaruan berikutnya.
        </p>
      </section>

      <!-- Dosen -->
      <section id="dosen" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Dosen</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Master biodata dosen — terpisah dari data karyawan umum. Kartu ringkasan di bagian atas menampilkan jumlah
          dosen per <strong class="text-on-surface">Kelompok Fakultas</strong> (FKF, FTID, FIP, Non Base).
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Data yang dikelola:</p>
        <p class="text-body-md text-on-surface-variant mb-3">
          NIK, NIDN, nama lengkap, tempat/tanggal lahir, jenis kelamin, pendidikan terakhir, agama, no. HP, email,
          alamat, status dosen (Tetap/Tidak Tetap), status kepegawaian (Institusi/Yayasan), waktu (Pagi/Malam), TMT,
          status karyawan internal, status infaq, dan kelompok fakultas.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant">
          <li>Gunakan kolom pencarian (nama/NIDN/NIK) dan filter <strong class="text-on-surface">Kelompok Fakultas</strong> untuk mempersempit daftar.</li>
          <li>Klik <strong class="text-on-surface">"Tambah Data"</strong> untuk menambah dosen baru, atau ikon pensil/tempat sampah pada baris untuk mengubah/menghapus.</li>
          <li>Gunakan tombol <strong class="text-on-surface">Import/Export Excel</strong> untuk mengelola data secara massal — unduh template terlebih dahulu agar format kolom sesuai.</li>
        </ul>
      </section>

      <!-- Karyawan -->
      <section id="karyawan" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Karyawan</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Master biodata karyawan non-dosen di lingkungan kampus. Kartu ringkasan di bagian atas menampilkan jumlah
          karyawan berdasarkan jenis kelamin (Laki-Laki/Perempuan).
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Data yang dikelola:</p>
        <p class="text-body-md text-on-surface-variant mb-3">
          NIP, ID-Finger, nama lengkap, tempat/tanggal lahir, jenis kelamin, pendidikan terakhir, agama, no. HP,
          email, alamat, bagian/unit kerja, status kepegawaian (mis. Tetap/Kontrak), TMT, dan status aktif.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant">
          <li>Gunakan kolom pencarian (NIP/nama/bagian) dan filter <strong class="text-on-surface">Status</strong> (Aktif/Non-aktif).</li>
          <li>Klik <strong class="text-on-surface">"Tambah Karyawan"</strong> untuk menambah data baru, atau ikon pensil/tempat sampah pada baris untuk mengubah/menghapus.</li>
          <li>Gunakan tombol <strong class="text-on-surface">Import/Export Excel</strong> untuk mengelola data secara massal — unduh template terlebih dahulu agar format kolom sesuai.</li>
        </ul>
      </section>

      <!-- Sync Finger -->
      <section id="sync-finger" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Sync Finger A1 / A2</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Menarik data absensi dari mesin fingerprint <strong class="text-on-surface">A1</strong> dan
          <strong class="text-on-surface">A2</strong> ke dalam sistem. Karena aplikasi belum terhubung langsung ke
          mesin, data diambil lewat file Excel yang diekspor dari mesin fingerprint.
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Langkah sinkronisasi:</p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Ekspor log absensi dari mesin fingerprint sebagai file Excel (kolom NIK + Tanggal). Gunakan tombol template yang tersedia jika perlu contoh formatnya.</li>
          <li>Klik <strong class="text-on-surface">"Tarik Data Dari Mesin"</strong> dan unggah file tersebut — baris yang berhasil dibaca akan tampil di tabel dengan status <strong class="text-on-surface">Menunggu</strong>.</li>
          <li>Periksa hasil tarikan (bisa dicari berdasarkan NIK); baris yang gagal dibaca akan ditampilkan sebagai error lengkap dengan nomor baris &amp; pesannya.</li>
          <li>Klik <strong class="text-on-surface">"Masukan Data Ke Database"</strong> untuk mencocokkan data yang ditarik dengan master dosen/karyawan dan menyimpannya sebagai data kehadiran resmi (status berubah menjadi <strong class="text-on-surface">Diproses</strong>). Sistem melaporkan jumlah baris yang cocok maupun yang tidak dikenali.</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">Halaman A1 dan A2 bekerja dengan cara yang identik, hanya sumber mesinnya berbeda.</p>
      </section>

      <!-- Dinas/Cuti/Lupa Finger -->
      <section id="dinas-cuti-lupa-finger" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Tugas Dinas / Cuti / Lupa Finger</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Mencatat pengecualian kehadiran pegawai: dinas luar, cuti, cuti spesial, cuti bersama, dan lupa
          presensi/fingerprint — supaya rekap kehadiran (Report Finger) tidak salah menandai pegawai sebagai
          tidak hadir pada hari-hari tersebut.
        </p>
        <p class="font-medium text-label-md text-on-surface mb-2">Menambah data baru:</p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Klik <strong class="text-on-surface">"Tambah Data"</strong>, lalu pilih pegawai (ditampilkan sebagai NIP - Nama, jabatan terisi otomatis).</li>
          <li>Isi <strong class="text-on-surface">Tanggal</strong> dan pilih <strong class="text-on-surface">Status</strong>: Dinas Luar, Cuti, Lupa Kehadiran, Cuti Spesial, atau Cuti Bersama.</li>
          <li>Isi <strong class="text-on-surface">Keperluan</strong> (alasan/keterangan), dan lampirkan dokumen pendukung jika ada (PDF/PNG/JPEG, maks. 5MB).</li>
          <li>Klik <strong class="text-on-surface">Simpan</strong>.</li>
        </ol>
        <p class="text-body-md text-on-surface-variant">
          Gunakan kolom pencarian (kode/nama pegawai) dan filter Status untuk menyaring data. Klik lampiran pada
          baris untuk melihat pratinjau dokumen, dan ikon pensil/tempat sampah untuk mengubah/menghapus data.
        </p>
      </section>

      <!-- Report Finger -->
      <section id="report-finger" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Report Finger</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Halaman untuk mencetak rekap kehadiran seorang pegawai berdasarkan data fingerprint yang sudah
          disinkronkan. Bukan tabel data — murni alat filter &amp; cetak.
        </p>
        <ol class="list-decimal pl-6 space-y-1 text-body-md text-on-surface-variant">
          <li>Pilih <strong class="text-on-surface">Pegawai</strong> (NIP - Nama).</li>
          <li>Isi <strong class="text-on-surface">Periode Awal</strong> dan <strong class="text-on-surface">Periode Akhir</strong>.</li>
          <li>Pilih <strong class="text-on-surface">Shift</strong> kerja (Shift 1/2/3).</li>
          <li>Klik <strong class="text-on-surface">"Periksa"</strong> — sistem akan membuka rekap kehadiran dalam format PDF untuk pegawai &amp; periode tersebut.</li>
        </ol>
      </section>

      <!-- Hak Akses -->
      <section id="hak-akses" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Hak Akses (Permission)</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Setiap menu di modul SDI memiliki 4 jenis izin yang diatur per role oleh Superadmin melalui menu
          Manajemen Role di Admin Console: <strong class="text-on-surface">Lihat (Read)</strong>,
          <strong class="text-on-surface">Tambah (Create)</strong>, <strong class="text-on-surface">Ubah (Update)</strong>,
          dan <strong class="text-on-surface">Hapus (Delete)</strong>.
        </p>
        <ul class="list-disc pl-6 space-y-1 text-body-md text-on-surface-variant mb-3">
          <li>Jika role Anda tidak memiliki izin <strong class="text-on-surface">Lihat</strong> pada suatu menu, menu tersebut tidak akan muncul di sidebar dan halaman akan menampilkan pesan akses ditolak jika diakses langsung lewat tautan.</li>
          <li>Tombol "Tambah Data" hanya muncul jika role Anda memiliki izin <strong class="text-on-surface">Tambah</strong>.</li>
          <li>Ikon ubah (pensil) dan hapus (tempat sampah) pada setiap baris tabel hanya muncul sesuai izin <strong class="text-on-surface">Ubah</strong>/<strong class="text-on-surface">Hapus</strong> yang dimiliki role Anda.</li>
          <li>Menu <strong class="text-on-surface">Report Finger</strong> tidak memiliki tabel data untuk diubah/dihapus — izin yang relevan hanya <strong class="text-on-surface">Lihat</strong>.</li>
        </ul>
        <p class="text-body-md text-on-surface-variant">
          Jika Anda merasa perlu akses tambahan ke suatu menu, hubungi Superadmin untuk mengatur ulang hak akses
          role Anda.
        </p>
      </section>
    </div>
  </div>
</template>
