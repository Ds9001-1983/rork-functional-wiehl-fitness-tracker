import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    xp: z.number().min(0).max(10000000),
    level: z.number().min(1).max(1000),
    badges: z.array(z.object({
      id: z.string().max(100),
      unlockedAt: z.string().optional(),
    })).max(100),
    currentStreak: z.number().min(0).max(99999),
    longestStreak: z.number().min(0).max(99999),
    streakFreezes: z.number().min(0).max(100),
    streakFreezesUsed: z.array(z.string()).max(100),
    lastActiveDate: z.string(),
    coachingTone: z.string().max(50).optional(),
  }))
  .mutation(async ({ input }) => {
    // Check existing data for badge/level changes before sync
    const existing = await storage.gamification.get(input.userId);
    const oldLevel = existing?.level || 1;
    const oldBadgeCount = existing?.badges?.length || 0;

    await storage.gamification.sync(input.userId, input);

    // Create notifications for level-ups
    if (input.level > oldLevel) {
      await storage.notifications.create({
        userId: input.userId,
        title: 'Level Up!',
        body: `Du hast Level ${input.level} erreicht!`,
        type: 'level',
      });
    }

    // Create notifications for new badges
    if (input.badges.length > oldBadgeCount) {
      const newCount = input.badges.length - oldBadgeCount;
      await storage.notifications.create({
        userId: input.userId,
        title: 'Neues Badge freigeschaltet!',
        body: `Du hast ${newCount} neue${newCount > 1 ? ' Badges' : 's Badge'} erhalten.`,
        type: 'badge',
      });
    }

    // Create notifications for streak milestones (7, 14, 30, 60, 100)
    const streakMilestones = [7, 14, 30, 60, 100];
    if (streakMilestones.includes(input.currentStreak) && input.currentStreak > (existing?.currentStreak || 0)) {
      await storage.notifications.create({
        userId: input.userId,
        title: `${input.currentStreak}-Tage-Streak!`,
        body: `Unglaublich! Du trainierst seit ${input.currentStreak} Tagen in Folge.`,
        type: 'streak',
      });
    }

    return { success: true };
  });
