import createContextHook from '@nkzw/create-context-hook';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import type { Exercise } from '@/types/workout';

export interface ExerciseCategory {
  slug: string;
  name: string;
  icon?: string;
  orderIndex: number;
  active: boolean;
}

function useExercisesData() {
  const exercisesQuery = trpc.exercises.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const categoriesQuery = trpc.exerciseCategories.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const exercises: Exercise[] = useMemo(() => {
    const rows = exercisesQuery.data ?? [];
    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category as Exercise['category'],
      equipment: e.equipment ?? undefined,
      videoUrl: e.videoUrl ?? undefined,
      instructions: e.instructions ?? undefined,
      muscleGroups: e.muscleGroups ?? [],
    }));
  }, [exercisesQuery.data]);

  const categories: ExerciseCategory[] = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  );

  const findById = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e]));
    return (id: string) => map.get(id);
  }, [exercises]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.slug, c.name]));
    return (slug: string) => map.get(slug) ?? slug;
  }, [categories]);

  const categoryIcon = useMemo(() => {
    const map = new Map(categories.map((c) => [c.slug, c.icon ?? '']));
    return (slug: string) => map.get(slug) ?? '';
  }, [categories]);

  return {
    exercises,
    categories,
    isLoading: exercisesQuery.isLoading || categoriesQuery.isLoading,
    refetch: async () => {
      await Promise.all([exercisesQuery.refetch(), categoriesQuery.refetch()]);
    },
    findById,
    categoryName,
    categoryIcon,
  };
}

export const [ExercisesProvider, useExercises] = createContextHook(useExercisesData);
