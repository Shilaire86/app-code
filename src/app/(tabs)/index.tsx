import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { theme } from '@/constants/theme';
import { useEffect } from 'react';
import { calculateStageProgress } from '@/lib/stages/calculator';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
    const { user, signOut } = useAuthStore();
    const { profile, stage, isLoading, fetchProfile } = useProfileStore();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

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
    const progress = calculateStageProgress(useProfileStore.getState().activityCounts);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.stageCard}>
                <View style={styles.stageHeader}>
                    <View style={[styles.stageBadge, { backgroundColor: (theme.colors as any)[displayStage] || theme.colors.primary }]}>
                        <Text style={styles.stageText}>{displayStage.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.stageTitle}>Your Becoming Stage</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}% to next stage</Text>
                </View>
            </View>

            <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Daily Power</Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/mindset/new')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="journal-outline" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Mindset</Text>
                            <Text style={styles.actionSubtitle}>Reflect</Text>
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
                <Text style={styles.sectionTitle}>Evolution</Text>
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
        marginBottom: theme.spacing.xl,
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
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
        marginRight: theme.spacing.md,
    },
    actionInfo: {
        flex: 1,
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
