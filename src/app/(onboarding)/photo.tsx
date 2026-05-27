import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';

export default function PhotoScreen() {
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

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
        placeholder: {
            minHeight: 240,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.borderMid,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
            gap: spacing.md,
        },
        placeholderTitle: {
            ...typography.h3,
            color: colors.text,
            textAlign: 'center',
        },
        placeholderText: {
            ...typography.bodySmall,
            color: colors.textTertiary,
            textAlign: 'center',
            maxWidth: 280,
        },
        cameraButton: {
            width: '100%',
        },
        actions: {
            gap: spacing.md,
            marginBottom: spacing.xl,
        },
        actionButton: {
            width: '100%',
        },
    });
