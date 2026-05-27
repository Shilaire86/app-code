import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';

export default function IdentityScreen() {
    const [fullName, setFullName] = useState('');
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();
    const { colors, spacing, typography } = useTheme();
    const styles = createStyles({ colors, spacing, typography });

    const handleContinue = async () => {
        if (fullName.trim() && profile) {
            await updateProfile({ full_name: fullName.trim() });
        }
        router.push('/(onboarding)/alignment');
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Who are you becoming?</Text>
                <Text style={styles.subtitle}>
                    Your name anchors the path. It is the first commitment.
                </Text>
                <Input
                    label="Full Name"
                    placeholder="Your name"
                    value={fullName}
                    onChangeText={setFullName}
                />
            </View>

            <Button title="Continue" onPress={handleContinue} style={styles.button} />
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
            marginBottom: spacing.lg,
        },
        button: {
            marginBottom: spacing.xl,
        },
    });
