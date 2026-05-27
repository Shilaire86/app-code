import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { SectionHeader } from '@/components/ui/SectionHeader';

const GOAL_OPTIONS = ['Strength', 'Fat Loss', 'Athletic', 'Mobility', 'Consistency'];
const EQUIPMENT_OPTIONS = [
    { label: 'Full Gym', value: 'full_gym' },
    { label: 'Barbell', value: 'barbell' },
    { label: 'Dumbbell', value: 'dumbbell' },
    { label: 'Kettlebell', value: 'kettlebell' },
    { label: 'Bodyweight', value: 'bodyweight' },
    { label: 'Machine', value: 'machine' },
    { label: 'Cable', value: 'cable' },
    { label: 'Bands', value: 'resistance_band' },
    { label: 'Other', value: 'other' },
];
const EXPERIENCE_OPTIONS = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
];

export default function SurveyScreen() {
    const [goals, setGoals] = useState<string[]>([]);
    const [equipment, setEquipment] = useState<string[]>([]);
    const [experience, setExperience] = useState<string>('beginner');
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

    const toggleValue = (list: string[], value: string, setter: (next: string[]) => void) => {
        setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
    };

    const handleContinue = async () => {
        if (profile) {
            await updateProfile({
                goals,
                equipment_access: equipment,
                experience_level: experience,
            });
        }
        router.push('/(onboarding)/photo');
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Survey</Text>
                <Text style={styles.subtitle}>
                    Quick inputs help us personalize your training.
                </Text>

                <SectionHeader title="Goals" />
                <View style={styles.optionGrid}>
                    {GOAL_OPTIONS.map((goal) => (
                        <TouchableOpacity
                            key={goal}
                            style={[
                                styles.optionChip,
                                goals.includes(goal) && styles.optionChipActive,
                            ]}
                            onPress={() => toggleValue(goals, goal, setGoals)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    goals.includes(goal) && styles.optionTextActive,
                                ]}
                            >
                                {goal}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <SectionHeader title="Equipment Access" />
                <View style={styles.optionGrid}>
                    {EQUIPMENT_OPTIONS.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.optionChip,
                                equipment.includes(item.value) && styles.optionChipActive,
                            ]}
                            onPress={() => toggleValue(equipment, item.value, setEquipment)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    equipment.includes(item.value) && styles.optionTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <SectionHeader title="Experience" />
                <View style={styles.optionGrid}>
                    {EXPERIENCE_OPTIONS.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.optionChip,
                                experience === item.value && styles.optionChipActive,
                            ]}
                            onPress={() => setExperience(item.value)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    experience === item.value && styles.optionTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <Button title="Continue" onPress={handleContinue} style={styles.button} />
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
        },
        content: {
            paddingTop: spacing.xxl,
            paddingBottom: spacing.xl,
        },
        title: {
            ...typography.h1,
            color: colors.text,
            marginBottom: spacing.sm,
        },
        subtitle: {
            ...typography.body,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
        },
        optionGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
        },
        optionChip: {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border,
        },
        optionChipActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primarySoft,
        },
        optionText: {
            ...typography.bodySmall,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        optionTextActive: {
            color: colors.primary,
        },
        button: {
            marginBottom: spacing.xl,
            marginTop: spacing.md,
        },
    });
