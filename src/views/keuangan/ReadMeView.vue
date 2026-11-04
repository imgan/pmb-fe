<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import PanduanDoc, { type PanduanBagian } from '@/components/PanduanDoc.vue';
import { bagianHakAkses } from '@/constants/panduanUmum';

/** Panduan modul Keuangan, disusun mengikuti urutan menu sidebar. */
const bagian: PanduanBagian[] = [
  {
    id: 'dashboard',
    judul: 'Dashboard',
    icon: 'dashboard',
    menu: [{ judul: 'Dashboard', to: 'keuangan-dashboard', ringkas: 'Ringkasan keuangan saat masuk ke modul.' }],
  },
  {
    id: 'master',
    judul: 'Master',
    icon: 'tune',
    menu: [
      { judul: 'Keringanan', to: 'keuangan-keringanan', ringkas: 'Izin sementara agar mahasiswa yang tertahan Batas Tagihan Akademik tetap bisa mengakses KRS, UTS, atau UAS. Berlaku bila Disetujui dan belum lewat Sampai tanggal. Tagihan tidak berkurang.' },
      { judul: 'Tarif TA/Skripsi', to: 'keuangan-tarif-ta-skripsi', ringkas: 'Tarif biaya tugas akhir/skripsi per periode dan prodi.' },
      { judul: 'Tarif Pembimbing', to: 'keuangan-tarif-pembimbing', ringkas: 'Tarif honor dosen pembimbing per periode dan prodi.' },
      { judul: 'Tarif Biaya Lain', to: 'keuangan-tarif-biaya-lain', ringkas: 'Tarif biaya lain-lain seperti sertifikasi dan pelatihan.' },
      { judul: 'Tarif Biaya Kuliah', to: 'keuangan-tarif-biaya-kuliah', ringkas: 'Tarif biaya kuliah per prodi, tahun angkatan, dan semester.' },
      {
        judul: 'Tagihan Mahasiswa',
        to: 'keuangan-generate-tagihan',
        ringkas: 'Tagihan kuliah per mahasiswa per semester, diimpor dari data keuangan (Excel).',
        catatan: ['Tombol yang tersedia: Import Tagihan, Import VA, Buat Cicilan, dan Export Excel.'],
      },
      { judul: 'Daftar Potongan', to: 'keuangan-daftar-potongan', ringkas: 'Daftar potongan biaya kuliah mahasiswa.' },
      { judul: 'Batas Tagihan Akademik', to: 'keuangan-batas-tagihan-akademik', ringkas: 'Alur cekal per prodi: minimal persentase tagihan terbayar untuk mengisi KRS, mengikuti UTS, dan melihat nilai.' },
    ],
  },
  {
    id: 'transaksi',
    judul: 'Transaksi',
    icon: 'payments',
    menu: [
      { judul: 'Pembayaran Sertifikasi', to: 'keuangan-pembayaran-sertifikasi', ringkas: 'Transaksi pembayaran sertifikasi mahasiswa.' },
      { judul: 'Voc Ujian', to: 'keuangan-voc-ujian', ringkas: 'Transaksi pembayaran honor ujian dosen.' },
      { judul: 'Pembayaran SP', to: 'keuangan-pembayaran-sp', ringkas: 'Transaksi pembayaran SP mahasiswa.' },
      { judul: 'Voc SP', to: 'keuangan-voc-sp', ringkas: 'Verifikasi pembayaran SP mahasiswa.' },
      { judul: 'Pembayaran Kuliah', to: 'keuangan-pembayaran-kuliah', ringkas: 'Transaksi pembayaran biaya kuliah mahasiswa melalui tombol Bayar.' },
      { judul: 'Pembayaran TA/Skripsi', to: 'keuangan-pembayaran-ta-skripsi', ringkas: 'Tagihan dan pembayaran TA/Skripsi, polanya sama dengan Pembayaran Wisuda. Generate Tagihan membuat tagihan dari biaya pendaftaran Master Tarif TA/Skripsi (sesuai prodi dan Tahun TA/Skripsi terpilih) untuk mahasiswa aktif semester 5 ke atas; prodi yang belum punya tarif dilewati. Generate ulang menimpa tagihan lama yang belum lunas. Pembayaran hanya bisa dicatat setelah tagihan dibuat, boleh dicicil sampai lunas, dan bisa diberi jadwal cicilan bulanan. Cicilan yang lewat jatuh tempo membuat mahasiswa berstatus menunggak, dan sisanya tampil pada kolom Sisa TA/Skripsi di Laporan Tunggakan.' },
      { judul: 'Perpanjangan TA/Skripsi', to: 'keuangan-perpanjangan-ta-skripsi', ringkas: 'Transaksi pembayaran perpanjangan masa tugas akhir/skripsi.' },
      { judul: 'Pembayaran Wisuda', to: 'keuangan-pembayaran-wisuda', ringkas: 'Tagihan dan pembayaran wisuda. Generate Tagihan membuat tagihan dari Tarif Biaya Lain berkode awalan W (mis. W2026) untuk mahasiswa aktif semester 5 ke atas. Generate ulang menimpa tagihan lama dengan tarif terpilih, kecuali yang sudah lunas. Pembayaran hanya bisa dicatat setelah tagihan dibuat, jenisnya mengikuti tagihan, dan boleh dicicil sampai lunas. Sisa tagihan tampil pada kolom Sisa Wisuda di Laporan Tunggakan dan Tunggakan Mahasiswa.' },
    ],
  },
  {
    id: 'laporan',
    judul: 'Laporan',
    icon: 'summarize',
    menu: [
      { judul: 'Tunggakan Mahasiswa', to: 'keuangan-laporan-tunggakan-mahasiswa', ringkas: 'Rekap total tunggakan mahasiswa. Filter Status: Menunggak (ada utang semester lalu, tunggakan lain, atau lewat jatuh tempo) dan Belum Lunas (masih ada sisa tagihan tetapi tidak menunggak).' },
      { judul: 'Laporan Uang Kuliah', to: 'keuangan-laporan-uang-kuliah', ringkas: 'Rekap tagihan, pembayaran, dan tunggakan uang kuliah per program studi.' },
      { judul: 'Laporan Lain', to: 'keuangan-laporan-lain', ringkas: 'Laporan keuangan lainnya.' },
      { judul: 'Laporan Bebas Tunggakan', to: 'keuangan-laporan-bebas-tunggakan', ringkas: 'Mahasiswa yang tagihannya lunas dan tanpa tunggakan lain.' },
      { judul: 'Laporan Tunggakan', to: 'keuangan-laporan-tunggakan', ringkas: 'Rekap tunggakan seluruh mahasiswa per program studi.' },
      { judul: 'Laporan Sertifikasi', to: 'keuangan-laporan-sertifikasi', ringkas: 'Rekap pembayaran sertifikasi per jenis pembayaran.' },
      { judul: 'Laporan KTI/Skripsi', to: 'keuangan-laporan-kti-skripsi', ringkas: 'Rekap pembayaran KTI/Skripsi mahasiswa.' },
      { judul: 'Laporan Semester Pendek', to: 'keuangan-laporan-semester-pendek', ringkas: 'Rekap pembayaran semester pendek mahasiswa.' },
    ],
  },
  {
    id: 'audit',
    judul: 'Audit Log',
    icon: 'history',
    menu: [{ judul: 'Audit Log', to: 'keuangan-audit-log', ringkas: 'Riwayat tambah, ubah, hapus, dan login. Bisa disaring dan diekspor ke CSV.' }],
  },
  bagianHakAkses('Keuangan'),
];
</script>

<template>
  <div>
    <PageHeader title="ReadMe" subtitle="Panduan setiap menu modul Keuangan, mengikuti urutan sidebar." />
    <PanduanDoc :bagian="bagian" />
  </div>
</template>
