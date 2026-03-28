import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Workout, WorkoutPlan, WorkoutExercise, WorkoutSet } from '@/types/workout';


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
}

export const [WorkoutProvider, useWorkouts] = createContextHook<WorkoutState>(() => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [storedWorkouts, storedPlans] = await Promise.all([
        AsyncStorage.getItem('workouts'),
        AsyncStorage.getItem('workoutPlans'),
      ]);
      
      if (storedWorkouts) setWorkouts(JSON.parse(storedWorkouts));
      if (storedPlans) setWorkoutPlans(JSON.parse(storedPlans));
    } catch (error) {
      console.error('Error loading workout data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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

    const completedWorkout = {
      ...activeWorkout,
      completed: true,
      duration: Date.now() - new Date(activeWorkout.date).getTime(),
    };

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

  const createWorkoutPlan = useCallback(async (plan: Omit<WorkoutPlan, 'id'>) => {
    const newPlan: WorkoutPlan = {
      ...plan,
      id: Date.now().toString(),
    };

    const updatedPlans = [...workoutPlans, newPlan];
    setWorkoutPlans(updatedPlans);
    
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const createWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    const newWorkout: Workout = {
      ...workout,
      id: Date.now().toString(),
    };

    const updatedWorkouts = [...workouts, newWorkout];
    setWorkouts(updatedWorkouts);
    
    await AsyncStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }, [workouts]);

  const updateWorkoutPlan = useCallback(async (planId: string, updatedPlan: WorkoutPlan) => {
    const updatedPlans = workoutPlans.map(p => 
      p.id === planId ? updatedPlan : p
    );
    
    setWorkoutPlans(updatedPlans);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  }, [workoutPlans]);

  const assignPlanToUser = useCallback(async (planId: string, userId: string) => {
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
    createWorkout,
    createWorkoutPlan,
    updateWorkoutPlan,
    assignPlanToUser,
  }), [workouts, workoutPlans, activeWorkout, isLoading, currentUserId, startWorkout, endWorkout, addExerciseToWorkout, updateSet, addSet, removeSet, saveWorkout, getWorkoutHistory, createWorkout, createWorkoutPlan, updateWorkoutPlan, assignPlanToUser]);
});