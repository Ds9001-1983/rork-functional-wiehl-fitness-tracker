export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full-body';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment?: string;
  videoUrl?: string;
  instructions?: string;
  muscleGroups: string[];
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
  type: SetType;
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  supersetWith?: string; // ID of paired exercise for supersets
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  duration?: number;
  exercises: WorkoutExercise[];
  completed: boolean;
  userId: string;
  createdBy?: string;
  templateId?: string; // Reference to routine used
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  createdBy: string;
  folder?: string;
  lastUsed?: string;
  timesUsed: number;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
  restTime?: number;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdBy: string;
  assignedTo?: string[];
  schedule?: {
    dayOfWeek: number;
    time?: string;
  }[];
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  weight?: number; // kg
  bodyFat?: number; // %
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  bicepLeft?: number; // cm
  bicepRight?: number; // cm
  thighLeft?: number; // cm
  thighRight?: number; // cm
  calfLeft?: number; // cm
  calfRight?: number; // cm
  neck?: number; // cm
  shoulders?: number; // cm
}

export interface PersonalRecord {
  exerciseId: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'trainer' | 'admin' | 'superadmin';
  avatar?: string;
  joinDate: string;
  phone?: string;
  stats?: UserStats;
  starterPassword?: string;
  passwordChanged?: boolean;
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  favoriteExercise?: string;
  personalRecords: Record<string, number>;
}

// Helper: Epley formula for estimated 1RM
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}