import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ProgressEntry = {
    created_at: string;
    entry_date?: string | null;
    weight_lbs?: number | null;
    body_fat_percent?: number | null;
    chest_inches?: number | null;
    waist_inches?: number | null;
    hips_inches?: number | null;
    arms_inches?: number | null;
    thighs_inches?: number | null;
    notes?: string | null;
};

function formatDate(dateLike?: string | null) {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return String(dateLike);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtNum(n?: number | null, suffix = '') {
    if (n === null || n === undefined) return '—';
    const num = typeof n === 'number' ? n : Number(n);
    if (Number.isNaN(num)) return '—';
    return `${num}${suffix}`;
}

export default function MyCheckInsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [entries, setEntries] = useState<ProgressEntry[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user?.id) return;
        fetchEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    async function fetchEntries() {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('progress_entries')
                .select('created_at,entry_date,weight_lbs,body_fat_percent,chest_inches,waist_inches,hips_inches,arms_inches,thighs_inches,notes')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries((data || []) as ProgressEntry[]);
        } catch (e: any) {
            setError(typeof e?.message === 'string' ? e.message : 'Failed to load check-ins.');
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }

    const latest = entries[0] || null;

    const history = useMemo(() => entries.slice(0), [entries]);

    const toggleExpanded = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'My Check-Ins',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/progress/measurements')}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Add Check-In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/progress/trends')}>
                    <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
                    <Text style={styles.secondaryButtonText}>View Trends</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="clipboard-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.emptyTitle}>No check-ins yet</Text>
                    <Text style={styles.emptyText}>Add your first check-in to start tracking your progress.</Text>
                    {!!error && <Text style={styles.errorText}>{error}</Text>}
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/progress/measurements')}>
                        <Text style={styles.primaryButtonText}>Add a check-in</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    {!!error && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{error}</Text>
                            <TouchableOpacity onPress={fetchEntries}>
                                <Text style={styles.errorBannerAction}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Latest */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Latest Check-In</Text>
                            <Text style={styles.cardMeta}>{latest ? formatDate(latest.created_at) : '—'}</Text>
                        </View>

                        <View style={styles.latestGrid}>
                            <View style={styles.latestItem}>
                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{fmtNum(latest?.weight_lbs, ' lbs')}</Text>
                            </View>
                            <View style={styles.latestItem}>
                                <Text style={styles.label}>Body Fat</Text>
                                <Text style={styles.value}>{fmtNum(latest?.body_fat_percent, '%')}</Text>
                            </View>
                            <View style={styles.latestItem}>
                                <Text style={styles.label}>Waist</Text>
                                <Text style={styles.value}>{fmtNum(latest?.waist_inches, ' in')}</Text>
                            </View>
                            <View style={styles.latestItem}>
                                <Text style={styles.label}>Chest</Text>
                                <Text style={styles.value}>{fmtNum(latest?.chest_inches, ' in')}</Text>
                            </View>
                            <View style={styles.latestItem}>
                                <Text style={styles.label}>Hips</Text>
                                <Text style={styles.value}>{fmtNum(latest?.hips_inches, ' in')}</Text>
                            </View>
                        </View>

                        {latest?.notes ? (
                            <View style={styles.notesRow}>
                                <Text style={styles.label}>Notes</Text>
                                <Text style={styles.notesText} numberOfLines={3}>{latest.notes}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* History */}
                    <Text style={styles.sectionTitle}>History</Text>
                    {history.map((e) => {
                        const key = `${e.created_at}`;
                        const isOpen = !!expanded[key];
                        return (
                            <TouchableOpacity
                                key={key}
                                style={styles.row}
                                onPress={() => toggleExpanded(key)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.rowTop}>
                                    <View style={styles.rowLeft}>
                                        <Text style={styles.rowDate}>{formatDate(e.created_at)}</Text>
                                        <Text style={styles.rowSub}>Weight: {fmtNum(e.weight_lbs, ' lbs')}</Text>
                                    </View>
                                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.7)" />
                                </View>

                                {isOpen && (
                                    <View style={styles.rowDetails}>
                                        <Text style={styles.detailLine}>Body Fat: {fmtNum(e.body_fat_percent, '%')}</Text>
                                        <Text style={styles.detailLine}>Chest: {fmtNum(e.chest_inches, ' in')}</Text>
                                        <Text style={styles.detailLine}>Waist: {fmtNum(e.waist_inches, ' in')}</Text>
                                        <Text style={styles.detailLine}>Hips: {fmtNum(e.hips_inches, ' in')}</Text>
                                        <Text style={styles.detailLine}>Arms: {fmtNum(e.arms_inches, ' in')}</Text>
                                        <Text style={styles.detailLine}>Thighs: {fmtNum(e.thighs_inches, ' in')}</Text>
                                        {!!e.notes && <Text style={styles.detailLine}>Notes: {e.notes}</Text>}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    primaryButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    secondaryButtonText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '800',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    errorBanner: {
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderColor: 'rgba(255,107,107,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    errorBannerText: {
        flex: 1,
        color: '#FFB3B3',
        fontSize: 12,
        fontWeight: '600',
    },
    errorBannerAction: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.lg,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    cardMeta: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    latestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    latestItem: {
        width: '46%',
        minWidth: 140,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
    },
    value: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },
    notesRow: {
        marginTop: theme.spacing.md,
    },
    notesText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        lineHeight: 16,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        marginBottom: theme.spacing.sm,
    },
    row: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.sm,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    rowLeft: {
        flex: 1,
    },
    rowDate: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
    },
    rowSub: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        fontWeight: '600',
    },
    rowDetails: {
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        gap: 6,
    },
    detailLine: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 12,
        lineHeight: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        gap: 10,
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    errorText: {
        color: '#FFB3B3',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 6,
    },
});

