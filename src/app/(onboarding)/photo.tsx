import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';

export default function PhotoScreen() {
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();

    const finishOnboarding = async () => {
        if (profile) {
            await updateProfile({ onboarding_complete: true });
        }
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Baseline Photo</Text>
                <Text style={styles.subtitle}>
                    Optional. Capture a private reference image to track your evolution.
                </Text>
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Camera setup coming next</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <Button
                    title="Skip for now"
                    variant="outline"
                    onPress={finishOnboarding}
                    style={styles.actionButton}
                />
                <Button
                    title="Finish"
                    onPress={finishOnboarding}
                    style={styles.actionButton}
                />
            </View>
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
    placeholder: {
        height: 220,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textTertiary,
    },
    actions: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    actionButton: {
        width: '100%',
    },
});
