import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface DataPoint {
    date: string;
    value: number;
}

interface WeightChartProps {
    data: DataPoint[];
    unit?: string;
}

const CHART_HEIGHT = 120;

export default function WeightChart({ data, unit = 'lbs' }: WeightChartProps) {
    const theme = useTheme();
    const styles = createStyles(theme);
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No weight data yet</Text>
                <Text style={styles.emptySubtext}>Log a measurement to see your progress</Text>
            </View>
        );
    }

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const change = values[values.length - 1] - values[0];

    // Calculate bar heights (percentage of range)
    const getBarHeight = (value: number) => {
        const percentage = ((value - minValue) / range) * 100;
        return Math.max(10, percentage); // Minimum 10% height
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Weight Progress</Text>
                <View style={[styles.changeBadge, { backgroundColor: change <= 0 ? 'rgba(0,255,170,0.2)' : 'rgba(255,107,107,0.2)' }]}>
                    <Text style={[styles.changeText, { color: change <= 0 ? '#00FFAA' : '#FF6B6B' }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} {unit}
                    </Text>
                </View>
            </View>

            {/* Simple bar chart */}
            <View style={styles.chartContainer}>
                <View style={styles.chartArea}>
                    {values.map((value, index) => (
                        <View key={index} style={styles.barWrapper}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: `${getBarHeight(value)}%`,
                                        backgroundColor: index === values.length - 1
                                            ? theme.colors.primary
                                            : 'rgba(255,102,0,0.5)'
                                    }
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {/* Y-axis labels */}
                <View style={styles.yAxisLabels}>
                    <Text style={styles.axisLabel}>{maxValue}</Text>
                    <Text style={styles.axisLabel}>{minValue}</Text>
                </View>
            </View>

            {/* Date labels */}
            <View style={styles.dateLabels}>
                <Text style={styles.dateLabel}>
                    {new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.dateLabel}>
                    {new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Start</Text>
                    <Text style={styles.statValue}>{values[0]} {unit}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={styles.statValue}>{values[values.length - 1]} {unit}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Low</Text>
                    <Text style={styles.statValue}>{minValue} {unit}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>High</Text>
                    <Text style={styles.statValue}>{maxValue} {unit}</Text>
                </View>
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
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
    changeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chartContainer: {
        flexDirection: 'row',
        height: CHART_HEIGHT,
    },
    chartArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        paddingRight: theme.spacing.sm,
    },
    barWrapper: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 2,
        minHeight: 4,
    },
    yAxisLabels: {
        justifyContent: 'space-between',
        paddingLeft: theme.spacing.xs,
        width: 40,
    },
    axisLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
    dateLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing.xs,
        paddingRight: 40,
    },
    dateLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
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
