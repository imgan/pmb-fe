import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';
import type { Dosen } from '@/types/entities';

export interface DosenLoginPayload {
  nidn?: string;
  email?: string;
  password: string;
}

export interface DosenLoginResult {
  dosen: Dosen;
  accessToken: string;
}

export const dosenAuthApi = {
  async login(payload: DosenLoginPayload): Promise<DosenLoginResult> {
    const { data } = await dosenHttp.post<ApiResponse<DosenLoginResult>>('/dosen-portal/login', payload);
    return data.data;
  },
  async me(): Promise<Dosen> {
    const { data } = await dosenHttp.get<ApiResponse<Dosen>>('/dosen-portal/me');
    return data.data;
  },
};
