import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore, BecomingStage } from '@/stores/profileStore';
import { goBackOr } from '@/lib/navigation';
import { POINTS, THRESHOLDS, calculateTotalPoints } from '@/lib/stages/calculator';

const STAGE_ORDER: BecomingStage[] = ['initiate', 'practitioner', 'devoted', 'embodied'];

const STAGE_LABELS: Record<BecomingStage, string> = {
    initiate: 'Initiate',
    practitioner: 'Practitioner',
    devoted: 'Devoted',
    embodied: 'Embodied',
};

const STAGE_THRESHOLDS: Record<BecomingStage, number> = {
    initiate: 0,
    practitioner: THRESHOLDS.PRACTITIONER,
    devoted: THRESHOLDS.DEVOTED,
    embodied: THRESHOLDS.EMBODIED,
};

const STAGE_DESCRIPTIONS: Record<BecomingStage, string> = {
    initiate: 'Every journey starts with a single rep. You’re building the habit.',
    practitioner: 'Consistency is becoming your identity.',
    devoted: 'You’re proving who you are every single day.',
    embodied: 'You are The Becoming Method.',
};

export default function StageDetailScreen() {
    const theme = useTheme();
    const { colors, spacing, radius } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { stage, activityCounts } = useProfileStore();

    const currentStage = (stage || 'initiate') as BecomingStage;
    const totalPoints = calculateTotalPoints(activityCounts);
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const nextStage = STAGE_ORDER[currentIndex + 1];
    const pointsToNext = nextStage ? Math.max(0, STAGE_THRESHOLDS[nextStage] - totalPoints) : 0;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Your Becoming Stage',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.pointsHero}>
                    <Ionicons name="star" size={22} color={colors.primary} />
                    <Text style={styles.pointsHeroValue}>{totalPoints}</Text>
                    <Text style={styles.pointsHeroLabel}>Becoming Points</Text>
                    {nextStage ? (
                        <Text style={styles.pointsHeroSub}>
                            {pointsToNext} more to reach {STAGE_LABELS[nextStage]}
                        </Text>
                    ) : (
                        <Text style={styles.pointsHeroSub}>You've reached the highest stage</Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>The Path</Text>
                <View style={styles.ladder}>
                    {STAGE_ORDER.map((s, index) => {
                        const isCurrent = s === currentStage;
                        const isComplete = index < currentIndex;
                        const stageColor = (colors as any)[s] || colors.primary;
                        return (
                            <View key={s} style={styles.ladderRow}>
                                <View style={styles.ladderRail}>
                                    <View
                                        style={[
                                            styles.ladderDot,
                                            { borderColor: stageColor },
                                            (isCurrent || isComplete) && { backgroundColor: stageColor },
                                        ]}
                                    >
                                        {isComplete && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                    </View>
                                    {index < STAGE_ORDER.length - 1 && (
                                        <View style={[styles.ladderLine, isComplete && { backgroundColor: stageColor }]} />
                                    )}
                                </View>
                                <View style={styles.ladderContent}>
                                    <View style={styles.ladderHeaderRow}>
                                        <Text style={[styles.ladderStageName, isCurrent && { color: stageColor }]}>
                                            {STAGE_LABELS[s]}
                                        </Text>
                                        {isCurrent && (
                                            <View style={[styles.currentPill, { backgroundColor: stageColor + '20', borderColor: stageColor }]}>
                                                <Text style={[styles.currentPillText, { color: stageColor }]}>YOU ARE HERE</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.ladderThreshold}>
                                        {STAGE_THRESHOLDS[s] === 0 ? 'Starting stage' : `${STAGE_THRESHOLDS[s]}+ points`}
                                    </Text>
                                    <Text style={styles.ladderCopy}>{STAGE_DESCRIPTIONS[s]}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.sectionTitle}>How Points Are Earned</Text>
                <View style={styles.earnCard}>
                    <View style={styles.earnRow}>
                        <View style={styles.earnIconWrap}>
                            <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.earnLabel}>Workout logged</Text>
                        <Text style={styles.earnValue}>+{POINTS.WORKOUT}</Text>
                    </View>
                    <View style={styles.earnRow}>
                        <View style={styles.earnIconWrap}>
                            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.earnLabel}>Progress check-in</Text>
                        <Text style={styles.earnValue}>+{POINTS.PROGRESS_ENTRY}</Text>
                    </View>
                    <View style={styles.earnRow}>
                        <View style={styles.earnIconWrap}>
                            <Ionicons name="camera-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.earnLabel}>Progress photo</Text>
                        <Text style={styles.earnValue}>+{POINTS.PHOTO}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => {
    const { colors, spacing, radius } = theme;
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
        },
        pointsHero: {
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.xl,
        },
        pointsHeroValue: {
            color: colors.text,
            fontSize: 40,
            fontWeight: '800',
            marginTop: spacing.xs,
        },
        pointsHeroLabel: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        pointsHeroSub: {
            color: colors.primary,
            fontSize: 13,
            fontWeight: '700',
            marginTop: spacing.sm,
            textAlign: 'center',
        },
        sectionTitle: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: spacing.md,
        },
        ladder: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
        },
        ladderRow: {
            flexDirection: 'row',
        },
        ladderRail: {
            alignItems: 'center',
            width: 28,
        },
        ladderDot: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ladderLine: {
            width: 2,
            flex: 1,
            minHeight: 40,
            backgroundColor: colors.border,
            marginVertical: 4,
        },
        ladderContent: {
            flex: 1,
            paddingBottom: spacing.lg,
            paddingLeft: spacing.sm,
        },
        ladderHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
        },
        ladderStageName: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '800',
        },
        currentPill: {
            borderWidth: 1,
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
        },
        currentPillText: {
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.5,
        },
        ladderThreshold: {
            color: colors.textTertiary,
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
        },
        ladderCopy: {
            color: colors.textSecondary,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 6,
        },
        earnCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.lg,
            gap: spacing.md,
        },
        earnRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        earnIconWrap: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        earnLabel: {
            flex: 1,
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
        },
        earnValue: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '800',
        },
    });
};
