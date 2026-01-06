import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { canAccessTier, getTierLabel } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';

export default function ProgramDetailScreen() {
    const { id } = useLocalSearchParams();
    const [program, setProgram] = useState<any>(null);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { tier } = useProfileStore();
    const router = useRouter();

    useEffect(() => {
        fetchProgramDetails();
    }, [id]);

    async function fetchProgramDetails() {
        try {
            const { data: programData, error: pError } = await supabase
                .from('programs')
                .select('*')
                .eq('id', id)
                .single();

            if (pError) throw pError;
            setProgram(programData);

            const { data: workoutData, error: wError } = await supabase
                .from('workouts')
                .select('*')
                .eq('program_id', id)
                .order('week_number', { ascending: true })
                .order('day_number', { ascending: true });

            if (wError) throw wError;
            setWorkouts(workoutData || []);
        } catch (error) {
            console.error('Error fetching program details:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    if (!program) return null;

    const hasAccess = canAccessTier(tier, program.tier_required);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: '',
                headerTransparent: true,
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#FFF" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerImage}>
                    <Ionicons name="fitness-outline" size={80} color="rgba(255,255,255,0.1)" />
                </View>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{program.name}</Text>
                        <View style={[styles.badge, { backgroundColor: (theme.colors as any)[program.difficulty] || theme.colors.primary }]}>
                            <Text style={styles.badgeText}>{program.difficulty.toUpperCase()}</Text>
                        </View>
                    </View>

                    <Text style={styles.description}>{program.description}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.statText}>{program.duration_weeks} Weeks</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="layers-outline" size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.statText}>{getTierLabel(program.tier_required)} Tier</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Curriculum</Text>
                        {workouts.length === 0 ? (
                            <Text style={styles.emptyText}>No workouts added yet.</Text>
                        ) : (
                            workouts.map((workout, index) => (
                                <View key={workout.id} style={styles.workoutItem}>
                                    <View style={styles.workoutNumber}>
                                        <Text style={styles.workoutNumberText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.workoutInfo}>
                                        <Text style={styles.workoutName}>{workout.name}</Text>
                                        <Text style={styles.workoutDetails}>Week {workout.week_number} • Day {workout.day_number}</Text>
                                    </View>
                                    {hasAccess ? (
                                        <Ionicons name="play-circle-outline" size={24} color={theme.colors.primary} />
                                    ) : (
                                        <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.3)" />
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {!hasAccess && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.upgradeButton}>
                        <Text style={styles.upgradeText}>Upgrade to Unlock</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerNote}>This program requires {getTierLabel(program.tier_required)} access.</Text>
                </View>
            )}

            {hasAccess && workouts.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push({ pathname: '/workout/active', params: { id: workouts[0].id } })}
                    >
                        <Text style={styles.startText}>Start Program</Text>
                    </TouchableOpacity>
                </View>
            )}
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
    backButton: {
        marginLeft: 10,
        marginTop: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    headerImage: {
        height: 250,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.lg,
        marginTop: -30,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.h2.fontSize,
        fontWeight: theme.typography.h2.fontWeight as any,
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.md,
    },
    badge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    description: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.body.fontSize,
        lineHeight: 24,
        marginBottom: theme.spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing.xl,
        marginBottom: theme.spacing.xxl,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        marginTop: theme.spacing.md,
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: theme.typography.h3.fontSize,
        fontWeight: theme.typography.h3.fontWeight as any,
        marginBottom: theme.spacing.lg,
    },
    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    workoutNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    workoutNumberText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    workoutDetails: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
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
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: theme.colors.primary,
        width: '100%',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    startText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    upgradeButton: {
        backgroundColor: theme.colors.secondary,
        width: '100%',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    upgradeText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    footerNote: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: theme.spacing.sm,
    },
});
