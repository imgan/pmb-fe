import type { PanduanBagian } from '@/components/PanduanDoc.vue';

/** Bagian penutup panduan konsol staf: hak akses menu berlaku sama di semua modul yang sidebarnya dari database. */
export const bagianHakAkses = (modul: string): PanduanBagian => ({
  id: 'hak-akses',
  judul: 'Hak Akses (Permission)',
  icon: 'lock',
  menu: [
    {
      judul: 'Izin per Menu',
      ringkas: `Setiap menu modul ${modul} memiliki izin Lihat, Tambah, Ubah, dan Hapus yang diatur per role di modul Admin → Role Management.`,
      catatan: [
        'Tanpa izin Lihat, menu tidak muncul di sidebar dan halamannya menolak akses.',
        'Tombol tambah, ubah, dan hapus hanya muncul sesuai izin role Anda.',
        'Butuh akses tambahan? Hubungi Superadmin.',
      ],
    },
  ],
});
