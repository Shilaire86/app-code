import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { fetchPrograms } from '@/services/programs';
import { HintCard } from '@/components/HintCard';
import { hasEntitlement } from '@/lib/entitlements';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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
    const [activeTab, setActiveTab] = React.useState<'coach' | 'my'>('coach');
    const [userPrograms, setUserPrograms] = useState<any[]>([]);
    const userId = useAuthStore.getState().user?.id ?? null;

    const canDoQuick = hasEntitlement(tier, 'quickWorkoutEnabled');
    const canCreateProgram = hasEntitlement(tier, 'guidedProgramsEnabled');
    const canBuildOwn = hasEntitlement(tier, 'customProgramsEnabled');

    // Fetch user-owned programs when switching to My Programs tab
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
                    {!canDoQuick && <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.4)" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
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

            {activeTab === 'my' && (
                <ScrollView style={styles.myProgramsContainer} showsVerticalScrollIndicator={false}>
                     <TouchableOpacity 
                        style={styles.quickWorkoutCard}
                        onPress={() => canDoQuick ? router.push('/workout/quick') : router.push('/subscribe')}
                    >
                        <View style={styles.quickIconBg}>
                            <Ionicons name="flash" size={24} color={theme.colors.primary} />
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
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => canCreateProgram ? router.push('/programs/create') : router.push('/subscribe')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: 'rgba(0,255,128,0.1)' }]}>
                            <Ionicons name="sparkles" size={24} color="#00FF80" />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Create Program</Text>
                            <Text style={styles.quickSub}>Auto-generate a multi-week plan</Text>
                        </View>
                        {!canCreateProgram ? (
                             <View style={[styles.quickLock, { backgroundColor: '#00FF80' }]}>
                                <Ionicons name="lock-closed" size={14} color="#000" />
                                <Text style={[styles.lockText, { color: '#000' }]}>VIP+</Text>
                             </View>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => canBuildOwn ? router.push('/programs/build') : router.push('/subscribe')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: 'rgba(255,170,0,0.1)' }]}>
                            <Ionicons name="construct" size={24} color="#FFAA00" />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Build Your Own</Text>
                            <Text style={styles.quickSub}>Full blank-canvas program builder</Text>
                        </View>
                        {!canBuildOwn ? (
                             <View style={[styles.quickLock, { backgroundColor: '#FFAA00' }]}>
                                <Ionicons name="lock-closed" size={14} color="#000" />
                                <Text style={[styles.lockText, { color: '#000' }]}>Elite</Text>
                             </View>
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.createProgramCard}
                        onPress={() => router.push('/cardio')}
                    >
                        <View style={[styles.quickIconBg, { backgroundColor: 'rgba(255,152,0,0.1)' }]}>
                            <Ionicons name="fitness" size={24} color="#FF9800" />
                        </View>
                        <View style={styles.quickContent}>
                            <Text style={styles.quickTitle}>Cardio</Text>
                            <Text style={styles.quickSub}>Browse protocols & weekly plan</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
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
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {userPrograms.length === 0 && (
                        <View style={styles.emptyMyPrograms}>
                            <Ionicons name="albums-outline" size={40} color="rgba(255,255,255,0.05)" />
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
                )
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
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: 'rgba(0,187,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.3)',
    },
    tabText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    myProgramsContainer: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
    },
    quickWorkoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.xl,
    },
    quickIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(0,187,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    quickContent: {
        flex: 1,
    },
    quickTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    quickSub: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    quickLock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
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
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '700',
        marginTop: 12,
    },
    emptyMyBody: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    createProgramCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.lg,
    },
    userProgramsSection: {
        marginTop: theme.spacing.md,
    },
    sectionLabel: {
        color: theme.colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: theme.spacing.md,
    },
    userProgramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    userProgramInfo: {
        flex: 1,
    },
    userProgramName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    userProgramMeta: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
    },
});
