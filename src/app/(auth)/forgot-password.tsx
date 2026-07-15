import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { showAlert } from '@/lib/confirm';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleReset() {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            showAlert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
                ? `${window.location.origin}/reset-password`
                : Linking.createURL('/reset-password');

            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: redirectUrl,
            });

            if (error) {
                showAlert('Error', error.message);
            } else {
                showAlert('Success', 'Check your email for the reset link.');
                router.replace('/(auth)/login');
            }
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
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email to receive a reset link.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        placeholder="your@email.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Button
                        title="Send Reset Email"
                        onPress={handleReset}
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
