import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

export default function AlignmentScreen() {
    const router = useRouter();
    const { colors, spacing, typography } = useTheme();
    const styles = createStyles({ colors, spacing, typography });

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Alignment</Text>
                <Text style={styles.subtitle}>
                    Calm structure beats chaos. You will see your next step, every day.
                </Text>
                <Text style={styles.body}>
                    We will align your training with your goals and the equipment you have.
                </Text>
            </View>

            <Button
                title="Continue"
                onPress={() => router.push('/(onboarding)/commitment')}
                style={styles.button}
            />
        </View>
    );
}

const createStyles = ({ colors, spacing, typography }: any) =>
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
            marginBottom: spacing.md,
        },
        body: {
            ...typography.bodySmall,
            color: colors.textTertiary,
        },
        button: {
            marginBottom: spacing.xl,
        },
    });
