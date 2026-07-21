import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTargets, getAdherenceSummary, AdherenceSummary, NutritionTarget } from '@/services/nutrition';
import { goBackOr } from '@/lib/navigation';

export default function AdherenceScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();
    const [targets, setTargets] = useState<NutritionTarget | null>(null);
    const [summary, setSummary] = useState<AdherenceSummary | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const activeTargets = await getActiveTargets(user.id);
            setTargets(activeTargets);
            
            if (activeTargets) {
                const adherence = await getAdherenceSummary(user.id, activeTargets);
                setSummary(adherence);
            }
        } catch (err) {
            console.error('[Adherence] Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user])
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    if (!targets || !summary) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    title: 'Nutrition Adherence',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/nutrition')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ),
                }} />
                <View style={styles.emptyState}>
                    <Ionicons name="stats-chart" size={64} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyTitle}>No Data Yet</Text>
                    <Text style={styles.emptyText}>
                        Set your nutrition targets and start logging meals to see your adherence stats here.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Adherence',
                    headerShown: true,
                    headerTransparent: false,
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/nutrition')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.streakCard}>
                    <Ionicons name="flame" size={32} color="#FF6B6B" />
                    <View style={styles.streakInfo}>
                        <Text style={styles.streakValue}>{summary.loggingStreak} Days</Text>
                        <Text style={styles.streakLabel}>Current Logging Streak</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7-DAY AVERAGES</Text>
                    
                    <View style={styles.statGrid}>
                        {/* Calories */}
                        <View style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <Text style={styles.statLabel}>Calories</Text>
                                <Text style={styles.targetLabel}>Target: {targets.calories}</Text>
                            </View>
                            <Text style={styles.statValue}>{summary.avgCalories7d}</Text>
                            <View style={styles.track}>
                                <View style={[
                                    styles.fill, 
                                    { backgroundColor: theme.colors.primary, 
                                      width: `${Math.min((summary.avgCalories7d / targets.calories) * 100, 100)}%` 
                                    }
                                ]} />
                            </View>
                        </View>

                        {/* Protein */}
                        <View style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <Text style={styles.statLabel}>Protein</Text>
                                <Text style={styles.targetLabel}>Target: {targets.protein_g}g</Text>
                            </View>
                            <Text style={styles.statValue}>{summary.avgProtein7d}g</Text>
                            <View style={styles.track}>
                                <View style={[
                                    styles.fill, 
                                    { backgroundColor: '#FF6B6B', 
                                      width: `${Math.min((summary.avgProtein7d / targets.protein_g) * 100, 100)}%` 
                                    }
                                ]} />
                            </View>
                        </View>
                        
                        {/* Protein Hit Rate */}
                        <View style={styles.statCardFull}>
                            <Text style={styles.statLabel}>Protein Consistency</Text>
                            <Text style={styles.statDesc}>Days hitting ≥90% of protein target (last 7 days)</Text>
                            <View style={styles.daysRow}>
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                    <View 
                                        key={day} 
                                        style={[
                                            styles.dayPip, 
                                            day <= summary.proteinHitDays7d && styles.dayPipActive
                                        ]} 
                                    />
                                ))}
                            </View>
                            <Text style={styles.hitDaysText}>{summary.proteinHitDays7d} / 7 Days</Text>
                        </View>

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        marginTop: 60,
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    streakCard: {
        backgroundColor: 'rgba(255,107,107,0.1)',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.2)',
    },
    streakInfo: {
        flex: 1,
    },
    streakValue: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 4,
    },
    streakLabel: {
        color: '#FF6B6B',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    statGrid: {
        gap: 16,
    },
    statCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statCardFull: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    targetLabel: {
        color: theme.colors.textTertiary,
        fontSize: 12,
    },
    statValue: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 16,
    },
    track: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
    statDesc: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        marginBottom: 16,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    dayPip: {
        flex: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
    },
    dayPipActive: {
        backgroundColor: '#FF6B6B',
    },
    hitDaysText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'right',
    },
});
