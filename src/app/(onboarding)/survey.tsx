import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.lg,
    },
    content: {
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.xl,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    optionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    optionChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optionChipActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(99,102,241,0.15)',
    },
    optionText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    optionTextActive: {
        color: theme.colors.text,
    },
    button: {
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.md,
    },
});
