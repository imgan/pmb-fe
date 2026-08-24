import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { SyncFingerInsertResult, SyncFingerLog, SyncFingerMesin, SyncFingerPullResult } from '@/types/entities';

export const createSyncFingerApi = (mesin: SyncFingerMesin) => {
  const base = `/sync-finger-${mesin.toLowerCase()}`;

  return {
    async list(query?: ListQuery): Promise<ListResult<SyncFingerLog>> {
      const { data } = await http.get<ApiResponse<SyncFingerLog[]> & { meta: ListResult<SyncFingerLog>['meta'] }>(
        base,
        { params: query }
      );
      return { data: data.data, meta: data.meta };
    },

    async template(): Promise<Blob> {
      const { data } = await http.get(`${base}/template`, { responseType: 'blob' });
      return data;
    },

    async pull(file: string): Promise<SyncFingerPullResult> {
      const { data } = await http.post<ApiResponse<SyncFingerPullResult>>(`${base}/pull`, { file });
      return data.data;
    },

    async insert(): Promise<SyncFingerInsertResult> {
      const { data } = await http.post<ApiResponse<SyncFingerInsertResult>>(`${base}/insert`, {});
      return data.data;
    },
  };
};
