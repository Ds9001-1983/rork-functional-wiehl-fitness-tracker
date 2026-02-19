import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Workout } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';
import { syncQueue } from '@/lib/sync-queue';
import {
  UserGamification,
  UserBadge,
  XP_REWARDS,
  getLevelForXP,
  getXPForNextLevel,
  MAX_STREAK_FREEZES,
  LEVEL_NAMES,
} from '@/types/gamification';
import { badges } from '@/data/badges';
import { exercises as exerciseDb } from '@/data/exercises';

const STORAGE_KEY = 'gamification';
const DEFAULT_TONE = 'motivator';

interface GamificationState {
  gamification: UserGamification;
  unlockedBadges: Array<{ badgeId: string; unlockedAt: string }>;
  level: number;
  levelName: string;
  xpProgress: { current: number; needed: number; progress: number };
  allBadges: typeof badges;
  coachingTone: string;
  setCoachingTone: (tone: string) => void;
  processWorkoutComplete: (workout: Workout, allWorkouts: Workout[], personalRecordCount: number) => Promise<string[]>;
  useStreakFreeze: () => Promise<boolean>;
  recalculateFromWorkouts: (workouts: Workout[], currentUserId: string) => Promise<void>;
}

function getUniqueDates(workouts: Workout[]): string[] {
  return [...new Set(
    workouts
      .filter(w => w.completed)
      .map(w => new Date(w.date).toISOString().split('T')[0])
  )].sort();
}

function calculateStreak(workouts: Workout[], freezeDates: string[] = []): { current: number; longest: number } {
  const dates = getUniqueDates(workouts);
  if (dates.length === 0) return { current: 0, longest: 0 };

  const allDates = new Set([...dates, ...freezeDates]);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Current streak
  let current = 0;
  let checkDate = allDates.has(today) ? new Date() : allDates.has(yesterday) ? new Date(yesterday) : null;
  if (checkDate) {
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (allDates.has(dateStr)) {
        current++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 0;
  let streak = 1;
  const sortedDates = [...allDates].sort();
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { current, longest: Math.max(longest, current) };
}

function calculateTotalVolume(workouts: Workout[]): number {
  return workouts
    .filter(w => w.completed)
    .reduce((total, workout) =>
      total + workout.exercises.reduce((wTotal, exercise) =>
        wTotal + exercise.sets.reduce((eTotal, set) =>
          eTotal + (set.completed ? set.weight * set.reps : 0), 0), 0), 0);
}

function checkEarlyBird(workouts: Workout[]): number {
  return workouts.filter(w => {
    const hour = new Date(w.date).getHours();
    return w.completed && hour < 7;
  }).length;
}

function checkNightOwl(workouts: Workout[]): number {
  return workouts.filter(w => {
    const hour = new Date(w.date).getHours();
    return w.completed && hour >= 21;
  }).length;
}

function checkWeekStreak(workouts: Workout[]): number {
  const completed = workouts.filter(w => w.completed);
  if (completed.length === 0) return 0;

  // Group by week (ISO week)
  const weekMap: Record<string, number> = {};
  for (const w of completed) {
    const d = new Date(w.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
    const key = weekStart.toISOString().split('T')[0];
    weekMap[key] = (weekMap[key] || 0) + 1;
  }

  // Count consecutive weeks with >= 3 workouts
  const weeks = Object.entries(weekMap)
    .filter(([, count]) => count >= 3)
    .map(([date]) => date)
    .sort();

  if (weeks.length === 0) return 0;

  let maxConsecutive = 1;
  let consecutive = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1]);
    const curr = new Date(weeks[i]);
    const diff = (curr.getTime() - prev.getTime()) / (7 * 86400000);
    if (Math.abs(diff - 1) < 0.1) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }

  return maxConsecutive;
}

function evaluateBadges(
  workouts: Workout[],
  streakData: { current: number; longest: number },
  personalRecordCount: number,
  existingBadges: UserBadge[],
): UserBadge[] {
  const completedWorkouts = workouts.filter(w => w.completed);
  const totalVolume = calculateTotalVolume(workouts);
  const earlyBirdCount = checkEarlyBird(workouts);
  const nightOwlCount = checkNightOwl(workouts);
  const weekStreakCount = checkWeekStreak(workouts);
  const existingIds = new Set(existingBadges.map(b => b.badgeId));

  const newBadges: UserBadge[] = [...existingBadges];

  for (const badge of badges) {
    if (existingIds.has(badge.id)) continue;

    let earned = false;
    const { type, threshold } = badge.criteria;

    switch (type) {
      case 'workout_count':
        earned = completedWorkouts.length >= threshold;
        break;
      case 'streak':
        earned = streakData.longest >= threshold;
        break;
      case 'total_volume_kg':
        earned = totalVolume >= threshold;
        break;
      case 'personal_record_count':
        earned = personalRecordCount >= threshold;
        break;
      case 'early_bird':
        earned = earlyBirdCount >= threshold;
        break;
      case 'night_owl':
        earned = nightOwlCount >= threshold;
        break;
      case 'week_streak':
        earned = weekStreakCount >= threshold;
        break;
    }

    if (earned) {
      newBadges.push({ badgeId: badge.id, unlockedAt: new Date().toISOString() });
    }
  }

  return newBadges;
}

export const [GamificationProvider, useGamification] = createContextHook<GamificationState>(() => {
  const [gamification, setGamification] = useState<UserGamification>({
    xp: 0,
    level: 1,
    badges: [],
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: MAX_STREAK_FREEZES,
    streakFreezesUsed: [],
    lastActiveDate: '',
  });
  const [coachingTone, setCoachingToneState] = useState<string>(DEFAULT_TONE);

  // Load from server first, then AsyncStorage fallback
  useEffect(() => {
    (async () => {
      try {
        const [stored, tone] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem('coachingTone'),
        ]);
        if (stored) setGamification(JSON.parse(stored));
        if (tone) setCoachingToneState(tone);

        // Try loading from server (overrides local if server has data)
        const userId = await AsyncStorage.getItem('user').then(u => u ? JSON.parse(u).id : null);
        if (userId) {
          try {
            const serverData = await trpcClient.gamification.get.query({ userId });
            if (serverData && serverData.xp > 0) {
              const merged: UserGamification = {
                xp: serverData.xp,
                level: serverData.level,
                badges: serverData.badges || [],
                currentStreak: serverData.currentStreak,
                longestStreak: serverData.longestStreak,
                streakFreezes: serverData.streakFreezes,
                streakFreezesUsed: serverData.streakFreezesUsed || [],
                lastActiveDate: serverData.lastActiveDate || '',
              };
              setGamification(merged);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              if (serverData.coachingTone) {
                setCoachingToneState(serverData.coachingTone);
                await AsyncStorage.setItem('coachingTone', serverData.coachingTone);
              }
            }
          } catch {
            // Server unavailable, use local data
          }
        }
      } catch {
        // Use defaults
      }
    })();
  }, []);

  const save = useCallback(async (data: UserGamification) => {
    setGamification(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Sync to server in background
    try {
      const userId = await AsyncStorage.getItem('user').then(u => u ? JSON.parse(u).id : null);
      if (userId) {
        const syncInput = {
          userId,
          xp: data.xp,
          level: data.level,
          badges: data.badges,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          streakFreezes: data.streakFreezes,
          streakFreezesUsed: data.streakFreezesUsed,
          lastActiveDate: data.lastActiveDate,
          coachingTone: coachingTone,
        };
        trpcClient.gamification.sync.mutate(syncInput).catch(() => {
          syncQueue.enqueue('gamification.sync', syncInput);
        });
      }
    } catch {}
  }, [coachingTone]);

  const setCoachingTone = useCallback(async (tone: string) => {
    setCoachingToneState(tone);
    await AsyncStorage.setItem('coachingTone', tone);
  }, []);

  const processWorkoutComplete = useCallback(async (
    workout: Workout,
    allWorkouts: Workout[],
    personalRecordCount: number,
  ): Promise<string[]> => {
    const notifications: string[] = [];
    let xpGained = 0;

    // Base XP for completing workout
    const isFirst = allWorkouts.filter(w => w.completed).length <= 1;
    xpGained += isFirst ? XP_REWARDS.FIRST_WORKOUT : XP_REWARDS.WORKOUT_COMPLETE;

    // XP per completed set
    const completedSets = workout.exercises.reduce(
      (total, ex) => total + ex.sets.filter(s => s.completed).length, 0
    );
    xpGained += completedSets * XP_REWARDS.SET_COMPLETE;

    // Streak calculation
    const streakData = calculateStreak(allWorkouts, gamification.streakFreezesUsed);
    xpGained += streakData.current * XP_REWARDS.STREAK_BONUS_PER_DAY;

    // Check for new badges
    const newBadges = evaluateBadges(allWorkouts, streakData, personalRecordCount, gamification.badges);
    const newlyEarned = newBadges.filter(
      b => !gamification.badges.some(existing => existing.badgeId === b.badgeId)
    );
    xpGained += newlyEarned.length * XP_REWARDS.BADGE_UNLOCK;

    // Add badge notifications
    for (const earned of newlyEarned) {
      const badge = badges.find(b => b.id === earned.badgeId);
      if (badge) {
        notifications.push(`${badge.icon} ${badge.name}: ${badge.description}`);
      }
    }

    // Calculate new XP and level
    const totalXP = gamification.xp + xpGained;
    const oldLevel = gamification.level;
    const newLevel = getLevelForXP(totalXP);

    if (newLevel > oldLevel) {
      notifications.push(`Level ${newLevel}: ${LEVEL_NAMES[newLevel] || 'Level ' + newLevel} erreicht!`);
    }

    // Reset streak freezes weekly
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const freezesThisWeek = gamification.streakFreezesUsed.filter(d => d >= weekStartStr).length;
    const availableFreezes = MAX_STREAK_FREEZES - freezesThisWeek;

    const updated: UserGamification = {
      xp: totalXP,
      level: newLevel,
      badges: newBadges,
      currentStreak: streakData.current,
      longestStreak: streakData.longest,
      streakFreezes: availableFreezes,
      streakFreezesUsed: gamification.streakFreezesUsed,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };

    await save(updated);

    if (xpGained > 0) {
      notifications.unshift(`+${xpGained} XP`);
    }

    return notifications;
  }, [gamification, save]);

  const useStreakFreeze = useCallback(async (): Promise<boolean> => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const freezesThisWeek = gamification.streakFreezesUsed.filter(d => d >= weekStartStr).length;

    if (freezesThisWeek >= MAX_STREAK_FREEZES) return false;

    const today = now.toISOString().split('T')[0];
    const updated: UserGamification = {
      ...gamification,
      streakFreezesUsed: [...gamification.streakFreezesUsed, today],
      streakFreezes: MAX_STREAK_FREEZES - freezesThisWeek - 1,
    };

    await save(updated);
    return true;
  }, [gamification, save]);

  const recalculateFromWorkouts = useCallback(async (workouts: Workout[], currentUserId: string) => {
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);
    const streakData = calculateStreak(userWorkouts, gamification.streakFreezesUsed);

    // Count personal records
    const records: Record<string, number> = {};
    for (const workout of userWorkouts) {
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight > 0) {
            const current = records[exercise.exerciseId] || 0;
            if (set.weight > current) records[exercise.exerciseId] = set.weight;
          }
        }
      }
    }
    const personalRecordCount = Object.keys(records).length;

    // Recalculate XP
    let xp = 0;
    for (const w of userWorkouts) {
      xp += XP_REWARDS.WORKOUT_COMPLETE;
      const sets = w.exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0);
      xp += sets * XP_REWARDS.SET_COMPLETE;
    }
    if (userWorkouts.length > 0) xp += XP_REWARDS.FIRST_WORKOUT - XP_REWARDS.WORKOUT_COMPLETE; // first workout bonus

    const newBadges = evaluateBadges(userWorkouts, streakData, personalRecordCount, []);
    xp += newBadges.length * XP_REWARDS.BADGE_UNLOCK;

    const level = getLevelForXP(xp);

    const updated: UserGamification = {
      xp,
      level,
      badges: newBadges,
      currentStreak: streakData.current,
      longestStreak: streakData.longest,
      streakFreezes: gamification.streakFreezes,
      streakFreezesUsed: gamification.streakFreezesUsed,
      lastActiveDate: gamification.lastActiveDate,
    };

    await save(updated);
  }, [gamification, save]);

  const level = gamification.level;
  const levelName = LEVEL_NAMES[level] || `Level ${level}`;
  const xpProgress = getXPForNextLevel(gamification.xp);

  return useMemo(() => ({
    gamification,
    unlockedBadges: gamification.badges,
    level,
    levelName,
    xpProgress,
    allBadges: badges,
    coachingTone,
    setCoachingTone,
    processWorkoutComplete,
    useStreakFreeze,
    recalculateFromWorkouts,
  }), [gamification, level, levelName, xpProgress, coachingTone, setCoachingTone, processWorkoutComplete, useStreakFreeze, recalculateFromWorkouts]);
});
