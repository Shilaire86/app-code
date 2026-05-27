import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';

const TIME_OPTIONS = [
    { label: 'Morning', value: '07:00' },
    { label: 'Midday', value: '12:00' },
    { label: 'Evening', value: '18:00' },
];

export default function CommitmentScreen() {
    const [selectedTime, setSelectedTime] = useState<string>('07:00');
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

    const handleContinue = async () => {
        if (profile) {
            await updateProfile({ preferred_workout_time: selectedTime });
        }
        router.push('/(onboarding)/survey');
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Commitment</Text>
                <Text style={styles.subtitle}>
                    Choose a daily training window. This becomes your default rhythm.
                </Text>
                <View style={styles.options}>
                    {TIME_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.option,
                                selectedTime === option.value && styles.optionActive,
                            ]}
                            onPress={() => setSelectedTime(option.value)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    selectedTime === option.value && styles.optionTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <Button title="Continue" onPress={handleContinue} style={styles.button} />
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: spacing.lg,
            justifyContent: 'space-between',
        },
        content: {
            marginTop: spacing.xxl,
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
        options: {
            flexDirection: 'row',
            gap: spacing.sm,
        },
        option: {
            flex: 1,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
        },
        optionActive: {
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
        },
    });
