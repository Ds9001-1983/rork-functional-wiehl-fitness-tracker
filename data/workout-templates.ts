import { RoutineExercise } from '@/types/workout';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  goals: string[];
  levels: string[];
  minDays: number;
  maxDays: number;
  routines: {
    name: string;
    exercises: RoutineExercise[];
  }[];
}

export const workoutTemplates: WorkoutTemplate[] = [
  // ============ MUSKELAUFBAU ============
  {
    id: 'muscle-beginner',
    name: 'Ganzkörper Grundlagen',
    description: 'Perfekter Einstieg mit den wichtigsten Grundübungen',
    goals: ['muscle'],
    levels: ['beginner'],
    minDays: 2,
    maxDays: 3,
    routines: [
      {
        name: 'Ganzkörper A',
        exercises: [
          { exerciseId: 'machine-chest-press', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'lat-pulldown', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'leg-press', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'machine-shoulder-press', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'dumbbell-curl', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'tricep-pushdown', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'plank', sets: 3, reps: 30, weight: 0, restTime: 60, notes: '30 Sekunden halten' },
        ],
      },
      {
        name: 'Ganzkörper B',
        exercises: [
          { exerciseId: 'dumbbell-bench-press', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'machine-row', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'goblet-squat', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'lateral-raise', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'hammer-curl', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'overhead-tricep-extension', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'crunch', sets: 3, reps: 15, weight: 0, restTime: 60 },
        ],
      },
    ],
  },
  {
    id: 'muscle-intermediate',
    name: 'Oberkörper / Unterkörper Split',
    description: 'Klassischer 4-Tage Split für mehr Volumen und Fortschritt',
    goals: ['muscle'],
    levels: ['intermediate'],
    minDays: 3,
    maxDays: 4,
    routines: [
      {
        name: 'Oberkörper',
        exercises: [
          { exerciseId: 'bench-press', sets: 4, reps: 8, weight: 0, restTime: 120 },
          { exerciseId: 'barbell-row', sets: 4, reps: 8, weight: 0, restTime: 120 },
          { exerciseId: 'dumbbell-shoulder-press', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'cable-fly', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'lateral-raise', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'barbell-curl', sets: 3, reps: 10, weight: 0, restTime: 60 },
          { exerciseId: 'tricep-pushdown', sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
      },
      {
        name: 'Unterkörper',
        exercises: [
          { exerciseId: 'squat', sets: 4, reps: 8, weight: 0, restTime: 120 },
          { exerciseId: 'romanian-deadlift', sets: 3, reps: 10, weight: 0, restTime: 120 },
          { exerciseId: 'leg-press', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'leg-curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'leg-extension', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'calf-raise-standing', sets: 4, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'plank', sets: 3, reps: 45, weight: 0, restTime: 60, notes: '45 Sekunden halten' },
        ],
      },
    ],
  },
  {
    id: 'muscle-advanced',
    name: 'Push / Pull / Legs',
    description: 'Optimale Frequenz und Volumen für maximalen Muskelaufbau',
    goals: ['muscle'],
    levels: ['advanced'],
    minDays: 4,
    maxDays: 6,
    routines: [
      {
        name: 'Push (Brust, Schultern, Trizeps)',
        exercises: [
          { exerciseId: 'bench-press', sets: 4, reps: 6, weight: 0, restTime: 150 },
          { exerciseId: 'incline-dumbbell-press', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'dumbbell-shoulder-press', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'lateral-raise', sets: 4, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'cable-fly', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'tricep-pushdown', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'overhead-tricep-extension', sets: 3, reps: 12, weight: 0, restTime: 60 },
        ],
      },
      {
        name: 'Pull (Rücken, Bizeps)',
        exercises: [
          { exerciseId: 'deadlift', sets: 4, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'barbell-row', sets: 4, reps: 8, weight: 0, restTime: 120 },
          { exerciseId: 'lat-pulldown', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'seated-cable-row', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'face-pull', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'barbell-curl', sets: 3, reps: 10, weight: 0, restTime: 60 },
          { exerciseId: 'hammer-curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
        ],
      },
      {
        name: 'Legs (Beine)',
        exercises: [
          { exerciseId: 'squat', sets: 4, reps: 6, weight: 0, restTime: 180 },
          { exerciseId: 'romanian-deadlift', sets: 3, reps: 10, weight: 0, restTime: 120 },
          { exerciseId: 'leg-press', sets: 3, reps: 12, weight: 0, restTime: 90 },
          { exerciseId: 'leg-extension', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'leg-curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'calf-raise-standing', sets: 4, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'hanging-knee-raise', sets: 3, reps: 15, weight: 0, restTime: 60 },
        ],
      },
    ],
  },

  // ============ ABNEHMEN ============
  {
    id: 'lose-weight-beginner',
    name: 'Fettverbrennung Starter',
    description: 'Ganzkörpertraining mit hoher Wiederholungszahl und Cardio-Finish',
    goals: ['lose_weight'],
    levels: ['beginner'],
    minDays: 2,
    maxDays: 3,
    routines: [
      {
        name: 'Ganzkörper Fettverbrennung',
        exercises: [
          { exerciseId: 'machine-chest-press', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'machine-row', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'leg-press', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'machine-shoulder-press', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'plank', sets: 3, reps: 30, weight: 0, restTime: 45, notes: '30 Sekunden halten' },
          { exerciseId: 'stationary-bike', sets: 1, reps: 20, weight: 0, restTime: 0, notes: '20 Minuten moderates Tempo' },
        ],
      },
    ],
  },
  {
    id: 'lose-weight-advanced',
    name: 'HIIT & Kraft Kombi',
    description: 'Intensives Training für maximale Kalorienverbrennung',
    goals: ['lose_weight'],
    levels: ['intermediate', 'advanced'],
    minDays: 3,
    maxDays: 5,
    routines: [
      {
        name: 'Kraft & Kondition',
        exercises: [
          { exerciseId: 'squat', sets: 4, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'bench-press', sets: 4, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'barbell-row', sets: 4, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'lunges', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'push-up', sets: 3, reps: 15, weight: 0, restTime: 45 },
          { exerciseId: 'mountain-climber', sets: 3, reps: 20, weight: 0, restTime: 45, notes: '20 pro Seite' },
          { exerciseId: 'burpee', sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
      },
    ],
  },

  // ============ ALLGEMEINE FITNESS ============
  {
    id: 'fitness-beginner',
    name: 'Fitness Basics',
    description: 'Ausgewogenes Training an Maschinen und mit Grundübungen',
    goals: ['fitness'],
    levels: ['beginner'],
    minDays: 2,
    maxDays: 3,
    routines: [
      {
        name: 'Fitness Ganzkörper',
        exercises: [
          { exerciseId: 'machine-chest-press', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'lat-pulldown', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'leg-press', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'machine-shoulder-press', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'plank', sets: 3, reps: 30, weight: 0, restTime: 45, notes: '30 Sekunden halten' },
          { exerciseId: 'elliptical', sets: 1, reps: 15, weight: 0, restTime: 0, notes: '15 Minuten zum Aufwärmen/Cool-Down' },
        ],
      },
    ],
  },
  {
    id: 'fitness-advanced',
    name: 'Allround Fitness',
    description: 'Vielseitiges Training mit freien Gewichten und Cardio',
    goals: ['fitness'],
    levels: ['intermediate', 'advanced'],
    minDays: 3,
    maxDays: 5,
    routines: [
      {
        name: 'Kraft & Ausdauer',
        exercises: [
          { exerciseId: 'bench-press', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'barbell-row', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'squat', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'overhead-press', sets: 3, reps: 10, weight: 0, restTime: 90 },
          { exerciseId: 'dumbbell-curl', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'tricep-pushdown', sets: 2, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'plank', sets: 3, reps: 45, weight: 0, restTime: 60, notes: '45 Sekunden halten' },
          { exerciseId: 'rowing-machine', sets: 1, reps: 10, weight: 0, restTime: 0, notes: '10 Minuten als Finisher' },
        ],
      },
    ],
  },

  // ============ KRAFT ============
  {
    id: 'strength-beginner',
    name: 'Kraft Grundlagen',
    description: 'Fokus auf die großen Grundübungen mit niedrigen Wiederholungen',
    goals: ['strength'],
    levels: ['beginner'],
    minDays: 2,
    maxDays: 3,
    routines: [
      {
        name: 'Kraft Tag A',
        exercises: [
          { exerciseId: 'squat', sets: 5, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'bench-press', sets: 5, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'barbell-row', sets: 5, reps: 5, weight: 0, restTime: 150 },
          { exerciseId: 'plank', sets: 3, reps: 30, weight: 0, restTime: 60, notes: '30 Sekunden halten' },
        ],
      },
      {
        name: 'Kraft Tag B',
        exercises: [
          { exerciseId: 'squat', sets: 5, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'overhead-press', sets: 5, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'deadlift', sets: 3, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'hanging-knee-raise', sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
      },
    ],
  },
  {
    id: 'strength-advanced',
    name: 'Maximalkraft Programm',
    description: 'Periodisiertes Krafttraining für erfahrene Athleten',
    goals: ['strength'],
    levels: ['intermediate', 'advanced'],
    minDays: 3,
    maxDays: 5,
    routines: [
      {
        name: 'Squat & Schultern',
        exercises: [
          { exerciseId: 'squat', sets: 5, reps: 3, weight: 0, restTime: 240 },
          { exerciseId: 'front-squat', sets: 3, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'overhead-press', sets: 5, reps: 3, weight: 0, restTime: 180 },
          { exerciseId: 'leg-extension', sets: 3, reps: 10, weight: 0, restTime: 60 },
          { exerciseId: 'lateral-raise', sets: 3, reps: 15, weight: 0, restTime: 60 },
        ],
      },
      {
        name: 'Bench & Rücken',
        exercises: [
          { exerciseId: 'bench-press', sets: 5, reps: 3, weight: 0, restTime: 240 },
          { exerciseId: 'incline-bench-press', sets: 3, reps: 5, weight: 0, restTime: 180 },
          { exerciseId: 'barbell-row', sets: 5, reps: 5, weight: 0, restTime: 150 },
          { exerciseId: 'face-pull', sets: 3, reps: 15, weight: 0, restTime: 60 },
          { exerciseId: 'dumbbell-curl', sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
      },
      {
        name: 'Deadlift & Beine',
        exercises: [
          { exerciseId: 'deadlift', sets: 5, reps: 3, weight: 0, restTime: 240 },
          { exerciseId: 'romanian-deadlift', sets: 3, reps: 8, weight: 0, restTime: 120 },
          { exerciseId: 'bulgarian-split-squat', sets: 3, reps: 8, weight: 0, restTime: 90 },
          { exerciseId: 'leg-curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
          { exerciseId: 'calf-raise-standing', sets: 4, reps: 15, weight: 0, restTime: 60 },
        ],
      },
    ],
  },
];

/**
 * Find the best matching template based on onboarding selections.
 */
export function getTemplateForUser(goal: string, level: string, _days: string): WorkoutTemplate | null {
  // Exact match first
  const exact = workoutTemplates.find(
    t => t.goals.includes(goal) && t.levels.includes(level)
  );
  if (exact) return exact;

  // Fallback: match goal only, pick closest level
  const goalMatches = workoutTemplates.filter(t => t.goals.includes(goal));
  if (goalMatches.length > 0) {
    // Prefer beginner for beginners, advanced for others
    if (level === 'beginner') {
      return goalMatches.find(t => t.levels.includes('beginner')) || goalMatches[0];
    }
    return goalMatches.find(t => t.levels.includes('intermediate') || t.levels.includes('advanced')) || goalMatches[0];
  }

  // Ultimate fallback: first template
  return workoutTemplates[0];
}
