import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
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
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.dateText}>{formatDate(item.entry_date)}</Text>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </View>

                {isExpanded ? (
                    <View style={styles.entryContent}>
                        {item.gratitude && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="heart-outline" size={16} color="#FF6B6B" />
                                    <Text style={[styles.sectionLabel, { color: '#FF6B6B' }]}>Gratitude</Text>
                                </View>
                                <Text style={styles.sectionText}>{item.gratitude}</Text>
                            </View>
                        )}
                        {item.intention && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="compass-outline" size={16} color="#4ECDC4" />
                                    <Text style={[styles.sectionLabel, { color: '#4ECDC4' }]}>Intention</Text>
                                </View>
                                <Text style={styles.sectionText}>{item.intention}</Text>
                            </View>
                        )}
                        {item.reflection && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bulb-outline" size={16} color="#FFEAA7" />
                                    <Text style={[styles.sectionLabel, { color: '#FFEAA7' }]}>Reflection</Text>
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
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Mindset Journal',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerRight: () => (
                    <TouchableOpacity onPress={() => router.push('/mindset/new')}>
                        <Ionicons name="add" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                )
            }} />

            {entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="journal-outline" size={60} color="rgba(255,255,255,0.1)" />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        margin: theme.spacing.md,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: -theme.spacing.sm,
    },
    statValue: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    list: {
        padding: theme.spacing.md,
        paddingTop: 0,
    },
    entryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    previewText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.sm,
        lineHeight: 20,
    },
    entryContent: {
        marginTop: theme.spacing.md,
        gap: theme.spacing.md,
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
        fontSize: 12,
        fontWeight: '600',
    },
    sectionText: {
        color: '#FFF',
        fontSize: 14,
        lineHeight: 20,
        paddingLeft: 22,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: theme.spacing.lg,
    },
    emptySubtext: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
    },
    ctaButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        gap: 8,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: '700',
    },
});
