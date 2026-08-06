import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { useRunStore, computeRunElapsedSeconds } from '@/stores/runStore';
import {
    requestRunPermissionsAsync,
    startLocationTrackingAsync,
    stopLocationTrackingAsync,
    getStepCountForRangeAsync,
    metersToMiles,
    formatPace,
} from '@/lib/runTracking';
import { logCardioSession } from '@/services/cardio';
import { showAlert } from '@/lib/confirm';
import { goBackOr } from '@/lib/navigation';
import { generateUuid } from '@/lib/uuid';

function formatElapsed(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function OutdoorRunScreen() {
    const theme = useTheme();
    const { colors, spacing, radius } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();

    const {
        activeRunId,
        startTime,
        distanceMeters,
        isPaused,
        pausedMs,
        pauseStartedAt,
        hasHydrated,
        startRun,
        togglePause,
        finishRun,
        discardRun,
    } = useRunStore();

    const [starting, setStarting] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isActive = hasHydrated && !!activeRunId;

    useEffect(() => {
        if (!isActive || isPaused) return;
        setElapsed(computeRunElapsedSeconds({ startTime, pausedMs, pauseStartedAt }));
        tickRef.current = setInterval(() => {
            setElapsed(computeRunElapsedSeconds({ startTime, pausedMs, pauseStartedAt }));
        }, 1000);
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, [isActive, isPaused, startTime, pausedMs, pauseStartedAt]);

    async function handleStart() {
        if (!user?.id) return;
        setStarting(true);
        try {
            const perms = await requestRunPermissionsAsync();
            if (!perms.foregroundGranted) {
                showAlert('Location Needed', 'Enable location access to track your run.');
                return;
            }
            if (!perms.backgroundGranted) {
                showAlert(
                    'Heads Up',
                    "Without \"Always\" location access, tracking will pause if you lock your phone or switch apps. You can still run with the app open."
                );
            }

            const runId = generateUuid();
            startRun(runId, user.id);
            await startLocationTrackingAsync();
        } catch (err) {
            console.error('[OutdoorRun] Failed to start:', err);
            showAlert('Error', 'Could not start location tracking. Please try again.');
        } finally {
            setStarting(false);
        }
    }

    async function handleFinish() {
        if (!user?.id || !startTime) return;
        setFinishing(true);
        try {
            await stopLocationTrackingAsync();

            const finalElapsed = computeRunElapsedSeconds({ startTime, pausedMs, pauseStartedAt });
            const steps = await getStepCountForRangeAsync(new Date(startTime), new Date());

            if (finalElapsed < 30) {
                // Too short to be worth saving — likely a mis-tap.
                discardRun();
                router.back();
                return;
            }

            await logCardioSession(user.id, {
                title: 'Outdoor Run',
                durationMinutes: finalElapsed / 60,
                completedAt: new Date(),
                distanceMeters,
                steps,
            });
            finishRun();
            showAlert('Run Saved', `${metersToMiles(distanceMeters).toFixed(2)} mi added to your history.`);
            router.back();
        } catch (err) {
            console.error('[OutdoorRun] Failed to save run:', err);
            showAlert('Error', 'Failed to save your run. Your distance and time are still being tracked — try finishing again.');
        } finally {
            setFinishing(false);
        }
    }

    function handleDiscard() {
        showAlert('Discard Run?', 'This run will not be saved.', [
            { text: 'Keep Running', style: 'cancel' },
            {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                    await stopLocationTrackingAsync();
                    discardRun();
                    router.back();
                },
            },
        ]);
    }

    const miles = metersToMiles(distanceMeters);
    const pace = formatPace(elapsed, distanceMeters);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Outdoor Run',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/cardio')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            {!isActive ? (
                <View style={styles.startWrap}>
                    <Ionicons name="walk-outline" size={48} color={colors.primary} />
                    <Text style={styles.startTitle}>Track an Outdoor Run</Text>
                    <Text style={styles.startBody}>
                        Distance, pace, and steps — tracking continues even if your screen locks or you switch apps.
                    </Text>
                    <TouchableOpacity
                        style={[styles.startButton, starting && { opacity: 0.6 }]}
                        onPress={handleStart}
                        disabled={starting}
                    >
                        {starting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.startButtonText}>Start Run</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.activeWrap}>
                    <View style={styles.statsCard}>
                        <Text style={styles.elapsedLabel}>TIME</Text>
                        <Text style={styles.elapsedValue}>{formatElapsed(elapsed)}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{miles.toFixed(2)}</Text>
                                <Text style={styles.statLabel}>MILES</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{pace}</Text>
                                <Text style={styles.statLabel}>PACE</Text>
                            </View>
                        </View>

                        {isPaused && (
                            <View style={styles.pausedChip}>
                                <Ionicons name="pause-circle" size={14} color={colors.warning} />
                                <Text style={styles.pausedChipText}>Paused — distance isn't being tracked</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.controlsRow}>
                        <TouchableOpacity style={styles.discardButton} onPress={handleDiscard} disabled={finishing}>
                            <Text style={styles.discardButtonText}>Discard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pauseButton} onPress={togglePause} disabled={finishing}>
                            <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color={colors.text} />
                            <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.finishButton, finishing && { opacity: 0.6 }]}
                            onPress={handleFinish}
                            disabled={finishing}
                        >
                            {finishing ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.finishButtonText}>Finish</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => {
    const { colors, spacing, radius } = theme;
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        startWrap: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
            gap: spacing.md,
        },
        startTitle: {
            color: colors.text,
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
        },
        startBody: {
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing.md,
        },
        startButton: {
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: 16,
            paddingHorizontal: 40,
            minWidth: 200,
            alignItems: 'center',
            justifyContent: 'center',
        },
        startButtonText: {
            color: '#FFF',
            fontSize: 16,
            fontWeight: '800',
        },
        activeWrap: {
            flex: 1,
            padding: spacing.lg,
            justifyContent: 'space-between',
        },
        statsCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            alignItems: 'center',
            marginTop: spacing.xl,
        },
        elapsedLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1.5,
        },
        elapsedValue: {
            color: colors.text,
            fontSize: 56,
            fontWeight: '800',
            marginTop: spacing.xs,
            marginBottom: spacing.xl,
        },
        statsRow: {
            flexDirection: 'row',
            gap: spacing.xxl,
        },
        statItem: {
            alignItems: 'center',
        },
        statValue: {
            color: colors.primary,
            fontSize: 24,
            fontWeight: '800',
        },
        statLabel: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
            marginTop: 4,
        },
        pausedChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.warningSoft,
            borderRadius: radius.full,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginTop: spacing.lg,
        },
        pausedChipText: {
            color: colors.warning,
            fontSize: 12,
            fontWeight: '700',
        },
        controlsRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.md,
        },
        discardButton: {
            flex: 1,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
        },
        discardButtonText: {
            color: colors.error,
            fontSize: 14,
            fontWeight: '700',
        },
        pauseButton: {
            flex: 1,
            flexDirection: 'row',
            gap: 6,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
        },
        pauseButtonText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
        },
        finishButton: {
            flex: 1,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
        },
        finishButtonText: {
            color: '#FFF',
            fontSize: 14,
            fontWeight: '700',
        },
    });
};
