import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { isVip, hasEntitlement } from '@/lib/entitlements';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { 
    getActiveTargets, 
    fetchDailyLogs, 
    calculateDailySummary, 
    deleteMealLog,
    getSmartFoodSuggestions,
    NutritionTarget, 
    MealLog,
    DailySummary,
    FoodSuggestion
} from '@/services/nutrition';
import { getActiveInsights, resolveInsight, generateInsights, NutritionInsight } from '@/services/nutritionInsights';

export default function NutritionDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile, tier } = useProfileStore();
    const [targets, setTargets] = useState<NutritionTarget | null>(null);
    const [logs, setLogs] = useState<MealLog[]>([]);
    const [summary, setSummary] = useState<DailySummary>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    const [insights, setInsights] = useState<NutritionInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const canAccessNutrition = hasEntitlement(tier, 'nutritionEnabled');

    const loadData = async () => {
        if (!user?.id || !profile) return; // Wait until profile is loaded
        
        if (!canAccessNutrition) {
            setLoading(false);
            return;
        }
        try {
            const [fetchedTargets, fetchedLogs] = await Promise.all([
                getActiveTargets(user.id),
                fetchDailyLogs(user.id, today)
            ]);
            
            setTargets(fetchedTargets);
            setLogs(fetchedLogs);
            setSummary(calculateDailySummary(fetchedLogs));

            if (tier === 'elite') {
                // Fetch existing insights
                const userInsights = await getActiveInsights(user.id);
                setInsights(userInsights);
                // Background trigger to generate new ones
                generateInsights(user.id).catch(console.error);
            }
        } catch (err) {
            console.error('[NutritionDashboard] Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Use useFocusEffect to reload data when the user returns to this tab
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user, today, tier])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (logId: string, name: string) => {
        Alert.alert('Delete Log', `Are you sure you want to delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        await deleteMealLog(logId);
                        loadData(); // Refresh
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete meal log.');
                    }
                }
            }
        ]);
    };

    if (!profile || (loading && !refreshing)) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    if (!canAccessNutrition) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { marginBottom: 20 }]}>
                    <View>
                        <Text style={styles.headerTitle}>Nutrition</Text>
                    </View>
                </View>
                <View style={{ flex: 1, padding: theme.spacing.lg, justifyContent: 'center' }}>
                     <UpgradePrompt 
                         title="Upgrade to Access Nutrition"
                         body="The Dynamic Nutrition System helps you hit your macros and guarantees results. Upgrade to gain full access to macro tracking, meal libraries, and smart food suggestions."
                         requiredTier="standard"
                         onUpgradePress={() => router.push('/subscribe')}
                         onLearnMorePress={() => {}}
                     />
                </View>
            </View>
        );
    }

    if (!targets) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.emptyState}>
                    <Ionicons name="restaurant-outline" size={64} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyTitle}>Nutrition Targets</Text>
                    <Text style={styles.emptyText}>
                        You haven't set your daily macro targets yet. Use the macro calculator to find your starting point.
                    </Text>
                    <TouchableOpacity
                        style={styles.calcButton}
                        onPress={() => router.push('/nutrition/calculator')}
                    >
                        <Text style={styles.calcButtonText}>Open Macro Calculator</Text>
                        <Ionicons name="arrow-forward" size={18} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const remaining = {
        calories: Math.max(0, targets.calories - summary.calories),
        protein_g: Math.max(0, targets.protein_g - summary.protein_g),
        carbs_g: Math.max(0, targets.carbs_g - summary.carbs_g),
        fat_g: Math.max(0, targets.fat_g - summary.fat_g),
    };

    const getProgressPercent = (current: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(100, Math.max(0, (current / target) * 100));
    };

    const suggestions = isVip(tier) && targets
        ? getSmartFoodSuggestions(remaining, profile?.dietary_preference || 'standard')
        : [];

    const getFocusColor = (focus: string) => {
        switch (focus) {
            case 'protein': return '#FF6B6B';
            case 'carbs': return '#4ECDC4';
            case 'fat': return '#FECA57';
            case 'done': return theme.colors.primary;
            default: return theme.colors.textSecondary;
        }
    };

    const getFocusIcon = (focus: string): any => {
        switch (focus) {
            case 'protein': return 'fish';
            case 'carbs': return 'leaf';
            case 'fat': return 'water';
            case 'done': return 'checkmark-circle';
            default: return 'restaurant';
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Nutrition</Text>
                    <Text style={styles.headerDate}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {isVip(profile?.tier) && (
                        <TouchableOpacity onPress={() => router.push('/nutrition/adherence')} style={styles.headerBtn}>
                            <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => router.push('/nutrition/calculator')} style={styles.headerBtn}>
                        <Ionicons name="options-outline" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Elite Insights */}
                {tier === 'elite' && insights.length > 0 && (
                    <View style={styles.insightsContainer}>
                        {insights.map(insight => (
                            <View key={insight.id} style={styles.insightCard}>
                                <View style={styles.insightHeader}>
                                    <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                                    <Text style={styles.insightTitle}>{insight.title}</Text>
                                </View>
                                <Text style={styles.insightMessage}>{insight.message}</Text>
                                <View style={styles.insightActions}>
                                    <TouchableOpacity 
                                        style={styles.insightDismissBtn} 
                                        onPress={async () => {
                                            await resolveInsight(insight.id, 'dismissed');
                                            setInsights(prev => prev.filter(i => i.id !== insight.id));
                                        }}
                                    >
                                        <Text style={styles.insightDismissText}>Dismiss</Text>
                                    </TouchableOpacity>
                                    {insight.action_type === 'recalculate' && (
                                        <TouchableOpacity 
                                            style={styles.insightActionBtn}
                                            onPress={async () => {
                                                await resolveInsight(insight.id, 'resolved');
                                                setInsights(prev => prev.filter(i => i.id !== insight.id));
                                                router.push('/nutrition/calculator');
                                            }}
                                        >
                                            <Text style={styles.insightActionBtnText}>Recalculate</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Daily Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.calorieOverview}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statLabel}>Calories Remaining</Text>
                            <Text style={styles.largeValue}>{remaining.calories}</Text>
                        </View>
                        <View style={styles.goalPill}>
                            <Text style={styles.goalPillText}>{targets.goal}</Text>
                        </View>
                    </View>

                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${getProgressPercent(summary.calories, targets.calories)}%` }]} />
                    </View>
                    <View style={styles.progressRow}>
                        <Text style={styles.progressText}>{summary.calories} consumed</Text>
                        <Text style={styles.progressText}>{targets.calories} target</Text>
                    </View>

                    {/* Macro Columns */}
                    <View style={styles.macrosContainer}>
                        <View style={styles.macroCol}>
                            <Text style={styles.macroValue}>{Math.round(remaining.protein_g)}g</Text>
                            <Text style={styles.macroName}>Protein</Text>
                            <View style={styles.macroTrack}>
                                <View style={[styles.macroFill, { backgroundColor: '#FF6B6B', width: `${getProgressPercent(summary.protein_g, targets.protein_g)}%` }]} />
                            </View>
                        </View>
                        <View style={styles.macroCol}>
                            <Text style={styles.macroValue}>{Math.round(remaining.carbs_g)}g</Text>
                            <Text style={styles.macroName}>Carbs</Text>
                            <View style={styles.macroTrack}>
                                <View style={[styles.macroFill, { backgroundColor: '#4ECDC4', width: `${getProgressPercent(summary.carbs_g, targets.carbs_g)}%` }]} />
                            </View>
                        </View>
                        <View style={styles.macroCol}>
                            <Text style={styles.macroValue}>{Math.round(remaining.fat_g)}g</Text>
                            <Text style={styles.macroName}>Fat</Text>
                            <View style={styles.macroTrack}>
                                <View style={[styles.macroFill, { backgroundColor: '#FECA57', width: `${getProgressPercent(summary.fat_g, targets.fat_g)}%` }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={[styles.addLogBtn, isVip(tier) && styles.actionBtnHalf]}
                        onPress={() => router.push('/nutrition/log-meal')}
                    >
                        <Ionicons name="add-circle" size={20} color="#000" />
                        <Text style={styles.addLogBtnText}>LOG MEAL</Text>
                    </TouchableOpacity>

                    {isVip(tier) && (
                        <TouchableOpacity 
                            style={[styles.myMealsBtn, styles.actionBtnHalf]}
                            onPress={() => router.push('/nutrition/saved-meals')}
                        >
                            <Ionicons name="fast-food" size={18} color="#FFF" />
                            <Text style={styles.myMealsBtnText}>MY MEALS</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Smart Suggestions (VIP+) */}
                {suggestions.length > 0 && (
                    <View style={styles.suggestionsSection}>
                        <Text style={styles.sectionLabel}>SMART SUGGESTIONS</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={{ gap: 12 }}
                        >
                            {suggestions.map((sug, i) => (
                                <View key={i} style={styles.suggestionCard}>
                                    <View style={[styles.suggestionIcon, { backgroundColor: getFocusColor(sug.macroFocus) + '20' }]}>
                                        <Ionicons name={getFocusIcon(sug.macroFocus)} size={20} color={getFocusColor(sug.macroFocus)} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.suggestionTitle}>{sug.title}</Text>
                                        <Text style={styles.suggestionDesc}>{sug.description}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.logSection}>
                    <Text style={styles.sectionLabel}>TODAY'S LOGS</Text>
                    
                    {logs.length === 0 ? (
                        <View style={styles.emptyMealsBox}>
                            <Ionicons name="cafe-outline" size={32} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyMealsTitle}>No Meals Yet</Text>
                            <Text style={styles.emptyMealsText}>
                                Start logging your meals to stay on track with your macro goals.
                            </Text>
                        </View>
                    ) : (
                        logs.map((log) => (
                            <View key={log.id} style={styles.mealCard}>
                                <View style={styles.mealInfo}>
                                    <View style={styles.mealHeader}>
                                        <Text style={styles.mealTitle}>{log.name}</Text>
                                        <Text style={styles.mealTypeTag}>{log.meal_type}</Text>
                                    </View>
                                    <Text style={styles.mealMacros}>
                                        {log.calories} cal • {Math.round(log.protein_g)}g P • {Math.round(log.carbs_g)}g C • {Math.round(log.fat_g)}g F
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(log.id, log.name)}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '800',
    },
    headerDate: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
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
        marginBottom: 30,
    },
    calcButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
    },
    calcButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '700',
    },
    overviewCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    calorieOverview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xl,
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    largeValue: {
        color: '#FFF',
        fontSize: 48,
        fontWeight: '800',
        lineHeight: 52,
    },
    goalPill: {
        backgroundColor: 'rgba(0,187,255,0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.2)',
    },
    goalPillText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 6,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 6,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    progressText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    macrosContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    macroCol: {
        flex: 1,
    },
    macroValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    macroName: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    macroTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyMealsBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
    },
    emptyMealsTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMealsText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    actionBtnHalf: {
        flex: 1,
        marginBottom: 0,
    },
    addLogBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
    },
    addLogBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    myMealsBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    myMealsBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    suggestionsSection: {
        marginBottom: 32,
    },
    suggestionCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 16,
        width: 280,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    suggestionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    suggestionDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    logSection: {
        marginBottom: 20,
    },
    sectionLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    mealCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    mealInfo: {
        flex: 1,
    },
    mealHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    mealTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    mealTypeTag: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    mealMacros: {
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 8,
    },
    // Elite Insights
    insightsContainer: {
        marginBottom: 24,
        gap: 12,
    },
    insightCard: {
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    insightTitle: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    insightMessage: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    insightActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        alignItems: 'center',
    },
    insightDismissBtn: {
        paddingVertical: 8,
    },
    insightDismissText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    insightActionBtn: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    insightActionBtnText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '800',
    },
});
