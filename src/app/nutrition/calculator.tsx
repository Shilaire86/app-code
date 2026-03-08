import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { Ionicons } from '@expo/vector-icons';
import {
    calculateMacros,
    MacroResults,
    Sex,
    ActivityLevel,
    Goal,
    ACTIVITY_DESCRIPTIONS,
    GOAL_DESCRIPTIONS,
} from '@/lib/macroCalculator';

export default function MacroCalculatorScreen() {
    const { user } = useAuthStore();
    const { profile } = useProfileStore();

    // Form state
    const [age, setAge] = useState('30');
    const [sex, setSex] = useState<Sex>('male');
    const [heightFeet, setHeightFeet] = useState('5');
    const [heightInches, setHeightInches] = useState('10');
    const [weight, setWeight] = useState('180');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
    const [goal, setGoal] = useState<Goal>('maintain');
    const [results, setResults] = useState<MacroResults | null>(null);

    // Auto-fill from profile if available
    useEffect(() => {
        if (profile?.weight) {
            setWeight(String(Math.round(profile.weight)));
        }
    }, [profile]);

    function handleCalculate() {
        const totalHeightInches = (parseInt(heightFeet) * 12) + parseInt(heightInches);
        const result = calculateMacros({
            age: parseInt(age),
            sex,
            heightInches: totalHeightInches,
            weightLbs: parseFloat(weight),
            activityLevel,
            goal,
        });
        setResults(result);
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Macro Calculator',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Sex Toggle */}
                <Text style={styles.label}>Sex</Text>
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleButton, sex === 'male' && styles.toggleActive]}
                        onPress={() => setSex('male')}
                    >
                        <Ionicons name="male" size={20} color={sex === 'male' ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.toggleText, sex === 'male' && styles.toggleTextActive]}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, sex === 'female' && styles.toggleActive]}
                        onPress={() => setSex('female')}
                    >
                        <Ionicons name="female" size={20} color={sex === 'female' ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.toggleText, sex === 'female' && styles.toggleTextActive]}>Female</Text>
                    </TouchableOpacity>
                </View>

                {/* Age & Weight Row */}
                <View style={styles.row}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            value={age}
                            onChangeText={setAge}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Weight (lbs)</Text>
                        <TextInput
                            style={styles.input}
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                </View>

                {/* Height Row */}
                <Text style={styles.label}>Height</Text>
                <View style={styles.row}>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            value={heightFeet}
                            onChangeText={setHeightFeet}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                        <Text style={styles.unitLabel}>ft</Text>
                    </View>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            value={heightInches}
                            onChangeText={setHeightInches}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                        <Text style={styles.unitLabel}>in</Text>
                    </View>
                </View>

                {/* Activity Level */}
                <Text style={styles.label}>Activity Level</Text>
                <View style={styles.optionGrid}>
                    {(Object.keys(ACTIVITY_DESCRIPTIONS) as ActivityLevel[]).map((level) => (
                        <TouchableOpacity
                            key={level}
                            style={[styles.optionButton, activityLevel === level && styles.optionActive]}
                            onPress={() => setActivityLevel(level)}
                        >
                            <Text style={[styles.optionText, activityLevel === level && styles.optionTextActive]}>
                                {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
                            </Text>
                            <Text style={styles.optionSubtext}>{ACTIVITY_DESCRIPTIONS[level]}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Goal */}
                <Text style={styles.label}>Goal</Text>
                <View style={styles.goalRow}>
                    {(Object.keys(GOAL_DESCRIPTIONS) as Goal[]).map((g) => (
                        <TouchableOpacity
                            key={g}
                            style={[styles.goalButton, goal === g && styles.goalActive]}
                            onPress={() => setGoal(g)}
                        >
                            <Ionicons
                                name={g === 'lose' ? 'trending-down' : g === 'gain' ? 'trending-up' : 'remove'}
                                size={20}
                                color={goal === g ? '#FFF' : theme.colors.textSecondary}
                            />
                            <Text style={[styles.goalText, goal === g && styles.goalTextActive]}>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Calculate Button */}
                <TouchableOpacity style={styles.calculateButton} onPress={handleCalculate}>
                    <Text style={styles.calculateButtonText}>Calculate Macros</Text>
                </TouchableOpacity>

                {/* Results */}
                {results && (
                    <View style={styles.resultsCard}>
                        <Text style={styles.resultsTitle}>Your Daily Targets</Text>

                        <View style={styles.calorieBox}>
                            <Text style={styles.calorieLabel}>Calories</Text>
                            <Text style={styles.calorieValue}>{results.targetCalories}</Text>
                        </View>

                        <View style={styles.macroRow}>
                            <View style={[styles.macroBox, { backgroundColor: 'rgba(255,107,107,0.2)' }]}>
                                <Text style={styles.macroLabel}>Protein</Text>
                                <Text style={styles.macroValue}>{results.protein}g</Text>
                            </View>
                            <View style={[styles.macroBox, { backgroundColor: 'rgba(78,205,196,0.2)' }]}>
                                <Text style={styles.macroLabel}>Carbs</Text>
                                <Text style={styles.macroValue}>{results.carbs}g</Text>
                            </View>
                            <View style={[styles.macroBox, { backgroundColor: 'rgba(254,202,87,0.2)' }]}>
                                <Text style={styles.macroLabel}>Fat</Text>
                                <Text style={styles.macroValue}>{results.fat}g</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>BMR (Base Metabolism):</Text>
                            <Text style={styles.detailValue}>{results.bmr} cal</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>TDEE (Maintenance):</Text>
                            <Text style={styles.detailValue}>{results.tdee} cal</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    label: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    inputGroup: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    unitLabel: {
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    toggleText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#FFF',
    },
    optionGrid: {
        gap: theme.spacing.sm,
    },
    optionButton: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    optionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(255,102,0,0.1)',
    },
    optionText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    optionTextActive: {
        color: theme.colors.primary,
    },
    optionSubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    goalRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    goalButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    goalActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    goalText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    goalTextActive: {
        color: '#FFF',
    },
    calculateButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    calculateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resultsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginTop: theme.spacing.xl,
    },
    resultsTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    calorieBox: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    calorieLabel: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    calorieValue: {
        color: theme.colors.primary,
        fontSize: 48,
        fontWeight: '700',
    },
    macroRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    macroBox: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
    },
    macroLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    macroValue: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    detailLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    detailValue: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
