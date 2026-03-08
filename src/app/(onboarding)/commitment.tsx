import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        justifyContent: 'space-between',
    },
    content: {
        marginTop: theme.spacing.xxl,
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
    options: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    option: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    optionActive: {
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
    },
});
