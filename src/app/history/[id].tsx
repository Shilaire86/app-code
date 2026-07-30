import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { goBackOr } from '@/lib/navigation';
import { showPrompt } from '@/lib/confirm';

export default function LogDetailScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [log, setLog] = useState<any>(null);
    const [sets, setSets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchLogDetails();
        }
    }, [id]);

    async function fetchLogDetails() {
        try {
            // Fetch log header
            const { data: logData, error: logError } = await supabase
                .from('workout_logs')
                .select(`
                    *,
                    workouts ( name )
                `)
                .eq('id', id)
                .single();

            if (logError) throw logError;
            setLog(logData);

            // Fetch set logs
            const { data: setsData, error: setsError } = await supabase
                .from('set_logs')
                .select(`
                    *,
                    exercises ( name )
                `)
                .eq('workout_log_id', id)
                .order('created_at', { ascending: true });

            if (setsError) throw setsError;
            setSets(setsData || []);

        } catch (error) {
            console.error('Error fetching log details:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleRename() {
        showPrompt(
            'Rename Workout',
            'Give this workout a name',
            async (text) => {
                const trimmed = text.trim();
                if (!trimmed || trimmed === (log?.title || log?.workouts?.name || log?.notes)) return;
                const previous = log?.title;
                setLog((prev: any) => ({ ...prev, title: trimmed }));
                const { error } = await supabase
                    .from('workout_logs')
                    .update({ title: trimmed })
                    .eq('id', id);
                if (error) {
                    console.error('Error renaming workout:', error);
                    setLog((prev: any) => ({ ...prev, title: previous }));
                }
            },
            log?.title || log?.workouts?.name || log?.notes || ''
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    // A workout session pre-seeds one row per planned set at 0 lbs / 0 reps
    // so the active-workout screen has something to edit; any exercise the
    // user never actually touched leaves those placeholder rows behind.
    // Exclude them here rather than showing "0 lbs / 0 reps" for work that
    // was never done.
    const performedSets = sets.filter((set: any) => (set.weight_lbs || 0) > 0 || (set.reps || 0) > 0);

    // Group sets by exercise. `exercises` is null for custom/quick-workout
    // sets that don't match a catalog exercise — those carry their name in
    // the set_logs.exercise_name text column instead.
    const groupedSets = performedSets.reduce((acc: any, set: any) => {
        const name = set.exercises?.name || set.exercise_name || 'Custom Exercise';
        if (!acc[name]) acc[name] = [];
        acc[name].push(set);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Workout Summary',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/history')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <TouchableOpacity style={styles.workoutNameRow} onPress={handleRename} activeOpacity={0.7}>
                        <Text style={styles.workoutName}>{log?.title || log?.workouts?.name || log?.notes || 'Custom Workout'}</Text>
                        <Ionicons name="pencil" size={16} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                    <Text style={styles.date}>
                        {new Date(log?.started_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>DURATION</Text>
                            <Text style={styles.statValue}>{Math.floor(log?.duration_seconds / 60)}m</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TOTAL SETS</Text>
                            <Text style={styles.statValue}>{performedSets.length}</Text>
                        </View>
                    </View>
                </View>

                {log?.notes && (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesLabel}>YOUR NOTES</Text>
                        <Text style={styles.notesBody}>{log.notes}</Text>
                    </View>
                )}

                {Object.keys(groupedSets).map((exerciseName) => (
                    <View key={exerciseName} style={styles.exerciseSection}>
                        <Text style={styles.exerciseTitle}>{exerciseName}</Text>
                        <View style={styles.setsList}>
                            {groupedSets[exerciseName].map((s: any, i: number) => (
                                <View key={s.id} style={[styles.setRow, i % 2 === 1 && styles.setRowAlt]}>
                                    <Text style={styles.setNum}>{i + 1}</Text>
                                    <Text style={[styles.setData, { flex: 1 }]}>{s.weight_lbs} lbs</Text>
                                    <Text style={[styles.setData, { flex: 1 }]}>{s.reps} reps</Text>
                                    {s.rpe && <Text style={styles.rpeBadge}>RPE {s.rpe}</Text>}
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.lg,
    },
    headerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    workoutNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    workoutName: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: '800',
        flexShrink: 1,
    },
    date: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: theme.spacing.xl,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 32,
    },
    statItem: {
        gap: 4,
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statValue: {
        color: theme.colors.primary,
        fontSize: 20,
        fontWeight: '800',
    },
    notesCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    notesLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 6,
    },
    notesBody: {
        color: theme.colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    exerciseSection: {
        marginBottom: theme.spacing.xl,
    },
    exerciseTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: theme.spacing.md,
    },
    setsList: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        gap: 16,
    },
    setRowAlt: {
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    setNum: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '800',
        width: 20,
    },
    setData: {
        color: theme.colors.text,
        fontSize: 14,
    },
    rpeBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: theme.colors.textSecondary,
        fontSize: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: '600',
    },
});
