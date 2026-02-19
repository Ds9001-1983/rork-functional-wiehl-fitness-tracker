import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Workout, WorkoutPlan, WorkoutExercise, WorkoutSet, Routine, calculate1RM } from '@/types/workout';
import { exercises as exerciseDb } from '@/data/exercises';
import { trpcClient } from '@/lib/trpc';
import { syncQueue } from '@/lib/sync-queue';

interface WorkoutState {
  workouts: Workout[];
  workoutPlans: WorkoutPlan[];
  routines: Routine[];
  activeWorkout: Workout | null;
  isLoading: boolean;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  startWorkout: (planId?: string) => void;
  startWorkoutFromRoutine: (routine: Routine) => void;
  endWorkout: () => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  updateSet: (exerciseIndex: number, setIndex: number, set: Partial<WorkoutSet>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateExerciseNotes: (exerciseIndex: number, notes: string) => void;
  saveWorkout: () => Promise<void>;
  getWorkoutHistory: () => Workout[];
  getPersonalRecords: () => Record<string, number>;
  getDetailedRecords: () => Array<{ exerciseId: string; weight: number; reps: number; date: string; estimated1RM: number }>;
  getExerciseHistory: (exerciseId: string) => Array<{ date: string; sets: WorkoutSet[] }>;
  getMuscleGroupVolume: () => Record<string, number>;
  createWorkout: (workout: Omit<Workout, 'id'>) => Promise<void>;
  createWorkoutPlan: (plan: Omit<WorkoutPlan, 'id'>) => Promise<void>;
  updateWorkoutPlan: (planId: string, updatedPlan: WorkoutPlan) => Promise<void>;
  assignPlanToUser: (planId: string, userId: string, createInstance?: boolean) => Promise<void>;
  instantiatePlan: (templateId: string, userIds: string[]) => Promise<void>;
  saveRoutine: (routine: Omit<Routine, 'id' | 'timesUsed'>) => Promise<void>;
  updateRoutine: (routineId: string, updates: Partial<Omit<Routine, 'id'>>) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  updateWorkout: (workoutId: string, updates: Partial<Omit<Workout, 'id'>>) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  repeatWorkout: (workout: Workout) => void;
  deletePlan: (planId: string) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<void>;
  refreshFromServer: () => Promise<void>;
}

export const [WorkoutProvider, useWorkouts] = createContextHook<WorkoutState>(() => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      try {
        const [serverWorkouts, serverPlans, serverRoutines] = await Promise.all([
          currentUserId
            ? trpcClient.workouts.list.query({ userId: currentUserId })
            : trpcClient.workouts.list.query(),
          trpcClient.plans.list.query(),
          currentUserId
            ? trpcClient.routines.list.query({ userId: currentUserId })
            : Promise.resolve(null),
        ]);

        setWorkouts(serverWorkouts as Workout[]);
        setWorkoutPlans(serverPlans as WorkoutPlan[]);

        if (serverRoutines) {
          const mappedRoutines: Routine[] = (serverRoutines as any[]).map(r => ({
            id: r.id,
            name: r.name,
            exercises: r.exercises,
            createdBy: r.userId || currentUserId || '',
            timesUsed: r.timesUsed || 0,
            lastUsed: r.lastUsed || undefined,
          }));
          setRoutines(mappedRoutines);
          await AsyncStorage.setItem('routines', JSON.stringify(mappedRoutines));
        }

        await Promise.all([
          AsyncStorage.setItem('workouts', JSON.stringify(serverWorkouts)),
          AsyncStorage.setItem('workoutPlans', JSON.stringify(serverPlans)),
        ]);
      } catch (serverError) {
        const [storedWorkouts, storedPlans, storedRoutines] = await Promise.all([
          AsyncStorage.getItem('workouts'),
          AsyncStorage.getItem('workoutPlans'),
          AsyncStorage.getItem('routines'),
        ]);

        if (storedWorkouts) setWorkouts(JSON.parse(storedWorkouts));
        if (storedPlans) setWorkoutPlans(JSON.parse(storedPlans));
        if (storedRoutines) setRoutines(JSON.parse(storedRoutines));
      }
    } catch (error) {
      console.error('[Workouts] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
    // Restore active workout from AsyncStorage on mount
    AsyncStorage.getItem('activeWorkout').then(data => {
      if (data) {
        try {
          const restored = JSON.parse(data);
          if (restored && !restored.completed) {
            setActiveWorkout(restored);
          }
        } catch {}
      }
    });
  }, [loadData]);

  // Autosave active workout to AsyncStorage on every change
  useEffect(() => {
    if (activeWorkout) {
      AsyncStorage.setItem('activeWorkout', JSON.stringify(activeWorkout));
    } else {
      AsyncStorage.removeItem('activeWorkout');
    }
  }, [activeWorkout]);

  const refreshFromServer = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const startWorkout = useCallback((planId?: string) => {
    const plan = planId ? workoutPlans.find(p => p.id === planId) : null;
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);

    // Auto-fill plan exercises with last workout data
    let exercises = plan?.exercises || [];
    if (plan?.exercises && plan.exercises.length > 0) {
      exercises = plan.exercises.map(ex => {
        // Find last performance for this exercise
        let previousSets: { reps: number; weight: number; type: string }[] | null = null;
        for (let i = userWorkouts.length - 1; i >= 0; i--) {
          const prevExercise = userWorkouts[i].exercises.find(e => e.exerciseId === ex.exerciseId);
          if (prevExercise && prevExercise.sets.length > 0) {
            previousSets = prevExercise.sets.map(s => ({
              reps: s.reps,
              weight: s.weight,
              type: s.type || 'normal',
            }));
            break;
          }
        }

        if (previousSets) {
          // Fill with history data, match set count from plan
          return {
            ...ex,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            sets: ex.sets.map((s, i) => ({
              ...s,
              id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
              weight: previousSets![i]?.weight ?? s.weight,
              reps: previousSets![i]?.reps ?? s.reps,
              completed: false,
            })),
          };
        }

        return {
          ...ex,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sets: ex.sets.map((s, i) => ({
            ...s,
            id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            completed: false,
          })),
        };
      });
    }

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: plan?.name || `Workout ${new Date().toLocaleDateString('de-DE')}`,
      date: new Date().toISOString(),
      exercises,
      completed: false,
      userId: currentUserId || '1',
      templateId: planId,
      planInstanceId: plan?.isInstance ? planId : undefined,
    };

    setActiveWorkout(newWorkout);
  }, [workoutPlans, workouts, currentUserId]);

  const startWorkoutFromRoutine = useCallback((routine: Routine) => {
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);

    const newExercises: WorkoutExercise[] = routine.exercises.map(re => {
      // Look up last performance for this exercise
      let previousSets: { reps: number; weight: number }[] | null = null;
      for (let i = userWorkouts.length - 1; i >= 0; i--) {
        const prevExercise = userWorkouts[i].exercises.find(e => e.exerciseId === re.exerciseId);
        if (prevExercise && prevExercise.sets.length > 0) {
          previousSets = prevExercise.sets.map(s => ({ reps: s.reps, weight: s.weight }));
          break;
        }
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        exerciseId: re.exerciseId,
        sets: Array.from({ length: re.sets }, (_, i) => ({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          reps: previousSets?.[i]?.reps ?? re.reps ?? 0,
          weight: previousSets?.[i]?.weight ?? re.weight ?? 0,
          completed: false,
          type: 'normal' as const,
        })),
        notes: re.notes,
      };
    });

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: routine.name,
      date: new Date().toISOString(),
      exercises: newExercises,
      completed: false,
      userId: currentUserId || '1',
      templateId: routine.id,
    };

    const updatedRoutines = routines.map(r =>
      r.id === routine.id
        ? { ...r, timesUsed: r.timesUsed + 1, lastUsed: new Date().toISOString() }
        : r
    );
    setRoutines(updatedRoutines);
    AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));

    // Sync timesUsed to server in background
    const routineUpdateInput = {
      id: routine.id,
      timesUsed: routine.timesUsed + 1,
      lastUsed: new Date().toISOString(),
    };
    trpcClient.routines.update.mutate(routineUpdateInput).catch(() => {
      syncQueue.enqueue('routines.update', routineUpdateInput);
    });

    setActiveWorkout(newWorkout);
  }, [routines, workouts, currentUserId]);

  const saveWorkout = useCallback(async () => {
    if (!activeWorkout) return;

    const completedWorkout: Workout = {
      ...activeWorkout,
      completed: true,
      duration: Date.now() - new Date(activeWorkout.date).getTime(),
    };

    const mutationInput = {
      userId: completedWorkout.userId,
      name: completedWorkout.name,
      date: completedWorkout.date,
      duration: completedWorkout.duration,
      exercises: completedWorkout.exercises,
      completed: true,
      createdBy: completedWorkout.createdBy,
    };

    try {
      const serverWorkout = await trpcClient.workouts.create.mutate(mutationInput);
      completedWorkout.id = (serverWorkout as any).id || completedWorkout.id;
    } catch (error) {
      syncQueue.enqueue('workouts.create', mutationInput);
    }

    const updatedWorkouts = [...workouts, completedWorkout];
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [activeWorkout, workouts]);

  const endWorkout = useCallback(() => {
    setActiveWorkout(null);
  }, []);

  const addExerciseToWorkout = useCallback((exerciseId: string) => {
    if (!activeWorkout) return;

    // Auto-fill from last workout history
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);
    let previousSets: { reps: number; weight: number; type: string }[] | null = null;

    for (let i = userWorkouts.length - 1; i >= 0; i--) {
      const prevExercise = userWorkouts[i].exercises.find(e => e.exerciseId === exerciseId);
      if (prevExercise && prevExercise.sets.length > 0) {
        previousSets = prevExercise.sets.map(s => ({
          reps: s.reps,
          weight: s.weight,
          type: s.type || 'normal',
        }));
        break;
      }
    }

    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      exerciseId,
      sets: previousSets
        ? previousSets.map((prev, i) => ({
            id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            reps: prev.reps,
            weight: prev.weight,
            completed: false,
            type: (prev.type || 'normal') as 'normal' | 'warmup' | 'dropset' | 'failure',
          }))
        : [{
            id: Date.now().toString(),
            reps: 0,
            weight: 0,
            completed: false,
            type: 'normal',
          }],
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newExercise],
    });
  }, [activeWorkout, workouts, currentUserId]);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, setUpdate: Partial<WorkoutSet>) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: updatedExercises[exerciseIndex].sets.map((s, i) =>
        i === setIndex ? { ...s, ...setUpdate } : s
      ),
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const addSet = useCallback((exerciseIndex: number) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    const sets = updatedExercises[exerciseIndex].sets;
    const lastSet = sets[sets.length - 1];

    const newSet: WorkoutSet = {
      id: Date.now().toString(),
      reps: lastSet?.reps || 0,
      weight: lastSet?.weight || 0,
      completed: false,
      type: 'normal',
    };

    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: [...sets, newSet],
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: updatedExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex),
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const updateExerciseNotes = useCallback((exerciseIndex: number, notes: string) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      notes,
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const getWorkoutHistory = useCallback(() => {
    return workouts.filter(w => w.userId === currentUserId);
  }, [workouts, currentUserId]);

  const getPersonalRecords = useCallback((): Record<string, number> => {
    const records: Record<string, number> = {};
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);

    for (const workout of userWorkouts) {
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight > 0) {
            const currentRecord = records[exercise.exerciseId] || 0;
            if (set.weight > currentRecord) {
              records[exercise.exerciseId] = set.weight;
            }
          }
        }
      }
    }

    return records;
  }, [workouts, currentUserId]);

  const getDetailedRecords = useCallback(() => {
    const records: Record<string, { weight: number; reps: number; date: string; estimated1RM: number }> = {};
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);

    for (const workout of userWorkouts) {
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight > 0) {
            const e1rm = calculate1RM(set.weight, set.reps);
            const current = records[exercise.exerciseId];
            if (!current || e1rm > current.estimated1RM) {
              records[exercise.exerciseId] = {
                weight: set.weight,
                reps: set.reps,
                date: workout.date,
                estimated1RM: e1rm,
              };
            }
          }
        }
      }
    }

    return Object.entries(records).map(([exerciseId, data]) => ({
      exerciseId,
      ...data,
    }));
  }, [workouts, currentUserId]);

  const getExerciseHistory = useCallback((exerciseId: string) => {
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);
    const history: Array<{ date: string; sets: WorkoutSet[] }> = [];

    for (const workout of userWorkouts) {
      const exercise = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (exercise) {
        history.push({ date: workout.date, sets: exercise.sets });
      }
    }

    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts, currentUserId]);

  const getMuscleGroupVolume = useCallback(() => {
    const volume: Record<string, number> = {};
    const userWorkouts = workouts.filter(w => w.userId === currentUserId && w.completed);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const workout of userWorkouts) {
      if (new Date(workout.date) < weekAgo) continue;

      for (const exercise of workout.exercises) {
        const exData = exerciseDb.find(e => e.id === exercise.exerciseId);
        if (!exData) continue;

        const completedSets = exercise.sets.filter(s => s.completed).length;

        for (const mg of exData.muscleGroups) {
          volume[mg] = (volume[mg] || 0) + completedSets;
        }
      }
    }

    return volume;
  }, [workouts, currentUserId]);

  const createWorkoutPlan = useCallback(async (plan: Omit<WorkoutPlan, 'id'>) => {
    let newPlan: WorkoutPlan;

    const mutationInput = {
      name: plan.name,
      description: plan.description,
      exercises: plan.exercises,
      createdBy: plan.createdBy,
      assignedTo: plan.assignedTo,
      schedule: plan.schedule,
    };

    try {
      const serverPlan = await trpcClient.plans.create.mutate(mutationInput);
      newPlan = serverPlan as WorkoutPlan;
    } catch (error) {
      syncQueue.enqueue('plans.create', mutationInput);
      newPlan = { ...plan, id: Date.now().toString() };
    }

    const updatedPlans = [...workoutPlans, newPlan];
    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const createWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    let newWorkout: Workout;

    const mutationInput = {
      userId: workout.userId,
      name: workout.name,
      date: workout.date,
      duration: workout.duration,
      exercises: workout.exercises,
      completed: workout.completed,
      createdBy: workout.createdBy,
    };

    try {
      const serverWorkout = await trpcClient.workouts.create.mutate(mutationInput);
      newWorkout = serverWorkout as Workout;
    } catch (error) {
      syncQueue.enqueue('workouts.create', mutationInput);
      newWorkout = { ...workout, id: Date.now().toString() };
    }

    const updatedWorkouts = [...workouts, newWorkout];
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [workouts]);

  const updateWorkoutPlan = useCallback(async (planId: string, updatedPlan: WorkoutPlan) => {
    const mutationInput = {
      id: planId,
      name: updatedPlan.name,
      description: updatedPlan.description,
      exercises: updatedPlan.exercises,
      assignedTo: updatedPlan.assignedTo,
      schedule: updatedPlan.schedule,
    };

    try {
      await trpcClient.plans.update.mutate(mutationInput);
    } catch (error) {
      syncQueue.enqueue('plans.update', mutationInput);
    }

    const updatedPlans = workoutPlans.map(p =>
      p.id === planId ? updatedPlan : p
    );

    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const assignPlanToUser = useCallback(async (planId: string, userId: string, createInstance?: boolean) => {
    try {
      const result = await trpcClient.plans.assign.mutate({ planId, userId, createInstance });

      if (createInstance && result.instanceId) {
        // Instance was created server-side, refresh plans
        await refreshFromServer();
        return;
      }
    } catch (error) {
      // Local fallback
    }

    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan) return;

    if (createInstance) {
      // Local fallback: create instance copy
      const instance: WorkoutPlan = {
        id: Math.random().toString(36).substring(2, 9),
        name: plan.name,
        description: plan.description,
        exercises: JSON.parse(JSON.stringify(plan.exercises)),
        createdBy: plan.createdBy,
        assignedTo: [userId],
        schedule: plan.schedule ? JSON.parse(JSON.stringify(plan.schedule)) : undefined,
        templateId: planId,
        isInstance: true,
        customizedFields: [],
      };

      const updatedPlans = [...workoutPlans, instance];
      setWorkoutPlans(updatedPlans);
      await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
    } else {
      const updatedPlan = {
        ...plan,
        assignedTo: [...(plan.assignedTo || []), userId],
      };

      const updatedPlans = workoutPlans.map(p =>
        p.id === planId ? updatedPlan : p
      );

      setWorkoutPlans(updatedPlans);
      await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
    }
  }, [workoutPlans]);

  const instantiatePlan = useCallback(async (templateId: string, userIds: string[]) => {
    try {
      await trpcClient.plans.instantiate.mutate({ templateId, userIds });
      await refreshFromServer();
    } catch (error) {
      // Local fallback: create instances for each user
      const template = workoutPlans.find(p => p.id === templateId);
      if (!template) return;

      const newInstances: WorkoutPlan[] = userIds.map(userId => ({
        id: Math.random().toString(36).substring(2, 9),
        name: template.name,
        description: template.description,
        exercises: JSON.parse(JSON.stringify(template.exercises)),
        createdBy: template.createdBy,
        assignedTo: [userId],
        schedule: template.schedule ? JSON.parse(JSON.stringify(template.schedule)) : undefined,
        templateId: templateId,
        isInstance: true,
        customizedFields: [],
      }));

      const updatedPlans = [...workoutPlans, ...newInstances];
      setWorkoutPlans(updatedPlans);
      await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
    }
  }, [workoutPlans]);

  const saveRoutine = useCallback(async (routine: Omit<Routine, 'id' | 'timesUsed'>) => {
    let newRoutine: Routine;

    try {
      const serverResult = await trpcClient.routines.create.mutate({
        userId: routine.createdBy || currentUserId || '',
        name: routine.name,
        exercises: routine.exercises,
      });
      newRoutine = {
        ...routine,
        id: (serverResult as any).id || Date.now().toString(),
        timesUsed: 0,
      };
    } catch {
      newRoutine = {
        ...routine,
        id: Date.now().toString(),
        timesUsed: 0,
      };
    }

    const updatedRoutines = [...routines, newRoutine];
    setRoutines(updatedRoutines);
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
  }, [routines, currentUserId]);

  const updateRoutine = useCallback(async (routineId: string, updates: Partial<Omit<Routine, 'id'>>) => {
    const updatedRoutines = routines.map(r =>
      r.id === routineId ? { ...r, ...updates } : r
    );
    setRoutines(updatedRoutines);
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));

    const mutationInput = {
      id: routineId,
      name: updates.name,
      exercises: updates.exercises,
      timesUsed: updates.timesUsed,
      lastUsed: updates.lastUsed,
    };

    try {
      await trpcClient.routines.update.mutate(mutationInput);
    } catch {
      syncQueue.enqueue('routines.update', mutationInput);
    }
  }, [routines]);

  const deleteRoutine = useCallback(async (routineId: string) => {
    try {
      await trpcClient.routines.delete.mutate({ id: routineId });
    } catch {
      syncQueue.enqueue('routines.delete', { id: routineId });
    }
    const updatedRoutines = routines.filter(r => r.id !== routineId);
    setRoutines(updatedRoutines);
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
  }, [routines]);

  const updateWorkout = useCallback(async (workoutId: string, updates: Partial<Omit<Workout, 'id'>>) => {
    const updatedWorkouts = workouts.map(w =>
      w.id === workoutId ? { ...w, ...updates } : w
    );
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
    try {
      await trpcClient.workouts.update.mutate({ id: workoutId, ...updates } as any);
    } catch {
      syncQueue.enqueue('workouts.update', { id: workoutId, ...updates });
    }
  }, [workouts]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    try {
      await trpcClient.workouts.delete.mutate({ id: workoutId });
    } catch (error) {
      syncQueue.enqueue('workouts.delete', { id: workoutId });
    }

    const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [workouts]);

  const repeatWorkout = useCallback((workout: Workout) => {
    const newExercises: WorkoutExercise[] = workout.exercises.map(ex => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s, i) => ({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        reps: s.reps,
        weight: s.weight,
        completed: false,
        type: s.type || 'normal' as const,
      })),
      notes: ex.notes,
    }));

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workout.name,
      date: new Date().toISOString(),
      exercises: newExercises,
      completed: false,
      userId: currentUserId || workout.userId,
    };

    setActiveWorkout(newWorkout);
  }, [currentUserId]);

  const deletePlan = useCallback(async (planId: string) => {
    try {
      await trpcClient.plans.delete.mutate({ id: planId });
    } catch (error) {
      syncQueue.enqueue('plans.delete', { id: planId });
    }

    const updatedPlans = workoutPlans.filter(p => p.id !== planId);
    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const duplicatePlan = useCallback(async (planId: string) => {
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan) return;

    await createWorkoutPlan({
      name: `${plan.name} (Kopie)`,
      description: plan.description,
      exercises: JSON.parse(JSON.stringify(plan.exercises)),
      createdBy: plan.createdBy,
      assignedTo: [],
      schedule: plan.schedule,
    });
  }, [workoutPlans, createWorkoutPlan]);

  return useMemo(() => ({
    workouts,
    workoutPlans,
    routines,
    activeWorkout,
    isLoading,
    currentUserId,
    setCurrentUserId,
    startWorkout,
    startWorkoutFromRoutine,
    endWorkout,
    addExerciseToWorkout,
    updateSet,
    addSet,
    removeSet,
    updateExerciseNotes,
    saveWorkout,
    getWorkoutHistory,
    getPersonalRecords,
    getDetailedRecords,
    getExerciseHistory,
    getMuscleGroupVolume,
    createWorkout,
    createWorkoutPlan,
    updateWorkoutPlan,
    assignPlanToUser,
    instantiatePlan,
    saveRoutine,
    updateRoutine,
    deleteRoutine,
    updateWorkout,
    deleteWorkout,
    repeatWorkout,
    deletePlan,
    duplicatePlan,
    refreshFromServer,
  }), [workouts, workoutPlans, routines, activeWorkout, isLoading, currentUserId, startWorkout, startWorkoutFromRoutine, endWorkout, addExerciseToWorkout, updateSet, addSet, removeSet, updateExerciseNotes, saveWorkout, getWorkoutHistory, getPersonalRecords, getDetailedRecords, getExerciseHistory, getMuscleGroupVolume, createWorkout, createWorkoutPlan, updateWorkoutPlan, assignPlanToUser, instantiatePlan, saveRoutine, updateRoutine, deleteRoutine, updateWorkout, deleteWorkout, repeatWorkout, deletePlan, duplicatePlan, refreshFromServer]);
});
