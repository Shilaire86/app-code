import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import WeightChart from '@/components/charts/WeightChart';
import MeasurementChart from '@/components/charts/MeasurementChart';
import { Ionicons } from '@expo/vector-icons';

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function TrendsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [weightData, setWeightData] = useState<{ date: string; value: number }[]>([]);
    const [measurementData, setMeasurementData] = useState<any[]>([]);
    const [hasAnyMeasurements, setHasAnyMeasurements] = useState(false);
    const [hasSelectedMeasurements, setHasSelectedMeasurements] = useState(false);
    const [entryCount, setEntryCount] = useState(0);

    useEffect(() => {
        if (user) fetchData();
    }, [user, dateRange]);

    async function fetchData() {
        setLoading(true);
        try {
            if (!user?.id) {
                setEntryCount(0);
                setWeightData([]);
                setMeasurementData([]);
                return;
            }

            const now = new Date();
            let startDate: Date;

            switch (dateRange) {
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date('2020-01-01');
            }

            const { data, error } = await supabase
                .from('progress_entries')
                .select('created_at,entry_date,weight_lbs,chest_inches,waist_inches,hips_inches,arms_inches,thighs_inches,body_fat_percent')
                .eq('user_id', user.id)
                .gte('entry_date', startDate.toISOString().split('T')[0])
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            const rows = (data || []) as any[];
            setEntryCount(rows.length);

            // Charts usually expect chronological order; query returns newest-first.
            const chronological = [...rows].reverse();

            // Transform for weight chart
            const weights = chronological
                .filter(d => d.weight_lbs !== null && d.weight_lbs !== undefined)
                .map(d => ({
                    date: d.entry_date || d.created_at,
                    value: Number(d.weight_lbs),
                }));
            setWeightData(weights);

            // Transform for measurements chart
            const measurements = chronological.map(d => ({
                date: d.entry_date || d.created_at,
                chest: d.chest_inches,
                waist: d.waist_inches,
                hips: d.hips_inches,
                arms: d.arms_inches,
                thighs: d.thighs_inches,
            }));
            setMeasurementData(measurements);

            // Detect if user has logged any body measurements at all (non-weight).
            const anyMeasurementsExist = chronological.some(d =>
                d.body_fat_percent != null ||
                d.chest_inches != null ||
                d.waist_inches != null ||
                d.hips_inches != null ||
                d.arms_inches != null ||
                d.thighs_inches != null
            );
            setHasAnyMeasurements(anyMeasurementsExist);

            // Detect if the currently displayed fields have data, to avoid confusing chart empty copy.
            const selectedFieldsHaveData = measurements.some(m =>
                m.waist != null || m.chest != null || m.hips != null
            );
            setHasSelectedMeasurements(selectedFieldsHaveData);
        } catch (error) {
            setEntryCount(0);
            setWeightData([]);
            setMeasurementData([]);
            setHasAnyMeasurements(false);
            setHasSelectedMeasurements(false);
        } finally {
            setLoading(false);
        }
    }

    const ranges: { key: DateRange; label: string }[] = [
        { key: '7d', label: '7 Days' },
        { key: '30d', label: '30 Days' },
        { key: '90d', label: '90 Days' },
        { key: 'all', label: 'All Time' },
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Progress Trends',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

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

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Always-visible navigation row (above charts) */}
                <Pressable
                    style={styles.navRow}
                    accessibilityRole="button"
                    onPress={() => router.push('/progress/checkins')}
                >
                    <Text style={styles.navRowText}>View all check-ins</Text>
                    <Text style={styles.navRowArrow}>→</Text>
                </Pressable>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={theme.colors.primary} size="large" />
                    </View>
                ) : (
                    entryCount === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="stats-chart-outline" size={56} color="rgba(255,255,255,0.12)" />
                            <Text style={styles.emptyTitle}>No check-ins yet</Text>
                            <Text style={styles.emptyText}>
                                Start tracking weight, measurements, and photos so you can see your progress over time.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => router.push('/progress/checkins')}
                            >
                                <Text style={styles.emptyButtonText}>Create your first check-in</Text>
                            </TouchableOpacity>
                            <Text style={styles.emptySecondary}>Takes ~2 minutes.</Text>
                        </View>
                    ) : (
                        <>
                    <WeightChart data={weightData} />
                    {!hasAnyMeasurements ? (
                        <View style={styles.emptyMeasurementsCard}>
                            <Ionicons name="body-outline" size={24} color={theme.colors.primary} />
                            <View style={styles.emptyMeasurementsText}>
                                <Text style={styles.emptyMeasurementsTitle}>Measurements</Text>
                                <Text style={styles.emptyMeasurementsSubtitle}>
                                    You've logged weight. Add measurements to unlock body trends.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.emptyMeasurementsButton}
                                onPress={() => router.push('/progress/measurements')}
                            >
                                <Text style={styles.emptyMeasurementsButtonText}>Add measurements</Text>
                            </TouchableOpacity>
                        </View>
                    ) : !hasSelectedMeasurements ? (
                        <View style={styles.emptyMeasurementsCard}>
                            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
                            <View style={styles.emptyMeasurementsText}>
                                <Text style={styles.emptyMeasurementsTitle}>Measurements</Text>
                                <Text style={styles.emptyMeasurementsSubtitle}>
                                    No data for these measurements yet. Try selecting different measurements (if available) or log a few more check-ins.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.emptyMeasurementsButton}
                                onPress={() => router.push('/progress/measurements')}
                            >
                                <Text style={styles.emptyMeasurementsButtonText}>Add measurements</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <MeasurementChart data={measurementData} showFields={['waist', 'chest', 'hips']} />
                    )}

                    {/* Summary Stats */}
                    {weightData.length >= 2 && (
                        <View style={styles.summaryCard}>
                            <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
                            <View style={styles.summaryText}>
                                <Text style={styles.summaryTitle}>Weight Change</Text>
                                <Text style={styles.summaryValue}>
                                    {(weightData[weightData.length - 1].value - weightData[0].value).toFixed(1)} lbs
                                </Text>
                            </View>
                        </View>
                    )}
                        </>
                    )
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    rangeSelector: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
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
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.sm,
    },
    navRowText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
    navRowArrow: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 28,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.md,
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 10,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 14,
        paddingHorizontal: 20,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
    },
    emptyButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
    emptySecondary: {
        color: theme.colors.textSecondary,
        marginTop: 10,
        fontSize: 12,
        fontWeight: '600',
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    emptyMeasurementsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    emptyMeasurementsText: {
        flex: 1,
    },
    emptyMeasurementsTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    emptyMeasurementsSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    emptyMeasurementsButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radius.md,
    },
    emptyMeasurementsButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    summaryText: {
        flex: 1,
    },
    summaryTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
});
