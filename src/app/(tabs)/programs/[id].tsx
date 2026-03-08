import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { getTierLabel } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { canAccessContentTier } from '@/lib/entitlements';

export default function ProgramDetailScreen() {
    const { id } = useLocalSearchParams();
    const [program, setProgram] = useState<any>(null);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notAvailable, setNotAvailable] = useState(false);
    const { tier } = useProfileStore();
    const router = useRouter();

    useEffect(() => {
        fetchProgramDetails();
    }, [id]);

    async function fetchProgramDetails() {
        setNotAvailable(false);
        try {
            const { data: programData, error: pError } = await supabase
                .from('programs')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                // TEMP: Match the list filter until we have a real publish flag.
                .not('name', 'ilike', 'demo%')
                .not('name', 'ilike', 'sample%')
                .single();

            if (pError) throw pError;
            setProgram(programData);

            // Try new structure first (program_weeks -> program_days)
            const { data: weeksData, error: weeksError } = await supabase
                .from('program_weeks')
                .select(`
                    id,
                    week_number,
                    title,
                    program_days(
                        id,
                        day_number,
                        title
                    )
                `)
                .eq('program_id', id)
                .order('week_number', { ascending: true });

            if (!weeksError && weeksData && weeksData.length > 0) {
                // Flatten program_days into a workouts-like structure
                const allDays: any[] = [];
                weeksData.forEach((week: any) => {
                    (week.program_days || []).forEach((day: any) => {
                        allDays.push({
                            id: day.id,
                            name: day.title || `Day ${day.day_number}`,
                            week_number: week.week_number,
                            day_number: day.day_number,
                            isNewStructure: true,
                        });
                    });
                });
                allDays.sort((a, b) => {
                    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                    return a.day_number - b.day_number;
                });
                setWorkouts(allDays);
            } else {
                // Fallback to legacy workouts table
                const { data: workoutData, error: wError } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('program_id', id)
                    .order('week_number', { ascending: true })
                    .order('day_number', { ascending: true });

                if (wError) throw wError;
                setWorkouts(workoutData || []);
            }
        } catch (error) {
            console.error('Error fetching program details:', error);
            setProgram(null);
            setWorkouts([]);
            setNotAvailable(true);
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

    if (notAvailable || !program) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{
                    headerShown: true,
                    headerTitle: 'Programs',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }} />
                <Text style={styles.notAvailableTitle}>Program not available</Text>
                <Text style={styles.notAvailableText}>This program is unpublished or cannot be found.</Text>
                <TouchableOpacity style={styles.notAvailableButton} onPress={() => router.back()}>
                    <Text style={styles.notAvailableButtonText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const hasAccess = canAccessContentTier(tier || 'free', program.tier_required);

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
                                <TouchableOpacity
                                    key={workout.id}
                                    style={styles.workoutItem}
                                    onPress={() => {
                                        if (hasAccess) {
                                            router.push({ pathname: '/workout/active', params: { id: workout.id } });
                                        }
                                    }}
                                    disabled={!hasAccess}
                                >
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
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    {!hasAccess && (
                        <View style={{ marginTop: theme.spacing.md }}>
                            <UpgradePrompt
                                title="Unlock this program"
                                body="This program is part of a higher tier. Upgrade to access workouts and stay consistent."
                                requiredTier={program.tier_required}
                                onUpgradePress={() => router.push('/subscribe')}
                                onLearnMorePress={() => router.push('/help/quick-start')}
                            />
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Keep footer reserved for Start Program when accessible */}

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
    notAvailableTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 10,
    },
    notAvailableText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 14,
        paddingHorizontal: theme.spacing.xl,
    },
    notAvailableButton: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    notAvailableButtonText: {
        color: '#FFF',
        fontWeight: '800',
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
