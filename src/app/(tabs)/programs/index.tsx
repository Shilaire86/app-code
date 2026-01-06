import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const ProgramCard = memo(({ item, tier, onPress }: { item: any, tier: any, onPress: (id: string) => void }) => {
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
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { tier } = useProfileStore();
    const router = useRouter();

    useEffect(() => {
        fetchPrograms();
    }, []);

    async function fetchPrograms() {
        try {
            const { data, error } = await supabase
                .from('programs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPrograms(data || []);
        } catch (error) {
            console.error('Error fetching programs:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderProgram = ({ item }: { item: any }) => (
        <ProgramCard
            item={item}
            tier={tier}
            onPress={(id) => router.push({ pathname: '/(tabs)/programs/[id]', params: { id } })}
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

            <FlatList
                data={programs}
                renderItem={renderProgram}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
            />
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
