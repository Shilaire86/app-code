import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';

export default function IdentityScreen() {
    const [fullName, setFullName] = useState('');
    const { updateProfile, profile } = useProfileStore();
    const router = useRouter();

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
    button: {
        marginBottom: theme.spacing.xl,
    },
});
