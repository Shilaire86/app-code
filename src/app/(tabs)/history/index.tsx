import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const HistoryCard = memo(({ item, onPress, formatDate, formatDuration }: { item: any, onPress: (id: string) => void, formatDate: any, formatDuration: any }) => (
    <TouchableOpacity
        style={styles.historyCard}
        onPress={() => onPress(item.id)}
    >
        <View style={styles.cardHeader}>
            <Text style={styles.workoutName}>
                {item.workouts?.name || 'Custom Workout'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
        </View>
        <View style={styles.cardFooter}>
            <View style={styles.meta}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{formatDate(item.started_at)}</Text>
            </View>
            <View style={styles.meta}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

export default function WorkoutHistoryScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    async function fetchHistory() {
        try {
            const { data, error } = await supabase
                .from('workout_logs')
                .select(`
                    id,
                    started_at,
                    duration_seconds,
                    workouts (
                        name
                    )
                `)
                .eq('user_id', user?.id)
                .order('started_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }

    async function clearHistory() {
        if (!user?.id) return;
        setClearing(true);
        try {
            // Deletes only the current user's workout history.
            // `set_logs` should cascade from `workout_logs` via FK.
            const { error } = await supabase
                .from('workout_logs')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            await fetchHistory();
        } catch (error: any) {
            const msg = typeof error?.message === 'string' ? error.message : 'Failed to clear history.';
            Alert.alert('Error', msg);
        } finally {
            setClearing(false);
        }
    }

    function confirmClear() {
        const title = 'Clear History';
        const message = 'This will delete all your logged workouts. This cannot be undone.';

        if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            const typed = globalThis.prompt?.(`${title}\n\n${message}\n\nType DELETE to confirm:`);
            if (typed === 'DELETE') clearHistory();
            return;
        }

        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete All', style: 'destructive', onPress: clearHistory },
        ]);
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    const renderItem = ({ item }: { item: any }) => (
        <HistoryCard
            item={item}
            onPress={(id) => router.push(`/history/${id}`)}
            formatDate={formatDate}
            formatDuration={formatDuration}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>History</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={confirmClear}
                            disabled={clearing}
                        >
                            <Ionicons name="trash-outline" size={18} color={clearing ? 'rgba(255,255,255,0.35)' : '#FF6B6B'} />
                            <Text style={[styles.clearButtonText, clearing && styles.clearButtonTextDisabled]}>
                                {clearing ? 'Clearing...' : 'Clear'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.prButton}
                            onPress={() => router.push('/history/prs')}
                        >
                            <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.prButtonText}>PRs</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyText}>No workouts logged yet.</Text>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => router.push('/programs')}
                        >
                            <Text style={styles.ctaText}>Explore Programs</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={renderItem}
            />
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
    header: {
        paddingTop: 60,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,107,107,0.10)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.18)',
        minHeight: 36,
    },
    clearButtonText: {
        color: '#FF6B6B',
        fontSize: 14,
        fontWeight: '800',
    },
    clearButtonTextDisabled: {
        color: 'rgba(255,255,255,0.35)',
    },
    prButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,102,0,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        gap: 6,
    },
    prButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    list: {
        padding: theme.spacing.lg,
    },
    historyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    workoutName: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    cardFooter: {
        flexDirection: 'row',
        gap: theme.spacing.lg,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        marginVertical: theme.spacing.lg,
    },
    ctaButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: '700',
    },
});
