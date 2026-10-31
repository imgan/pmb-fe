import type { PesertaBiodata } from '@/types/entities';

/** State form biodata peserta (admin) — dipakai PesertaBiodataFields di panel detail & form Tambah/Ubah Peserta. */
export const biodataKosong = () => ({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '' as 'L' | 'P' | '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  nik: '',
  namaIbuKandung: '',
  jalan: '',
  rt: '',
  rw: '',
  desaKelurahan: '',
  provinsi: '',
  kabupaten: '',
  kecamatan: '',
  kodePos: '',
  noWhatsapp: '',
  // Data Pendidikan (opsional)
  jurusanSekolah: '',
  tahunLulus: '',
  jenisPengelolaanSekolah: '',
  alamatSekolah: '',
  nisn: '',
});

export type BiodataForm = ReturnType<typeof biodataKosong>;

export const isiBiodataForm = (form: BiodataForm, biodata: PesertaBiodata | null | undefined, noWhatsappAwal = '') => {
  Object.assign(form, biodataKosong());
  if (!biodata) {
    form.noWhatsapp = noWhatsappAwal;
    return;
  }
  (Object.keys(form) as (keyof BiodataForm)[]).forEach((k) => {
    const v = biodata[k];
    if (typeof v === 'string') (form as Record<string, string>)[k] = k === 'tanggalLahir' ? v.slice(0, 10) : v;
  });
  // Biodata yang baru berisi data pendidikan: no. WhatsApp masih kosong.
  if (!form.noWhatsapp) form.noWhatsapp = noWhatsappAwal;
};

// Diabaikan: kewarganegaraan & no. WhatsApp punya nilai awal; data pendidikan bisa diisi terpisah (popup Data Pendidikan).
const ABAIKAN = new Set<keyof BiodataForm>(['kewarganegaraan', 'noWhatsapp', 'jurusanSekolah', 'tahunLulus', 'jenisPengelolaanSekolah', 'alamatSekolah', 'nisn']);

/** true bila admin belum mengisi biodata pribadi apa pun. */
export const biodataBelumDiisi = (form: BiodataForm) => (Object.keys(form) as (keyof BiodataForm)[]).every((k) => ABAIKAN.has(k) || !String(form[k]).trim());

const WAJIB: [keyof BiodataForm, string][] = [
  ['tempatLahir', 'Tempat lahir'],
  ['tanggalLahir', 'Tanggal lahir'],
  ['jenisKelamin', 'Jenis kelamin'],
  ['agama', 'Agama'],
  ['kewarganegaraan', 'Kewarganegaraan'],
  ['noWhatsapp', 'No. WhatsApp'],
];

/** Isi `errors` (key = nama field); true bila valid. */
export const validasiBiodata = (form: BiodataForm, errors: Record<string, string>) => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  WAJIB.forEach(([k, label]) => {
    if (!String(form[k]).trim()) errors[k] = `${label} wajib diisi`;
  });
  if (!/^\d{16}$/.test(form.nik.trim())) errors.nik = 'NIK harus 16 digit angka';
  if (form.tahunLulus.trim() && !/^\d{4}$/.test(form.tahunLulus.trim())) errors.tahunLulus = 'Tahun lulus harus 4 digit';
  if (form.nisn.trim() && !/^\d{10}$/.test(form.nisn.trim())) errors.nisn = 'NISN harus 10 digit angka';
  return Object.keys(errors).length === 0;
};

export const biodataPayload = (form: BiodataForm, isAgree = true): Omit<PesertaBiodata, 'id' | 'pesertaId' | 'isLocked'> => ({
  ...(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()])) as Record<keyof BiodataForm, string>),
  jenisKelamin: form.jenisKelamin as 'L' | 'P',
  isAgree,
});
