import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
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

    const [workout, setWorkout] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchWorkoutDetails();
    }, [id]);

    useEffect(() => {
        if (startTime) {
            const start = new Date(startTime).getTime();
            timerRef.current = setInterval(() => {
                const now = new Date().getTime();
                setElapsedTime(Math.floor((now - start) / 1000));
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [startTime]);

    async function fetchWorkoutDetails() {
        try {
            const { data: workoutData, error: wError } = await supabase
                .from('workouts')
                .select('*, programs(name)')
                .eq('id', id)
                .single();

            if (wError) throw wError;
            setWorkout(workoutData);

            const { data: exData, error: eError } = await supabase
                .from('workout_exercises')
                .select('*, exercises(*)')
                .eq('workout_id', id)
                .order('order_index', { ascending: true });

            if (eError) throw eError;
            setExercises(exData || []);

            // Start/Reset the workout in store if not already started
            if (activeWorkoutId !== id) {
                startWorkout(id as string);

                // Pre-populate set logs with empty rows for each prescribed set
                exData?.forEach((ex: any) => {
                    for (let i = 0; i < ex.sets; i++) {
                        logSet({
                            exerciseId: ex.exercises.id,
                            setNumber: i + 1,
                            reps: 0,
                            weightLbs: 0
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching active workout:', error);
            Alert.alert('Error', 'Failed to load workout details');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinish = async () => {
        Alert.alert(
            "Finish Workout",
            "Ready to submit your hard work?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Finish",
                    style: "default",
                    onPress: async () => {
                        try {
                            // 1. Save Workout Log
                            const { data: log, error: logError } = await supabase
                                .from('workout_logs')
                                .insert({
                                    user_id: useAuthStore.getState().user?.id,
                                    workout_id: activeWorkoutId,
                                    started_at: startTime,
                                    completed_at: new Date().toISOString(),
                                    duration_seconds: elapsedTime
                                })
                                .select()
                                .single();

                            if (logError) throw logError;

                            // 2. Save Set Logs
                            if (setLogs.length > 0) {
                                const formattedSets = setLogs.map(s => ({
                                    workout_log_id: log.id,
                                    exercise_id: s.exerciseId,
                                    set_number: s.setNumber,
                                    reps: s.reps,
                                    weight_lbs: s.weightLbs,
                                    rpe: s.rpe
                                }));

                                const { error: setsError } = await supabase
                                    .from('set_logs')
                                    .insert(formattedSets);

                                if (setsError) throw setsError;

                                // 3. Check for PRs
                                for (const exercise of exercises) {
                                    const exerciseSets = setLogs.filter(s => s.exerciseId === exercise.exercises.id);
                                    if (exerciseSets.length === 0) continue;

                                    const maxWeight = Math.max(...exerciseSets.map(s => s.weightLbs));
                                    if (maxWeight <= 0) continue;

                                    // Get current PR for this exercise
                                    const { data: currentPR } = await supabase
                                        .from('prs')
                                        .select('weight_lbs')
                                        .eq('user_id', useAuthStore.getState().user?.id)
                                        .eq('exercise_id', exercise.exercises.id)
                                        .order('weight_lbs', { ascending: false })
                                        .limit(1)
                                        .maybeSingle();

                                    if (!currentPR || maxWeight > currentPR.weight_lbs) {
                                        // New PR!
                                        await supabase
                                            .from('prs')
                                            .insert({
                                                user_id: useAuthStore.getState().user?.id,
                                                exercise_id: exercise.exercises.id,
                                                exercise_name: exercise.exercises.name,
                                                weight_lbs: maxWeight,
                                                reps: exerciseSets.find(s => s.weightLbs === maxWeight)?.reps || 1,
                                                achieved_at: new Date().toISOString().split('T')[0]
                                            });
                                    }
                                }
                            }

                            // 3. Refresh Profile Points
                            const userId = useAuthStore.getState().user?.id;
                            if (userId) {
                                useProfileStore.getState().fetchProfile(userId);
                            }

                            completeWorkout();
                            router.replace('/(tabs)');
                            Alert.alert("Success", "Workout completed! +5 Becoming Points earned.");
                        } catch (error) {
                            console.error('Error saving workout:', error);
                            Alert.alert("Error", "Workout saved locally but failed to sync. Points will update later.");
                            completeWorkout();
                            router.replace('/(tabs)');
                        }
                    }
                }
            ]
        );
    };

    const handleDiscard = () => {
        Alert.alert(
            "Discard Workout",
            "Are you sure? This progress will be lost.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => {
                        discardWorkout();
                        router.back();
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Active Workout',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => null, // Prevent back navigation while active
                headerRight: () => (
                    <TouchableOpacity onPress={handleDiscard}>
                        <Text style={{ color: '#FF4444', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.timerHeader}>
                <Text style={styles.programName}>{workout?.programs?.name}</Text>
                <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {exercises.map((ex) => {
                    const exerciseSets = setLogs.filter(log => log.exerciseId === ex.exercises.id);

                    return (
                        <View key={ex.id} style={styles.exerciseCard}>
                            <Text style={styles.exerciseName}>{ex.exercises.name}</Text>
                            <Text style={styles.prescription}>
                                {ex.sets} Sets • {ex.reps_min}-{ex.reps_max} Reps
                            </Text>

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
                                        placeholderTextColor="rgba(255,255,255,0.2)"
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
                                        placeholderTextColor="rgba(255,255,255,0.2)"
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
                                        placeholderTextColor="rgba(255,255,255,0.2)"
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
                                <Ionicons name="add" size={18} color={theme.colors.primary} />
                                <Text style={styles.addSetText}>Add Set</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                    <Text style={styles.finishText}>Finish Workout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerHeader: {
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    programName: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    timerText: {
        color: theme.colors.primary,
        fontSize: 32,
        fontWeight: '800',
        fontFamily: 'System', // Use mono if available
        marginTop: 4,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 100,
    },
    exerciseCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    exerciseName: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    prescription: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    setsHeader: {
        flexDirection: 'row',
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xs,
    },
    colLabel: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    setCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    setText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    inputBox: {
        flex: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: theme.radius.sm,
        marginHorizontal: 4,
        textAlign: 'center',
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: theme.radius.md,
    },
    addSetText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    inputText: {
        color: theme.colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.lg,
        paddingBottom: 40,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    finishButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    finishText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
