import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome to The Becoming Method</Text>
                <Text style={styles.subtitle}>
                    This is your quiet start. We will set your path with a few guided steps.
                </Text>
            </View>

            <Button
                title="Begin"
                onPress={() => router.push('/(onboarding)/identity')}
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
        marginTop: theme.spacing.xxxl,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        lineHeight: 26,
    },
    button: {
        marginBottom: theme.spacing.xl,
    },
});
