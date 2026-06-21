import api from '@/lib/api';
import type { Delegate, ApiResponse } from '@/types';

export const delegatesService = {
  getAll: async (): Promise<Delegate[]> => {
    const { data } = await api.get<ApiResponse<Delegate[]>>('/delegates');
    return data.data;
  },

  getById: async (id: string): Promise<Delegate> => {
    const { data } = await api.get<ApiResponse<Delegate>>(`/delegates/${id}`);
    return data.data;
  },

  create: async (payload: Omit<Delegate, 'id'>): Promise<Delegate> => {
    const { data } = await api.post<ApiResponse<Delegate>>('/delegates', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<Delegate>): Promise<Delegate> => {
    const { data } = await api.patch<ApiResponse<Delegate>>(`/delegates/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/delegates/${id}`);
  },
};
