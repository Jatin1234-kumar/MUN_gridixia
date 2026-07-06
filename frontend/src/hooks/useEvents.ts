import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Event } from '@/types';

const fetchEvents = async (): Promise<Event[]> => {
  const { data } = await api.get<{ data: Event[] }>('/events');
  return data.data;
};

export const useEvents = () =>
  useQuery({ queryKey: ['events'], queryFn: fetchEvents });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<{ data: Event }>('/events', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};
