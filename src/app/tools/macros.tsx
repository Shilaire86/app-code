import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import {
    calculateMacroResults,
    MacroInputs,
    MacroResults,
    Gender,
    ActivityLevel,
    Goal,
} from '@/lib/macros/calculator';

export default function MacroCalculatorScreen() {
    const router = useRouter();
    const [inputs, setInputs] = useState<MacroInputs>({
        age: 30,
        gender: 'male',
        weightLbs: 180,
        heightInches: 70,
        activityLevel: 'moderate',
        goal: 'maintain',
    });
    const [results, setResults] = useState<MacroResults | null>(null);

    const handleCalculate = () => {
        const calculated = calculateMacroResults(inputs);
        setResults(calculated);
    };

    const updateInput = (key: keyof MacroInputs, value: any) => {
        setInputs(prev => ({ ...prev, [key]: value }));
        setResults(null); // Clear results when inputs change
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Macro Calculator',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>
                    Calculate your daily calorie and macro targets based on your goals.
                </Text>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Info</Text>

                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={inputs.age.toString()}
                            onChangeText={(val) => updateInput('age', parseInt(val) || 0)}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Weight (lbs)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={inputs.weightLbs.toString()}
                            onChangeText={(val) => updateInput('weightLbs', parseFloat(val) || 0)}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Height (inches)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={inputs.heightInches.toString()}
                            onChangeText={(val) => updateInput('heightInches', parseFloat(val) || 0)}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    inputs.gender === 'male' && styles.optionButtonActive,
                                ]}
                                onPress={() => updateInput('gender', 'male')}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        inputs.gender === 'male' && styles.optionTextActive,
                                    ]}
                                >
                                    Male
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    inputs.gender === 'female' && styles.optionButtonActive,
                                ]}
                                onPress={() => updateInput('gender', 'female')}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        inputs.gender === 'female' && styles.optionTextActive,
                                    ]}
                                >
                                    Female
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity Level</Text>
                    {[
                        { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
                        { key: 'light', label: 'Light', desc: '1-3 days/week' },
                        { key: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
                        { key: 'active', label: 'Active', desc: '6-7 days/week' },
                        { key: 'very_active', label: 'Very Active', desc: 'Athlete/physical job' },
                    ].map((option) => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.radioOption,
                                inputs.activityLevel === option.key && styles.radioOptionActive,
                            ]}
                            onPress={() => updateInput('activityLevel', option.key as ActivityLevel)}
                        >
                            <View style={styles.radioContent}>
                                <Text style={styles.radioLabel}>{option.label}</Text>
                                <Text style={styles.radioDesc}>{option.desc}</Text>
                            </View>
                            {inputs.activityLevel === option.key && (
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </Card>

                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Goal</Text>
                    {[
                        { key: 'lose', label: 'Lose Weight', desc: '-500 cal/day (1 lb/week)' },
                        { key: 'maintain', label: 'Maintain', desc: 'Stay at current weight' },
                        { key: 'gain', label: 'Gain Muscle', desc: '+300 cal/day (lean bulk)' },
                    ].map((option) => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.radioOption,
                                inputs.goal === option.key && styles.radioOptionActive,
                            ]}
                            onPress={() => updateInput('goal', option.key as Goal)}
                        >
                            <View style={styles.radioContent}>
                                <Text style={styles.radioLabel}>{option.label}</Text>
                                <Text style={styles.radioDesc}>{option.desc}</Text>
                            </View>
                            {inputs.goal === option.key && (
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </Card>

                <TouchableOpacity style={styles.calculateButton} onPress={handleCalculate}>
                    <Text style={styles.calculateText}>Calculate Macros</Text>
                </TouchableOpacity>

                {results && (
                    <Card style={styles.resultsCard}>
                        <Text style={styles.resultsTitle}>Your Daily Targets</Text>

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>BMR (Basal Metabolic Rate)</Text>
                            <Text style={styles.resultValue}>{results.bmr} cal</Text>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>TDEE (Total Daily Energy)</Text>
                            <Text style={styles.resultValue}>{results.tdee} cal</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.resultRow}>
                            <Text style={[styles.resultLabel, styles.targetLabel]}>Target Calories</Text>
                            <Text style={[styles.resultValue, styles.targetValue]}>
                                {results.targetCalories} cal
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.macrosTitle}>Macro Split</Text>

                        <View style={styles.macroGrid}>
                            <View style={styles.macroCard}>
                                <Text style={styles.macroValue}>{results.protein}g</Text>
                                <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                            <View style={styles.macroCard}>
                                <Text style={styles.macroValue}>{results.carbs}g</Text>
                                <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                            <View style={styles.macroCard}>
                                <Text style={styles.macroValue}>{results.fat}g</Text>
                                <Text style={styles.macroLabel}>Fat</Text>
                            </View>
                        </View>
                    </Card>
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
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: theme.spacing.md,
    },
    inputRow: {
        marginBottom: theme.spacing.md,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: 16,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    optionButton: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    optionTextActive: {
        color: '#FFF',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: theme.spacing.sm,
    },
    radioOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(99,102,241,0.1)',
    },
    radioContent: {
        flex: 1,
    },
    radioLabel: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    radioDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    calculateButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    calculateText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resultsCard: {
        backgroundColor: theme.colors.surfaceElevated,
    },
    resultsTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: theme.spacing.lg,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    resultLabel: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    resultValue: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    targetLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    targetValue: {
        fontSize: 20,
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: theme.spacing.md,
    },
    macrosTitle: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    macroGrid: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    macroCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    macroValue: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: '800',
    },
    macroLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
});
