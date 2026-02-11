// Gamification Types - Badges, XP, Levels, Streaks

export type BadgeCategory = 'consistency' | 'milestone' | 'performance' | 'special';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: BadgeCategory;
  criteria: BadgeCriteria;
}

export interface BadgeCriteria {
  type: 'workout_count' | 'streak' | 'total_volume_kg' | 'personal_record_count' | 'early_bird' | 'night_owl' | 'week_streak';
  threshold: number;
}

export interface UserBadge {
  badgeId: string;
  unlockedAt: string;
}

export interface UserGamification {
  xp: number;
  level: number;
  badges: UserBadge[];
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  streakFreezesUsed: string[]; // dates when freezes were used
  lastActiveDate: string;
}

// XP rewards
export const XP_REWARDS = {
  WORKOUT_COMPLETE: 100,
  SET_COMPLETE: 10,
  PERSONAL_RECORD: 50,
  STREAK_BONUS_PER_DAY: 5, // multiplied by streak length
  BADGE_UNLOCK: 25,
  FIRST_WORKOUT: 200,
} as const;

// Level thresholds (XP needed for each level)
export const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0 XP
  300,    // Level 2: 300 XP
  750,    // Level 3: 750 XP
  1500,   // Level 4: 1500 XP
  3000,   // Level 5: 3000 XP
  5000,   // Level 6: 5000 XP
  8000,   // Level 7: 8000 XP
  12000,  // Level 8: 12000 XP
  18000,  // Level 9: 18000 XP
  25000,  // Level 10: 25000 XP
  35000,  // Level 11
  50000,  // Level 12
  70000,  // Level 13
  100000, // Level 14
  150000, // Level 15
] as const;

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Anfaenger',
  2: 'Einsteiger',
  3: 'Aktiv',
  4: 'Engagiert',
  5: 'Fortgeschritten',
  6: 'Erfahren',
  7: 'Stark',
  8: 'Elite',
  9: 'Champion',
  10: 'Legende',
  11: 'Meister',
  12: 'Grossmeister',
  13: 'Titan',
  14: 'Mythisch',
  15: 'Unsterblich',
};

export function getLevelForXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = getLevelForXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 50000;
  const current = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current, needed, progress: Math.min(current / needed, 1) };
}

export const MAX_STREAK_FREEZES = 2; // per week
