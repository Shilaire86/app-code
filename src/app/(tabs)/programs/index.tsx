import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { fetchPrograms } from '@/services/programs';
import { HintCard } from '@/components/HintCard';

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
    const hasAccess = canAccessTier(tier, item.tier_required);

    return (
        <TouchableOpacity
            style={styles.programCard}
            onPress={() => onPress(item.id)}
        >
            <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="barbell-outline" size={40} color="rgba(255,255,255,0.1)" />
                {!hasAccess && (
                    <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={24} color="#FFF" />
                        <Text style={styles.lockedText}>LOCKED: {item.tier_required.toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.upgradeInlineButton}
                            onPress={(e) => {
                                // On web, prevent bubbling so this feels like a dedicated CTA.
                                // On native, nested touchables may still bubble; it's OK if the parent
                                // also navigates to the locked program (it will still be gated).
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
    const { tier } = useProfileStore();
    const { profile, setSeenHint } = useProfileStore();
    const router = useRouter();
    const seenProgramsIntro = !!profile?.seen_hints?.programs_intro;
    const isAdminOrCoach = profile?.role === 'admin' || profile?.role === 'coach';

    const { data: programs, isLoading: loading, refetch } = useCachedQuery(
        'programs:list',
        fetchPrograms,
        { staleTimeMs: 60_000 }
    );
    const programRows = programs ?? [];

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
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Training Programs</Text>
                <Text style={styles.subtitle}>Select your path to becoming.</Text>
            </View>

            {!seenProgramsIntro && (
                <View style={styles.hintWrap}>
                    <HintCard
                        title="Start with a Program"
                        body="Programs are structured weeks + days. Pick one, then hit 'Start Workout' on your training days. Consistency earns points and stages."
                        primaryCta={{
                            label: 'Browse Programs',
                            onPress: () => setSeenHint('programs_intro'),
                        }}
                        onDismiss={() => setSeenHint('programs_intro')}
                    />
                    {/* Test reset: set `profiles.seen_hints` to '{}'::jsonb in Supabase */}
                </View>
            )}

            {programRows.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Ionicons name="barbell-outline" size={56} color="rgba(255,255,255,0.12)" />
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
            <FlatList
                data={programRows}
                renderItem={renderProgram}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
            />
            )}
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
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
    },
    title: {
        color: theme.colors.text,
        fontSize: theme.typography.h1.fontSize,
        fontWeight: theme.typography.h1.fontWeight as any,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.body.fontSize,
        marginTop: theme.spacing.xs,
    },
    listContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    hintWrap: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    emptyCard: {
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 28,
        paddingHorizontal: 18,
        alignItems: 'center',
    },
    emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 10, textAlign: 'center' },
    emptyBody: { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 18 },
    emptyButton: {
        marginTop: 14,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    emptyButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    emptyHelper: { color: theme.colors.textSecondary, marginTop: 14, fontSize: 12, textAlign: 'center' },
    adminButton: {
        marginTop: 10,
        backgroundColor: 'rgba(0,187,255,0.10)',
        borderColor: 'rgba(0,187,255,0.28)',
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    adminButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
    programCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    thumbnailPlaceholder: {
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
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
        marginTop: theme.spacing.sm,
        letterSpacing: 1,
    },
    upgradeInlineButton: {
        marginTop: 12,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    upgradeInlineText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    programInfo: {
        padding: theme.spacing.md,
    },
    programName: {
        color: theme.colors.text,
        fontSize: theme.typography.h3.fontSize,
        fontWeight: theme.typography.h3.fontWeight as any,
    },
    programDetails: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    tag: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    tagText: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
    },
});
