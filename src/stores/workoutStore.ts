import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SetLog {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weightLbs: number;
    rpe?: number;
}

interface WorkoutState {
    activeWorkoutId: string | null;
    startTime: string | null;
    setLogs: SetLog[];
    isPaused: boolean;

    startWorkout: (workoutId: string) => void;
    logSet: (set: SetLog) => void;
    updateSet: (index: number, updates: Partial<SetLog>) => void;
    removeSet: (index: number) => void;
    completeWorkout: () => void;
    discardWorkout: () => void;
    togglePause: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
    persist(
        (set) => ({
            activeWorkoutId: null,
            startTime: null,
            setLogs: [],
            isPaused: false,

            startWorkout: (workoutId) =>
                set({
                    activeWorkoutId: workoutId,
                    startTime: new Date().toISOString(),
                    setLogs: [],
                    isPaused: false,
                }),

            logSet: (setLog) =>
                set((state) => ({
                    setLogs: [...state.setLogs, setLog],
                })),

            updateSet: (index, updates) =>
                set((state) => {
                    const newLogs = [...state.setLogs];
                    newLogs[index] = { ...newLogs[index], ...updates };
                    return { setLogs: newLogs };
                }),

            removeSet: (index) =>
                set((state) => ({
                    setLogs: state.setLogs.filter((_, i) => i !== index),
                })),

            togglePause: () =>
                set((state) => ({ isPaused: !state.isPaused })),

            completeWorkout: () =>
                set({
                    activeWorkoutId: null,
                    startTime: null,
                    setLogs: [],
                    isPaused: false,
                }),

            discardWorkout: () =>
                set({
                    activeWorkoutId: null,
                    startTime: null,
                    setLogs: [],
                    isPaused: false,
                }),
        }),
        {
            name: 'workout-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
