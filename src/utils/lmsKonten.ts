import type { JenisKonten, TargetKonten } from '@/api/elearning';

/** Label, ikon & warna jenis konten e-learning (konsol LMS). */
export const JENIS_KONTEN: Record<JenisKonten, { label: string; icon: string; kelas: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', kelas: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { label: 'Video', icon: 'smart_display', kelas: 'bg-[#d83b3b]/10 text-[#a32020]' },
  KUIS: { label: 'Kuis', icon: 'quiz', kelas: 'bg-[#7c3aed]/10 text-[#5b21b6]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', kelas: 'bg-[#d97706]/12 text-[#92400e]' },
};

export const TARGET_KONTEN: Record<TargetKonten, string> = {
  SEMUA: 'Seluruh kelas',
  PILIHAN: 'Mahasiswa tertentu',
  KAMPUS: 'Seluruh kampus',
  GRUP: 'Per grup',
};

export const teksPersen = (v: number | null | undefined) => (v == null ? '–' : `${Number.isInteger(v) ? v : v.toFixed(1)}%`);
export const teksAngka = (v: number | null | undefined) => (v == null ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Warna batang progres sesuai capaian. */
export const warnaProgres = (v: number | null | undefined) => (v == null ? 'bg-outline-variant' : v >= 75 ? 'bg-[#059669]' : v >= 40 ? 'bg-[#d97706]' : 'bg-[#d83b3b]');

export const waktuRelatif = (iso: string | null | undefined) => {
  if (!iso) return '–';
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return hari < 30 ? `${hari} hari lalu` : new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const teksDurasi = (detik: number) => {
  if (!detik) return '–';
  const m = Math.floor(detik / 60);
  return m >= 60 ? `${Math.floor(m / 60)} jam ${m % 60} mnt` : m ? `${m} mnt ${detik % 60} dtk` : `${detik} dtk`;
};
