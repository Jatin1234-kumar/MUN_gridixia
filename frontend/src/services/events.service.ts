import api from '@/lib/api';
import type { Event, ApiResponse } from '@/types';

export const eventsService = {
  getAll: async (): Promise<Event[]> => {
    const { data } = await api.get<ApiResponse<Event[]>>('/events');
    return data.data;
  },

  getById: async (id: string): Promise<Event> => {
    const { data } = await api.get<ApiResponse<Event>>(`/events/${id}`);
    return data.data;
  },

  create: async (payload: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'delegateCount'>): Promise<Event> => {
    const { data } = await api.post<ApiResponse<Event>>('/events', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<Event>): Promise<Event> => {
    const { data } = await api.patch<ApiResponse<Event>>(`/events/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};
