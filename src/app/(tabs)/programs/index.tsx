import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { useGuide } from '@/hooks/useGuide';
import { canAccessTier } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { fetchPrograms } from '@/services/programs';
import { HintCard } from '@/components/HintCard';
import { hasEntitlement } from '@/lib/entitlements';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ColorPalette } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Unique icon per program — no icon repeated across tiers.
const PROGRAM_ICON: Record<string, IoniconsName> = {
    // Free tier
    'Initiate':  'layers-outline',
    'Ground':    'leaf-outline',
    // Standard tier
    'Ascend':    'trending-up-outline',
    'Command':   'shield-outline',
    'Surge':     'flash-outline',
    // VIP tier
    'Forge':     'flame-outline',
    'Sovereign': 'trophy-outline',
    'Embody':    'fitness-outline',
    'Refine':    'infinite-outline',
};

// Tier-driven colors — all programs in the same tier share the same palette.
function getTierVisual(tier: string, colors: ColorPalette): { iconColor: string; bgColor: string; borderColor: string } {
    switch (tier) {
        case 'standard': return { iconColor: colors.primary,        bgColor: colors.primarySoft,       borderColor: colors.primary + '55' };
        case 'vip':      return { iconColor: colors.practitioner,   bgColor: colors.practitionerSoft,  borderColor: colors.practitioner + '55' };
        case 'elite':    return { iconColor: '#8B5CF6',             bgColor: 'rgba(139,92,246,0.10)',  borderColor: 'rgba(139,92,246,0.35)' };
        default:         return { iconColor: '#94A3B8',             bgColor: 'rgba(148,163,184,0.10)', borderColor: 'rgba(148,163,184,0.30)' };
    }
}

const TIER_PRIORITY: Record<string, number> = { elite: 0, vip: 1, standard: 2, free: 3 };
const TIER_LABELS: Record<string, string> = { elite: 'ELITE', vip: 'VIP', standard: 'STANDARD', free: 'FREE' };
const DIFFICULTY_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const ProgramCard = memo(({
    item,
    tier,
    onPress,
    onUpgrade,
}: {
    item: any;
    tier: any;
    onPress: (id: string) => void;
    onUpgrade: () => void;
}) => {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const hasAccess = canAccessTier(tier, item.tier_required);
    const visual = getTierVisual(item.tier_required, colors);
    const icon = PROGRAM_ICON[item.name] ?? 'barbell-outline';

    return (
        <TouchableOpacity
            style={[styles.programCard, {
                borderColor: visual.borderColor,
                borderTopColor: visual.iconColor,
                borderTopWidth: 3,
            }]}
            onPress={() => onPress(item.id)}
        >
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: visual.bgColor }]}>
                <Ionicons name={icon} size={64} color={visual.iconColor} style={{ opacity: 0.85 }} />
                <View style={[styles.thumbnailTierBadge, { backgroundColor: visual.iconColor + '22' }]}>
                    <Text style={[styles.thumbnailTierText, { color: visual.iconColor }]}>
                        {item.tier_required?.toUpperCase()}
                    </Text>
                </View>
                {!hasAccess && (
                    <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={24} color="#FFF" />
                        <Text style={styles.lockedText}>LOCKED: {item.tier_required.toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.upgradeInlineButton}
                            onPress={(e) => {
                                // @ts-ignore
                                e?.stopPropagation?.();
                                onUpgrade();
                            }}
                            accessibilityRole="button"
                        >
                            <Ionicons name="sparkles-outline" size={14} color="#FFF" />
                            <Text style={styles.upgradeInlineText}>Upgrade</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.programInfo}>
                <Text style={styles.programName}>{item.name}</Text>
                <Text style={styles.programDetails}>
                    {item.duration_weeks} Weeks • {item.difficulty.toUpperCase()}
                </Text>
                <View style={styles.tags}>
                    {item.goals?.map((goal: string) => (
                        <View key={goal} style={styles.tag}>
                            <Text style={styles.tagText}>{goal}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function ProgramsScreen() {
    const theme = useTheme();
    const { colors, spacing, radius, typography } = theme;
    const styles = createStyles(theme);
    const { tier } = useProfileStore();
    const { profile } = useProfileStore();
    const router = useRouter();
    const { shouldShow, dismiss } = useGuide();
    const seenProgramsIntro = !shouldShow('programs_intro');
    const isAdminOrCoach = profile?.role === 'admin' || profile?.role === 'coach';

    const { data: programs, isLoading: loading, refetch } = useCachedQuery(
        'programs:list',
        fetchPrograms,
        { staleTimeMs: 60_000 }
    );
    const programRows = programs ?? [];

    const coachSections = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        (programRows as any[]).forEach((p: any) => {
            const tier = p.tier_required || 'free';
            if (!groups[tier]) groups[tier] = [];
            groups[tier].push(p);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => (TIER_PRIORITY[a] ?? 99) - (TIER_PRIORITY[b] ?? 99))
            .map(([tier, data]) => ({
                title: TIER_LABELS[tier] || tier.toUpperCase(),
                data: [...data].sort((a, b) => {
                    const diffDelta = (DIFFICULTY_ORDER[b.difficulty] ?? 1) - (DIFFICULTY_ORDER[a.difficulty] ?? 1);
                    if (diffDelta !== 0) return diffDelta;
                    return (b.duration_weeks || 0) - (a.duration_weeks || 0);
                }),
            }));
    }, [programRows]);

    const [activeTab, setActiveTab] = React.useState<'coach' | 'my'>('coach');
    const [userPrograms, setUserPrograms] = useState<any[]>([]);
    const userId = useAuthStore(s => s.user?.id ?? null);

    const canDoQuick = hasEntitlement(tier, 'quickWorkoutEnabled');
    const canCreateProgram = hasEntitlement(tier, 'guidedProgramsEnabled');
    const canBuildOwn = hasEntitlement(tier, 'customProgramsEnabled');

    useEffect(() => {
        if (activeTab === 'my' && userId) {
            supabase
                .from('programs')
                .select('id, name, duration_weeks, program_type, is_active')
                .eq('owner_id', userId)
                .in('program_type', ['guided', 'custom'])
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .then(({ data }) => setUserPrograms(data ?? []));
        }
    }, [activeTab, userId]);

    const handleDeleteProgram = useCallback(async (programId: string, name: string) => {
        Alert.alert('Delete Program', `Are you sure you want to delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await supabase.from('programs').update({ is_active: false }).eq('id', programId);
                    setUserPrograms((prev) => prev.filter((p) => p.id !== programId));
                },
            },
        ]);
    }, []);

    const renderProgram = ({ item }: { item: any }) => (
        <ProgramCard
            item={item}
            tier={tier}
            onPress={(id) => router.push({ pathname: '/(tabs)/programs/[id]', params: { id } })}
            onUpgrade={() => router.push('/subscribe')}
        />
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Training Programs</Text>
                <Text style={styles.subtitle}>Select your path to becoming.</Text>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'coach' && styles.activeTab]}
                    onPress={() => setActiveTab('coach')}
                >
                    <Text style={[styles.tabText, activeTab === 'coach' && styles.activeTabText]}>Coach-Led</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my' && styles.activeTab]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Programs</Text>
                    {!canDoQuick && (
                        <Ionicons name="lock-closed" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                    )}
                </TouchableOpacity>
            </View>

            {!seenProgramsIntro && (
                <View style={styles.hintWrap}>
                    <HintCard
                        title="Start with a Program"
                        body="Programs are structured weeks + days. Pick one, then hit 'Start Workout' on your training days. Consistency earns points and stages."
                        primaryCta={{
                            label: 'Browse Programs',
                            onPress: () => dismiss('programs_intro'),
                        }}
                        onDismiss={() => dismiss('programs_intro')}
                    />
                </View>
            )}

            {activeTab === 'my' && (
                <ScrollView style={styles.myProgramsContainer} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                        style={styles.quickWorkoutCard}
                        onPress={() => canDoQuick ? router.push('/workout/quick') : router.push('/subscribe')}
                    >
                        <View style={styles.quickIconBg}>
                            <Ionicons name="flash" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Quick Workout</Text>
                            <Text style={styles.quickSub}>Start a freeform session now</Text>
                        </View>
                        {!canDoQuick ? (
                            <View style={styles.quickLock}>
                                <Ionicons name="sparkles" size={16} color="#FFF" />
                                <Text style={styles.lockText}>Standard+</Text>
                            </View>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => canCreateProgram ? router.push('/programs/create') : router.push('/subscribe')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: colors.successSoft }]}>
                            <Ionicons name="sparkles" size={24} color={colors.success} />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Create Program</Text>
                            <Text style={styles.quickSub}>Auto-generate a multi-week plan</Text>
                        </View>
                        {!canCreateProgram ? (
                            <View style={[styles.quickLock, { backgroundColor: colors.success }]}>
                                <Ionicons name="lock-closed" size={14} color="#FFF" />
                                <Text style={styles.lockText}>VIP+</Text>
                            </View>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => canBuildOwn ? router.push('/programs/build') : router.push('/subscribe')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: colors.warningSoft }]}>
                            <Ionicons name="construct" size={24} color={colors.warning} />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Build Your Own</Text>
                            <Text style={styles.quickSub}>Full blank-canvas program builder</Text>
                        </View>
                        {!canBuildOwn ? (
                            <View style={[styles.quickLock, { backgroundColor: colors.warning }]}>
                                <Ionicons name="lock-closed" size={14} color="#FFF" />
                                <Text style={styles.lockText}>VIP+</Text>
                            </View>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => router.push('/cardio')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: colors.cardioSoft }]}>
                            <Ionicons name="fitness" size={24} color={colors.cardio} />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Cardio</Text>
                            <Text style={styles.quickSub}>Browse protocols & weekly plan</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>

                    {userPrograms.length > 0 && (
                        <View style={styles.userProgramsSection}>
                            <Text style={styles.sectionLabel}>YOUR PROGRAMS</Text>
                            {userPrograms.map((prog: any) => (
                                <TouchableOpacity
                                    key={prog.id}
                                    style={styles.userProgramRow}
                                    onPress={() => router.push({ pathname: '/(tabs)/programs/[id]', params: { id: prog.id } })}
                                >
                                    <View style={styles.userProgramInfo}>
                                        <Text style={styles.userProgramName}>{prog.name}</Text>
                                        <Text style={styles.userProgramMeta}>
                                            {prog.duration_weeks}w • {prog.program_type === 'guided' ? 'Guided' : prog.program_type === 'quick' ? 'Quick' : 'Custom'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteProgram(prog.id, prog.name)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {userPrograms.length === 0 && (
                        <View style={styles.emptyMyPrograms}>
                            <Ionicons name="albums-outline" size={40} color={colors.textTertiary} />
                            <Text style={styles.emptyMyTitle}>No custom programs yet</Text>
                            <Text style={styles.emptyMyBody}>
                                Create a guided program or do a quick workout to get started.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {activeTab === 'coach' && (
                programRows.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="barbell-outline" size={56} color={colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No programs available yet</Text>
                        <Text style={styles.emptyBody}>
                            New programs will appear here once they're published. Check back soon.
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={refetch}>
                            <Text style={styles.emptyButtonText}>Refresh</Text>
                        </TouchableOpacity>

                        {isAdminOrCoach && (
                            <>
                                <Text style={styles.emptyHelper}>Publish a program to make it visible to members.</Text>
                                <TouchableOpacity
                                    style={styles.adminButton}
                                    onPress={() => router.push('/admin/programs')}
                                >
                                    <Text style={styles.adminButtonText}>Go to Admin Programs</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <SectionList
                        sections={coachSections}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProgram}
                        renderSectionHeader={({ section: { title } }) => (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderText}>{title}</Text>
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={6}
                        stickySectionHeadersEnabled={false}
                    />
                )
            )}
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: Pick<ReturnType<typeof useTheme>, 'colors' | 'spacing' | 'radius' | 'typography'>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: spacing.lg,
        paddingTop: spacing.xxl,
    },
    title: {
        color: colors.text,
        fontSize: typography.h1.fontSize,
        fontWeight: typography.h1.fontWeight as any,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: typography.body.fontSize,
        marginTop: spacing.xs,
    },
    listContent: {
        padding: spacing.lg,
        paddingTop: 0,
        paddingBottom: spacing.xxl,
    },
    sectionHeader: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    sectionHeaderText: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '800' as const,
        letterSpacing: 1.5,
    },
    hintWrap: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    emptyCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderMid,
        paddingVertical: 28,
        paddingHorizontal: 18,
        alignItems: 'center',
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 10, textAlign: 'center' },
    emptyBody: { color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 18 },
    emptyButton: {
        marginTop: 14,
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    emptyButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    emptyHelper: { color: colors.textSecondary, marginTop: 14, fontSize: 12, textAlign: 'center' },
    adminButton: {
        marginTop: 10,
        backgroundColor: colors.infoSoft,
        borderColor: colors.info,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    adminButtonText: { color: colors.info, fontSize: 13, fontWeight: '900' },
    programCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    thumbnailPlaceholder: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    thumbnailTierBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    thumbnailTierText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockedText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        marginTop: spacing.sm,
        letterSpacing: 1,
    },
    upgradeInlineButton: {
        marginTop: 12,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.borderHard,
    },
    upgradeInlineText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    programInfo: {
        padding: spacing.md,
    },
    programName: {
        color: colors.text,
        fontSize: typography.h3.fontSize,
        fontWeight: typography.h3.fontWeight as any,
    },
    programDetails: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.md,
        gap: spacing.xs,
    },
    tag: {
        backgroundColor: colors.secondarySoft,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.secondarySoft,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    tabText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    activeTabText: {
        color: colors.primary,
        fontWeight: '700',
    },
    myProgramsContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    quickWorkoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borderMid,
        marginBottom: spacing.xl,
    },
    quickIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    quickContent: {
        flex: 1,
    },
    quickTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    quickSub: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    quickLock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    lockText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    emptyMyPrograms: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        opacity: 0.6,
    },
    emptyMyTitle: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '700',
        marginTop: 12,
    },
    emptyMyBody: {
        color: colors.textTertiary,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    createProgramCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borderMid,
        marginBottom: spacing.lg,
    },
    userProgramsSection: {
        marginTop: spacing.md,
    },
    sectionLabel: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    userProgramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        padding: 16,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    userProgramInfo: {
        flex: 1,
    },
    userProgramName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    userProgramMeta: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
    },
});
