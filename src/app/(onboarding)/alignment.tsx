import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

export default function AlignmentScreen() {
    const router = useRouter();

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
        marginBottom: theme.spacing.md,
    },
    body: {
        ...theme.typography.bodySmall,
        color: theme.colors.textTertiary,
    },
    button: {
        marginBottom: theme.spacing.xl,
    },
});
