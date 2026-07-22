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
    // Which user started this in-progress workout. Persisted alongside the
    // rest of the state so a different account signing in on the same
    // device (after the previous user left a workout unfinished — app
    // killed, backgrounded, no clean logout) can detect the mismatch and
    // refuse to resume into someone else's unsaved reps/weights.
    userId: string | null;
    startTime: string | null;
    setLogs: SetLog[];
    isPaused: boolean;

    startWorkout: (workoutId: string, userId: string) => void;
    logSet: (set: SetLog) => void;
    updateSet: (index: number, updates: Partial<SetLog>) => void;
    removeSet: (index: number) => void;
    completeWorkout: () => void;
    discardWorkout: () => void;
    togglePause: () => void;
    reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
    persist(
        (set) => ({
            activeWorkoutId: null,
            userId: null,
            startTime: null,
            setLogs: [],
            isPaused: false,

            startWorkout: (workoutId, userId) =>
                set({
                    activeWorkoutId: workoutId,
                    userId,
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
                    userId: null,
                    startTime: null,
                    setLogs: [],
                    isPaused: false,
                }),

            discardWorkout: () =>
                set({
                    activeWorkoutId: null,
                    userId: null,
                    startTime: null,
                    setLogs: [],
                    isPaused: false,
                }),

            reset: () =>
                set({
                    activeWorkoutId: null,
                    userId: null,
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
