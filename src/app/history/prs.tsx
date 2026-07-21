import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import PRChart from '@/components/charts/PRChart';

type DateRange = '30d' | '90d' | 'all';

export default function PRDashboardScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const { user } = useAuthStore();
    const router = useRouter();
    const [prs, setPrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('all');

    useEffect(() => {
        if (user) {
            fetchPRs();
        }
    }, [user, dateRange]);

    async function fetchPRs() {
        setLoading(true);
        try {
            let query = supabase
                .from('prs')
                .select('*')
                .eq('user_id', user?.id)
                .order('achieved_at', { ascending: false });

            if (dateRange !== 'all') {
                const now = new Date();
                const days = dateRange === '30d' ? 30 : 90;
                const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                query = query.gte('achieved_at', startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            setPrs(data || []);
        } catch (error) {
            console.error('Error fetching PRs:', error);
        } finally {
            setLoading(false);
        }
    }

    const ranges: { key: DateRange; label: string }[] = [
        { key: '30d', label: '30 Days' },
        { key: '90d', label: '90 Days' },
        { key: 'all', label: 'All Time' },
    ];

    if (loading && prs.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{
                    headerTitle: 'Personal Records',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }} />
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTitle: 'Personal Records',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <FlatList
                data={prs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <>
                        <View style={styles.hero}>
                            <Ionicons name="trophy" size={48} color={theme.colors.primary} />
                            <Text style={styles.heroTitle}>Your Evolution</Text>
                            <Text style={styles.heroSubtitle}>Every pound gained is a piece of your old self shed.</Text>
                        </View>

                        {/* Date Range Selector */}
                        <View style={styles.rangeSelector}>
                            {ranges.map(r => (
                                <TouchableOpacity
                                    key={r.key}
                                    style={[styles.rangeButton, dateRange === r.key && styles.rangeButtonActive]}
                                    onPress={() => setDateRange(r.key)}
                                >
                                    <Text style={[styles.rangeButtonText, dateRange === r.key && styles.rangeButtonTextActive]}>
                                        {r.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* PR Chart */}
                        <PRChart data={prs} />

                        {prs.length > 0 && (
                            <Text style={styles.listHeader}>All Records</Text>
                        )}
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="barbell-outline" size={40} color="rgba(255,255,255,0.12)" />
                        <Text style={styles.emptyText}>No records hit yet. Keep pushing.</Text>
                        <Text style={styles.emptySubtext}>PRs are automatically tracked when you log heavier weights.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.prCard}>
                        <View style={styles.prInfo}>
                            <Text style={styles.exerciseName}>{item.exercise_name}</Text>
                            <Text style={styles.achievedAt}>Hit on {new Date(item.achieved_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.prValueBox}>
                            <Text style={styles.prWeight}>{item.weight_lbs}</Text>
                            <Text style={styles.prUnit}>LBS</Text>
                            {item.reps > 1 && <Text style={styles.prReps}>x{item.reps}</Text>}
                        </View>
                    </View>
                )}
            />
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
    list: {
        padding: theme.spacing.lg,
    },
    hero: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
    },
    heroTitle: {
        color: theme.colors.text,
        fontSize: 22,
        fontWeight: '800',
        marginTop: theme.spacing.md,
    },
    heroSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: theme.spacing.xl,
    },
    rangeSelector: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
    },
    rangeButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
    },
    rangeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    rangeButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    rangeButtonTextActive: {
        color: '#FFF',
    },
    listHeader: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: theme.spacing.md,
    },
    prCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    prInfo: {
        flex: 1,
    },
    exerciseName: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    achievedAt: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    prValueBox: {
        alignItems: 'flex-end',
    },
    prWeight: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: '900',
    },
    prUnit: {
        color: theme.colors.primary,
        fontSize: 10,
        fontWeight: '700',
        marginTop: -4,
    },
    prReps: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 20,
        gap: 8,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    emptySubtext: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
