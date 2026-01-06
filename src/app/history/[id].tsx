import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function LogDetailScreen() {
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

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    // Group sets by exercise
    const groupedSets = sets.reduce((acc: any, set: any) => {
        const name = set.exercises.name;
        if (!acc[name]) acc[name] = [];
        acc[name].push(set);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTitle: 'Workout Summary',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <Text style={styles.workoutName}>{log?.workouts?.name || 'Custom Workout'}</Text>
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
                            <Text style={styles.statValue}>{sets.length}</Text>
                        </View>
                    </View>
                </View>

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

const styles = StyleSheet.create({
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
    workoutName: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
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
