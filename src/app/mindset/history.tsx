import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

interface JournalEntry {
    id: string;
    entry_date: string;
    gratitude: string;
    intention: string;
    reflection: string;
    created_at: string;
}

export default function JournalHistoryScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

    useEffect(() => {
        if (user) fetchEntries();
    }, [user]);

    async function fetchEntries() {
        try {
            const { data, error } = await supabase
                .from('mindset_entries')
                .select('*')
                .eq('user_id', user?.id)
                .order('entry_date', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('[journal-history] Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const truncate = (text: string, length: number = 80) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    };

    const renderEntry = ({ item }: { item: JournalEntry }) => {
        const isExpanded = expandedId === item.id;

        return (
            <TouchableOpacity
                style={styles.entryCard}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.entryHeader}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                        <Text style={styles.dateText}>{formatDate(item.entry_date)}</Text>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                    />
                </View>

                {isExpanded ? (
                    <View style={styles.entryContent}>
                        {item.gratitude && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="heart-outline" size={16} color={colors.error} />
                                    <Text style={[styles.sectionLabel, { color: colors.error }]}>Gratitude</Text>
                                </View>
                                <Text style={styles.sectionText}>{item.gratitude}</Text>
                            </View>
                        )}
                        {item.intention && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="compass-outline" size={16} color={colors.progress} />
                                    <Text style={[styles.sectionLabel, { color: colors.progress }]}>Intention</Text>
                                </View>
                                <Text style={styles.sectionText}>{item.intention}</Text>
                            </View>
                        )}
                        {item.reflection && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: colors.primary }]}>Reflection</Text>
                                </View>
                                <Text style={styles.sectionText}>{item.reflection}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text style={styles.previewText}>
                        {truncate(item.gratitude || item.intention || item.reflection)}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{
                    headerShown: true,
                    headerTitle: 'Mindset Journal',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }} />
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Mindset Journal',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerRight: () => (
                    <TouchableOpacity onPress={() => router.push('/mindset/new')}>
                        <Ionicons name="add" size={28} color={colors.primary} />
                    </TouchableOpacity>
                )
            }} />

            {entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="journal-outline" size={60} color={colors.borderHard} />
                    <Text style={styles.emptyText}>No journal entries yet</Text>
                    <Text style={styles.emptySubtext}>Start your mindset practice today</Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => router.push('/mindset/new')}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.ctaText}>New Entry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{entries.length}</Text>
                            <Text style={styles.statLabel}>Total Entries</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {entries.filter(e => {
                                    const d = new Date(e.entry_date);
                                    const now = new Date();
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).length}
                            </Text>
                            <Text style={styles.statLabel}>This Month</Text>
                        </View>
                    </View>
                    <FlatList
                        data={entries}
                        renderItem={renderEntry}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            )}
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        centered: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        statsBar: {
            flexDirection: 'row',
            backgroundColor: colors.surface,
            margin: spacing.md,
            borderRadius: radius.lg,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
        },
        statDivider: {
            width: 1,
            backgroundColor: colors.borderMid,
            marginVertical: -spacing.sm,
        },
        statValue: {
            ...typography.h2,
            color: colors.primary,
        },
        statLabel: {
            ...typography.caption,
            color: colors.textSecondary,
        },
        list: {
            padding: spacing.md,
            paddingTop: 0,
        },
        entryCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
        },
        entryHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        dateContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        dateText: {
            ...typography.bodySmallMedium,
            color: colors.text,
        },
        previewText: {
            ...typography.bodySmall,
            color: colors.textSecondary,
            marginTop: spacing.sm,
            lineHeight: 20,
        },
        entryContent: {
            marginTop: spacing.md,
            gap: spacing.md,
        },
        section: {
            gap: 4,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        sectionLabel: {
            ...typography.captionMedium,
        },
        sectionText: {
            ...typography.bodySmall,
            color: colors.text,
            lineHeight: 20,
            paddingLeft: 22,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.xl,
        },
        emptyText: {
            ...typography.h3,
            color: colors.text,
            marginTop: spacing.lg,
        },
        emptySubtext: {
            ...typography.bodySmall,
            color: colors.textSecondary,
            marginTop: spacing.xs,
            marginBottom: spacing.lg,
        },
        ctaButton: {
            flexDirection: 'row',
            backgroundColor: colors.primary,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            alignItems: 'center',
            gap: 8,
        },
        ctaText: {
            ...typography.buttonSm,
            color: '#FFF',
        },
    });
