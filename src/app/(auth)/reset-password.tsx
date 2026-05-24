import React, { useEffect, useRef, useState } from 'react';
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
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [recoveryReady, setRecoveryReady] = useState(false);
    const router = useRouter();
    const linkUrl = Linking.useURL();
    const processedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        async function ensureRecoverySession() {
            const fallbackUrl = Platform.OS === 'web' && typeof window !== 'undefined'
                ? window.location.href
                : await Linking.getInitialURL();
            const activeUrl = linkUrl || fallbackUrl;

            if (!activeUrl) {
                const { data: { session } } = await supabase.auth.getSession();
                setRecoveryReady(!!session);
                return;
            }

            if (processedUrlRef.current === activeUrl) return;
            processedUrlRef.current = activeUrl;

            const hashIndex = activeUrl.indexOf('#');
            const queryIndex = activeUrl.indexOf('?');
            const paramsSource = hashIndex >= 0
                ? activeUrl.slice(hashIndex + 1)
                : queryIndex >= 0
                    ? activeUrl.slice(queryIndex + 1)
                    : '';

            const params = new URLSearchParams(paramsSource);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const code = params.get('code');

            try {
                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error) throw error;
                } else if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                }

                const { data: { session } } = await supabase.auth.getSession();
                setRecoveryReady(!!session);
            } catch (error) {
                console.error('[ResetPassword] Failed to restore recovery session:', error);
                setRecoveryReady(false);
            }
        }

        ensureRecoverySession();
    }, [linkUrl]);

    async function handleUpdatePassword() {
        if (!recoveryReady) {
            Alert.alert('Invalid Link', 'Open the password reset link from your email again and retry.');
            return;
        }

        if (!password || password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords must match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            Alert.alert('Success', 'Your password has been updated.');
            router.replace('/(auth)/login');
        } finally {
            setLoading(false);
        }
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
                        disabled={loading || !recoveryReady}
                        style={styles.button}
                    />

                    {!recoveryReady && (
                        <Text style={styles.helperText}>
                            Waiting for a valid recovery session from your reset link.
                        </Text>
                    )}

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
    helperText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
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
