import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Workout, WorkoutPlan, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { trpcClient } from '@/lib/trpc';

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
  getPersonalRecords: () => Record<string, number>;
  createWorkout: (workout: Omit<Workout, 'id'>) => Promise<void>;
  createWorkoutPlan: (plan: Omit<WorkoutPlan, 'id'>) => Promise<void>;
  updateWorkoutPlan: (planId: string, updatedPlan: WorkoutPlan) => Promise<void>;
  assignPlanToUser: (planId: string, userId: string) => Promise<void>;
  refreshFromServer: () => Promise<void>;
}

export const [WorkoutProvider, useWorkouts] = createContextHook<WorkoutState>(() => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load from server first, fallback to AsyncStorage
  const loadData = useCallback(async () => {
    try {
      // Try to load from server
      try {
        const [serverWorkouts, serverPlans] = await Promise.all([
          currentUserId
            ? trpcClient.workouts.list.query({ userId: currentUserId })
            : trpcClient.workouts.list.query(),
          trpcClient.plans.list.query(),
        ]);

        setWorkouts(serverWorkouts as Workout[]);
        setWorkoutPlans(serverPlans as WorkoutPlan[]);

        // Cache locally
        await Promise.all([
          AsyncStorage.setItem('workouts', JSON.stringify(serverWorkouts)),
          AsyncStorage.setItem('workoutPlans', JSON.stringify(serverPlans)),
        ]);

        console.log('[Workouts] Loaded from server:', serverWorkouts.length, 'workouts,', serverPlans.length, 'plans');
      } catch (serverError) {
        console.log('[Workouts] Server nicht erreichbar, lade aus lokalem Speicher');

        // Fallback to local storage
        const [storedWorkouts, storedPlans] = await Promise.all([
          AsyncStorage.getItem('workouts'),
          AsyncStorage.getItem('workoutPlans'),
        ]);

        if (storedWorkouts) setWorkouts(JSON.parse(storedWorkouts));
        if (storedPlans) setWorkoutPlans(JSON.parse(storedPlans));
      }
    } catch (error) {
      console.error('[Workouts] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshFromServer = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const startWorkout = useCallback((planId?: string) => {
    const plan = planId ? workoutPlans.find(p => p.id === planId) : null;

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: plan?.name || `Workout ${new Date().toLocaleDateString('de-DE')}`,
      date: new Date().toISOString(),
      exercises: plan?.exercises || [],
      completed: false,
      userId: currentUserId || '1',
    };

    setActiveWorkout(newWorkout);
  }, [workoutPlans, currentUserId]);

  const saveWorkout = useCallback(async () => {
    if (!activeWorkout) return;

    const completedWorkout: Workout = {
      ...activeWorkout,
      completed: true,
      duration: Date.now() - new Date(activeWorkout.date).getTime(),
    };

    // Save to server
    try {
      const serverWorkout = await trpcClient.workouts.create.mutate({
        userId: completedWorkout.userId,
        name: completedWorkout.name,
        date: completedWorkout.date,
        duration: completedWorkout.duration,
        exercises: completedWorkout.exercises,
        completed: true,
        createdBy: completedWorkout.createdBy,
      });
      // Use server-generated ID
      completedWorkout.id = (serverWorkout as any).id || completedWorkout.id;
      console.log('[Workouts] Workout auf Server gespeichert:', completedWorkout.id);
    } catch (error) {
      console.log('[Workouts] Server-Speicherung fehlgeschlagen, nur lokal gespeichert');
    }

    const updatedWorkouts = [...workouts, completedWorkout];
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [activeWorkout, workouts]);

  const endWorkout = useCallback(() => {
    if (activeWorkout) {
      saveWorkout();
    }
    setActiveWorkout(null);
  }, [activeWorkout, saveWorkout]);

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

  // Calculate personal records dynamically from workout history
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

  const createWorkoutPlan = useCallback(async (plan: Omit<WorkoutPlan, 'id'>) => {
    let newPlan: WorkoutPlan;

    try {
      const serverPlan = await trpcClient.plans.create.mutate({
        name: plan.name,
        description: plan.description,
        exercises: plan.exercises,
        createdBy: plan.createdBy,
        assignedTo: plan.assignedTo,
        schedule: plan.schedule,
      });
      newPlan = serverPlan as WorkoutPlan;
      console.log('[Workouts] Plan auf Server erstellt:', newPlan.id);
    } catch (error) {
      console.log('[Workouts] Server-Erstellung fehlgeschlagen, lokal erstellt');
      newPlan = { ...plan, id: Date.now().toString() };
    }

    const updatedPlans = [...workoutPlans, newPlan];
    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const createWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    let newWorkout: Workout;

    try {
      const serverWorkout = await trpcClient.workouts.create.mutate({
        userId: workout.userId,
        name: workout.name,
        date: workout.date,
        duration: workout.duration,
        exercises: workout.exercises,
        completed: workout.completed,
        createdBy: workout.createdBy,
      });
      newWorkout = serverWorkout as Workout;
      console.log('[Workouts] Workout auf Server erstellt:', newWorkout.id);
    } catch (error) {
      console.log('[Workouts] Server-Erstellung fehlgeschlagen, lokal erstellt');
      newWorkout = { ...workout, id: Date.now().toString() };
    }

    const updatedWorkouts = [...workouts, newWorkout];
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [workouts]);

  const updateWorkoutPlan = useCallback(async (planId: string, updatedPlan: WorkoutPlan) => {
    try {
      await trpcClient.plans.update.mutate({
        id: planId,
        name: updatedPlan.name,
        description: updatedPlan.description,
        exercises: updatedPlan.exercises,
        assignedTo: updatedPlan.assignedTo,
        schedule: updatedPlan.schedule,
      });
      console.log('[Workouts] Plan auf Server aktualisiert:', planId);
    } catch (error) {
      console.log('[Workouts] Server-Update fehlgeschlagen, lokal aktualisiert');
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
      console.log('[Workouts] Plan zugewiesen:', planId, '-> User:', userId);
    } catch (error) {
      console.log('[Workouts] Server-Zuweisung fehlgeschlagen, lokal aktualisiert');
    }

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
    getPersonalRecords,
    createWorkout,
    createWorkoutPlan,
    updateWorkoutPlan,
    assignPlanToUser,
    refreshFromServer,
  }), [workouts, workoutPlans, activeWorkout, isLoading, currentUserId, startWorkout, endWorkout, addExerciseToWorkout, updateSet, addSet, removeSet, saveWorkout, getWorkoutHistory, getPersonalRecords, createWorkout, createWorkoutPlan, updateWorkoutPlan, assignPlanToUser, refreshFromServer]);
});
