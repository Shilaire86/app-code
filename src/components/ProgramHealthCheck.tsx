import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const PUSH_GROUPS = ['chest', 'shoulders', 'triceps'];
const PULL_GROUPS = ['back', 'biceps', 'forearms'];
const LEG_GROUPS = ['legs', 'glutes', 'calves'];

type HealthIssue = {
    level: 'ok' | 'warning' | 'error';
    message: string;
};

type DayData = {
    title: string;
    exercises: { name: string; muscle_groups: string[]; sets: number }[];
};

export function runHealthCheck(days: DayData[]): HealthIssue[] {
    const issues: HealthIssue[] = [];

    // 1. Check for empty days
    for (const day of days) {
        if (day.exercises.length === 0) {
            issues.push({
                level: 'error',
                message: `"${day.title}" has no exercises. Add at least 1.`,
            });
        }
    }

    // 2. Aggregate all muscle groups across the week
    const muscleCounts: Record<string, number> = {};
    const exerciseAppearances: Record<string, number> = {};

    for (const day of days) {
        for (const ex of day.exercises) {
            // Track exercise appearances for variety check
            exerciseAppearances[ex.name] = (exerciseAppearances[ex.name] || 0) + 1;

            for (const mg of ex.muscle_groups) {
                const key = mg.toLowerCase();
                muscleCounts[key] = (muscleCounts[key] || 0) + ex.sets;
            }
        }
    }

    // 3. Check muscle balance — every major group should be hit
    const hasPush = PUSH_GROUPS.some((g) => (muscleCounts[g] || 0) > 0);
    const hasPull = PULL_GROUPS.some((g) => (muscleCounts[g] || 0) > 0);
    const hasLegs = LEG_GROUPS.some((g) => (muscleCounts[g] || 0) > 0);

    if (!hasPush) {
        issues.push({
            level: 'warning',
            message: 'No pushing exercises found — consider adding bench press, overhead press, or push-ups.',
        });
    }
    if (!hasPull) {
        issues.push({
            level: 'warning',
            message: 'No pulling exercises found — consider adding rows, pull-ups, or curls.',
        });
    }
    if (!hasLegs) {
        issues.push({
            level: 'warning',
            message: 'No leg exercises found — consider adding squats, lunges, or leg press.',
        });
    }

    // 4. Volume cap: > 25 sets per muscle group per week is excessive
    for (const [muscle, sets] of Object.entries(muscleCounts)) {
        if (sets > 25) {
            issues.push({
                level: 'warning',
                message: `${muscle} has ${sets} sets this week — that's very high volume. Consider reducing to ≤25.`,
            });
        }
    }

    // 5. Variety: same exercise more than 2× per week
    for (const [name, count] of Object.entries(exerciseAppearances)) {
        if (count > 2) {
            issues.push({
                level: 'warning',
                message: `"${name}" appears ${count}× this week. Consider swapping some for variety.`,
            });
        }
    }

    // 6. If no issues, add an "all clear"
    if (issues.length === 0) {
        issues.push({
            level: 'ok',
            message: 'Program looks balanced! All major muscle groups are covered.',
        });
    }

    return issues;
}

// ---- UI Component ----

interface ProgramHealthCheckProps {
    issues: HealthIssue[];
}

export function ProgramHealthCheck({ issues }: ProgramHealthCheckProps) {
    const hasErrors = issues.some((i) => i.level === 'error');
    const hasWarnings = issues.some((i) => i.level === 'warning');
    const allOk = !hasErrors && !hasWarnings;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons
                    name={allOk ? 'shield-checkmark' : hasErrors ? 'alert-circle' : 'warning'}
                    size={20}
                    color={allOk ? '#00FF80' : hasErrors ? theme.colors.error : '#FFB800'}
                />
                <Text style={[styles.title, { color: allOk ? '#00FF80' : hasErrors ? theme.colors.error : '#FFB800' }]}>
                    {allOk ? 'Program Health: Great' : hasErrors ? 'Program Health: Issues Found' : 'Program Health: Warnings'}
                </Text>
            </View>
            {issues.map((issue, idx) => (
                <View key={idx} style={styles.issueRow}>
                    <Ionicons
                        name={issue.level === 'ok' ? 'checkmark-circle' : issue.level === 'error' ? 'close-circle' : 'alert'}
                        size={16}
                        color={issue.level === 'ok' ? '#00FF80' : issue.level === 'error' ? theme.colors.error : '#FFB800'}
                    />
                    <Text style={styles.issueText}>{issue.message}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    issueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    issueText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
});
