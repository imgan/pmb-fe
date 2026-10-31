import { MENU, type MenuCode } from './menuCodes';

/**
 * Menu Feeder PDDIKTI (modul SIM). Satu halaman generik (FeederEntityView) melayani semua
 * entitas; kolom, form & aksi diambil dari backend (/sim/feeder/:key/meta). Daftar ini hanya
 * memetakan path -> menu code untuk route & hak akses.
 */
export const FEEDER_ENTITIES: { key: string; menuCode: MenuCode }[] = [
  // Perkuliahan
  { key: 'matakuliah', menuCode: MENU.SIM_FEEDER_MATAKULIAH_MANAGEMENT },
  { key: 'mahasiswa', menuCode: MENU.SIM_FEEDER_MAHASISWA_MANAGEMENT },
  { key: 'kelas', menuCode: MENU.SIM_FEEDER_KELAS_MANAGEMENT },
  { key: 'krs', menuCode: MENU.SIM_FEEDER_KRS_MANAGEMENT },
  { key: 'dosen-ajar', menuCode: MENU.SIM_FEEDER_DOSEN_AJAR_MANAGEMENT },
  { key: 'nilai', menuCode: MENU.SIM_FEEDER_NILAI_MANAGEMENT },
  { key: 'akm', menuCode: MENU.SIM_FEEDER_AKM_MANAGEMENT },
  { key: 'kelulusan', menuCode: MENU.SIM_FEEDER_KELULUSAN_MANAGEMENT },
  { key: 'nilai-transfer', menuCode: MENU.SIM_FEEDER_NILAI_TRANSFER_MANAGEMENT },
  // Aktivitas
  { key: 'aktivitas-ta', menuCode: MENU.SIM_FEEDER_AKTIVITAS_TA_MANAGEMENT },
  { key: 'peserta-ta', menuCode: MENU.SIM_FEEDER_PESERTA_TA_MANAGEMENT },
  { key: 'pembimbing-ta', menuCode: MENU.SIM_FEEDER_PEMBIMBING_TA_MANAGEMENT },
  { key: 'penguji-ta', menuCode: MENU.SIM_FEEDER_PENGUJI_TA_MANAGEMENT },
  { key: 'aktivitas-kkp', menuCode: MENU.SIM_FEEDER_AKTIVITAS_KKP_MANAGEMENT },
  { key: 'peserta-kkp', menuCode: MENU.SIM_FEEDER_PESERTA_KKP_MANAGEMENT },
  { key: 'pembimbing-kkp', menuCode: MENU.SIM_FEEDER_PEMBIMBING_KKP_MANAGEMENT },
  { key: 'aktivitas-pa', menuCode: MENU.SIM_FEEDER_AKTIVITAS_PA_MANAGEMENT },
  { key: 'peserta-pa', menuCode: MENU.SIM_FEEDER_PESERTA_PA_MANAGEMENT },
  { key: 'pembimbing-pa', menuCode: MENU.SIM_FEEDER_PEMBIMBING_PA_MANAGEMENT },
];
