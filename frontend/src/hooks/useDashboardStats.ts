import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DashboardMetrics {
  totalDelegates: number;
  confirmedDelegates: number;
  pendingDelegates: number;
  waitlistedDelegates: number;
  totalCapacity: number;
  filledSeats: number;
  occupancyRate: number;
  activeEvents: number;
  totalCommittees: number;
}

export interface CommitteeOccupancy {
  name: string;
  abbr: string;
  delegates: number;
  capacity: number;
}

export interface RecentDelegate {
  id: string;
  name: string;
  committee: string;
  country: string;
  status: 'confirmed' | 'pending' | 'waitlisted';
  registeredAt: string;
}

export interface DashboardStats {
  metrics: DashboardMetrics;
  committeeOccupancy: CommitteeOccupancy[];
  recentDelegates: RecentDelegate[];
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<{ data: DashboardStats }>('/dashboard/stats');
  return data.data;
};

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });
