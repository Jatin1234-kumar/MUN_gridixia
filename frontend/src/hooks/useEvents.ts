import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Event } from '@/types';

const fetchEvents = async (): Promise<Event[]> => {
  const { data } = await api.get<{ data: Event[] }>('/events');
  return data.data;
};

export const useEvents = () =>
  useQuery({ queryKey: ['events'], queryFn: fetchEvents });
