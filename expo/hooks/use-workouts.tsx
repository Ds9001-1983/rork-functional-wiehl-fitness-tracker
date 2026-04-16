import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Workout, WorkoutPlan, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';

function toServerExercises(exercises: WorkoutExercise[]) {
  return exercises.map(ex => ({
    exerciseId: ex.exerciseId,
    notes: ex.notes,
    sets: ex.sets.map(s => ({
      reps: s.reps,
      weight: s.weight,
      completed: s.completed,
      restTime: s.restTime,
    })),
  }));
}

interface WorkoutState {
  workouts: Workout[];
  workoutPlans: WorkoutPlan[];
  activeWorkout: Workout | null;
  isLoading: boolean;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  startWorkout: (planId?: string) => void;
  endWorkout: () => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  updateSet: (exerciseIndex: number, setIndex: number, set: Partial<WorkoutSet>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  saveWorkout: () => Promise<void>;
  getWorkoutHistory: () => Workout[];
  createWorkout: (workout: Omit<Workout, 'id'>) => Promise<void>;
  createWorkoutPlan: (plan: Omit<WorkoutPlan, 'id'>) => Promise<void>;
  updateWorkoutPlan: (planId: string, updatedPlan: WorkoutPlan) => Promise<void>;
  assignPlanToUser: (planId: string, userId: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<void>;
  instantiatePlan: (planId: string, userId: string) => Promise<void>;
  repeatWorkout: (workoutId: string) => void;
  saveRoutine: (workout: Workout) => Promise<void>;
  updateWorkout: (workoutId: string, updates: Partial<Workout>) => Promise<void>;
}

export const [WorkoutProvider, useWorkouts] = createContextHook<WorkoutState>(() => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Migration: Bestehende lokale Workouts zum Server synchronisieren
      const migrated = await AsyncStorage.getItem('workouts_migrated');
      if (!migrated) {
        const localWorkouts = await AsyncStorage.getItem('workouts');
        if (localWorkouts) {
          const parsed = JSON.parse(localWorkouts) as Workout[];
          if (parsed.length > 0) {
            try {
              const result = await trpcClient.workouts.sync.mutate({
                workouts: parsed.map(w => ({
                  localId: w.id,
                  name: w.name,
                  date: w.date,
                  duration: w.duration,
                  exercises: toServerExercises(w.exercises),
                  completed: w.completed,
                  userId: w.userId,
                })),
              });
              console.log('[Workouts] Migration abgeschlossen:', result.synced, 'Workouts synchronisiert');
              await AsyncStorage.setItem('workouts_migrated', 'true');
            } catch (syncError) {
              console.error('[Workouts] Migration fehlgeschlagen, wird beim nächsten Start erneut versucht:', syncError);
            }
          } else {
            await AsyncStorage.setItem('workouts_migrated', 'true');
          }
        } else {
          await AsyncStorage.setItem('workouts_migrated', 'true');
        }
      }

      // Offline-Retry: Lokal gespeicherte Workouts die nicht synchronisiert wurden nachsynen
      try {
        const localWorkouts = await AsyncStorage.getItem('workouts');
        if (localWorkouts) {
          const parsed = JSON.parse(localWorkouts) as Workout[];
          // Lokale Workouts haben Timestamp-IDs (rein numerisch, > 1000000000)
          const unsyncedWorkouts = parsed.filter(w => parseInt(w.id) > 1000000000);
          if (unsyncedWorkouts.length > 0) {
            const result = await trpcClient.workouts.sync.mutate({
              workouts: unsyncedWorkouts.map(w => ({
                localId: w.id,
                name: w.name,
                date: w.date,
                duration: w.duration,
                exercises: toServerExercises(w.exercises),
                completed: w.completed,
                userId: w.userId,
              })),
            });
            console.log('[Workouts] Offline-Retry:', result.synced, 'Workouts nachsynchronisiert');
          }
        }
      } catch (retryError) {
        console.error('[Workouts] Offline-Retry fehlgeschlagen:', retryError);
      }

      // Server-First: Workouts vom Server laden
      try {
        const serverWorkouts = await trpcClient.workouts.list.query();
        setWorkouts(serverWorkouts as Workout[]);
        await AsyncStorage.setItem('workouts', JSON.stringify(serverWorkouts));
      } catch (serverError) {
        console.error('[Workouts] Server-Load fehlgeschlagen, nutze lokale Daten:', serverError);
        const localWorkouts = await AsyncStorage.getItem('workouts');
        if (localWorkouts) setWorkouts(JSON.parse(localWorkouts));
      }

      // Workout-Pläne vom Server laden (Server-First)
      try {
        const serverPlans = await trpcClient.plans.list.query();
        setWorkoutPlans(serverPlans as WorkoutPlan[]);
        await AsyncStorage.setItem('workoutPlans', JSON.stringify(serverPlans));
      } catch (planError) {
        console.error('[Workouts] Plan-Load vom Server fehlgeschlagen, nutze lokale Daten:', planError);
        const storedPlans = await AsyncStorage.getItem('workoutPlans');
        if (storedPlans) setWorkoutPlans(JSON.parse(storedPlans));
      }
    } catch (error) {
      console.error('Error loading workout data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
  }, [currentUserId, loadData]);

  const startWorkout = useCallback((planId?: string) => {
    const plan = planId ? workoutPlans.find(p => p.id === planId) : null;
    
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: plan?.name || `Workout ${new Date().toLocaleDateString('de-DE')}`,
      date: new Date().toISOString(),
      exercises: plan?.exercises || [],
      completed: false,
      userId: currentUserId || 'unknown',
    };
    
    setActiveWorkout(newWorkout);
  }, [workoutPlans, currentUserId]);

  const saveWorkout = useCallback(async () => {
    if (!activeWorkout) return;

    const completedWorkout = {
      ...activeWorkout,
      completed: true,
      duration: Date.now() - new Date(activeWorkout.date).getTime(),
    };

    try {
      // Server-First: Workout zum Server senden
      const serverWorkout = await trpcClient.workouts.create.mutate({
        name: completedWorkout.name,
        date: completedWorkout.date,
        duration: completedWorkout.duration,
        exercises: toServerExercises(completedWorkout.exercises),
        completed: completedWorkout.completed,
        userId: completedWorkout.userId,
      });

      // Lokalen State mit Server-ID aktualisieren
      const savedWorkout = { ...completedWorkout, id: serverWorkout.id } as Workout;
      const updatedWorkouts = [...workouts, savedWorkout];
      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
      console.log('[Workouts] Workout auf Server gespeichert:', serverWorkout.id);
    } catch (error) {
      console.error('[Workouts] Server-Save fehlgeschlagen, speichere lokal:', error);
      // Fallback: Lokal speichern
      const updatedWorkouts = [...workouts, completedWorkout];
      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
    }
  }, [activeWorkout, workouts]);

  const endWorkout = useCallback(() => {
    setActiveWorkout(null);
  }, []);

  const addExerciseToWorkout = useCallback((exerciseId: string) => {
    if (!activeWorkout) return;

    const newExercise: WorkoutExercise = {
      id: Date.now().toString(),
      exerciseId,
      sets: [
        {
          id: Date.now().toString(),
          reps: 0,
          weight: 0,
          completed: false,
        },
      ],
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newExercise],
    });
  }, [activeWorkout]);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, setUpdate: Partial<WorkoutSet>) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...setUpdate,
    };

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const addSet = useCallback((exerciseIndex: number) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    const lastSet = updatedExercises[exerciseIndex].sets[updatedExercises[exerciseIndex].sets.length - 1];
    
    updatedExercises[exerciseIndex].sets.push({
      id: Date.now().toString(),
      reps: lastSet?.reps || 0,
      weight: lastSet?.weight || 0,
      completed: false,
    });

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  }, [activeWorkout]);

  const getWorkoutHistory = useCallback(() => {
    return workouts.filter(w => w.userId === currentUserId);
  }, [workouts, currentUserId]);

  const createWorkoutPlan = useCallback(async (plan: Omit<WorkoutPlan, 'id'>) => {
    try {
      const serverPlan = await trpcClient.plans.create.mutate({
        name: plan.name,
        description: plan.description,
        exercises: plan.exercises,
        schedule: plan.schedule,
      });
      const newPlan = { ...plan, id: serverPlan.id } as WorkoutPlan;
      const updatedPlans = [...workoutPlans, newPlan];
      setWorkoutPlans(updatedPlans);
      await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
    } catch (error) {
      console.error('[Workouts] Server createWorkoutPlan fehlgeschlagen, speichere lokal:', error);
      const newPlan: WorkoutPlan = { ...plan, id: Date.now().toString() };
      const updatedPlans = [...workoutPlans, newPlan];
      setWorkoutPlans(updatedPlans);
      await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
    }
  }, [workoutPlans]);

  const createWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    try {
      const serverWorkout = await trpcClient.workouts.create.mutate({
        name: workout.name,
        date: workout.date,
        duration: workout.duration,
        exercises: toServerExercises(workout.exercises),
        completed: workout.completed,
        userId: workout.userId,
      });

      const newWorkout = { ...workout, id: serverWorkout.id } as Workout;
      const updatedWorkouts = [...workouts, newWorkout];
      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
    } catch (error) {
      console.error('[Workouts] Server createWorkout fehlgeschlagen, speichere lokal:', error);
      const newWorkout: Workout = { ...workout, id: Date.now().toString() };
      const updatedWorkouts = [...workouts, newWorkout];
      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
    }
  }, [workouts]);

  const updateWorkoutPlan = useCallback(async (planId: string, updatedPlan: WorkoutPlan) => {
    try {
      await trpcClient.plans.update.mutate({
        id: planId,
        name: updatedPlan.name,
        description: updatedPlan.description,
        exercises: updatedPlan.exercises,
        schedule: updatedPlan.schedule,
      });
      console.log('[Workouts] Plan auf Server aktualisiert:', planId);
    } catch (error) {
      console.error('[Workouts] Server updatePlan fehlgeschlagen:', error);
    }

    const updatedPlans = workoutPlans.map(p =>
      p.id === planId ? updatedPlan : p
    );
    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const assignPlanToUser = useCallback(async (planId: string, userId: string) => {
    try {
      await trpcClient.plans.assign.mutate({ planId, userId });
      console.log('[Workouts] Plan', planId, 'an User', userId, 'zugewiesen (+ Push-Notification)');
    } catch (error) {
      console.error('[Workouts] Server assignPlan fehlgeschlagen:', error);
    }

    // Lokalen State aktualisieren
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan) return;

    const updatedPlan = {
      ...plan,
      assignedTo: [...(plan.assignedTo || []), userId],
    };

    const updatedPlans = workoutPlans.map(p =>
      p.id === planId ? updatedPlan : p
    );

    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const deletePlan = useCallback(async (planId: string) => {
    const next = workoutPlans.filter(p => p.id !== planId);
    setWorkoutPlans(next);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(next));
    try { await (trpcClient as any).plans.delete?.mutate({ id: planId }); } catch {}
  }, [workoutPlans]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    const next = workouts.filter(w => w.id !== workoutId);
    setWorkouts(next);
    await AsyncStorage.setItem('workouts', JSON.stringify(next));
    try { await (trpcClient as any).workouts.delete?.mutate({ id: workoutId }); } catch {}
  }, [workouts]);

  const duplicatePlan = useCallback(async (planId: string) => {
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan) return;
    const copy: WorkoutPlan = { ...plan, id: Date.now().toString(), name: `${plan.name} (Kopie)` };
    const next = [...workoutPlans, copy];
    setWorkoutPlans(next);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(next));
  }, [workoutPlans]);

  const instantiatePlan = useCallback(async (planId: string, userId: string) => {
    try { await (trpcClient as any).plans.instantiate?.mutate({ planId, userId }); } catch {}
  }, []);

  const repeatWorkout = useCallback((workoutId: string) => {
    const previous = workouts.find(w => w.id === workoutId);
    if (!previous) return;
    const fresh: Workout = {
      ...previous,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      completed: false,
      exercises: previous.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => ({ ...s, completed: false })),
      })),
    };
    setActiveWorkout(fresh);
  }, [workouts]);

  const saveRoutine = useCallback(async (workout: Workout) => {
    const stored = await AsyncStorage.getItem('routines');
    const list: Workout[] = stored ? JSON.parse(stored) : [];
    list.push({ ...workout, id: Date.now().toString() });
    await AsyncStorage.setItem('routines', JSON.stringify(list));
  }, []);

  const updateWorkout = useCallback(async (workoutId: string, updates: Partial<Workout>) => {
    const next = workouts.map(w => w.id === workoutId ? { ...w, ...updates } : w);
    setWorkouts(next);
    await AsyncStorage.setItem('workouts', JSON.stringify(next));
  }, [workouts]);

  return useMemo(() => ({
    workouts,
    workoutPlans,
    activeWorkout,
    isLoading,
    currentUserId,
    setCurrentUserId,
    startWorkout,
    endWorkout,
    addExerciseToWorkout,
    updateSet,
    addSet,
    removeSet,
    saveWorkout,
    getWorkoutHistory,
    createWorkout,
    createWorkoutPlan,
    updateWorkoutPlan,
    assignPlanToUser,
    deletePlan,
    deleteWorkout,
    duplicatePlan,
    instantiatePlan,
    repeatWorkout,
    saveRoutine,
    updateWorkout,
  }), [workouts, workoutPlans, activeWorkout, isLoading, currentUserId, startWorkout, endWorkout, addExerciseToWorkout, updateSet, addSet, removeSet, saveWorkout, getWorkoutHistory, createWorkout, createWorkoutPlan, updateWorkoutPlan, assignPlanToUser, deletePlan, deleteWorkout, duplicatePlan, instantiatePlan, repeatWorkout, saveRoutine, updateWorkout]);
});