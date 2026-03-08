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
}

interface SyncQueueState {
    queue: PendingWorkoutLog[];
    isSyncing: boolean;
    enqueueWorkout: (entry: PendingWorkoutLog) => void;
    processQueue: () => Promise<void>;
}

export const useSyncQueueStore = create<SyncQueueState>()(
    persist(
        (set, get) => ({
            queue: [],
            isSyncing: false,
            enqueueWorkout: (entry) =>
                set((state) => ({ queue: [...state.queue, entry] })),
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
                        const { data: log, error: logError } = await supabase
                            .from('workout_logs')
                            .insert({
                                user_id: entry.userId,
                                workout_id: entry.workoutId,
                                started_at: entry.startedAt,
                                completed_at: entry.completedAt,
                                duration_seconds: entry.durationSeconds,
                            })
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
                        console.error('Failed to sync queued workout:', error);
                        remaining.push(entry);
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
