import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { theme } from '@/constants/theme';
import { calculateStageProgress } from '@/lib/stages/calculator';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { POINTS } from '@/lib/stages/calculator';
import { HintCard } from '@/components/HintCard';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWorkoutStreakSummary, WorkoutStreakSummary } from '@/lib/streaks';
import { isVip } from '@/lib/entitlements';

// Stage-specific motivational copy
function getStageCopy(stage: string): string {
    switch (stage) {
        case 'initiate':
            return "Every journey starts with a single rep. Keep going.";
        case 'practitioner':
            return "Consistency is becoming your identity.";
        case 'devoted':
            return "You're proving who you are every single day.";
        case 'embodied':
            return "You are The Becoming Method.";
        default:
            return "Every journey starts with a single rep.";
    }
}

function calculateTotalPoints(activityCounts: { workoutCount: number; progressEntryCount: number; photoCount: number }): number {
    return (
        activityCounts.workoutCount * POINTS.WORKOUT +
        activityCounts.progressEntryCount * POINTS.PROGRESS_ENTRY +
        activityCounts.photoCount * POINTS.PHOTO
    );
}

export default function HomeScreen() {
    const { user, signOut } = useAuthStore();
    // Profile is now bootstrapped globally in _layout.tsx
    const { profile, stage, tier, isLoading, setSeenHint, setSeenHintValue } = useProfileStore();
    const router = useRouter();
    const isAdmin = profile?.role === 'admin';

    const [streak, setStreak] = useState<WorkoutStreakSummary>({ streakDays: 0, lastWorkoutAt: null, daysSinceLast: null });
    const [streakLoading, setStreakLoading] = useState(false);

    const fetchStreak = useCallback(async () => {
        if (!user?.id) return;
        setStreakLoading(true);
        try {
            const res = await getWorkoutStreakSummary(user.id, { force: false });
            setStreak(res);
        } catch {
            // Fail closed: keep card but show 0/unknown.
            setStreak({ streakDays: 0, lastWorkoutAt: null, daysSinceLast: null });
        } finally {
            setStreakLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchStreak();
        }, [fetchStreak])
    );

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            signOut();
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    const displayStage = stage || 'initiate';
    const activityCounts = useProfileStore.getState().activityCounts;
    const progress = calculateStageProgress(activityCounts);
    const totalPoints = calculateTotalPoints(activityCounts);
    const stageCopy = getStageCopy(displayStage);
    const seenStageHint = !!profile?.seen_hints?.stage_badge;
    const seenMessagesHint = !!profile?.seen_hints?.messages_entry;
    const showUpgradeCard = (tier === 'free' || tier === 'standard') && !isVip(tier);

    const lastWorkoutLabel = (() => {
        if (!streak.lastWorkoutAt) return 'No workouts logged yet';
        if (streak.daysSinceLast === 0) return 'Last workout: today';
        if (streak.daysSinceLast === 1) return 'Last workout: yesterday';
        if (typeof streak.daysSinceLast === 'number') return `Last workout: ${streak.daysSinceLast} days ago`;
        return `Last workout: ${new Date(streak.lastWorkoutAt).toLocaleDateString()}`;
    })();

    const hoursSinceLastWorkout = (() => {
        if (!streak.lastWorkoutAt) return null;
        const d = new Date(streak.lastWorkoutAt);
        if (Number.isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / 3_600_000);
    })();

    const todayKey = (() => {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        } catch {
            return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        }
    })();
    const lastDismissed = profile?.seen_hints?.streak_risk_last_dismissed;
    const riskDismissedToday = typeof lastDismissed === 'string' && lastDismissed === todayKey;

    const showRisk =
        !riskDismissedToday &&
        streak.streakDays >= 2 &&
        typeof hoursSinceLastWorkout === 'number' &&
        hoursSinceLastWorkout >= 20;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={() => router.push('/help/quick-start')}
                        accessibilityRole="button"
                        accessibilityLabel="Open Quick Start Guide"
                    >
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    {profile?.role === 'admin' || profile?.role === 'coach' ? (
                        <TouchableOpacity
                            style={styles.debugButton}
                            onPress={() => router.push('/debug')}
                            accessibilityRole="button"
                            accessibilityLabel="Open Debug Screen"
                        >
                            <Ionicons name="bug-outline" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {!seenStageHint && (
                <HintCard
                    title="Your Becoming Stage"
                    body="Earn points by completing workouts, logging check-ins, and adding photos. Your Stage updates automatically as you progress. Workouts +5, Check-in +2, Photo +10."
                    onDismiss={() => setSeenHint('stage_badge')}
                />
            )}

            <Card style={styles.stageCard}>
                <View style={styles.stageHeader}>
                    <View style={[styles.stageBadge, { backgroundColor: (theme.colors as any)[displayStage] || theme.colors.primary }]}>
                        <Text style={styles.stageText}>{displayStage.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.stageTitle}>Your Becoming Stage</Text>
                </View>

                <Text style={styles.stageCopy}>{stageCopy}</Text>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}% to next stage</Text>
                </View>

                <View style={styles.pointsRow}>
                    <Ionicons name="star" size={16} color={theme.colors.primary} />
                    <Text style={styles.pointsText}>{totalPoints} Becoming Points</Text>
                </View>
            </Card>

            <Card style={styles.consistencyCard}>
                <View style={styles.consistencyTop}>
                    <Text style={styles.consistencyTitle}>Consistency</Text>
                    {streakLoading && (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    )}
                </View>
                <Text style={styles.consistencyMain}>
                    {streak.streakDays > 0 ? `🔥 ${streak.streakDays} day streak` : 'Start your streak today'}
                </Text>
                <Text style={styles.consistencySub}>{lastWorkoutLabel}</Text>
                {typeof streak.daysSinceLast === 'number' && streak.daysSinceLast >= 2 && (
                    <Text style={styles.consistencyNudge}>Don't break your streak — get a quick session in today.</Text>
                )}
            </Card>

            {showUpgradeCard && (
                <Card style={styles.upgradeCard}>
                    <Text style={styles.upgradeTitle}>Upgrade your access</Text>
                    <Text style={styles.upgradeBody}>
                        Unlock VIP/Elite programs, premium tools, and priority support.
                    </Text>
                    <TouchableOpacity
                        style={styles.upgradeButton}
                        onPress={() => router.push('/subscribe')}
                        accessibilityRole="button"
                    >
                        <Text style={styles.upgradeButtonText}>View plans</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                </Card>
            )}

            {showRisk && (
                <View style={styles.riskCard}>
                    <View style={styles.riskTop}>
                        <Text style={styles.riskTitle}>Streak risk</Text>
                        <TouchableOpacity
                            onPress={() => setSeenHintValue('streak_risk_last_dismissed', todayKey)}
                            style={styles.riskDismiss}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss streak warning"
                        >
                            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.riskBody}>Don't break your streak — get a quick session in today.</Text>
                    <TouchableOpacity
                        style={styles.riskButton}
                        onPress={() => {
                            setSeenHintValue('streak_risk_last_dismissed', todayKey);
                            router.push('/(tabs)/programs');
                        }}
                        accessibilityRole="button"
                    >
                        <Text style={styles.riskButtonText}>Start a workout</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.quickActions}>
                <SectionHeader title="Daily Power" />
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/mindset/history')}
                        onLongPress={() => router.push('/mindset/new')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="journal-outline" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Mindset</Text>
                            <Text style={styles.actionSubtitle}>Journal</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: theme.spacing.md, borderColor: 'rgba(0,187,255,0.1)' }]}
                        onPress={() => router.push('/progress/camera')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,187,255,0.1)' }]}>
                            <Ionicons name="camera-outline" size={24} color="#00BBFF" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Progress</Text>
                            <Text style={styles.actionSubtitle}>Capture</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.quickActions}>
                <SectionHeader title="Support" />

                {!seenMessagesHint && (
                    <HintCard
                        title="Need help fast?"
                        body="Message your coach anytime. Choose a category so we can help quicker. Replies typically within 24-48h."
                        primaryCta={{
                            label: 'Open Messages',
                            onPress: () => {
                                setSeenHint('messages_entry');
                                router.push('/messages');
                            },
                        }}
                        onDismiss={() => setSeenHint('messages_entry')}
                        dismissLabel="Got it"
                    />
                )}

                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { borderColor: 'rgba(0,187,255,0.1)' }]}
                        onPress={() => router.push('/messages')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,187,255,0.1)' }]}>
                            <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Messages</Text>
                            <Text style={styles.actionSubtitle}>Coach</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.quickActions}>
                <SectionHeader title="Evolution" />
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/progress/measurements')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,255,170,0.1)' }]}>
                            <Ionicons name="stats-chart-outline" size={24} color="#00FFAA" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Metrics</Text>
                            <Text style={styles.actionSubtitle}>Stats</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: theme.spacing.md, borderColor: 'rgba(255,0,255,0.1)' }]}
                        onPress={() => router.push('/progress/gallery')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,0,255,0.1)' }]}>
                            <Ionicons name="images-outline" size={24} color="#FF00FF" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Gallery</Text>
                            <Text style={styles.actionSubtitle}>Evolution</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={[styles.actionGrid, { marginTop: theme.spacing.md }]}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/progress/trends')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,165,0,0.1)' }]}>
                            <Ionicons name="analytics-outline" size={24} color="#FFA500" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Trends</Text>
                            <Text style={styles.actionSubtitle}>Charts</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: theme.spacing.md, borderColor: 'rgba(0,255,127,0.1)' }]}
                        onPress={() => router.push('/nutrition/calculator')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,255,127,0.1)' }]}>
                            <Ionicons name="calculator-outline" size={24} color="#00FF7F" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Macros</Text>
                            <Text style={styles.actionSubtitle}>Calculator</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionGrid, { marginTop: theme.spacing.md }]}>
                    <TouchableOpacity
                        style={[styles.actionCard, { borderColor: 'rgba(0,187,255,0.1)' }]}
                        onPress={() => router.push('/history')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,187,255,0.1)' }]}>
                            <Ionicons name="time-outline" size={24} color="#00BBFF" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Log Book</Text>
                            <Text style={styles.actionSubtitle}>History</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: theme.spacing.md, borderColor: 'rgba(255,102,0,0.1)' }]}
                        onPress={() => router.push('/progress/checkins')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,102,0,0.1)' }]}>
                            <Ionicons name="clipboard-outline" size={24} color="#FF6600" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Check-Ins</Text>
                            <Text style={styles.actionSubtitle}>History</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* More Features */}
            <View style={styles.quickActions}>
                <SectionHeader title="More" />
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { borderColor: 'rgba(255,215,0,0.1)' }]}
                        onPress={() => router.push('/mindset/reflections')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                            <Ionicons name="trophy-outline" size={24} color="#FFD700" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Weekly</Text>
                            <Text style={styles.actionSubtitle}>Reflect</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: theme.spacing.md, borderColor: 'rgba(255,107,107,0.1)' }]}
                        onPress={() => router.push('/offers')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,107,107,0.1)' }]}>
                            <Ionicons name="gift-outline" size={24} color="#FF6B6B" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Offers</Text>
                            <Text style={styles.actionSubtitle}>Partners</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {isAdmin && (
                    <View style={[styles.actionGrid, { marginTop: theme.spacing.md }]}>
                        <TouchableOpacity
                            style={[styles.actionCard, { borderColor: 'rgba(255,255,255,0.12)' }]}
                            onPress={() => router.push('/admin')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
                            </View>
                            <View style={styles.actionInfo}>
                                <Text style={styles.actionTitle}>Admin</Text>
                                <Text style={styles.actionSubtitle}>Dashboard</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xl,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    debugButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    helpButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    greeting: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.body.fontSize,
    },
    email: {
        color: theme.colors.text,
        fontSize: theme.typography.h2.fontSize,
        fontWeight: theme.typography.h2.fontWeight as any,
        marginTop: theme.spacing.xs,
    },
    stageCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    consistencyCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: theme.spacing.md,
    },
    consistencyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    consistencyTitle: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
    consistencyMain: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 10 },
    consistencySub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 },
    consistencyNudge: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 10, lineHeight: 16 },
    upgradeCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: theme.spacing.md,
        gap: 10,
    },
    upgradeTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    upgradeBody: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
    upgradeButton: {
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    upgradeButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    riskCard: {
        marginTop: theme.spacing.md,
        backgroundColor: 'rgba(255,165,0,0.08)',
        borderColor: 'rgba(255,165,0,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
    },
    riskTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    riskTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
    riskDismiss: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    riskBody: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 18, marginTop: 8 },
    riskButton: {
        marginTop: 12,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    riskButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    stageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    stageBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.full,
        marginRight: theme.spacing.md,
    },
    stageText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    stageTitle: {
        color: theme.colors.text,
        fontSize: theme.typography.h3.fontSize,
        fontWeight: theme.typography.h3.fontWeight as any,
    },
    progressContainer: {
        marginTop: theme.spacing.sm,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    progressText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: theme.spacing.sm,
    },
    stageCopy: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
        marginTop: theme.spacing.md,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: theme.spacing.md,
    },
    pointsText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    quickActions: {
        marginTop: theme.spacing.xxl,
    },
    actionGrid: {
        flexDirection: 'row',
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,102,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    actionInfo: {
        alignItems: 'center',
    },
    actionTitle: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    actionSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    actions: {
        marginTop: theme.spacing.xl,
    },
    signOutButton: {
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,44,44,0.3)',
        alignItems: 'center',
    },
    signOutText: {
        color: '#FF4444',
        fontWeight: '600',
    },
});
