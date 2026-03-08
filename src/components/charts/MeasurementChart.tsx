import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { theme } from '@/constants/theme';

interface MeasurementData {
    date: string;
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
}

interface MeasurementChartProps {
    data: MeasurementData[];
    showFields?: ('chest' | 'waist' | 'hips' | 'arms' | 'thighs')[];
}

const CHART_HEIGHT = 100;

const COLORS: Record<string, string> = {
    chest: '#FF6B6B',
    waist: '#4ECDC4',
    hips: '#45B7D1',
    arms: '#96CEB4',
    thighs: '#FFEAA7',
};

const LABELS: Record<string, string> = {
    chest: 'Chest',
    waist: 'Waist',
    hips: 'Hips',
    arms: 'Arms',
    thighs: 'Thighs',
};

export default function MeasurementChart({ data, showFields = ['waist', 'chest', 'hips'] }: MeasurementChartProps) {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No measurement data yet</Text>
                <Text style={styles.emptySubtext}>Log your body measurements to track progress</Text>
            </View>
        );
    }

    // Build datasets for each field
    const datasets = showFields.map(field => {
        const values = data.map(d => d[field] || 0).filter(v => v > 0);
        const current = values[values.length - 1] || 0;
        const start = values[0] || 0;
        const change = current - start;
        return {
            field,
            values,
            current,
            start,
            change,
            color: COLORS[field],
            label: LABELS[field],
        };
    }).filter(set => set.values.length > 0);

    if (datasets.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data for selected measurements</Text>
            </View>
        );
    }

    // Calculate global min/max for consistent scaling
    const allValues = datasets.flatMap(d => d.values);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;

    const getBarHeight = (value: number) => {
        const percentage = ((value - minVal) / range) * 100;
        return Math.max(10, percentage);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Body Measurements</Text>

            {/* Legend */}
            <View style={styles.legend}>
                {datasets.map(set => (
                    <View key={set.field} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: set.color }]} />
                        <Text style={styles.legendText}>{set.label}</Text>
                    </View>
                ))}
            </View>

            {/* Mini bar charts for each measurement */}
            {datasets.map(set => (
                <View key={set.field} style={styles.measurementRow}>
                    <Text style={[styles.measurementLabel, { color: set.color }]}>{set.label}</Text>
                    <View style={styles.miniChart}>
                        {set.values.map((value, idx) => (
                            <View key={idx} style={styles.miniBarWrapper}>
                                <View
                                    style={[
                                        styles.miniBar,
                                        {
                                            height: `${getBarHeight(value)}%`,
                                            backgroundColor: set.color,
                                            opacity: idx === set.values.length - 1 ? 1 : 0.5
                                        }
                                    ]}
                                />
                            </View>
                        ))}
                    </View>
                    <View style={styles.measurementStats}>
                        <Text style={styles.currentValue}>{set.current}"</Text>
                        <Text style={[styles.changeValue, { color: set.change <= 0 ? '#00FFAA' : '#FF6B6B' }]}>
                            {set.change > 0 ? '+' : ''}{set.change.toFixed(1)}"
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: theme.spacing.sm,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    measurementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    measurementLabel: {
        width: 50,
        fontSize: 12,
        fontWeight: '600',
    },
    miniChart: {
        flex: 1,
        height: 40,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1,
        marginHorizontal: theme.spacing.sm,
    },
    miniBarWrapper: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    miniBar: {
        width: '100%',
        borderRadius: 1,
        minHeight: 2,
    },
    measurementStats: {
        width: 60,
        alignItems: 'flex-end',
    },
    currentValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    changeValue: {
        fontSize: 10,
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
