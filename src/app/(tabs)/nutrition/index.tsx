import React, { useEffect, useState, useCallback } from 'react';

const DIETARY_PREFERENCES = ['standard', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'carnivore'] as const;
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
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useGuide } from '@/hooks/useGuide';
import { GuideBanner } from '@/components/GuideBanner';
import { isVip, hasEntitlement } from '@/lib/entitlements';
import { fetchScanCredits, ScanCredits } from '@/services/scanCredits';
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
import * as ImagePicker from 'expo-image-picker';
import { estimateMealFromPhoto } from '@/services/mealVision';

export default function NutritionDashboard() {
    const theme = useTheme();
    const { colors, spacing, radius, typography } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile, tier, updateProfile } = useProfileStore();
    const { shouldShow, dismiss } = useGuide();
    const [targets, setTargets] = useState<NutritionTarget | null>(null);
    const [logs, setLogs] = useState<MealLog[]>([]);
    const [summary, setSummary] = useState<DailySummary>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    const [insights, setInsights] = useState<NutritionInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanCredits, setScanCredits] = useState<ScanCredits | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const canAccessNutrition = hasEntitlement(tier, 'nutritionEnabled');

    const loadData = async () => {
        if (!user?.id || !profile) return; // Wait until profile is loaded
        
        if (!canAccessNutrition) {
            setLoading(false);
            return;
        }
        try {
            const canScan = hasEntitlement(tier, 'mealScanEnabled');
            const [fetchedTargets, fetchedLogs, credits] = await Promise.all([
                getActiveTargets(user.id),
                fetchDailyLogs(user.id, today),
                canScan ? fetchScanCredits(user.id, tier) : Promise.resolve(null),
            ]);
            if (credits) setScanCredits(credits);
            
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

    const runScan = async (source: 'camera' | 'library') => {
        try {
            const perm = source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    'Permission Needed',
                    `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access to scan meals.`
                );
                return;
            }

            const opts: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                base64: true,
                quality: 0.5,
                allowsEditing: false,
            };
            const result = source === 'camera'
                ? await ImagePicker.launchCameraAsync(opts)
                : await ImagePicker.launchImageLibraryAsync(opts);

            if (result.canceled || !result.assets?.[0]?.base64) return;
            const asset = result.assets[0];
            const mediaType = asset.mimeType === 'image/png'
                ? 'image/png'
                : asset.mimeType === 'image/webp'
                    ? 'image/webp'
                    : 'image/jpeg';

            setScanning(true);
            const est = await estimateMealFromPhoto(asset.base64!, mediaType);
            setScanning(false);

            // Refresh credit count so the button updates immediately
            if (user?.id && tier) {
                fetchScanCredits(user.id, tier).then(setScanCredits).catch(() => {});
            }

            router.push({
                pathname: '/nutrition/log-meal',
                params: {
                    name: est.name,
                    calories: String(est.calories),
                    protein: String(est.protein_g),
                    carbs: String(est.carbs_g),
                    fat: String(est.fat_g),
                    confidence: est.confidence,
                    fromScan: '1',
                },
            });
        } catch (err) {
            setScanning(false);
            const msg = err instanceof Error ? err.message : 'Could not analyze the photo.';
            if (msg.includes('No scans remaining')) {
                Alert.alert(
                    'Daily Limit Reached',
                    "You've used all your scans for today. Your credits reset at midnight.",
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Scan Failed', msg);
            }
        }
    };

    const handleScanMeal = () => {
        Alert.alert('Scan a Meal', 'Snap a photo of your meal and AI will estimate the macros.', [
            { text: 'Take Photo', onPress: () => runScan('camera') },
            { text: 'Choose from Library', onPress: () => runScan('library') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    if (!profile || (loading && !refreshing)) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} size="large" />
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
                <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
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
                    <Ionicons name="restaurant-outline" size={64} color={colors.textTertiary} />
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
            case 'done': return colors.primary;
            default: return colors.textSecondary;
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

            {scanning && (
                <View style={styles.scanOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.scanOverlayText}>Analyzing your meal…</Text>
                    <Text style={styles.scanOverlaySub}>Estimating macros from your photo</Text>
                </View>
            )}

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Nutrition</Text>
                    <Text style={styles.headerDate}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {isVip(tier) && (
                        <TouchableOpacity onPress={() => router.push('/nutrition/adherence')} style={styles.headerBtn}>
                            <Ionicons name="stats-chart" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => router.push('/nutrition/calculator')} style={styles.headerBtn}>
                        <Ionicons name="options-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
            >
                {shouldShow('nutrition_guide') && (
                    <GuideBanner
                        title="Welcome to Nutrition"
                        body="Your macro rings show today's calories, protein, carbs, and fat. Tap 'Log Meal' to add food — or use the AI scanner to estimate macros from a photo. Tap the sliders icon to adjust your daily targets."
                        onDismiss={() => dismiss('nutrition_guide')}
                        primaryCta={{
                            label: 'Open Macro Calculator',
                            onPress: () => {
                                dismiss('nutrition_guide');
                                router.push('/nutrition/calculator');
                            },
                        }}
                    />
                )}

                {/* Elite Insights */}
                {tier === 'elite' && insights.length > 0 && (
                    <View style={styles.insightsContainer}>
                        {insights.map(insight => (
                            <View key={insight.id} style={styles.insightCard}>
                                <View style={styles.insightHeader}>
                                    <Ionicons name="sparkles" size={20} color={colors.primary} />
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

                {/* Scan a Meal (Standard+) */}
                {hasEntitlement(tier, 'mealScanEnabled') && (
                    <TouchableOpacity style={styles.scanBtn} onPress={handleScanMeal} disabled={scanning}>
                        <Ionicons name="camera" size={20} color="#000" />
                        <Text style={styles.scanBtnText}>SCAN A MEAL</Text>
                        <View style={styles.scanBadge}>
                            <Text style={styles.scanBadgeText}>AI</Text>
                        </View>
                        {scanCredits !== null && (
                            <View style={styles.scanCreditPill}>
                                <Text style={styles.scanCreditText}>
                                    {scanCredits.totalRemaining} left
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

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

                {/* Tools */}
                <Text style={styles.sectionLabel}>TOOLS</Text>
                <TouchableOpacity
                    style={styles.toolRow}
                    onPress={() => router.push('/nutrition/calculator')}
                >
                    <View style={styles.toolIconBox}>
                        <Ionicons name="calculator-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.toolTitle}>Macro Calculator</Text>
                        <Text style={styles.toolSub}>Recalculate your daily calorie & macro targets</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Dietary Preference */}
                <Text style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.prefCard}>
                    <Text style={styles.prefLabel}>Dietary Preference</Text>
                    <Text style={styles.prefDesc}>Personalizes your smart food suggestions</Text>
                    <View style={styles.prefRow}>
                        {DIETARY_PREFERENCES.map((pref) => {
                            const active = (profile?.dietary_preference || 'standard') === pref;
                            return (
                                <TouchableOpacity
                                    key={pref}
                                    style={[styles.prefBtn, active && styles.prefBtnActive]}
                                    onPress={() => updateProfile({ dietary_preference: pref })}
                                >
                                    <Text style={[styles.prefBtnText, active && styles.prefBtnTextActive]}>
                                        {pref.charAt(0).toUpperCase() + pref.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
                            <Ionicons name="cafe-outline" size={32} color={colors.textTertiary} />
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
                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: Pick<ReturnType<typeof useTheme>, 'colors' | 'spacing' | 'radius' | 'typography'>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    headerDate: {
        color: colors.textSecondary,
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
        padding: spacing.lg,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    calcButton: {
        backgroundColor: colors.primary,
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
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    calorieOverview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xl,
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    largeValue: {
        color: colors.text,
        fontSize: 48,
        fontWeight: '800',
        lineHeight: 52,
    },
    goalPill: {
        backgroundColor: colors.primarySoft,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    goalPillText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: colors.secondarySoft,
        borderRadius: 6,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 6,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    progressText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    macrosContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderMid,
    },
    macroCol: {
        flex: 1,
    },
    macroValue: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    macroName: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    macroTrack: {
        height: 6,
        backgroundColor: colors.secondarySoft,
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroFill: {
        height: '100%',
        borderRadius: 3,
    },
    emptyMealsBox: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderMid,
        borderStyle: 'dashed',
    },
    emptyMealsTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMealsText: {
        color: colors.textSecondary,
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
        backgroundColor: colors.primary,
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
        backgroundColor: colors.secondarySoft,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    myMealsBtnText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    toolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    toolIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    toolSub: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    scanBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
        marginBottom: 12,
    },
    scanBtnText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scanBadge: {
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 4,
    },
    scanBadgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    scanCreditPill: {
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 4,
    },
    scanCreditText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '700',
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    scanOverlayText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 8,
    },
    scanOverlaySub: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    suggestionsSection: {
        marginBottom: 32,
    },
    suggestionCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 16,
        width: 280,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    suggestionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    suggestionDesc: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    logSection: {
        marginBottom: 20,
    },
    sectionLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    mealCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderMid,
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
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    mealTypeTag: {
        backgroundColor: colors.secondarySoft,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    mealMacros: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 8,
    },
    prefCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.borderMid,
    },
    prefLabel: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    prefDesc: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 14,
    },
    prefRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    prefBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderMid,
        backgroundColor: colors.secondarySoft,
    },
    prefBtnActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
    },
    prefBtnText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    prefBtnTextActive: {
        color: colors.primary,
        fontWeight: '800',
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
        color: colors.textSecondary,
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
        color: colors.textSecondary,
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
