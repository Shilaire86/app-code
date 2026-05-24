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
                    <Text style={styles.placeholderTitle}>Capture your baseline</Text>
                    <Text style={styles.placeholderText}>
                        This opens the Growth Track camera so you can take a private progress photo now.
                    </Text>
                    <Button
                        title="Open Camera"
                        onPress={() => router.push('/progress/camera')}
                        style={styles.cameraButton}
                    />
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
        minHeight: 240,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    placeholderTitle: {
        ...theme.typography.h3,
        color: theme.colors.text,
        textAlign: 'center',
    },
    placeholderText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        maxWidth: 280,
    },
    cameraButton: {
        width: '100%',
    },
    actions: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    actionButton: {
        width: '100%',
    },
});
