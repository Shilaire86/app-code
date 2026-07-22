import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface PendingSetLog {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weightLbs: number;
    rpe?: number;
}

interface PendingExercise {
    id: string;
    name: string;
}

export interface PendingWorkoutLog {
    id: string;
    userId: string;
    workoutId: string | null;
    startedAt: string;
    completedAt: string;
    durationSeconds: number;
    setLogs: PendingSetLog[];
    exercises: PendingExercise[];
    attempts?: number;
}

// A permanently-failing entry (e.g. a referenced exercise_id that no longer
// exists) would otherwise retry forever on every reconnect/app-open with no
// visible signal to the user. Drop it after this many failed attempts.
const MAX_SYNC_ATTEMPTS = 5;

interface SyncQueueState {
    queue: PendingWorkoutLog[];
    isSyncing: boolean;
    enqueueWorkout: (entry: PendingWorkoutLog) => void;
    processQueue: () => Promise<void>;
    clearQueue: () => void;
    pendingCount: () => number;
}

export const useSyncQueueStore = create<SyncQueueState>()(
    persist(
        (set, get) => ({
            queue: [],
            isSyncing: false,
            enqueueWorkout: (entry) =>
                set((state) => ({ queue: [...state.queue, entry] })),
            pendingCount: () => get().queue.length,
            clearQueue: () => set({ queue: [] }),
            processQueue: async () => {
                const { queue, isSyncing } = get();
                if (isSyncing || queue.length === 0) return;
                set({ isSyncing: true });

                const remaining: PendingWorkoutLog[] = [];
                const { data: userRes } = await supabase.auth.getUser();
                const activeUserId = userRes?.user?.id ?? null;

                for (const entry of queue) {
                    if (activeUserId && entry.userId !== activeUserId) {
                        // Drop stale entries from a different signed-in user to prevent repeated RLS failures.
                        console.warn('Dropping queued workout for different user', {
                            queuedUserId: entry.userId,
                            activeUserId,
                        });
                        continue;
                    }
                    try {
                        // entry.id is the same client-generated id used for this
                        // workout whether it was queued directly from a failed
                        // finishWorkout() call or from a previous failed sync
                        // attempt. Upserting on it (instead of a plain insert)
                        // means retrying a previously-failed queue entry updates
                        // the existing row rather than creating a duplicate.
                        const { data: log, error: logError } = await supabase
                            .from('workout_logs')
                            .upsert({
                                client_log_id: entry.id,
                                user_id: entry.userId,
                                workout_id: entry.workoutId,
                                started_at: entry.startedAt,
                                completed_at: entry.completedAt,
                                duration_seconds: entry.durationSeconds,
                            }, { onConflict: 'client_log_id' })
                            .select()
                            .single();

                        if (logError) throw logError;

                        if (entry.setLogs.length > 0) {
                            const formattedSets = entry.setLogs.map((s) => ({
                                workout_log_id: log.id,
                                exercise_id: s.exerciseId,
                                set_number: s.setNumber,
                                reps: s.reps,
                                weight_lbs: s.weightLbs,
                                rpe: s.rpe,
                            }));

                            // Clear any sets from a prior partial attempt at this
                            // same log before inserting fresh, for the same
                            // reason as the upsert above.
                            const { error: deleteError } = await supabase
                                .from('set_logs')
                                .delete()
                                .eq('workout_log_id', log.id);
                            if (deleteError) throw deleteError;

                            const { error: setsError } = await supabase
                                .from('set_logs')
                                .insert(formattedSets);
                            if (setsError) throw setsError;
                        }

                        for (const exercise of entry.exercises) {
                            const exerciseSets = entry.setLogs.filter(
                                (s) => s.exerciseId === exercise.id
                            );
                            if (exerciseSets.length === 0) continue;

                            const maxWeight = Math.max(...exerciseSets.map((s) => s.weightLbs));
                            if (maxWeight <= 0) continue;

                            const { data: currentPR } = await supabase
                                .from('prs')
                                .select('weight_lbs')
                                .eq('user_id', entry.userId)
                                .eq('exercise_id', exercise.id)
                                .order('weight_lbs', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (!currentPR || maxWeight > currentPR.weight_lbs) {
                                await supabase.from('prs').insert({
                                    user_id: entry.userId,
                                    exercise_id: exercise.id,
                                    exercise_name: exercise.name,
                                    weight_lbs: maxWeight,
                                    reps: exerciseSets.find((s) => s.weightLbs === maxWeight)?.reps || 1,
                                    achieved_at: new Date().toISOString().split('T')[0],
                                });
                            }
                        }
                    } catch (error) {
                        const attempts = (entry.attempts ?? 0) + 1;
                        if (attempts >= MAX_SYNC_ATTEMPTS) {
                            console.error(
                                `Dropping queued workout after ${attempts} failed sync attempts:`,
                                error
                            );
                            continue;
                        }
                        console.error(`Failed to sync queued workout (attempt ${attempts}):`, error);
                        remaining.push({ ...entry, attempts });
                    }
                }

                set({ queue: remaining, isSyncing: false });
            },
        }),
        {
            name: 'sync-queue-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
