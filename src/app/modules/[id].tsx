import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { ModuleRoutine, ModuleExercise } from '@/services/modules';

export default function RoutinePlayerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [routine, setRoutine] = useState<ModuleRoutine | null>(null);
    const [loading, setLoading] = useState(true);
    const [started, setStarted] = useState(false);
    
    // Player State
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [timerValue, setTimerValue] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    
    // Refs
    const timerInterval = useRef<NodeJS.Timeout | null>(null);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadRoutine();
        return () => clearTimer();
    }, [id]);

    async function loadRoutine() {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('module_routines')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            setRoutine(data as ModuleRoutine);
        } catch (error) {
            Alert.alert('Error', 'Failed to load routine');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    function clearTimer() {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
    }

    function startTimer(duration: number) {
        clearTimer();
        setTimerValue(duration);
        progressAnim.setValue(1); // Full width initially

        Animated.timing(progressAnim, {
            toValue: 0,
            duration: duration * 1000,
            useNativeDriver: false, // width animation doesn't support native driver
        }).start();

        timerInterval.current = setInterval(() => {
            setTimerValue(prev => {
                if (prev === null || prev <= 1) {
                    clearTimer();
                    handleNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    function pauseTimer() {
        setIsPaused(true);
        clearTimer();
        // Stop the animation at its current value
        progressAnim.stopAnimation();
    }

    function resumeTimer() {
        if (timerValue === null) return;
        setIsPaused(false);
        
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: timerValue * 1000,
            useNativeDriver: false,
        }).start();

        timerInterval.current = setInterval(() => {
            setTimerValue(prev => {
                if (prev === null || prev <= 1) {
                    clearTimer();
                    handleNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    function handleStart() {
        setStarted(true);
        const firstEx = routine?.exercises[0];
        if (firstEx?.duration_seconds) {
            startTimer(firstEx.duration_seconds);
        } else {
            setTimerValue(null);
            progressAnim.setValue(0);
        }
    }

    function handleNext() {
        if (!routine) return;
        const nextIndex = currentExerciseIndex + 1;
        
        if (nextIndex >= routine.exercises.length) {
            // Finished
            clearTimer();
            Alert.alert(
                'Routine Complete!',
                'Great job finishing this supplemental session.',
                [{ text: 'Done', onPress: () => router.back() }]
            );
        } else {
            setCurrentExerciseIndex(nextIndex);
            const nextEx = routine.exercises[nextIndex];
            if (nextEx.duration_seconds) {
                startTimer(nextEx.duration_seconds);
                setIsPaused(false);
            } else {
                clearTimer();
                setTimerValue(null);
                progressAnim.setValue(0);
            }
        }
    }

    function handlePrev() {
        if (currentExerciseIndex === 0) return;
        if (!routine) return;
        
        const prevIndex = currentExerciseIndex - 1;
        setCurrentExerciseIndex(prevIndex);
        
        const prevEx = routine.exercises[prevIndex];
        if (prevEx.duration_seconds) {
            startTimer(prevEx.duration_seconds);
            setIsPaused(false);
        } else {
            clearTimer();
            setTimerValue(null);
            progressAnim.setValue(0);
        }
    }

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <Stack.Screen options={{ headerTitle: 'Loading...' }} />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!routine) return null;

    const currentEx = routine.exercises[currentExerciseIndex];
    const isTimed = !!currentEx?.duration_seconds;

    // ─────────────────────────────────────────────────────────────────
    // Pre-start screen (Overview)
    // ─────────────────────────────────────────────────────────────────
    if (!started) {
        return (
            <View style={styles.container}>
                <Stack.Screen 
                    options={{
                        headerTitle: 'Routine Overview',
                        headerStyle: { backgroundColor: theme.colors.background },
                        headerTintColor: '#FFF',
                    }} 
                />
                <ScrollView contentContainerStyle={styles.overviewContent}>
                    <View style={styles.overviewHeader}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="body" size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.routineTitle}>{routine.name}</Text>
                        <Text style={styles.routineSub}>{routine.duration_minutes} Minutes • Follow-along</Text>
                    </View>

                    <View style={styles.exercisePreviewCard}>
                        <Text style={styles.previewTitle}>Movements</Text>
                        {routine.exercises.map((ex, idx) => (
                            <View key={idx} style={styles.previewRow}>
                                <View style={styles.previewNumberBox}>
                                    <Text style={styles.previewNumber}>{idx + 1}</Text>
                                </View>
                                <View style={styles.previewRowContent}>
                                    <Text style={styles.previewExName}>{ex.name}</Text>
                                    <Text style={styles.previewExDetail}>
                                        {ex.duration_seconds ? formatTime(ex.duration_seconds) : ex.reps}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                        <Text style={styles.startBtnText}>START ROUTINE</Text>
                        <Ionicons name="play" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Active Player Screen
    // ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{
                    headerTitle: `${currentExerciseIndex + 1} of ${routine.exercises.length}`,
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => {
                            Alert.alert('End Routine?', 'Are you sure you want to stop early?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'End', style: 'destructive', onPress: () => router.back() }
                            ]);
                        }}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )
                }} 
            />

            {/* Progress Bar */}
            {isTimed && (
                <View style={styles.progressBarContainer}>
                    <Animated.View 
                        style={[
                            styles.progressBarFill, 
                            { 
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                }) 
                            }
                        ]} 
                    />
                </View>
            )}

            <View style={styles.playerContent}>
                <View style={styles.playerHeader}>
                    <Text style={styles.upNextText}>
                        {currentExerciseIndex + 1 < routine.exercises.length 
                            ? `Up next: ${routine.exercises[currentExerciseIndex + 1].name}` 
                            : 'Last movement!'}
                    </Text>
                    <Text style={styles.activeExName}>{currentEx.name}</Text>
                </View>

                <View style={styles.timerDisplay}>
                    {isTimed ? (
                        <>
                            <Ionicons name="timer-outline" size={32} color={theme.colors.primary} />
                            <Text style={styles.timerText}>{timerValue !== null ? formatTime(timerValue) : '0:00'}</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="repeat" size={32} color={theme.colors.primary} />
                            <Text style={styles.timerText}>{currentEx.reps}</Text>
                        </>
                    )}
                </View>

                {currentEx.instructions && (
                    <View style={styles.instructionsBox}>
                        <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.instructionsText}>{currentEx.instructions}</Text>
                    </View>
                )}
            </View>

            <View style={styles.playerControls}>
                <TouchableOpacity 
                    style={[styles.controlBtnSecondary, currentExerciseIndex === 0 && { opacity: 0.3 }]} 
                    onPress={handlePrev}
                    disabled={currentExerciseIndex === 0}
                >
                    <Ionicons name="play-skip-back" size={24} color="#FFF" />
                </TouchableOpacity>

                {isTimed && (
                    <TouchableOpacity 
                        style={styles.controlBtnPrimary} 
                        onPress={isPaused ? resumeTimer : pauseTimer}
                    >
                        <Ionicons name={isPaused ? "play" : "pause"} size={32} color="#000" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.controlBtnSecondary} onPress={handleNext}>
                    <Ionicons name="play-skip-forward" size={24} color="#FFF" />
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
    // Overview Styles
    overviewContent: {
        padding: 24,
        paddingBottom: 40,
    },
    overviewHeader: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 16,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    routineTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    routineSub: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        fontWeight: '600',
    },
    exercisePreviewCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    previewTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewNumberBox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    previewNumber: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
    previewRowContent: {
        flex: 1,
    },
    previewExName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    previewExDetail: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    startBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    startBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    
    // Player Styles
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    playerContent: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerHeader: {
        alignItems: 'center',
        marginBottom: 48,
    },
    upNextText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    activeExName: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        lineHeight: 38,
    },
    timerDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 48,
    },
    timerText: {
        color: '#FFF',
        fontSize: 72,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    instructionsBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 12,
        gap: 12,
        width: '100%',
    },
    instructionsText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        lineHeight: 24,
        flex: 1,
    },
    playerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        paddingBottom: 60,
    },
    controlBtnSecondary: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBtnPrimary: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
