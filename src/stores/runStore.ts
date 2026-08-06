import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RunCoords = { latitude: number; longitude: number };

interface RunState {
    activeRunId: string | null;
    // Same reasoning as workoutStore: persisted so a different account
    // signing in on a shared device doesn't resume someone else's
    // in-progress run.
    userId: string | null;
    startTime: string | null;
    distanceMeters: number;
    // Last GPS fix we accepted, used by the background location task to
    // compute the incremental distance for the next fix. Persisted so the
    // task can resume correctly even if the JS engine was fully restarted
    // to service a background location update (normal on iOS).
    lastCoords: RunCoords | null;
    isPaused: boolean;
    // Total time spent paused, plus when the current pause began (if any) —
    // elapsed time is computed from wall-clock time (Date.now() - startTime
    // - paused time) rather than accumulated via a tick counter, since
    // setInterval ticks are throttled/dropped while backgrounded. See
    // workout/active.tsx's computeElapsedSeconds for the same pattern.
    pausedMs: number;
    pauseStartedAt: number | null;
    // AsyncStorage rehydration is async — see workoutStore for why consumers
    // must wait for this before trusting activeRunId/etc.
    hasHydrated: boolean;
    setHasHydrated: (value: boolean) => void;

    startRun: (runId: string, userId: string) => void;
    addDistance: (meters: number, coords: RunCoords) => void;
    setLastCoords: (coords: RunCoords) => void;
    togglePause: () => void;
    finishRun: () => void;
    discardRun: () => void;
}

const emptyRunState = {
    activeRunId: null,
    userId: null,
    startTime: null,
    distanceMeters: 0,
    lastCoords: null,
    isPaused: false,
    pausedMs: 0,
    pauseStartedAt: null,
};

export const useRunStore = create<RunState>()(
    persist(
        (set) => ({
            ...emptyRunState,
            hasHydrated: false,
            setHasHydrated: (value) => set({ hasHydrated: value }),

            startRun: (runId, userId) =>
                set({
                    ...emptyRunState,
                    activeRunId: runId,
                    userId,
                    startTime: new Date().toISOString(),
                }),

            addDistance: (meters, coords) =>
                set((state) => ({
                    distanceMeters: state.distanceMeters + Math.max(0, meters),
                    lastCoords: coords,
                })),

            setLastCoords: (coords) => set({ lastCoords: coords }),

            togglePause: () =>
                set((state) => {
                    const next = !state.isPaused;
                    if (next) {
                        return { isPaused: true, pauseStartedAt: Date.now() };
                    }
                    const addedMs = state.pauseStartedAt ? Date.now() - state.pauseStartedAt : 0;
                    return { isPaused: false, pauseStartedAt: null, pausedMs: state.pausedMs + addedMs };
                }),

            finishRun: () => set({ ...emptyRunState }),
            discardRun: () => set({ ...emptyRunState }),
        }),
        {
            name: 'run-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

/** Elapsed seconds since the run started, excluding time spent paused. */
export function computeRunElapsedSeconds(state: {
    startTime: string | null;
    pausedMs: number;
    pauseStartedAt: number | null;
}): number {
    if (!state.startTime) return 0;
    const start = new Date(state.startTime).getTime();
    const currentPauseMs = state.pauseStartedAt ? Date.now() - state.pauseStartedAt : 0;
    const totalPausedMs = state.pausedMs + currentPauseMs;
    return Math.max(0, Math.floor((Date.now() - start - totalPausedMs) / 1000));
}
