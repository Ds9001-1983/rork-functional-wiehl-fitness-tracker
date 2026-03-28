export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full-body';
  equipment?: string;
  videoUrl?: string;
  instructions?: string;
  muscleGroups: string[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number;
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
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  favoriteExercise?: string;
  personalRecords: Record<string, number>;
}