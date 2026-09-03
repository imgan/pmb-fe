<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';

interface DocSection {
  id: string;
  title: string;
  icon: string;
}

const sections: DocSection[] = [
  { id: 'pendahuluan', title: 'Pendahuluan', icon: 'info' },
  { id: 'harian', title: 'Harian', icon: 'folder' },
  { id: 'silabus', title: 'Silabus Matakuliah', icon: 'article' },
  { id: 'lainnya', title: 'Periodik & Lain-Lain', icon: 'grid_view' },
];
</script>

<template>
  <div>
    <PageHeader title="Panduan Sistem" subtitle="Panduan penggunaan Portal Dosen." />

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
      <section id="pendahuluan" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Pendahuluan</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          <strong class="text-on-surface">Portal Dosen</strong> adalah layanan mandiri (self-service) khusus untuk
          dosen, terpisah sepenuhnya dari Admin Console/BAAK/SDI/Prodi/Keuangan. Login Anda menggunakan NIDN atau
          email pribadi beserta password yang diberikan admin, bukan akun staf sistem.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Navigasi Portal Dosen berada di bagian atas layar (bukan sidebar kiri seperti konsol lainnya), berisi menu
          Harian, Periodik, Lain-Lain, Panduan Sistem, dan Silabus Matakuliah.
        </p>
      </section>

      <section id="harian" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Harian</h2>
        <p class="text-body-md text-on-surface-variant mb-3">
          Menu <strong class="text-on-surface">Kehadiran Mengajar</strong> digunakan untuk mencatat realisasi
          mengajar Anda setiap sesi: tanggal pertemuan, mata kuliah, jam masuk &amp; keluar, pertemuan ke berapa,
          dan status kehadiran (Hadir/Tidak Hadir/Izin/Sakit). Data yang sudah tersimpan tampil pada tabel
          "Realisasi Mengajar" di bawah form, dan bisa dihapus jika salah input.
        </p>
        <p class="text-body-md text-on-surface-variant">
          Menu <strong class="text-on-surface">Rekap Mahasiswa</strong> menampilkan daftar mahasiswa yang mengambil
          KRS pada mata kuliah/kelas yang Anda ampu — pilih mata kuliah pada dropdown, lalu tabel akan menampilkan
          NIM dan nama mahasiswa yang terdaftar.
        </p>
      </section>

      <section id="silabus" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Silabus Matakuliah</h2>
        <p class="text-body-md text-on-surface-variant">
          Menampilkan daftar mata kuliah yang Anda ampu (sebagai dosen kordinator maupun dosen pengampu) beserta
          kode, SKS, dan deskripsi silabusnya (jika sudah diisi oleh Program Studi). Halaman ini bersifat
          read-only.
        </p>
      </section>

      <section id="lainnya" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 scroll-mt-4">
        <h2 class="text-headline-md font-semibold text-primary mb-3">Periodik &amp; Lain-Lain</h2>
        <p class="text-body-md text-on-surface-variant">
          Kedua menu ini masih dalam tahap pengembangan dan akan segera menyusul pada pembaruan berikutnya.
        </p>
      </section>
    </div>
  </div>
</template>
