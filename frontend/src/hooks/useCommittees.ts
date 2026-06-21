import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Committee } from '@/types';

const fetchCommittees = async (): Promise<Committee[]> => {
  const { data } = await api.get<{ data: Committee[] }>('/committees');
  return data.data;
};

export const useCommittees = () =>
  useQuery({ queryKey: ['committees'], queryFn: fetchCommittees });
