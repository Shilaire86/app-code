import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { fetchSavedMeals, deleteSavedMeal, logMeal, SavedMeal } from '@/services/nutrition';
import { goBackOr } from '@/lib/navigation';

export default function SavedMealsScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();
    const [meals, setMeals] = useState<SavedMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const fetchedMeals = await fetchSavedMeals(user.id);
            setMeals(fetchedMeals);
        } catch (err) {
            console.error('[SavedMeals] Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (mealId: string, name: string) => {
        showAlert('Delete Saved Meal', `Are you sure you want to remove "${name}" from your library?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        await deleteSavedMeal(mealId);
                        loadData(); // Refresh list
                    } catch (err) {
                        showAlert('Error', 'Failed to delete saved meal.');
                    }
                }
            }
        ]);
    };

    const handleLogSaved = (meal: SavedMeal) => {
        showAlert('Log Meal', `Log "${meal.name}" to today's intake?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log It',
                onPress: async () => {
                    if (!user?.id) return;
                    try {
                        await logMeal(user.id, {
                            name: meal.name,
                            meal_type: meal.meal_type,
                            calories: meal.calories,
                            protein_g: meal.protein_g,
                            carbs_g: meal.carbs_g,
                            fat_g: meal.fat_g,
                            saved_meal_id: meal.id,
                        });
                        showAlert('Logged!', 'Meal added to today.', [
                            { text: 'OK', onPress: () => router.back() }
                        ]);
                    } catch (err) {
                        console.error('[SavedMeals] Error logging:', err);
                        showAlert('Error', 'Failed to log the meal.');
                    }
                }
            }
        ]);
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'My Meals',
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

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
                }
            >
                {meals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="fast-food-outline" size={64} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyTitle}>No Saved Meals</Text>
                        <Text style={styles.emptyText}>
                            Save common meals to your library for quick logging. You can save a meal when adding it in the Log Meal screen.
                        </Text>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => router.push('/nutrition/log-meal')}
                        >
                            <Text style={styles.addBtnText}>Log a New Meal</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    meals.map((meal) => (
                        <View key={meal.id} style={styles.mealCard}>
                            <View style={styles.mealInfo}>
                                <View style={styles.mealHeader}>
                                    <Text style={styles.mealTitle}>{meal.name}</Text>
                                    <View style={styles.typeTag}>
                                        <Text style={styles.typeTagText}>{meal.meal_type}</Text>
                                    </View>
                                </View>
                                <Text style={styles.mealMacros}>
                                    {meal.calories} cal • {Math.round(meal.protein_g)}g P • {Math.round(meal.carbs_g)}g C • {Math.round(meal.fat_g)}g F
                                </Text>
                            </View>
                            
                            <View style={styles.actions}>
                                <TouchableOpacity 
                                    style={styles.logBtn}
                                    onPress={() => handleLogSaved(meal)}
                                >
                                    <Ionicons name="add" size={18} color="#000" />
                                    <Text style={styles.logBtnText}>Log</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(meal.id, meal.name)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        marginTop: 40,
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
    addBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
    },
    addBtnText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '700',
    },
    mealCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    mealInfo: {
        flex: 1,
        marginRight: 10,
    },
    mealHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    mealTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        flexShrink: 1,
    },
    typeTag: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeTagText: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    mealMacros: {
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    logBtnText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '800',
    },
    deleteBtn: {
        padding: 4,
    },
});
