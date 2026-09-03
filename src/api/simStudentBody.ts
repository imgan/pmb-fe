import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { StudentBodyGroup } from '@/types/entities';

export const simStudentBodyApi = {
  async list(): Promise<StudentBodyGroup[]> {
    const { data } = await http.get<ApiResponse<StudentBodyGroup[]>>('/sim/student-body');
    return data.data;
  },
};
