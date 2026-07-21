import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Linking, Modal } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { fetchWorkoutSession, fetchProgramDaySession } from '@/services/workouts';
import { fetchAffiliateOffers, fetchCoachPosts, toggleLike, fetchUserLikes, logActivity } from '@/services/feed';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { scheduleStreakNudge } from '@/lib/notifications';
import { getWorkoutStreakSummary } from '@/lib/streaks';

type RepRange = { min: number | null; max: number | null };
type LastSet = { weightLbs: number; reps: number; createdAt: string };
type Guidance = { lastLabel: string; suggestionLabel: string };

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const workoutId = Array.isArray(id) ? id[0] : id;
    const {
        activeWorkoutId,
        startTime,
        setLogs,
        startWorkout,
        logSet,
        updateSet,
        removeSet,
        completeWorkout,
        discardWorkout
    } = useWorkoutStore();
    const { enqueueWorkout } = useSyncQueueStore();
    const userId = useAuthStore(s => s.user?.id ?? null);
    const setLevelUp = useProfileStore(s => s.setLevelUp);
    const fetchProfile = useProfileStore(s => s.fetchProfile);
    const { colors, spacing, radius, typography } = useTheme();

    const errorHandledRef = useRef(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [restRemaining, setRestRemaining] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const restTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [historyByExerciseId, setHistoryByExerciseId] = useState<Record<string, LastSet | null>>({});
    const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [postWorkoutNotes, setPostWorkoutNotes] = useState('');

    // Swap feature state
    const [localExercises, setLocalExercises] = useState<any[]>([]);
    const [checkedExtras, setCheckedExtras] = useState<Record<string, boolean>>({});
    const toggleCheck = (id: string) => setCheckedExtras(prev => ({ ...prev, [id]: !prev[id] }));
    const [swapModalVisible, setSwapModalVisible] = useState(false);
    const [exerciseToSwap, setExerciseToSwap] = useState<any | null>(null);
    const [availableAlternates, setAvailableAlternates] = useState<any[]>([]);
    const [loadingAlternates, setLoadingAlternates] = useState(false);

    const {
        data,
        error,
        isLoading: loading,
    } = useCachedQuery(
        `workout:${workoutId}`,
        async () => {
            // Try new structure first, fall back to old
            try {
                return await fetchProgramDaySession(workoutId as string);
            } catch (e) {
                return await fetchWorkoutSession(workoutId as string);
            }
        },
        { enabled: Boolean(workoutId), staleTimeMs: 60_000 }
    );

    const workout = data?.workout ?? null;
    const initialExercises = data?.exercises ?? [];
    useEffect(() => {
        if (initialExercises.length > 0 && localExercises.length === 0) {
            setLocalExercises(initialExercises);
        }
    }, [initialExercises]);

    // Infer muscle groups from exercise name keywords (future-proofing)
    // Using a more structured mapping to allow for multi-word priority
    const MUSCLE_INFERENCE_DATA: Array<{ key: string; groups: string[] }> = [
        // Priority multi-word matches
        { key: 'leg press', groups: ['legs', 'glutes'] },
        { key: 'bench press', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'chest press', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'overhead press', groups: ['shoulders', 'triceps'] },
        { key: 'shoulder press', groups: ['shoulders', 'triceps'] },
        { key: 'incline press', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'decline press', groups: ['chest', 'triceps'] },
        { key: 'face pull', groups: ['shoulders', 'back'] },
        { key: 'straight arm pulldown', groups: ['back'] },

        // Single word matches
        { key: 'press', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'bench', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'push', groups: ['chest', 'shoulders', 'triceps'] },
        { key: 'fly', groups: ['chest'] },
        { key: 'chest', groups: ['chest'] },
        { key: 'row', groups: ['back', 'biceps'] },
        { key: 'pull', groups: ['back', 'biceps'] },
        { key: 'lat', groups: ['back', 'biceps'] },
        { key: 'back', groups: ['back'] },
        { key: 'squat', groups: ['legs', 'glutes'] },
        { key: 'lunge', groups: ['legs', 'glutes'] },
        { key: 'leg', groups: ['legs', 'glutes'] },
        { key: 'calf', groups: ['legs'] },
        { key: 'deadlift', groups: ['back', 'legs', 'glutes'] },
        { key: 'hip', groups: ['glutes', 'legs'] },
        { key: 'glute', groups: ['glutes', 'legs'] },
        { key: 'curl', groups: ['biceps'] },
        { key: 'bicep', groups: ['biceps'] },
        { key: 'tricep', groups: ['triceps'] },
        { key: 'extension', groups: ['triceps'] },
        { key: 'shoulder', groups: ['shoulders'] },
        { key: 'overhead', groups: ['shoulders', 'triceps'] },
        { key: 'lateral', groups: ['shoulders'] },
        { key: 'raise', groups: ['shoulders'] },
        { key: 'plank', groups: ['core'] },
        { key: 'crunch', groups: ['core'] },
        { key: 'twist', groups: ['core'] },
        { key: 'ab', groups: ['core'] },
    ];

    const inferMuscleGroups = (name: string): string[] => {
        const lower = name.toLowerCase();

        // 1. Try to find an exact multi-word match first
        for (const item of MUSCLE_INFERENCE_DATA) {
            if (item.key.includes(' ') && lower.includes(item.key)) {
                return item.groups;
            }
        }

        // 2. Special case: if it's a "press" but also mentions "leg", it's a leg exercise
        // This is a safety guard for variant names like "Leg Press (machine)"
        if (lower.includes('leg') && lower.includes('press') && !lower.includes('chest') && !lower.includes('bench')) {
            return ['legs', 'glutes'];
        }

        // 3. Otherwise collect standard keywords
        const inferred = new Set<string>();
        for (const item of MUSCLE_INFERENCE_DATA) {
            if (!item.key.includes(' ') && lower.includes(item.key)) {
                item.groups.forEach(g => inferred.add(g));
            }
        }
        return Array.from(inferred);
    };

    const handleShowSwap = async (ex: any) => {
        setExerciseToSwap(ex);
        setSwapModalVisible(true);
        setLoadingAlternates(true);

        try {
            // 1. Use program-defined text alternatives (highest priority — curated per exercise)
            const programAlts: string[] = ex.exercise_alternatives || [];
            if (programAlts.length > 0) {
                setAvailableAlternates(programAlts.map((name: string) => ({
                    id: name,
                    name,
                    equipment: [],
                    muscle_groups: [],
                })));
                setLoadingAlternates(false);
                return;
            }

            // 2. Try explicit alternatives from exercises table (UUID array)
            const altIds = ex.exercises?.alternatives || [];
            if (altIds.length > 0) {
                const { data: alts, error: altsError } = await supabase
                    .from('exercises')
                    .select('*')
                    .in('id', altIds);

                if (!altsError && alts && alts.length > 0) {
                    setAvailableAlternates(alts);
                    return;
                }
            }

            // 2. Fallback: find exercises with overlapping muscle groups
            let muscleGroups = ex.exercises?.muscle_groups || [];

            // If no muscle groups from DB, infer from exercise name
            if (muscleGroups.length === 0) {
                muscleGroups = inferMuscleGroups(ex.exercises?.name || '');
            }

            if (muscleGroups.length > 0) {
                const { data: fallbackAlts, error: fallbackError } = await supabase
                    .from('exercises')
                    .select('*')
                    .overlaps('muscle_groups', muscleGroups)
                    .neq('name', ex.exercises?.name || '')
                    .limit(8);

                if (!fallbackError && fallbackAlts && fallbackAlts.length > 0) {
                    setAvailableAlternates(fallbackAlts);
                    return;
                }
            }

            // 3. Last resort: search by keywords from the exercise name
            const nameWords = (ex.exercises?.name || '')
                .split(/[\s()/,]+/)
                .filter((w: string) => w.length > 3 && !['machine', 'dumbbell', 'barbell', 'cable'].includes(w.toLowerCase()));

            for (const keyword of nameWords) {
                const { data: keywordAlts } = await supabase
                    .from('exercises')
                    .select('*')
                    .ilike('name', `%${keyword}%`)
                    .neq('name', ex.exercises?.name || '')
                    .limit(8);

                if (keywordAlts && keywordAlts.length > 0) {
                    setAvailableAlternates(keywordAlts);
                    return;
                }
            }

            // Nothing found at all
            setAvailableAlternates([]);
        } catch (err) {
            console.error('Error fetching alternates:', err);
            showAlert('Error', 'Failed to load alternative exercises');
        } finally {
            setLoadingAlternates(false);
        }
    };

    const performSwap = (newExercise: any) => {
        if (!exerciseToSwap) return;

        setLocalExercises(prev => prev.map(ex => {
            if (ex.id === exerciseToSwap.id) {
                return {
                    ...ex,
                    exercises: newExercise
                };
            }
            return ex;
        }));

        setSwapModalVisible(false);
        setExerciseToSwap(null);
    };

    const togglePause = () => setIsPaused(prev => !prev);

    function isLowerBodyExercise(name: string) {
        const s = name.toLowerCase();
        return (
            s.includes('squat') ||
            s.includes('deadlift') ||
            s.includes('leg press') ||
            s.includes('lunge') ||
            s.includes('rdl') ||
            s.includes('romanian') ||
            s.includes('hip thrust') ||
            s.includes('glute') ||
            s.includes('hamstring') ||
            s.includes('quad') ||
            s.includes('calf')
        );
    }

    function parseTargetRange(ex: any): RepRange {
        // Handle new structure: reps_target string like "8-12"
        if (ex?.reps_target && typeof ex.reps_target === 'string') {
            const match = ex.reps_target.match(/(\d+)-(\d+)/);
            if (match) {
                return { min: parseInt(match[1]), max: parseInt(match[2]) };
            }
            const single = parseInt(ex.reps_target);
            if (!isNaN(single)) return { min: single, max: single };
        }
        // Handle old structure: reps_min/reps_max
        const min = typeof ex?.reps_min === 'number' ? ex.reps_min : ex?.reps_min ? Number(ex.reps_min) : null;
        const max = typeof ex?.reps_max === 'number' ? ex.reps_max : ex?.reps_max ? Number(ex.reps_max) : null;
        return {
            min: Number.isFinite(min as any) ? (min as number) : null,
            max: Number.isFinite(max as any) ? (max as number) : null,
        };
    }

    function computeSuggestedLoad(args: {
        lastWeight: number | null;
        lastReps: number | null;
        targetRepsRange: RepRange;
        isLowerBody: boolean;
    }): Guidance {
        const { lastWeight, lastReps, targetRepsRange, isLowerBody } = args;
        const inc = isLowerBody ? 10 : 5;
        const lastLabel =
            lastWeight != null && lastReps != null
                ? `Last time: ${Math.round(lastWeight)} lb x ${lastReps}`
                : 'Last time: —';

        if (lastWeight == null || lastReps == null) {
            return {
                lastLabel,
                suggestionLabel: 'Suggested today: start light and leave 2 reps in reserve (RIR 2).',
            };
        }

        const min = targetRepsRange.min ?? null;
        const max = targetRepsRange.max ?? null;

        // Conservative rule:
        // - If they hit the top of the target range (or higher), suggest a small increase window.
        // - If they missed minimum reps, suggest holding or a small decrease.
        // - Otherwise, suggest repeating last load.
        if (max != null && lastReps >= max) {
            return {
                lastLabel,
                suggestionLabel: `Suggested today: ${Math.round(lastWeight)}-${Math.round(lastWeight + inc)} lb`,
            };
        }

        if (min != null && lastReps < min) {
            const down = Math.max(0, Math.round(lastWeight - 5));
            return {
                lastLabel,
                suggestionLabel: `Suggested today: ${down}-${Math.round(lastWeight)} lb`,
            };
        }

        return {
            lastLabel,
            suggestionLabel: `Suggested today: ${Math.round(lastWeight)} lb`,
        };
    }

    useEffect(() => {
        if (startTime && !isPaused) {
            const start = new Date(startTime).getTime();
            // If we've been paused, we need to adjust for that.
            // But for simplicity in this MVP, we use elapsedTime which we increment.
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [startTime, isPaused]);

    useEffect(() => {
        if (restRemaining === null) return;
        if (restRemaining <= 0) {
            setRestRemaining(null);
            return;
        }

        restTimerRef.current = setTimeout(() => {
            setRestRemaining((prev) => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => {
            if (restTimerRef.current) clearTimeout(restTimerRef.current);
        };
    }, [restRemaining]);

    useEffect(() => {
        if (!workoutId || !data) return;

        if (activeWorkoutId !== workoutId) {
            startWorkout(workoutId);
            initialExercises
                .filter((ex: any) => !ex.is_warmup && !ex.is_cooldown)
                .forEach((ex: any) => {
                    for (let i = 0; i < ex.sets; i++) {
                        logSet({
                            exerciseId: ex.exercises.id,
                            setNumber: i + 1,
                            reps: 0,
                            weightLbs: 0,
                        });
                    }
                });
        }
    }, [workoutId, data, activeWorkoutId, initialExercises, startWorkout, logSet]);

    useEffect(() => {
        if (!userId) return;
        if (!localExercises || localExercises.length === 0) return;
        if (historyLoadFailed) return;

        let cancelled = false;

        async function loadLastSets() {
            try {
                // Build list of exercises to query
                const exerciseList = localExercises.map((ex: any) => ({
                    id: ex?.exercises?.id,
                    name: ex?.exercises?.name,
                }));

                // Avoid refetching exercises we already have
                const missing = exerciseList.filter((ex) => !(ex.id in historyByExerciseId));
                if (missing.length === 0) return;

                const results = await Promise.all(
                    missing.map(async (exercise) => {
                        // For new structure (no exercise_id), query by name
                        // For old structure, query by exercise_id
                        let query = supabase
                            .from('set_logs')
                            .select('reps,weight_lbs,created_at,exercise_name,exercise_id,workout_logs!inner(user_id)')
                            .eq('workout_logs.user_id', userId)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        if (exercise.id) {
                            // Old structure: match by exercise_id
                            query = query.eq('exercise_id', exercise.id);
                        } else if (exercise.name) {
                            // New structure: match by exercise_name (case-insensitive)
                            query = query.ilike('exercise_name', exercise.name);
                        } else {
                            return { exerciseId: exercise.id || exercise.name, last: null as LastSet | null, error: null };
                        }

                        const { data, error } = await query.maybeSingle();

                        if (error) {
                            return { exerciseId: exercise.id || exercise.name, last: null as LastSet | null, error };
                        }

                        const weightNum = data?.weight_lbs != null ? Number(data.weight_lbs) : null;
                        const repsNum = data?.reps != null ? Number(data.reps) : null;
                        if (!weightNum || !repsNum) {
                            return { exerciseId: exercise.id || exercise.name, last: null as LastSet | null, error: null };
                        }

                        return {
                            exerciseId: exercise.id || exercise.name,
                            last: {
                                weightLbs: weightNum,
                                reps: repsNum,
                                createdAt: String(data?.created_at ?? ''),
                            } satisfies LastSet,
                            error: null,
                        };
                    })
                );

                if (cancelled) return;

                const next: Record<string, LastSet | null> = {};
                for (const r of results) {
                    // If any query fails, we still proceed for others; UI will hide if globally failing.
                    next[r.exerciseId] = r.last;
                }
                setHistoryByExerciseId((prev) => ({ ...prev, ...next }));
            } catch (_e) {
                if (!cancelled) setHistoryLoadFailed(true);
            }
        }

        loadLastSets();
        return () => {
            cancelled = true;
        };
        // Intentionally exclude historyByExerciseId from deps to prevent request loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, localExercises, historyLoadFailed]);

    useEffect(() => {
        if (!error || errorHandledRef.current) return;
        errorHandledRef.current = true;
        console.error('Error fetching active workout:', error);
        showAlert('Error', 'Failed to load workout details');
        router.back();
    }, [error, router]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startRestTimer = (seconds: number) => {
        if (!seconds || seconds <= 0) return;
        setRestRemaining(seconds);
    };

    const finishWorkout = async () => {
        try {
            // Check if this is a new structure workout (program_day_id vs workout_id)
            const isNewStructure = (data as any)?.workout?.isNewStructure === true;

            // 1. Save Workout Log
            const { data: log, error: logError } = await supabase
                .from('workout_logs')
                .insert({
                    user_id: userId,
                    workout_id: isNewStructure ? null : activeWorkoutId,
                    started_at: startTime,
                    completed_at: new Date().toISOString(),
                    duration_seconds: elapsedTime,
                    notes: postWorkoutNotes.trim() || null,
                })
                .select()
                .single();

            if (logError) throw logError;

            // 2. Save Set Logs
            if (setLogs.length > 0) {
                const formattedSets = setLogs.map(s => ({
                    workout_log_id: log.id,
                    exercise_id: s.exerciseId, // set_logs.exercise_id is NOT NULL
                    set_number: s.setNumber,
                    reps: s.reps,
                    weight_lbs: s.weightLbs,
                    rpe: s.rpe
                }));

                const { error: setsError } = await supabase
                    .from('set_logs')
                    .insert(formattedSets);

                if (setsError) throw setsError;

                // 3. Check for PRs (only for exercises with valid exercise_id)
                for (const exercise of localExercises) {
                    // Skip PR check for new structure programs (synthetic IDs)
                    if (!exercise.exercises?.id || isNewStructure) continue;

                    const exerciseSets = setLogs.filter(s => s.exerciseId === exercise.exercises.id);
                    if (exerciseSets.length === 0) continue;

                    const maxWeight = Math.max(...exerciseSets.map(s => s.weightLbs));
                    if (maxWeight <= 0) continue;

                    // Get current PR for this exercise
                    const { data: currentPR } = await supabase
                        .from('prs')
                        .select('weight_lbs')
                        .eq('user_id', userId)
                        .eq('exercise_id', exercise.exercises.id)
                        .order('weight_lbs', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!currentPR || maxWeight > currentPR.weight_lbs) {
                        // New PR!
                        await supabase
                            .from('prs')
                            .insert({
                                user_id: userId,
                                exercise_id: exercise.exercises.id,
                                exercise_name: exercise.exercises.name,
                                weight_lbs: maxWeight,
                                reps: exerciseSets.find(s => s.weightLbs === maxWeight)?.reps || 1,
                                achieved_at: new Date().toISOString().split('T')[0]
                            });

                        // Log PR activity
                        if (userId) {
                            await logActivity(userId, 'pr_set', {
                                exercise_name: exercise.exercises.name,
                                weight: maxWeight,
                                reps: exerciseSets.find(s => s.weightLbs === maxWeight)?.reps || 1
                            });
                        }
                    }
                }
            }

            // Log Workout Completion activity
            if (userId) {
                await logActivity(userId, 'workout_complete', {
                    workout_name: (data as any)?.workout?.name || 'Workout'
                });

                // Milestone check (10, 25, 50, 100 workouts)
                const { count } = await supabase
                    .from('workout_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId);

                const workoutCount = (count || 0) + 1; // +1 for the one we just saved
                const milestones = [10, 25, 50, 100, 250, 500];
                if (milestones.includes(workoutCount)) {
                    await logActivity(userId, 'milestone', {
                        milestone: `${workoutCount} Workouts Completed`
                    });
                }
            }

            // 4. Recalculate Becoming Stage and check for level-up
            let stageChanged = false;
            let newStage = '';
            if (userId) {
                try {
                    const { recalculateStage } = await import('@/services/stageService');
                    const stageResult = await recalculateStage(userId, { force: true });
                    stageChanged = stageResult.changed;
                    newStage = stageResult.current;
                    if (stageChanged) {
                        setLevelUp(stageResult.previous, stageResult.current as any);
                        // Log stage-up to the community feed
                        await logActivity(userId, 'stage_up', {
                            previous_stage: stageResult.previous,
                            new_stage: stageResult.current,
                        });
                    }
                } catch (stageErr) {
                    console.warn('[Workout] Stage recalculation failed:', stageErr);
                }
            }

            // 5. Refresh Profile Points
            if (userId) {
                void fetchProfile(userId);
            }

            completeWorkout();
            router.replace('/(tabs)');

            // 6. Schedule Streak Nudge
            if (userId) {
                getWorkoutStreakSummary(userId, { force: true }).then(summary => {
                    if (summary.streakDays >= 1) {
                        scheduleStreakNudge(summary.streakDays);
                    }
                }).catch(err => console.error('[Workout] Failed to schedule nudge:', err));
            }

            if (stageChanged) {
                showAlert(
                    "🎉 Stage Up!",
                    `You've ascended to ${newStage.toUpperCase()}! Keep going.`,
                    [{ text: "Let's Go!", style: 'default' }]
                );
            } else {
                showAlert("Success", "Workout completed! +5 Becoming Points earned.");
            }
        } catch (error) {
            console.error('Error saving workout:', error);
            if (userId && startTime) {
                enqueueWorkout({
                    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    userId,
                    workoutId: activeWorkoutId,
                    startedAt: startTime,
                    completedAt: new Date().toISOString(),
                    durationSeconds: elapsedTime,
                    setLogs: setLogs.map((log) => ({
                        exerciseId: log.exerciseId,
                        setNumber: log.setNumber,
                        reps: log.reps,
                        weightLbs: log.weightLbs,
                        rpe: log.rpe,
                    })),
                    exercises: localExercises.map((ex: any) => ({
                        id: ex.exercises.id,
                        name: ex.exercises.name,
                    })),
                });

                // Also schedule nudge for offline completion if possible
                getWorkoutStreakSummary(userId, { force: true }).then(summary => {
                    if (summary.streakDays >= 1) {
                        scheduleStreakNudge(summary.streakDays);
                    }
                }).catch(() => { });
            }

            showAlert("Error", "Workout saved locally and will sync when you're back online.");
            completeWorkout();
            router.replace('/(tabs)');
        }
    };

    const handleFinish = async () => {
        // RN Web's Alert buttons can be unreliable; use a simple confirm there.
        if ((globalThis as any)?.document) {
            // eslint-disable-next-line no-alert
            const ok = globalThis.confirm?.("Finish workout?\n\nReady to submit your hard work?");
            if (ok) finishWorkout();
            return;
        }

        showAlert(
            "Finish Workout",
            "Ready to submit your hard work?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Finish", style: "default", onPress: finishWorkout }
            ]
        );
    };

    const exitActiveWorkout = () => {
        discardWorkout();
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/(tabs)');
    };

    const handleDiscard = () => {
        // RN Web's Alert buttons can be unreliable; use a simple confirm there.
        if ((globalThis as any)?.document) {
            // eslint-disable-next-line no-alert
            const ok = globalThis.confirm?.("Discard workout?\n\nThis progress will be lost.");
            if (ok) exitActiveWorkout();
            return;
        }

        showAlert(
            "Discard Workout",
            "Are you sure? This progress will be lost.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: exitActiveWorkout
                }
            ]
        );
    };

    const styles = createStyles({ colors, spacing, radius, typography });

    if (loading || !workout) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Active Workout',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerLeft: () => null,
                headerRight: () => (
                    <TouchableOpacity onPress={handleDiscard}>
                        <Text style={{ color: colors.error, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.timerHeader}>
                <View style={styles.timerRow}>
                    <View>
                        <Text style={styles.timerLabel}>Workout Time</Text>
                        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                    </View>
                    <View style={styles.headerControls}>
                        <TouchableOpacity
                            style={[styles.controlButton, isPaused && styles.resumeButton]}
                            onPress={togglePause}
                        >
                            <Ionicons
                                name={isPaused ? "play" : "pause"}
                                size={20}
                                color="#FFF"
                            />
                            <Text style={styles.controlButtonText}>
                                {isPaused ? "Resume" : "Pause"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.programName}>{workout?.programs?.name}</Text>
            </View>
            {restRemaining !== null && (
                <View style={styles.restBar}>
                    <View>
                        <Text style={styles.restLabel}>Rest Counter</Text>
                        <Text style={styles.restTime}>{formatTime(restRemaining)}</Text>
                    </View>
                    <TouchableOpacity style={styles.restCancelButton} onPress={() => setRestRemaining(null)}>
                        <Text style={styles.restCancel}>Skip Rest</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Warm-Up Section */}
                {localExercises.some((e: any) => e.is_warmup) && (
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="sunny-outline" size={14} color={colors.primary} />
                            <Text style={styles.sectionHeaderText}>WARM-UP</Text>
                        </View>
                        {localExercises.filter((e: any) => e.is_warmup).map((ex: any) => (
                            <View key={ex.id} style={styles.extraExCard}>
                                <View style={styles.extraExInfo}>
                                    <Text style={styles.extraExName}>{ex.exercises.name}</Text>
                                    {ex.reps_target && (
                                        <Text style={styles.extraExSub}>{ex.reps_target}</Text>
                                    )}
                                    {ex.notes && (
                                        <Text style={styles.extraExNote}>{ex.notes}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => toggleCheck(ex.id)}>
                                    <Ionicons
                                        name={checkedExtras[ex.id] ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                        size={28}
                                        color={checkedExtras[ex.id] ? colors.primary : 'rgba(255,255,255,0.25)'}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Main Work Section header — only shown when other sections are also present */}
                {(localExercises.some((e: any) => e.is_warmup) || localExercises.some((e: any) => e.is_cooldown)) &&
                    localExercises.some((e: any) => !e.is_warmup && !e.is_cooldown) && (
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="barbell-outline" size={14} color={colors.primary} />
                        <Text style={styles.sectionHeaderText}>MAIN WORK</Text>
                    </View>
                )}

                {localExercises.filter((e: any) => !e.is_warmup && !e.is_cooldown).map((ex) => {
                    const exerciseSets = setLogs.filter(log => log.exerciseId === ex.exercises.id);
                    const last = historyByExerciseId[ex.exercises.id] ?? null;
                    const targetRepsRange = parseTargetRange(ex);
                    const guidance = computeSuggestedLoad({
                        lastWeight: last?.weightLbs ?? null,
                        lastReps: last?.reps ?? null,
                        targetRepsRange,
                        isLowerBody: isLowerBodyExercise(ex.exercises.name),
                    });

                    return (
                        <View key={ex.id} style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.exerciseName}>{ex.exercises.name}</Text>
                                        <TouchableOpacity
                                            style={styles.inlineSwapButton}
                                            onPress={() => handleShowSwap(ex)}
                                        >
                                            <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                                            <Text style={styles.inlineSwapText}>Swap</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {ex.exercises.video_url && (
                                    <TouchableOpacity
                                        style={styles.demoButton}
                                        onPress={() => Linking.openURL(ex.exercises.video_url)}
                                    >
                                        <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
                                        <Text style={styles.demoText}>Demo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={styles.prescription}>
                                {ex.sets} Sets • {ex.reps_target || `${ex.reps_min}-${ex.reps_max}`} Reps
                            </Text>
                            {ex.notes && (
                                <Text style={styles.extraExNote}>{ex.notes}</Text>
                            )}
                            {guidance && (
                                <View style={styles.guidanceBox}>
                                    <Text style={styles.guidanceText}>{guidance.lastLabel}</Text>
                                    <Text style={styles.guidanceText}>{guidance.suggestionLabel}</Text>
                                </View>
                            )}
                            {ex.rest_seconds ? (
                                <TouchableOpacity
                                    style={styles.restButton}
                                    onPress={() => startRestTimer(ex.rest_seconds)}
                                >
                                    <Ionicons name="timer-outline" size={16} color={colors.primary} />
                                    <Text style={styles.restButtonText}>
                                        Start Rest ({ex.rest_seconds}s)
                                    </Text>
                                </TouchableOpacity>
                            ) : null}

                            <View style={styles.setsHeader}>
                                <Text style={[styles.colLabel, { flex: 0.5 }]}>SET</Text>
                                <Text style={styles.colLabel}>LBS</Text>
                                <Text style={styles.colLabel}>REPS</Text>
                                <Text style={styles.colLabel}>RPE</Text>
                            </View>

                            {exerciseSets.map((log, i) => (
                                <View key={`${ex.id}-${i}`} style={styles.setRow}>
                                    <View style={[styles.setCircle, { flex: 0.5 }]}>
                                        <Text style={styles.setText}>{i + 1}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.inputBox}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textTertiary}
                                        value={log.weightLbs > 0 ? log.weightLbs.toString() : ''}
                                        onChangeText={(val) => {
                                            const index = setLogs.indexOf(log);
                                            updateSet(index, { weightLbs: parseFloat(val) || 0 });
                                        }}
                                    />
                                    <TextInput
                                        style={styles.inputBox}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textTertiary}
                                        value={log.reps > 0 ? log.reps.toString() : ''}
                                        onChangeText={(val) => {
                                            const index = setLogs.indexOf(log);
                                            updateSet(index, { reps: parseInt(val) || 0 });
                                        }}
                                    />
                                    <TextInput
                                        style={styles.inputBox}
                                        keyboardType="numeric"
                                        placeholder="-"
                                        placeholderTextColor={colors.textTertiary}
                                        value={log.rpe && log.rpe > 0 ? log.rpe.toString() : ''}
                                        onChangeText={(val) => {
                                            const index = setLogs.indexOf(log);
                                            updateSet(index, { rpe: parseFloat(val) || 0 });
                                        }}
                                    />
                                </View>
                            ))}

                            <TouchableOpacity
                                style={styles.addSetButton}
                                onPress={() => logSet({
                                    exerciseId: ex.exercises.id,
                                    setNumber: exerciseSets.length + 1,
                                    reps: 0,
                                    weightLbs: 0
                                })}
                            >
                                <Ionicons name="add" size={18} color={colors.primary} />
                                <Text style={styles.addSetText}>Add Set</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Post-Workout Section */}
                {localExercises.some((e: any) => e.is_cooldown) && (
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="leaf-outline" size={14} color="rgba(255,152,0,0.9)" />
                            <Text style={[styles.sectionHeaderText, { color: 'rgba(255,152,0,0.9)' }]}>POST-WORKOUT</Text>
                        </View>
                        {localExercises.filter((e: any) => e.is_cooldown).map((ex: any) => (
                            <View key={ex.id} style={styles.extraExCard}>
                                <View style={styles.extraExInfo}>
                                    <Text style={styles.extraExName}>{ex.exercises.name}</Text>
                                    {ex.reps_target && (
                                        <Text style={styles.extraExSub}>{ex.reps_target}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => toggleCheck(ex.id)}>
                                    <Ionicons
                                        name={checkedExtras[ex.id] ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                        size={28}
                                        color={checkedExtras[ex.id] ? 'rgba(255,152,0,0.9)' : 'rgba(255,255,255,0.25)'}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Post-Workout Notes */}
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.sectionHeaderText}>NOTES FOR YOUR COACH</Text>
                    </View>
                    <TextInput
                        style={styles.notesInput}
                        value={postWorkoutNotes}
                        onChangeText={setPostWorkoutNotes}
                        placeholder="How did this session feel? (optional)"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerButtons}>
                    <TouchableOpacity style={styles.stopButton} onPress={handleDiscard}>
                        <Text style={styles.stopText}>Stop Workout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                        <Text style={styles.finishText}>Finish Workout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Swap Exercise Modal */}
            <Modal
                visible={swapModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSwapModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Swap Exercise</Text>
                            <TouchableOpacity onPress={() => setSwapModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Select an alternative for {exerciseToSwap?.exercises?.name}
                        </Text>

                        {loadingAlternates ? (
                            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
                        ) : availableAlternates.length > 0 ? (
                            <ScrollView style={styles.alternatesList}>
                                {availableAlternates.map((alt) => (
                                    <TouchableOpacity
                                        key={alt.id}
                                        style={styles.alternateItem}
                                        onPress={() => performSwap(alt)}
                                    >
                                        <View>
                                            <Text style={styles.alternateName}>{alt.name}</Text>
                                            <Text style={styles.alternateEquipment}>
                                                Equipment: {alt.equipment?.join(', ') || 'None'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyAlternates}>
                                <Ionicons name="information-circle-outline" size={32} color={colors.textTertiary} />
                                <Text style={styles.emptyText}>No specific alternatives found in the library.</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.cancelModalButton}
                            onPress={() => setSwapModalVisible(false)}
                        >
                            <Text style={styles.cancelModalButtonText}>Keep Original</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: Pick<ReturnType<typeof useTheme>, 'colors' | 'spacing' | 'radius' | 'typography'>) =>
    StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerHeader: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    timerLabel: {
        ...typography.label,
        color: colors.textSecondary,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.borderMid,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
    },
    resumeButton: {
        backgroundColor: colors.primary,
    },
    controlButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    restBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.successSoft,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    restCancelButton: {
        backgroundColor: colors.borderMid,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.sm,
    },
    restLabel: {
        ...typography.label,
        color: colors.textSecondary,
    },
    restTime: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    restCancel: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    programName: {
        ...typography.label,
        color: colors.textSecondary,
    },
    timerText: {
        color: colors.primary,
        fontSize: 32,
        fontWeight: '800',
        marginTop: 4,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 100,
    },
    sectionBlock: {
        marginBottom: spacing.sm,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    sectionHeaderText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    notesInput: {
        color: colors.text,
        fontSize: 14,
        minHeight: 70,
        textAlignVertical: 'top',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.sm,
    },
    extraExCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    extraExInfo: {
        flex: 1,
    },
    extraExName: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    extraExSub: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    extraExNote: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 2,
        fontStyle: 'italic',
    },
    exerciseCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    exerciseName: {
        ...typography.h4,
        color: colors.text,
        flex: 1,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    swapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
    },
    swapText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    inlineSwapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.sm,
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    inlineSwapText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    demoText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    prescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 4,
    },
    guidanceBox: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: 10,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    guidanceText: {
        ...typography.captionMedium,
        color: colors.textSecondary,
    },
    restButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.sm,
    },
    restButtonText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    setsHeader: {
        flexDirection: 'row',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    colLabel: {
        flex: 1,
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    setCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderMid,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    setText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    inputBox: {
        flex: 1,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        marginHorizontal: 4,
        textAlign: 'center',
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        padding: spacing.sm,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.borderMid,
        borderRadius: radius.md,
    },
    addSetText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    inputText: {
        color: colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        paddingBottom: 40,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    stopButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
        backgroundColor: colors.errorSoft,
    },
    stopText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },
    finishButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    finishText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.text,
    },
    modalSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    alternatesList: {
        marginBottom: spacing.xl,
    },
    alternateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    alternateName: {
        ...typography.bodyMedium,
        color: colors.text,
        marginBottom: 2,
    },
    alternateEquipment: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    emptyAlternates: {
        alignItems: 'center',
        padding: 40,
        gap: 12,
    },
    emptyText: {
        color: colors.textTertiary,
        textAlign: 'center',
        fontSize: 14,
    },
    cancelModalButton: {
        padding: spacing.md,
        alignItems: 'center',
    },
    cancelModalButtonText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
