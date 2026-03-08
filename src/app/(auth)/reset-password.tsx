import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleUpdatePassword() {
        if (!password || password !== confirmPassword) {
            Alert.alert('Error', 'Passwords must match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Success', 'Your password has been updated.');
            router.replace('/(auth)/login');
        }
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>
                        Choose a new password for your account.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="New Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <Input
                        label="Confirm Password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <Button
                        title="Update Password"
                        onPress={handleUpdatePassword}
                        loading={loading}
                        style={styles.button}
                    />

                    <TouchableOpacity
                        onPress={() => router.replace('/(auth)/login')}
                        style={styles.toggleContainer}
                    >
                        <Text style={styles.toggleText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center',
    },
    header: {
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    button: {
        marginTop: theme.spacing.md,
    },
    toggleContainer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    },
    toggleText: {
        ...theme.typography.bodySmall,
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
