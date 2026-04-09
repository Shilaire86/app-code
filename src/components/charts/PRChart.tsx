import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface PRDataPoint {
    exercise_name: string;
    weight_lbs: number;
    reps: number;
    achieved_at: string;
}

interface PRChartProps {
    data: PRDataPoint[];
}

export default function PRChart({ data }: PRChartProps) {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No PR data yet</Text>
                <Text style={styles.emptySubtext}>Hit some personal records to see your chart</Text>
            </View>
        );
    }

    // Group by exercise, pick the max weight per exercise
    const exerciseMap = new Map<string, { maxWeight: number; count: number; latestDate: string }>();
    data.forEach(pr => {
        const existing = exerciseMap.get(pr.exercise_name);
        if (!existing) {
            exerciseMap.set(pr.exercise_name, {
                maxWeight: pr.weight_lbs,
                count: 1,
                latestDate: pr.achieved_at,
            });
        } else {
            exerciseMap.set(pr.exercise_name, {
                maxWeight: Math.max(existing.maxWeight, pr.weight_lbs),
                count: existing.count + 1,
                latestDate: pr.achieved_at > existing.latestDate ? pr.achieved_at : existing.latestDate,
            });
        }
    });

    // Sort by max weight descending, take top 6
    const sorted = Array.from(exerciseMap.entries())
        .sort((a, b) => b[1].maxWeight - a[1].maxWeight)
        .slice(0, 6);

    const maxWeight = sorted[0]?.[1].maxWeight || 1;

    // Summary stats
    const totalPRs = data.length;
    const allWeights = data.map(d => d.weight_lbs);
    const bestLift = Math.max(...allWeights);
    const latestPR = data.reduce((latest, pr) =>
        pr.achieved_at > latest.achieved_at ? pr : latest
    , data[0]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Top Lifts</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{totalPRs} PRs</Text>
                </View>
            </View>

            {/* Horizontal bar chart */}
            <View style={styles.chartArea}>
                {sorted.map(([name, info], index) => {
                    const barWidth = (info.maxWeight / maxWeight) * 100;
                    const isTop = index === 0;
                    return (
                        <View key={name} style={styles.barRow}>
                            <Text style={styles.barLabel} numberOfLines={1}>
                                {name}
                            </Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            width: `${Math.max(barWidth, 8)}%`,
                                            backgroundColor: isTop
                                                ? theme.colors.primary
                                                : 'rgba(255,102,0,0.45)',
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.barValue, isTop && { color: theme.colors.primary }]}>
                                {info.maxWeight}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total PRs</Text>
                    <Text style={styles.statValue}>{totalPRs}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Best Lift</Text>
                    <Text style={styles.statValue}>{bestLift} lbs</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Latest</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                        {new Date(latestPR.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,102,0,0.15)',
    },
    countText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    chartArea: {
        gap: 8,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    barLabel: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        width: 80,
    },
    barTrack: {
        flex: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: 4,
    },
    barValue: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '800',
        width: 40,
        textAlign: 'right',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
    statValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtext: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.xs,
    },
});
