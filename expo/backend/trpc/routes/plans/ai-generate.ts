import { trainerProcedure } from '../../create-context';
import { z } from 'zod';
import { exercises } from '../../../../data/exercises';

const EXERCISE_IDS = exercises.map(e => e.id);

// Simple rule-based plan generator (no external API dependency)
function generatePlan(input: {
  goal: string;
  level: string;
  daysPerWeek: number;
  equipment: string;
  restrictions: string;
}) {
  const { goal, level, daysPerWeek, equipment, restrictions } = input;

  // Filter exercises by equipment availability
  const availableExercises = exercises.filter(e => {
    if (equipment === 'full') return true;
    if (equipment === 'minimal') {
      return !e.equipment || ['Körpergewicht', 'Kurzhanteln', 'Klimmzugstange'].includes(e.equipment || '');
    }
    // bodyweight
    return !e.equipment || e.equipment === 'Körpergewicht';
  });

  // Filter out restricted exercises
  const restrictionLower = restrictions.toLowerCase();
  const filtered = restrictionLower
    ? availableExercises.filter(e => {
        if (restrictionLower.includes('knie') && e.muscleGroups.some(mg => mg.includes('Quadrizeps'))) return false;
        if (restrictionLower.includes('schulter') && e.category === 'shoulders') return false;
        if (restrictionLower.includes('rücken') && e.category === 'back') return false;
        return true;
      })
    : availableExercises;

  // Categorize exercises
  const byCategory: Record<string, typeof filtered> = {};
  for (const ex of filtered) {
    if (!byCategory[ex.category]) byCategory[ex.category] = [];
    byCategory[ex.category].push(ex);
  }

  // Determine sets/reps based on goal and level
  const setsReps = {
    muscle: { beginner: { sets: 3, reps: 10 }, intermediate: { sets: 4, reps: 8 }, advanced: { sets: 4, reps: 10 } },
    strength: { beginner: { sets: 3, reps: 8 }, intermediate: { sets: 5, reps: 5 }, advanced: { sets: 5, reps: 3 } },
    lose_weight: { beginner: { sets: 3, reps: 15 }, intermediate: { sets: 3, reps: 12 }, advanced: { sets: 4, reps: 12 } },
    fitness: { beginner: { sets: 3, reps: 12 }, intermediate: { sets: 3, reps: 10 }, advanced: { sets: 4, reps: 10 } },
  };

  const config = (setsReps as any)[goal]?.[level] || { sets: 3, reps: 10 };

  // Generate split based on days per week
  type DaySplit = { name: string; categories: string[] };
  let splits: DaySplit[] = [];

  if (daysPerWeek <= 2) {
    splits = Array(daysPerWeek).fill(null).map((_, i) => ({
      name: `Ganzkörper ${i + 1}`,
      categories: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
    }));
  } else if (daysPerWeek === 3) {
    splits = [
      { name: 'Push (Brust/Schultern/Trizeps)', categories: ['chest', 'shoulders', 'arms'] },
      { name: 'Pull (Rücken/Bizeps)', categories: ['back', 'arms'] },
      { name: 'Beine & Core', categories: ['legs', 'core'] },
    ];
  } else if (daysPerWeek === 4) {
    splits = [
      { name: 'Oberkörper Push', categories: ['chest', 'shoulders'] },
      { name: 'Unterkörper 1', categories: ['legs', 'core'] },
      { name: 'Oberkörper Pull', categories: ['back', 'arms'] },
      { name: 'Unterkörper 2', categories: ['legs', 'core'] },
    ];
  } else {
    splits = [
      { name: 'Brust', categories: ['chest'] },
      { name: 'Rücken', categories: ['back'] },
      { name: 'Beine', categories: ['legs'] },
      { name: 'Schultern & Arme', categories: ['shoulders', 'arms'] },
      { name: 'Ganzkörper & Core', categories: ['chest', 'back', 'legs', 'core'] },
    ].slice(0, daysPerWeek);
  }

  // Pick exercises per day
  const days = splits.map(split => {
    const dayExercises: { exerciseId: string; sets: number; reps: number }[] = [];
    const exercisesPerDay = level === 'beginner' ? 4 : level === 'intermediate' ? 5 : 6;
    const perCategory = Math.max(1, Math.ceil(exercisesPerDay / split.categories.length));

    for (const cat of split.categories) {
      const catExercises = byCategory[cat] || [];
      const shuffled = [...catExercises].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(perCategory, shuffled.length); i++) {
        if (dayExercises.length >= exercisesPerDay) break;
        dayExercises.push({
          exerciseId: shuffled[i].id,
          sets: config.sets,
          reps: config.reps,
        });
      }
    }

    return {
      name: split.name,
      exercises: dayExercises,
    };
  });

  return {
    planName: `KI-Plan: ${goal === 'muscle' ? 'Muskelaufbau' : goal === 'strength' ? 'Kraft' : goal === 'lose_weight' ? 'Abnehmen' : 'Fitness'} (${level === 'beginner' ? 'Anfänger' : level === 'intermediate' ? 'Fortgeschritten' : 'Profi'})`,
    description: `Automatisch generierter ${daysPerWeek}-Tage Plan für ${goal === 'muscle' ? 'Muskelaufbau' : goal === 'strength' ? 'Kraftaufbau' : goal === 'lose_weight' ? 'Fettabbau' : 'allgemeine Fitness'}. Level: ${level}.${restrictions ? ` Einschränkungen berücksichtigt: ${restrictions}` : ''}`,
    days,
    config,
  };
}

export default trainerProcedure
  .input(z.object({
    goal: z.enum(['muscle', 'strength', 'lose_weight', 'fitness']),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    daysPerWeek: z.number().min(1).max(6),
    equipment: z.enum(['full', 'minimal', 'bodyweight']),
    restrictions: z.string().optional().default(''),
  }))
  .mutation(async ({ input }) => {
    return generatePlan(input);
  });
