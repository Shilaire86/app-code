import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useTheme } from '@/hooks/useTheme';
import { calculateStageProgress } from '@/lib/stages/calculator';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { HintCard } from '@/components/HintCard';
import { LevelUpModal } from '@/components/LevelUpModal';
import { useCallback, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { getWorkoutStreakSummary, WorkoutStreakSummary } from '@/lib/streaks';
import { fetchNextSession, fetchLatestWeight } from '@/services/workouts';
import { isVip, hasEntitlement } from '@/lib/entitlements';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { getTodaysCardio, markCardioComplete, UserCardioPlanEntry } from '@/services/cardio';
import { fetchUserActiveModules, TrainingModule } from '@/services/modules';
import { calculateTotalPoints } from '@/lib/stagePoints';
import { getActiveTargets, fetchDailyLogs, calculateDailySummary, NutritionTarget, DailySummary } from '@/services/nutrition';

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

export default function HomeScreen() {
    const { colors, spacing, radius, typography, isDark } = useTheme();
    const { user, signOut } = useAuthStore();
    // Profile is now bootstrapped globally in _layout.tsx
    const {
        profile,
        stage,
        tier,
        activityCounts,
        isLoading,
        setSeenHint,
        setSeenHintValue,
    } = useProfileStore();
    const router = useRouter();
    const isAdmin = profile?.role === 'admin';

    const [streak, setStreak] = useState<WorkoutStreakSummary>({ streakDays: 0, lastWorkoutAt: null, daysSinceLast: null });
    const [nextSession, setNextSession] = useState<any>(null);
    const [latestWeight, setLatestWeight] = useState<any>(null);
    const [todaysCardio, setTodaysCardio] = useState<UserCardioPlanEntry | null>(null);
    const [activeModules, setActiveModules] = useState<TrainingModule[]>([]);
    const [nutritionTargets, setNutritionTargets] = useState<NutritionTarget | null>(null);
    const [nutritionSummary, setNutritionSummary] = useState<DailySummary>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const styles = createStyles({ colors, spacing, radius, typography, isDark });

    const showCardioCard = hasEntitlement(tier, 'cardioRecommendationsEnabled');

    const fetchDashboardData = useCallback(async () => {
        if (!user?.id) return;
        setDashboardLoading(true);
        try {
            const cardioPromise = hasEntitlement(tier, 'cardioRecommendationsEnabled')
                ? getTodaysCardio(user.id)
                : Promise.resolve(null);
            const canNutrition = hasEntitlement(tier, 'nutritionEnabled');
            const todayStr = new Date().toISOString().split('T')[0];
            const nutritionTargetsPromise = canNutrition ? getActiveTargets(user.id) : Promise.resolve(null);
            const nutritionLogsPromise = canNutrition ? fetchDailyLogs(user.id, todayStr) : Promise.resolve([]);
            const [streakRes, sessionRes, weightRes, cardioRes, modulesRes, targetsRes, logsRes] = await Promise.all([
                getWorkoutStreakSummary(user.id, { force: false }),
                fetchNextSession(user.id),
                fetchLatestWeight(user.id),
                cardioPromise,
                fetchUserActiveModules(user.id),
                nutritionTargetsPromise,
                nutritionLogsPromise
            ]);
            setStreak(streakRes);
            setNextSession(sessionRes);
            setLatestWeight(weightRes);
            setTodaysCardio(cardioRes);
            setActiveModules(modulesRes);
            setNutritionTargets(targetsRes);
            setNutritionSummary(calculateDailySummary(logsRes));
        } catch (err) {
            console.warn('[Dashboard] Failed to fetch dashboard data', err);
            setStreak({ streakDays: 0, lastWorkoutAt: null, daysSinceLast: null });
        } finally {
            setDashboardLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [fetchDashboardData])
    );

    const { isConnected } = useNetworkStatus();
    const { pendingCount, processQueue, isSyncing } = useSyncQueueStore();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            signOut();
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    const count = pendingCount();

    const displayStage = stage || 'initiate';
    const progress = calculateStageProgress(activityCounts);
    const totalPoints = calculateTotalPoints(activityCounts);
    const stageCopy = getStageCopy(displayStage);
    const seenStageHint = !!profile?.seen_hints?.stage_badge;
    const seenMessagesHint = !!profile?.seen_hints?.messages_entry;
    const showUpgradeCard = (tier === 'free' || tier === 'standard') && !isVip(tier);

    const canAccessNutrition = hasEntitlement(tier, 'nutritionEnabled');
    const nutritionRemaining = nutritionTargets ? Math.max(0, nutritionTargets.calories - nutritionSummary.calories) : 0;
    const macroPct = (current: number, target: number) => (target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0);

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
            {/* Network / Sync Status Banner */}
            {(!isConnected || count > 0) && (
                <TouchableOpacity
                    style={[
                        styles.syncBanner,
                        !isConnected ? styles.offlineBanner : styles.pendingBanner
                    ]}
                    onPress={() => isConnected && count > 0 && processQueue()}
                    disabled={isSyncing || !isConnected}
                >
                    <Ionicons
                        name={!isConnected ? "cloud-offline-outline" : "sync-outline"}
                        size={18}
                        color="#FFF"
                    />
                    <Text style={styles.syncBannerText}>
                        {!isConnected
                            ? "Offline — Workouts will sync when reconnected"
                            : isSyncing
                                ? "Syncing workouts..."
                                : `${count} workout${count > 1 ? 's' : ''} pending sync. Tap to retry.`
                        }
                    </Text>
                    {isSyncing && <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            )}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={() => router.push('/(tabs)/feed')}
                        accessibilityRole="button"
                        accessibilityLabel="Open Community Feed"
                    >
                        <Ionicons name="chatbubbles-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={() => router.push('/help/quick-start')}
                        accessibilityRole="button"
                        accessibilityLabel="Open Quick Start Guide"
                    >
                        <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {profile?.role === 'admin' || profile?.role === 'coach' ? (
                        <TouchableOpacity
                            style={styles.debugButton}
                            onPress={() => router.push('/debug')}
                            accessibilityRole="button"
                            accessibilityLabel="Open Debug Screen"
                        >
                            <Ionicons name="bug-outline" size={20} color={colors.textSecondary} />
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
                    <View style={[styles.stageBadge, { backgroundColor: (colors as any)[displayStage] || colors.primary }]}>
                        <Text style={styles.stageText}>{displayStage.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.stageTitle}>Your Becoming Stage</Text>
                </View>

                <Text style={styles.stageCopy}>{stageCopy}</Text>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: (colors as any)[displayStage] || colors.primary }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}% to next stage</Text>
                </View>

                <View style={styles.pointsRow}>
                    <Ionicons name="star" size={16} color={colors.primary} />
                    <Text style={styles.pointsText}>{totalPoints} Becoming Points</Text>
                </View>
            </Card>

            <Card style={styles.consistencyCard}>
                <View style={styles.consistencyTop}>
                    <Text style={styles.consistencyTitle}>Consistency</Text>
                    {dashboardLoading && (
                        <ActivityIndicator size="small" color={colors.primary} />
                    )}
                </View>
                <Text style={styles.consistencyMain}>
                    {streak.streakDays > 0 ? `🔥 ${streak.streakDays} day streak` : 'Start your streak today'}
                </Text>
                <Text style={styles.consistencySub}>{lastWorkoutLabel}</Text>
                {typeof streak.daysSinceLast === 'number' && streak.daysSinceLast >= 2 && !showRisk && (
                    <Text style={styles.consistencyNudge}>Don't break your streak — get a quick session in today.</Text>
                )}
            </Card>

            <View style={styles.dashboardRow}>
                {/* Today's Workout Card */}
                {nextSession ? (
                    <TouchableOpacity
                        style={styles.dashboardHalfCard}
                        onPress={() => router.push(`/workout/active?id=${nextSession.programDayId}`)}
                    >
                        <View style={styles.halfCardIcon}>
                            <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.halfCardContent}>
                            <Text style={styles.halfCardLabel}>Up Next</Text>
                            <Text style={styles.halfCardValue} numberOfLines={1}>{nextSession.title || `Day ${nextSession.dayNumber}`}</Text>
                            <Text style={styles.halfCardSub} numberOfLines={1}>{nextSession.programName}</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.dashboardHalfCard}
                        onPress={() => router.push('/(tabs)/programs')}
                    >
                        <View style={styles.halfCardIcon}>
                            <Ionicons name="play-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.halfCardContent}>
                            <Text style={styles.halfCardLabel}>Next Workout</Text>
                            <Text style={styles.halfCardValue}>Start Program</Text>
                            <Text style={styles.halfCardSub}>Browse the library</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Progress Snapshot Card */}
                <TouchableOpacity
                    style={[styles.dashboardHalfCard, { borderColor: colors.progressSoft }]}
                    onPress={() => router.push('/progress/measurements')}
                >
                    <View style={[styles.halfCardIcon, { backgroundColor: colors.progressSoft }]}>
                        <Ionicons name="scale-outline" size={20} color={colors.progress} />
                    </View>
                    <View style={styles.halfCardContent}>
                        <Text style={styles.halfCardLabel}>Weight</Text>
                        {latestWeight ? (
                            <>
                                <View style={styles.snapshotTop}>
                                    <Text style={styles.halfCardValue}>{latestWeight.weight} lb</Text>
                                    {latestWeight.trend === 'up' && <Ionicons name="arrow-up" size={14} color={colors.error} />}
                                    {latestWeight.trend === 'down' && <Ionicons name="arrow-down" size={14} color={colors.success} />}
                                    {latestWeight.trend === 'flat' && <Ionicons name="remove" size={14} color={colors.textTertiary} />}
                                </View>
                                {latestWeight.trend ? (
                                    <Text style={styles.halfCardSub}>
                                        {latestWeight.trend === 'down' ? '-' : latestWeight.trend === 'up' ? '+' : ''}
                                        {latestWeight.change.toFixed(1)} lb from prev
                                    </Text>
                                ) : (
                                    <Text style={styles.halfCardSub}>{new Date(latestWeight.date).toLocaleDateString()}</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={styles.halfCardValue}>Log Weight</Text>
                                <Text style={styles.halfCardSub}>Track your evolution</Text>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Nutrition Snapshot — prioritized near the top */}
            {canAccessNutrition ? (
                <TouchableOpacity
                    style={styles.nutritionCard}
                    onPress={() => router.push('/(tabs)/nutrition')}
                    activeOpacity={0.85}
                >
                    <View style={styles.nutritionHeaderRow}>
                        <View style={styles.nutritionTitleRow}>
                            <View style={styles.nutritionIconBox}>
                                <Ionicons name="nutrition-outline" size={18} color={colors.nutrition} />
                            </View>
                            <Text style={styles.nutritionLabel}>NUTRITION</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>

                    {nutritionTargets ? (
                        <>
                            <View style={styles.nutritionCalRow}>
                                <Text style={styles.nutritionCalValue}>{nutritionRemaining}</Text>
                                <Text style={styles.nutritionCalUnit}>cal left today</Text>
                            </View>
                            <View style={styles.nutritionMacros}>
                                <View style={styles.nutritionMacroCol}>
                                    <View style={styles.nutritionMacroTop}>
                                        <Text style={styles.nutritionMacroName}>Protein</Text>
                                        <Text style={styles.nutritionMacroVal}>{Math.round(nutritionSummary.protein_g)}/{Math.round(nutritionTargets.protein_g)}g</Text>
                                    </View>
                                    <View style={styles.nutritionMacroTrack}>
                                        <View style={[styles.nutritionMacroFill, { backgroundColor: '#FF6B6B', width: `${macroPct(nutritionSummary.protein_g, nutritionTargets.protein_g)}%` }]} />
                                    </View>
                                </View>
                                <View style={styles.nutritionMacroCol}>
                                    <View style={styles.nutritionMacroTop}>
                                        <Text style={styles.nutritionMacroName}>Carbs</Text>
                                        <Text style={styles.nutritionMacroVal}>{Math.round(nutritionSummary.carbs_g)}/{Math.round(nutritionTargets.carbs_g)}g</Text>
                                    </View>
                                    <View style={styles.nutritionMacroTrack}>
                                        <View style={[styles.nutritionMacroFill, { backgroundColor: '#4ECDC4', width: `${macroPct(nutritionSummary.carbs_g, nutritionTargets.carbs_g)}%` }]} />
                                    </View>
                                </View>
                                <View style={styles.nutritionMacroCol}>
                                    <View style={styles.nutritionMacroTop}>
                                        <Text style={styles.nutritionMacroName}>Fat</Text>
                                        <Text style={styles.nutritionMacroVal}>{Math.round(nutritionSummary.fat_g)}/{Math.round(nutritionTargets.fat_g)}g</Text>
                                    </View>
                                    <View style={styles.nutritionMacroTrack}>
                                        <View style={[styles.nutritionMacroFill, { backgroundColor: '#FECA57', width: `${macroPct(nutritionSummary.fat_g, nutritionTargets.fat_g)}%` }]} />
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.nutritionSetup}>Set your daily macro targets to start tracking →</Text>
                    )}
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.nutritionLockedCard}
                    onPress={() => router.push('/subscribe')}
                    activeOpacity={0.85}
                >
                    <View style={styles.nutritionTitleRow}>
                        <View style={styles.nutritionIconBox}>
                            <Ionicons name="nutrition-outline" size={18} color={colors.nutrition} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.nutritionLabel}>NUTRITION</Text>
                            <Text style={styles.nutritionLockedText}>Unlock macro tracking & meal logging</Text>
                        </View>
                        <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
            )}

            {/* Today's Cardio Card */}
            {showCardioCard && todaysCardio && todaysCardio.protocol && !todaysCardio.is_completed && (
                <TouchableOpacity
                    style={styles.cardioCard}
                    onPress={() => router.push('/cardio/plan')}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardioLeft}>
                        <View style={styles.cardioIconBox}>
                            <Ionicons name="fitness-outline" size={20} color="#FF9800" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardioLabel}>TODAY'S CARDIO</Text>
                            <Text style={styles.cardioName} numberOfLines={1}>
                                {(todaysCardio.protocol as any).is_signature ? '★ ' : ''}
                                {(todaysCardio.protocol as any).name}
                            </Text>
                            <Text style={styles.cardioDuration}>
                                {(todaysCardio.protocol as any).duration_minutes} min · {todaysCardio.placement === 'rest_day' ? 'Rest Day' : 'Post-Workout'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.cardioCompleteBtn}
                        onPress={async (e) => {
                            e.stopPropagation();
                            await markCardioComplete(todaysCardio.id);
                            setTodaysCardio({ ...todaysCardio, is_completed: true });
                        }}
                    >
                        <Ionicons name="checkmark" size={18} color="#000" />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Active Training Modules */}
            {activeModules.map(mod => (
                <TouchableOpacity
                    key={mod.id}
                    style={styles.moduleCard}
                    onPress={() => router.push('/modules')}
                    activeOpacity={0.8}
                >
                    <View style={styles.moduleLeft}>
                        <View style={styles.moduleIconBox}>
                            <Ionicons name="body-outline" size={20} color={colors.nutrition} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.moduleLabel}>ACTIVE MODULE</Text>
                            <Text style={styles.moduleName} numberOfLines={1}>{mod.name}</Text>
                            <Text style={styles.moduleDuration}>
                                {mod.routines?.length || 0} routines available
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            ))}

            {showRisk && (
                <TouchableOpacity
                    style={styles.riskCard}
                    onPress={() => router.push('/(tabs)/programs')}
                >
                    <View style={styles.riskHeader}>
                        <Ionicons name="warning" size={24} color={colors.warning} />
                        <Text style={styles.riskTitle}>STREAK AT RISK</Text>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                setSeenHintValue('streak_risk_last_dismissed', todayKey);
                            }}
                            style={styles.riskDismiss}
                        >
                            <Ionicons name="close" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.riskBody}>
                        Your {streak.streakDays}-day streak expires in {24 - (hoursSinceLastWorkout || 0)} hours.
                        Don't let the momentum stop now.
                    </Text>
                    <View style={styles.riskFooter}>
                        <Text style={styles.riskAction}>Start Workout</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.warning} />
                    </View>
                </TouchableOpacity>
            )}

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

            <View style={styles.quickActions}>
                <SectionHeader title="Daily Power" />
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/mindset/history')}
                        onLongPress={() => router.push('/mindset/new')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="journal-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Mindset</Text>
                            <Text style={styles.actionSubtitle}>Journal</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: spacing.md, borderColor: colors.gallerySoft }]}
                        onPress={() => router.push('/progress/camera')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.gallerySoft }]}>
                            <Ionicons name="camera-outline" size={24} color={colors.gallery} />
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
                        style={[styles.actionCard, { borderColor: colors.progressSoft }]}
                        onPress={() => router.push('/messages')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.progressSoft }]}>
                            <Ionicons name="mail-outline" size={24} color={colors.primary} />
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
                        <View style={[styles.actionIcon, { backgroundColor: colors.progressSoft }]}>
                            <Ionicons name="stats-chart-outline" size={24} color={colors.progress} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Metrics</Text>
                            <Text style={styles.actionSubtitle}>Stats</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: spacing.md, borderColor: colors.gallerySoft }]}
                        onPress={() => router.push('/progress/gallery')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.gallerySoft }]}>
                            <Ionicons name="images-outline" size={24} color={colors.gallery} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Gallery</Text>
                            <Text style={styles.actionSubtitle}>Evolution</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={[styles.actionGrid, { marginTop: spacing.md }]}>
                    <TouchableOpacity
                        style={[styles.actionCard, { opacity: isVip(tier) ? 1 : 0.8 }]}
                        onPress={() => isVip(tier) ? router.push('/progress/trends') : router.push('/subscribe')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.cardioSoft }]}>
                            <Ionicons
                                name={isVip(tier) ? "analytics-outline" : "lock-closed-outline"}
                                size={24}
                                color={isVip(tier) ? colors.cardio : colors.textTertiary}
                            />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Trends</Text>
                            <Text style={styles.actionSubtitle}>{isVip(tier) ? 'Charts' : 'VIP Feature'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: spacing.md, borderColor: colors.progressSoft }]}
                        onPress={() => router.push('/history')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.progressSoft }]}>
                            <Ionicons name="time-outline" size={24} color={colors.progress} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Log Book</Text>
                            <Text style={styles.actionSubtitle}>History</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionGrid, { marginTop: spacing.md }]}>
                    <TouchableOpacity
                        style={[styles.actionCard, { borderColor: colors.cardioSoft }]}
                        onPress={() => router.push('/progress/checkins')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.cardioSoft }]}>
                            <Ionicons name="clipboard-outline" size={24} color={colors.cardio} />
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
                        style={[styles.actionCard, { borderColor: colors.mindsetSoft }]}
                        onPress={() => router.push('/mindset/reflections')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.mindsetSoft }]}>
                            <Ionicons name="trophy-outline" size={24} color={colors.mindset} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Weekly</Text>
                            <Text style={styles.actionSubtitle}>Reflect</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { marginLeft: spacing.md, borderColor: colors.errorSoft }]}
                        onPress={() => router.push('/offers')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.errorSoft }]}>
                            <Ionicons name="gift-outline" size={24} color={colors.error} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Offers</Text>
                            <Text style={styles.actionSubtitle}>Partners</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {isAdmin && (
                    <View style={[styles.actionGrid, { marginTop: spacing.md }]}>
                        <TouchableOpacity
                            style={[styles.actionCard, { borderColor: 'rgba(255,255,255,0.12)' }]}
                            onPress={() => router.push('/admin')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
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

            <LevelUpModal />
        </ScrollView>
    );
}

const createStyles = ({ colors, spacing, radius, typography, isDark }: Pick<ReturnType<typeof useTheme>, 'colors' | 'spacing' | 'radius' | 'typography' | 'isDark'>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.lg,
        paddingTop: spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xl,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    debugButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.50 : 0.09,
        shadowRadius: 5,
        elevation: 3,
    },
    helpButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.50 : 0.09,
        shadowRadius: 5,
        elevation: 3,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    greeting: {
        color: colors.textSecondary,
        fontSize: typography.body.fontSize,
    },
    email: {
        color: colors.text,
        fontSize: typography.h2.fontSize,
        fontWeight: typography.h2.fontWeight as any,
        marginTop: spacing.xs,
    },
    stageCard: {
        // Card.tsx default variant handles bg + neumorphic shadow
    },
    consistencyCard: {
        marginTop: spacing.md,
    },
    consistencyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    consistencyTitle: { ...typography.label, color: colors.textSecondary },
    consistencyMain: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
    consistencySub: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
    consistencyNudge: { color: colors.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 16 },
    dashboardRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    dashboardHalfCard: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.md,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: isDark ? 0.52 : 0.09,
        shadowRadius: 9,
        elevation: 3,
    },
    halfCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    halfCardContent: {
        gap: 4,
    },
    halfCardLabel: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    snapshotTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    halfCardValue: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
    },
    halfCardSub: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    upgradeCard: {
        marginTop: spacing.md,
        // Card.tsx default variant handles bg + neumorphic shadow
    },
    upgradeTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
    upgradeBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    upgradeButton: {
        minHeight: 44,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    upgradeButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    riskCard: {
        backgroundColor: colors.errorSoft,
        borderRadius: radius.xl,
        padding: 20,
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.40 : 0.07,
        shadowRadius: 6,
        elevation: 3,
    },
    riskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    riskTitle: {
        color: colors.error,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 2,
        flex: 1,
    },
    riskDismiss: {
        padding: 4,
    },
    riskBody: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 16,
    },
    riskFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    riskAction: {
        color: colors.warning,
        fontSize: 14,
        fontWeight: '800',
    },
    riskButton: {
        marginTop: 12,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
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
        marginBottom: spacing.lg,
    },
    stageBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginRight: spacing.md,
    },
    stageText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    stageTitle: {
        color: colors.text,
        fontSize: typography.h3.fontSize,
        fontWeight: typography.h3.fontWeight as any,
    },
    progressContainer: {
        marginTop: spacing.sm,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: (colors as any).neuInset,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.sm,
    },
    stageCopy: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
        marginTop: spacing.md,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
    },
    pointsText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    quickActions: {
        marginTop: spacing.xxl,
    },
    actionGrid: {
        flexDirection: 'row',
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderRadius: radius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: isDark ? 0.52 : 0.09,
        shadowRadius: 9,
        elevation: 3,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    actionInfo: {
        alignItems: 'center',
    },
    actionTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    actionSubtitle: {
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    actions: {
        marginTop: spacing.xl,
    },
    signOutButton: {
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.error,
        alignItems: 'center',
    },
    signOutText: {
        color: colors.error,
        fontWeight: '600',
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        gap: 10,
    },
    offlineBanner: {
        backgroundColor: '#636e72',
    },
    pendingBanner: {
        backgroundColor: colors.primary,
    },
    syncBannerText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    nutritionCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.nutrition,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    nutritionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    nutritionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    nutritionIconBox: {
        width: 36,
        height: 36,
        borderRadius: radius.sm,
        backgroundColor: colors.nutritionSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nutritionLabel: {
        ...typography.label,
        color: colors.nutrition,
    },
    nutritionCalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: spacing.md,
    },
    nutritionCalValue: {
        color: colors.text,
        fontSize: 40,
        fontWeight: '800',
        lineHeight: 42,
    },
    nutritionCalUnit: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    nutritionMacros: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    nutritionMacroCol: {
        flex: 1,
    },
    nutritionMacroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 5,
    },
    nutritionMacroName: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    nutritionMacroVal: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '700',
    },
    nutritionMacroTrack: {
        height: 5,
        backgroundColor: colors.neuInset,
        borderRadius: 3,
        overflow: 'hidden',
    },
    nutritionMacroFill: {
        height: '100%',
        borderRadius: 3,
    },
    nutritionSetup: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    nutritionLockedCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.nutrition,
    },
    nutritionLockedText: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    cardioCard: {
        backgroundColor: colors.cardioSoft,
        borderRadius: radius.xl,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    cardioLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    cardioIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        backgroundColor: colors.cardioSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardioLabel: {
        ...typography.label,
        color: colors.cardio,
        marginBottom: 2,
    },
    cardioName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    cardioDuration: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    cardioCompleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.cardio,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    moduleCard: {
        backgroundColor: colors.nutritionSoft,
        borderRadius: radius.xl,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    moduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    moduleIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        backgroundColor: colors.nutritionSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleLabel: {
        ...typography.label,
        color: colors.nutrition,
        marginBottom: 2,
    },
    moduleName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    moduleDuration: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
});
