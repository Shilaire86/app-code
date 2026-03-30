import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ExercisePicker } from '@/components/ExercisePicker';
import { ExerciseMatch } from '@/services/exercises';
import { startQuickWorkout } from '@/services/workouts';

type SelectedExercise = ExerciseMatch & {
    sets: number;
    reps: string;
    rest: number;
};

export default function QuickWorkoutScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    const addExercise = (exercise: ExerciseMatch) => {
        const newEx: SelectedExercise = {
            ...exercise,
            sets: 3,
            reps: '10-12',
            rest: 90,
        };
        setSelectedExercises([...selectedExercises, newEx]);
    };

    const removeExercise = (index: number) => {
        const newList = [...selectedExercises];
        newList.splice(index, 1);
        setSelectedExercises(newList);
    };

    const updateExercise = (index: number, updates: Partial<SelectedExercise>) => {
        const newList = [...selectedExercises];
        newList[index] = { ...newList[index], ...updates };
        setSelectedExercises(newList);
    };

    const handleStartWorkout = async () => {
        if (selectedExercises.length === 0) {
            Alert.alert('Empty Workout', 'Add at least one exercise to start.');
            return;
        }

        if (!user?.id) return;

        setIsStarting(true);
        try {
            const programDayId = await startQuickWorkout(
                user.id,
                'Quick Workout',
                selectedExercises
            );
            router.replace({
                pathname: '/workout/active',
                params: { id: programDayId }
            });
        } catch (err) {
            console.error('[QuickWorkout] Start failed', err);
            Alert.alert('Error', 'Failed to start workout. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{
                    title: 'Quick Workout',
                    headerShown: true,
                    headerTransparent: true,
                    headerTitleStyle: { color: '#FFF' },
                    headerTintColor: '#FFF',
                }} 
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Build Session</Text>
                    <Text style={styles.subtitle}>Add exercises and adjust your targets.</Text>
                </View>

                {selectedExercises.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="barbell-outline" size={48} color="rgba(255,255,255,0.05)" />
                        </View>
                        <Text style={styles.emptyText}>No exercises added yet.</Text>
                        <TouchableOpacity 
                            style={styles.addButtonLarge}
                            onPress={() => setPickerVisible(true)}
                        >
                            <Ionicons name="add" size={20} color={theme.colors.primary} />
                            <Text style={styles.addButtonLargeText}>Add First Exercise</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.exerciseList}>
                        {selectedExercises.map((ex, index) => (
                            <View key={`${ex.id}-${index}`} style={styles.exerciseCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.exerciseName}>{ex.name}</Text>
                                        <Text style={styles.exerciseMuscle}>{ex.muscle_groups.join(', ')}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeExercise(index)}>
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.controls}>
                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>SETS</Text>
                                        <View style={styles.counter}>
                                            <TouchableOpacity 
                                                onPress={() => updateExercise(index, { sets: Math.max(1, ex.sets - 1) })}
                                                style={styles.counterBtn}
                                            >
                                                <Ionicons name="remove" size={16} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.counterVal}>{ex.sets}</Text>
                                            <TouchableOpacity 
                                                onPress={() => updateExercise(index, { sets: ex.sets + 1 })}
                                                style={styles.counterBtn}
                                            >
                                                <Ionicons name="add" size={16} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>REPS</Text>
                                        <TouchableOpacity 
                                            style={styles.repsBtn}
                                            onPress={() => {
                                                Alert.prompt(
                                                    'Target Reps',
                                                    'e.g. 10-12, 8, 15+',
                                                    (text) => updateExercise(index, { reps: text || '10-12' }),
                                                    'plain-text',
                                                    ex.reps
                                                );
                                            }}
                                        >
                                            <Text style={styles.repsText}>{ex.reps}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>REST (S)</Text>
                                        <TouchableOpacity 
                                            style={styles.repsBtn}
                                            onPress={() => {
                                                Alert.prompt(
                                                    'Rest Seconds',
                                                    'Default is 90s',
                                                    (text) => {
                                                        const val = parseInt(text);
                                                        if (!isNaN(val)) updateExercise(index, { rest: val });
                                                    },
                                                    'plain-text',
                                                    ex.rest.toString(),
                                                    'number-pad'
                                                );
                                            }}
                                        >
                                            <Text style={styles.repsText}>{ex.rest}s</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity 
                            style={styles.addButtonRow}
                            onPress={() => setPickerVisible(true)}
                        >
                            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                            <Text style={styles.addButtonRowText}>Add Exercise</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.startButton, (selectedExercises.length === 0 || isStarting) && styles.startButtonDisabled]}
                    onPress={handleStartWorkout}
                    disabled={selectedExercises.length === 0 || isStarting}
                >
                    {isStarting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="flash" size={20} color="#000" />
                            <Text style={styles.startButtonText}>START WORKOUT</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ExercisePicker 
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={addExercise}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingTop: 110,
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    title: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        color: theme.colors.textTertiary,
        fontSize: 14,
        marginBottom: 24,
    },
    addButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.3)',
        backgroundColor: 'rgba(0,187,255,0.05)',
        gap: 8,
    },
    addButtonLargeText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    exerciseList: {
        paddingHorizontal: theme.spacing.lg,
        gap: 16,
    },
    exerciseCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardTitleRow: {
        flex: 1,
    },
    exerciseName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    exerciseMuscle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
        textTransform: 'capitalize',
    },
    controls: {
        flexDirection: 'row',
        gap: 12,
    },
    controlItem: {
        flex: 1,
    },
    controlLabel: {
        color: theme.colors.textTertiary,
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 6,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        height: 36,
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    counterBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterVal: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    repsBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    repsText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    addButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    addButtonRowText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '700',
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
    startButton: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    startButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    startButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
