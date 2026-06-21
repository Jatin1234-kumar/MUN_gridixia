import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Delegate } from '@/types';

const fetchDelegates = async (): Promise<Delegate[]> => {
  const { data } = await api.get<{ data: Delegate[] }>('/delegates');
  return data.data;
};

export const useDelegates = () =>
  useQuery({ queryKey: ['delegates'], queryFn: fetchDelegates });
