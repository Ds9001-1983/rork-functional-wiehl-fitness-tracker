export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full-body';
  equipment?: string;
  videoUrl?: string;
  imageData?: string | null;
  images?: string[];
  instructions?: string;
  muscleGroups: string[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
  type?: 'normal' | 'warmup' | 'dropset' | 'failure';
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  duration?: number;
  exercises: WorkoutExercise[];
  completed: boolean;
  userId: string;
  createdBy?: string; // Trainer ID if created by trainer
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdBy: string;
  assignedTo?: string[];
  schedule?: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time?: string;
  }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
  avatar?: string;
  joinDate: string;
  phone?: string;
  stats?: UserStats;
  starterPassword?: string; // Temporäres Passwort vom Trainer
  passwordChanged?: boolean; // Flag ob Kunde das Passwort bereits geändert hat
  passwordResetRequestedAt?: string | null; // Zeitstempel offener Reset-Anfrage vom Kunden
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  favoriteExercise?: string;
  personalRecords: Record<string, number>;
}

/**
 * Geschätztes 1-Rep-Maximum nach der Epley-Formel.
 * Bei einer Wiederholung ist 1RM = Gewicht; sonst weight * (1 + reps/30).
 */
export function calculate1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}