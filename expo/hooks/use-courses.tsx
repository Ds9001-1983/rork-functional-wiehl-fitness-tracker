import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export type ScheduleItem = Awaited<ReturnType<typeof trpcClient.courses.customer.getSchedule.query>>['items'][number];
export type MyBookingsResult = Awaited<ReturnType<typeof trpcClient.courses.customer.myBookings.query>>;

interface CoursesState {
  schedule: ScheduleItem[];
  isBlocked: boolean;
  noShowCount: number;
  noShowLimit: number;
  myBookings: MyBookingsResult | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  book: (instanceId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<{ lateCancelled: boolean }>;
  joinWaitlist: (instanceId: string) => Promise<void>;
  leaveWaitlist: (instanceId: string) => Promise<void>;
}

export const [CoursesProvider, useCourses] = createContextHook<CoursesState>(() => {
  const { user, isAuthenticated } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [noShowCount, setNoShowCount] = useState(0);
  const [noShowLimit, setNoShowLimit] = useState(3);
  const [myBookings, setMyBookings] = useState<MyBookingsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'client') {
      setSchedule([]); setMyBookings(null); setIsBlocked(false); setNoShowCount(0);
      setIsLoading(false); return;
    }
    setIsLoading(true);
    try {
      const [sched, mb] = await Promise.all([
        trpcClient.courses.customer.getSchedule.query(),
        trpcClient.courses.customer.myBookings.query({ includeHistory: false }),
      ]);
      setSchedule(sched.items);
      setIsBlocked(sched.isBlocked);
      setNoShowCount(sched.noShowCount);
      setNoShowLimit(sched.noShowLimit);
      setMyBookings(mb);
    } catch (err) {
      console.log('[Courses] refresh failed', err);
    } finally { setIsLoading(false); }
  }, [isAuthenticated, user?.role]);

  useEffect(() => { refresh(); }, [refresh]);

  const book = useCallback(async (instanceId: string) => {
    await trpcClient.courses.customer.book.mutate({ instance_id: instanceId });
    await refresh();
  }, [refresh]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    const res = await trpcClient.courses.customer.cancelMyBooking.mutate({ id: bookingId });
    await refresh();
    return { lateCancelled: res.lateCancelled };
  }, [refresh]);

  const joinWaitlist = useCallback(async (instanceId: string) => {
    await trpcClient.courses.customer.joinWaitlist.mutate({ instance_id: instanceId });
    await refresh();
  }, [refresh]);

  const leaveWaitlist = useCallback(async (instanceId: string) => {
    await trpcClient.courses.customer.leaveWaitlist.mutate({ instance_id: instanceId });
    await refresh();
  }, [refresh]);

  return useMemo(() => ({
    schedule, isBlocked, noShowCount, noShowLimit, myBookings, isLoading,
    refresh, book, cancelBooking, joinWaitlist, leaveWaitlist,
  }), [schedule, isBlocked, noShowCount, noShowLimit, myBookings, isLoading, refresh, book, cancelBooking, joinWaitlist, leaveWaitlist]);
});
