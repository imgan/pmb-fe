import { inject, type InjectionKey } from "vue";
import type { AxiosInstance } from "axios";
import { http } from "./http";
import { dosenHttp } from "./dosenHttp";
import { tahunAjaranApi } from "./tahunAjaran";
import type { TahunAjaran } from "@/types/entities";
import type { ApiResponse, ImportResult } from "@/types/common";
import type { AspekCpl, LevelPemetaan, MetodeBobot } from "./capaian";

/** Level baris Pemetaan CPMK: CPMK induk / Sub-CPMK. */
export type LevelPemetaanCpmk = "CPMK" | "SUB_CPMK";

/** RPS per mata kuliah (Matakuliah Aktif) — Pemetaan CPL & CPMK, Detail RPS, Rencana Pembelajaran & Evaluasi. */
export type BentukPembelajaran = 'LURING' | 'DARING' | 'HYBRID';
export const BENTUK_PEMBELAJARAN_LABEL: Record<BentukPembelajaran, string> = { LURING: 'Luring', DARING: 'Daring', HYBRID: 'Hybrid' };
export type JenisPertemuan = "KULIAH" | "PRAKTIKUM" | "UTS" | "UAS" | "LAINNYA";
export type MetodeEvaluasi =
  | "TUGAS_INDIVIDU"
  | "TUGAS_KELOMPOK"
  | "KUIS"
  | "UTS"
  | "UAS"
  | "PRAKTIKUM"
  | "PROYEK"
  | "PRESENTASI"
  | "PARTISIPASI"
  | "LAINNYA";

export const JENIS_PERTEMUAN_LABEL: Record<JenisPertemuan, string> = {
  KULIAH: "Kuliah",
  PRAKTIKUM: "Praktikum",
  UTS: "UTS",
  UAS: "UAS",
  LAINNYA: "Lainnya",
};
export const METODE_EVALUASI_LABEL: Record<MetodeEvaluasi, string> = {
  TUGAS_INDIVIDU: "TUGAS INDIVIDU",
  TUGAS_KELOMPOK: "TUGAS KELOMPOK",
  KUIS: "KUIS",
  UTS: "UTS",
  UAS: "UAS",
  PRAKTIKUM: "PRAKTIKUM",
  PROYEK: "PROYEK",
  PRESENTASI: "PRESENTASI",
  PARTISIPASI: "PARTISIPASI",
  LAINNYA: "LAINNYA",
};

export interface RpsMataKuliahInfo {
  id: number;
  kode: string;
  mataKuliah: string;
  mataKuliahEn: string | null;
  semester: number | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  sksTotal: number;
  jenisMataKuliah: "TEORI" | "PRAKTIK" | "TEORI_PRAKTIK" | null;
  kelompokMataKuliah: string | null;
  kelompokKurikulum: string | null;
  metodePembelajaran: string | null;
  isObe: boolean;
  targetCpl: number | null;
  targetCpmk: number | null;
  silabus: string | null;
  kurikulumId: number;
  kurikulum: string | null;
  tahunKurikulum: number | null;
  levelPemetaanCplMk: LevelPemetaan;
  levelPemetaanCpmk: LevelPemetaanCpmk;
  metodeBobotCpmk: MetodeBobot;
  kodeProdi: string | null;
  prodi: string | null;
  jenjang: string | null;
}

export interface RpsCpl {
  id: number;
  /** null = CPL; terisi = Indikator Kinerja (IK). */
  parentId: number | null;
  kode: string;
  aspek: AspekCpl | null;
  deskripsi: string;
}

export interface Cpmk {
  id: number;
  mataKuliahId: number;
  /** null = CPMK; terisi = Sub-CPMK. */
  parentId: number | null;
  kode: string;
  deskripsi: string;
  deskripsiEn: string | null;
}

export interface RpsDetail {
  mataKuliah: RpsMataKuliahInfo;
  cpl: RpsCpl[];
  /** CPL/IK yang dibebankan ke MK ini. */
  cplIds: number[];
  cpmk: Cpmk[];
  /** bobot = persen sel CPMK → CPL; total satu mata kuliah = 100. */
  cpmkCpl: { cpmkId: number; cplId: number; bobot: number }[];
  /** Tahun ajaran yang sudah berisi data RPS / rencana pembelajaran / evaluasi. */
  periodeIds: number[];
  /** Portal Dosen: hak akses dosen login pada RPS ini. */
  aksesDosen?: AksesRpsDosen;
}

export interface AksesRpsDosen {
  mengajar: boolean;
  koordinator: boolean;
  izinSetting: boolean;
  bisaUbah: boolean;
  alasan: string | null;
  tahunAjaran: { id: number; nama: string } | null;
}

export interface RpsInfo {
  deskripsi: string | null;
  bahanKajian: string | null;
  pustakaUtama: string | null;
  pustakaPendukung: string | null;
  mediaSoftware: string | null;
  mediaHardware: string | null;
  mkPrasyarat: string | null;
  dosenPengembang: string | null;
  koordinatorRmk: string | null;
  teamTeaching: string | null;
  tanggalPenyusunan: string | null;
}

export interface RpsPertemuan {
  id: number;
  tahunAjaranId: number;
  sesi: number;
  jenisPertemuan: JenisPertemuan;
  cpmkIds: number[];
  materi: string;
  materiEn: string | null;
  indikator: string | null;
  kriteriaPenilaian: string | null;
  /** Bentuk pembelajaran sesi: Luring / Daring / Hybrid. */
  bentukPembelajaran: BentukPembelajaran | null;
  metodePembelajaran: string | null;
  waktu: string | null;
  bobot: number | null;
  referensi: string | null;
}
export type RpsPertemuanPayload = Omit<RpsPertemuan, "id" | "tahunAjaranId"> & {
  tahunAjaranId?: number;
};

/** Baris rencana evaluasi: induk = metode evaluasi + bobot (% nilai akhir); parentId terisi = sub metode. */
export interface RpsEvaluasi {
  id: number;
  tahunAjaranId: number;
  parentId: number | null;
  urutan: number;
  metode: MetodeEvaluasi | null;
  jenisEvaluasi: string | null;
  bobot: number;
}

export interface RpsPeriode {
  rps: (RpsInfo & { id: number }) | null;
  pertemuan: RpsPertemuan[];
  evaluasi: RpsEvaluasi[];
  /** Nilai bobot tiap CPMK pada metode / sub metode evaluasi. */
  evaluasiCpmk: { rpsEvaluasiId: number; cpmkId: number; bobot: number }[];
}

export interface RpsMkOption {
  id: number;
  kode: string;
  mataKuliah: string;
  semester: number | null;
  tahunKurikulum: number | null;
}

/**
 * Klien RPS untuk Prodi (/prodi/rps, token staf) maupun portal Dosen (/dosen-portal/rps, token dosen) —
 * endpoint & komponen RPS sama; hak akses ditentukan backend.
 */
export const createRpsApi = (
  client: AxiosInstance,
  prefix: string,
  tahunAjaranList: () => Promise<TahunAjaran[]>,
) => {
  const http = client;
  const base = (mkId: number) => `${prefix}/${mkId}`;
  return {
    /** Pilihan periode ("Berlaku Sejak Periode"). */
    tahunAjaranList,
    async mataKuliahOptions(): Promise<RpsMkOption[]> {
      const { data } = await http.get<ApiResponse<RpsMkOption[]>>(
        `${prefix}/mata-kuliah`,
      );
      return data.data;
    },
    async detail(mkId: number): Promise<RpsDetail> {
      const { data } = await http.get<ApiResponse<RpsDetail>>(base(mkId));
      return data.data;
    },
    async periode(mkId: number, tahunAjaranId: number): Promise<RpsPeriode> {
      const { data } = await http.get<ApiResponse<RpsPeriode>>(
        `${base(mkId)}/periode/${tahunAjaranId}`,
      );
      return data.data;
    },
    async saveRps(mkId: number, tahunAjaranId: number, payload: RpsInfo) {
      await http.put(`${base(mkId)}/periode/${tahunAjaranId}`, payload);
    },
    async saveCpl(mkId: number, cplIds: number[]) {
      await http.put(`${base(mkId)}/cpl`, { cplIds });
    },
    async saveCpmk(
      mkId: number,
      payload: {
        kode: string;
        deskripsi: string;
        deskripsiEn: string | null;
        parentId?: number | null;
      },
      id?: number,
    ) {
      if (id) await http.put(`${base(mkId)}/cpmk/${id}`, payload);
      else await http.post(`${base(mkId)}/cpmk`, payload);
    },
    async removeCpmk(mkId: number, id: number) {
      await http.delete(`${base(mkId)}/cpmk/${id}`);
    },
    async salinCpmk(mkId: number, dariMataKuliahId: number): Promise<string> {
      const { data } = await http.post<ApiResponse<unknown>>(
        `${base(mkId)}/cpmk/salin`,
        { dariMataKuliahId },
      );
      return data.message;
    },
    /**
     * Simpan seluruh tabel Pemetaan CPMK: level & metode, daftar CPMK/Sub-CPMK (yang tidak dikirim dihapus)
     * dan sel CPMK → CPL berbobot. key = id lama (string) atau kunci sementara baris baru.
     */
    async savePemetaanCpmk(
      mkId: number,
      body: {
        level: LevelPemetaanCpmk;
        metode: MetodeBobot;
        cpmk: {
          key: string;
          id: number | null;
          parentKey: string | null;
          kode: string;
          deskripsi: string;
          deskripsiEn: string | null;
        }[];
        pairs: { cpmkKey: string; cplId: number; bobot: number | null }[];
      },
    ) {
      await http.put(`${base(mkId)}/pemetaan-cpmk`, body);
    },
    async savePertemuan(
      mkId: number,
      payload: RpsPertemuanPayload,
      id?: number,
    ) {
      if (id) await http.put(`${base(mkId)}/pertemuan/${id}`, payload);
      else await http.post(`${base(mkId)}/pertemuan`, payload);
    },
    /**
     * Simpan seluruh tabel Komponen Evaluasi satu periode (item lama yang tidak dikirim dihapus).
     * key = id lama (string) atau kunci sementara baris baru; cells = nilai CPMK pada baris daun.
     */
    async saveEvaluasi(
      mkId: number,
      tahunAjaranId: number,
      body: {
        items: {
          key: string;
          id: number | null;
          parentKey: string | null;
          metode: MetodeEvaluasi | null;
          jenisEvaluasi: string | null;
          bobot: number | null;
        }[];
        cells: { evalKey: string; cpmkId: number; bobot: number | null }[];
      },
    ) {
      await http.put(`${base(mkId)}/periode/${tahunAjaranId}/evaluasi`, body);
    },
    async remove(jenis: "pertemuan", mkId: number, id: number) {
      await http.delete(`${base(mkId)}/${jenis}/${id}`);
    },
    /** Salin rencana pembelajaran / evaluasi dari periode lain (MK ini atau MK lain). */
    async salin(
      jenis: "pertemuan" | "evaluasi",
      mkId: number,
      body: {
        dariMataKuliahId: number;
        dariTahunAjaranId: number;
        tahunAjaranId: number;
      },
    ): Promise<string> {
      const { data } = await http.post<ApiResponse<unknown>>(
        `${base(mkId)}/${jenis}/salin`,
        body,
      );
      return data.message;
    },
    async importPertemuan(
      mkId: number,
      tahunAjaranId: number,
      file: string,
    ): Promise<ImportResult> {
      const { data } = await http.post<ApiResponse<ImportResult>>(
        `${base(mkId)}/pertemuan/import`,
        { tahunAjaranId, file },
      );
      return data.data;
    },
    async templatePertemuan(): Promise<Blob> {
      const { data } = await http.get(`${prefix}/template-pertemuan`, {
        responseType: "blob",
      });
      return data;
    },
  };
};
export type RpsApi = ReturnType<typeof createRpsApi>;

export const rpsApi = createRpsApi(
  http,
  "/prodi/rps",
  async () => (await tahunAjaranApi.list({ limit: 100 })).data,
);
export const dosenRpsApi = createRpsApi(
  dosenHttp,
  "/dosen-portal/rps",
  async () =>
    (
      await dosenHttp.get<ApiResponse<TahunAjaran[]>>(
        "/dosen-portal/rps/tahun-ajaran",
      )
    ).data.data,
);

/** Halaman RPS menyediakan klien sesuai portal (provide); komponen RPS memakai useRpsApi(). */
export const RPS_API: InjectionKey<RpsApi> = Symbol("rpsApi");
export const useRpsApi = () => inject(RPS_API, rpsApi);
