import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { delegateRepository } from '../repositories/delegate.repository';
import { committeeRepository } from '../repositories/committee.repository';
import { eventRepository } from '../repositories/event.repository';

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const [delegates, committees, events] = await Promise.all([
    delegateRepository.findAll(),
    committeeRepository.findAll(),
    eventRepository.findAll(),
  ]);

  const totalDelegates = delegates.length;
  const confirmedDelegates = delegates.filter((d) => d.status === 'confirmed').length;
  const pendingDelegates = delegates.filter((d) => d.status === 'pending').length;
  const waitlistedDelegates = delegates.filter((d) => d.status === 'waitlisted').length;

  const totalCapacity = committees.reduce(
    (sum: number, c: { capacity: number }) => sum + c.capacity,
    0,
  );
  const filledSeats = committees.reduce(
    (sum: number, c: { filledSeats: number }) => sum + c.filledSeats,
    0,
  );
  const occupancyRate = totalCapacity > 0 ? Math.round((filledSeats / totalCapacity) * 100) : 0;

  const activeEvents = events.filter((e) => e.status === 'active').length;
  const totalCommittees = committees.length;

  const committeeOccupancy = committees.map(
    (c: { name: string; abbr: string; filledSeats: number; capacity: number }) => ({
      name: c.name,
      abbr: c.abbr,
      delegates: c.filledSeats,
      capacity: c.capacity,
    }),
  );

  const recentDelegates = delegates
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      name: d.name,
      committee: d.committee,
      country: d.country,
      status: d.status,
      registeredAt: d.registeredAt,
    }));

  res.json({
    data: {
      metrics: {
        totalDelegates,
        confirmedDelegates,
        pendingDelegates,
        waitlistedDelegates,
        totalCapacity,
        filledSeats,
        occupancyRate,
        activeEvents,
        totalCommittees,
      },
      committeeOccupancy,
      recentDelegates,
    },
  });
});
