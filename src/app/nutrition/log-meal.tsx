import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { isVip } from '@/lib/entitlements';
import { logMeal, saveMeal, MealType } from '@/services/nutrition';

const asStr = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

export default function LogMealScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { tier } = useProfileStore();
    // Fields can be pre-filled by the AI meal scanner (fromScan=1) for review.
    const params = useLocalSearchParams<{
        name?: string; calories?: string; protein?: string; carbs?: string;
        fat?: string; confidence?: string; fromScan?: string;
    }>();
    const fromScan = asStr(params.fromScan) === '1';

    const [name, setName] = useState(asStr(params.name));
    const [mealType, setMealType] = useState<MealType>('snack');
    const [calories, setCalories] = useState(asStr(params.calories));
    const [protein, setProtein] = useState(asStr(params.protein));
    const [carbs, setCarbs] = useState(asStr(params.carbs));
    const [fat, setFat] = useState(asStr(params.fat));
    const [isSaving, setIsSaving] = useState(false);
    const [saveToLibrary, setSaveToLibrary] = useState(false);

    const canSaveMeals = isVip(tier);

    const handleSave = async () => {
        if (!user?.id) return;

        if (!name.trim()) {
            Alert.alert('Missing Name', 'Please give your meal a name.');
            return;
        }

        if (!calories || isNaN(parseInt(calories))) {
            Alert.alert('Invalid Calories', 'Please enter a valid calorie amount.');
            return;
        }

        setIsSaving(true);
        try {
            let savedMealId: string | undefined = undefined;

            // Save to library if toggled
            if (saveToLibrary && canSaveMeals) {
                savedMealId = await saveMeal(user.id, {
                    name: name.trim(),
                    meal_type: mealType,
                    calories: parseInt(calories),
                    protein_g: parseFloat(protein) || 0,
                    carbs_g: parseFloat(carbs) || 0,
                    fat_g: parseFloat(fat) || 0,
                });
            }

            await logMeal(user.id, {
                name: name.trim(),
                meal_type: mealType,
                calories: parseInt(calories),
                protein_g: parseFloat(protein) || 0,
                carbs_g: parseFloat(carbs) || 0,
                fat_g: parseFloat(fat) || 0,
                saved_meal_id: savedMealId,
            });

            Alert.alert('Logged!', 'Your meal has been added to today\'s totals.', [
                { text: 'Back to Dashboard', onPress: () => router.back() }
            ]);
        } catch (err) {
            console.error('[LogMeal] Save error:', err);
            Alert.alert('Error', 'Failed to log meal. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Stack.Screen
                options={{
                    title: 'Log Meal',
                    headerShown: true,
                    headerTransparent: true,
                    headerTitleStyle: { color: '#FFF' },
                    headerTintColor: '#FFF',
                }}
            />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {fromScan && (
                    <View style={styles.scanBanner}>
                        <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                        <Text style={styles.scanBannerText}>
                            AI estimate from your photo
                            {asStr(params.confidence) ? ` · ${asStr(params.confidence)} confidence` : ''}. Review and adjust before saving.
                        </Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.label}>MEAL NAME</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Chicken & Sweet Potato"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>MEAL TYPE</Text>
                    <View style={styles.typeGrid}>
                        {mealTypes.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.typeBtn, mealType === type && styles.typeBtnActive]}
                                onPress={() => setMealType(type)}
                            >
                                <Text style={[styles.typeText, mealType === type && styles.typeTextActive]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>NUTRITION FACTS</Text>
                    
                    <View style={styles.macroRow}>
                        <View style={styles.macroInputGroup}>
                            <Text style={styles.macroLabel}>CALORIES</Text>
                            <TextInput
                                style={[styles.input, styles.macroInput]}
                                value={calories}
                                onChangeText={setCalories}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                        </View>
                    </View>

                    <View style={styles.macroRow}>
                        <View style={styles.macroInputGroup}>
                            <Text style={styles.macroLabel}>PROTEIN (g)</Text>
                            <TextInput
                                style={[styles.input, styles.macroInput]}
                                value={protein}
                                onChangeText={setProtein}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                        </View>
                        <View style={styles.macroInputGroup}>
                            <Text style={styles.macroLabel}>CARBS (g)</Text>
                            <TextInput
                                style={[styles.input, styles.macroInput]}
                                value={carbs}
                                onChangeText={setCarbs}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                        </View>
                        <View style={styles.macroInputGroup}>
                            <Text style={styles.macroLabel}>FAT (g)</Text>
                            <TextInput
                                style={[styles.input, styles.macroInput]}
                                value={fat}
                                onChangeText={setFat}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                        </View>
                    </View>
                </View>

                {canSaveMeals && (
                    <View style={styles.section}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchLabelContainer}>
                                <Text style={styles.switchLabel}>Save to My Meals</Text>
                                <Text style={styles.switchSubtext}>Add to your library for quick logging later</Text>
                            </View>
                            <Switch
                                value={saveToLibrary}
                                onValueChange={setSaveToLibrary}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.primary }}
                                thumbColor={Platform.OS === 'ios' ? '#FFF' : saveToLibrary ? '#FFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                )}

                <View style={[styles.section, { marginTop: 10 }]}>
                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <Ionicons name="add" size={20} color="#000" />
                                <Text style={styles.saveBtnText}>LOG MEAL</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingTop: 120,
        paddingBottom: 40,
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: 24,
    },
    scanBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: theme.spacing.lg,
        marginBottom: 20,
        padding: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.primarySoft,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    scanBannerText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 13,
        lineHeight: 18,
        textTransform: 'capitalize',
    },
    label: {
        color: theme.colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeBtn: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    typeBtnActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(0,187,255,0.08)',
    },
    typeText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    typeTextActive: {
        color: theme.colors.primary,
    },
    macroRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    macroInputGroup: {
        flex: 1,
    },
    macroLabel: {
        color: theme.colors.textTertiary,
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    macroInput: {
        textAlign: 'center',
        paddingHorizontal: 0,
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    switchLabelContainer: {
        flex: 1,
        paddingRight: 16,
    },
    switchLabel: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    switchSubtext: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
});
