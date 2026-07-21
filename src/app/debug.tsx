import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createThread, listAdminThreads, listMyThreads } from '@/services/messaging';

interface SubscriptionData {
    tier: string | null;
    status: string | null;
    current_period_end: string | null;
    stripe_subscription_id: string | null;
}

export default function DebugScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();

    // Auth state
    const { user, session, initialized, signOut: authSignOut } = useAuthStore();

    // Profile state
    const { profile, stage, tier, isLoading: profileLoading, fetchProfile } = useProfileStore();

    // Workout state
    const { activeWorkoutId, startTime, setLogs, isPaused } = useWorkoutStore();

    // Subscription from DB
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [subLoading, setSubLoading] = useState(false);
    const [subError, setSubError] = useState<string | null>(null);

    // Messaging smoke test (TEMP: remove before launch if needed)
    const [msgWorking, setMsgWorking] = useState<string | null>(null);
    const [msgError, setMsgError] = useState<string | null>(null);
    const [myThreadsPreview, setMyThreadsPreview] = useState<any[] | null>(null);
    const [adminThreadsPreview, setAdminThreadsPreview] = useState<any[] | null>(null);
    const [myThreadsCount, setMyThreadsCount] = useState<number | null>(null);
    const [adminThreadsCount, setAdminThreadsCount] = useState<number | null>(null);

    const isAdminOrCoach = profile?.role === 'admin' || profile?.role === 'coach';

    // Gate debug to admin/coach only.
    useEffect(() => {
        if (profileLoading) return;
        if (!isAdminOrCoach) router.replace('/');
    }, [profileLoading, isAdminOrCoach, router]);

    // Fetch subscription data
    useEffect(() => {
        async function fetchSubscription() {
            if (!user?.id) return;

            setSubLoading(true);
            setSubError(null);

            try {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('tier, status, current_period_end, stripe_subscription_id')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // PGRST116 = no rows, which is fine
                    setSubError(error.message);
                } else {
                    setSubscription(data);
                }
            } catch (err: any) {
                setSubError(err.message);
            } finally {
                setSubLoading(false);
            }
        }

        fetchSubscription();
    }, [user?.id]);

    const handleRefreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        authSignOut();
    };

    const handleGoHome = () => {
        router.replace('/');
    };

    if (!profileLoading && !isAdminOrCoach) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Not authorized</Text>
                <View style={{ padding: theme.spacing.lg }}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleGoHome}>
                        <Text style={styles.actionText}>Go home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleCreateTestThread = async () => {
        setMsgError(null);
        setMsgWorking(null);
        try {
            const { threadId } = await createThread({
                category: 'training',
                subject: 'Test Thread',
                body: 'Hello coach - smoke test',
            });
            setMsgWorking(`Created thread: ${threadId}`);
        } catch (e: any) {
            setMsgError(typeof e?.message === 'string' ? e.message : 'Failed to create test thread.');
        }
    };

    const handleListMyThreads = async () => {
        setMsgError(null);
        setMsgWorking(null);
        try {
            const threads = await listMyThreads();
            setMyThreadsCount(threads.length);
            setMyThreadsPreview(threads.slice(0, 3));
        } catch (e: any) {
            setMsgError(typeof e?.message === 'string' ? e.message : 'Failed to list my threads.');
        }
    };

    const handleListAdminThreads = async () => {
        setMsgError(null);
        setMsgWorking(null);
        try {
            const threads = await listAdminThreads();
            setAdminThreadsCount(threads.length);
            setAdminThreadsPreview(threads.slice(0, 3));
        } catch (e: any) {
            setMsgError(typeof e?.message === 'string' ? e.message : 'Failed to list admin threads.');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoHome} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Debug Panel</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* AUTH Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>AUTH</Text>
                <DebugRow label="initialized" value={String(initialized)} />
                <DebugRow label="session exists" value={session ? 'Yes' : 'No'} />
                <DebugRow label="user id" value={user?.id || 'null'} mono />
                <DebugRow label="email" value={user?.email || 'null'} />
            </View>

            {/* PROFILE Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFILE</Text>
                {profileLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : (
                    <>
                        <DebugRow label="profile id" value={profile?.id || 'null'} mono />
                        <DebugRow label="role" value={profile?.role || 'null'} />
                        <DebugRow label="display_name" value={profile?.display_name || 'null'} />
                        <DebugRow label="created_at" value={profile?.created_at || 'null'} />
                    </>
                )}
            </View>

            {/* TIER + STAGE Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>TIER + STAGE (from store)</Text>
                <DebugRow label="tier" value={tier} highlight />
                <DebugRow label="stage" value={stage} highlight />
            </View>

            {/* SUBSCRIPTION Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SUBSCRIPTION (from DB)</Text>
                {subLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : subError ? (
                    <Text style={styles.errorText}>Error: {subError}</Text>
                ) : subscription ? (
                    <>
                        <DebugRow label="tier" value={subscription.tier || 'null'} />
                        <DebugRow label="status" value={subscription.status || 'null'} />
                        <DebugRow label="current_period_end" value={subscription.current_period_end || 'null'} />
                        <DebugRow label="stripe_subscription_id" value={subscription.stripe_subscription_id || 'null'} mono />
                    </>
                ) : (
                    <Text style={styles.infoText}>No subscription row (defaults to free)</Text>
                )}
            </View>

            {/* WORKOUT STORE Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>WORKOUT STORE</Text>
                <DebugRow label="activeWorkoutId" value={activeWorkoutId || 'null'} mono />
                <DebugRow label="startTime" value={startTime || 'null'} />
                <DebugRow label="setLogs count" value={String(setLogs.length)} />
                <DebugRow label="isPaused" value={String(isPaused)} />
            </View>

            {/* Messaging Smoke Test */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Messaging Smoke Test</Text>

                {!!msgError && <Text style={styles.errorText}>Error: {msgError}</Text>}
                {!!msgWorking && <Text style={styles.infoText}>{msgWorking}</Text>}

                <TouchableOpacity style={styles.actionButton} onPress={handleCreateTestThread}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionText}>Create Test Thread</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleListMyThreads}>
                    <Ionicons name="list-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionText}>List My Threads</Text>
                </TouchableOpacity>

                {myThreadsCount !== null && (
                    <View style={{ marginTop: theme.spacing.sm }}>
                        <Text style={styles.infoText}>My threads: {myThreadsCount}</Text>
                        {(myThreadsPreview || []).map((t) => (
                            <Text key={t.id} style={styles.infoText}>
                                - {t.id} • {t.category} • {t.status}
                            </Text>
                        ))}
                    </View>
                )}

                {(profile?.role === 'admin' || profile?.role === 'coach') && (
                    <>
                        <TouchableOpacity style={styles.actionButton} onPress={handleListAdminThreads}>
                            <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.actionText}>List Admin Threads</Text>
                        </TouchableOpacity>

                        {adminThreadsCount !== null && (
                            <View style={{ marginTop: theme.spacing.sm }}>
                                <Text style={styles.infoText}>Admin threads: {adminThreadsCount}</Text>
                                {(adminThreadsPreview || []).map((t) => (
                                    <Text key={t.id} style={styles.infoText}>
                                        - {t.id} • {t.category} • {t.status}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* ACTIONS */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleRefreshProfile}>
                    <Ionicons name="refresh" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionText}>Refresh Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleGoHome}>
                    <Ionicons name="home" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionText}>Go Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={handleSignOut}>
                    <Ionicons name="log-out" size={18} color="#FF4444" />
                    <Text style={[styles.actionText, { color: '#FF4444' }]}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// Helper component for debug rows
function DebugRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[
                styles.value,
                mono && styles.mono,
                highlight && styles.highlight
            ]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: theme.colors.text,
        fontSize: theme.typography.h2.fontSize,
        fontWeight: theme.typography.h2.fontWeight as any,
    },
    section: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        color: theme.colors.primary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        flex: 1,
    },
    value: {
        color: theme.colors.text,
        fontSize: 13,
        flex: 1,
        textAlign: 'right',
    },
    mono: {
        fontFamily: 'Courier',
        fontSize: 11,
    },
    highlight: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    errorText: {
        color: '#FF4444',
        fontSize: 12,
    },
    infoText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    actions: {
        marginTop: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    signOutButton: {
        borderColor: 'rgba(255,68,68,0.3)',
    },
    actionText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
});
