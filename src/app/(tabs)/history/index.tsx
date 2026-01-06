import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
                    <TouchableOpacity
                        style={styles.prButton}
                        onPress={() => router.push('/history/prs')}
                    >
                        <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.prButtonText}>PRs</Text>
                    </TouchableOpacity>
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
    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: '800',
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
