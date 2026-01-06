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

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [debugMessage, setDebugMessage] = useState('');
    const router = useRouter();

    async function handleAuth() {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) Alert.alert('Error', error.message);
            else {
                Alert.alert('Success', 'Check your email for confirmation!');
                setIsSignUp(false);
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) Alert.alert('Error', error.message);
            else {
                // Auth state listener in useAuth will handle redirection
            }
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
                {debugMessage !== '' && (
                    <View style={styles.debugBanner}>
                        <Text style={styles.debugText}>{debugMessage}</Text>
                    </View>
                )}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isSignUp
                            ? 'Join The Becoming Method community'
                            : 'Sign in to continue your journey'}
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
                    <Input
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Button
                        title={isSignUp ? 'Sign Up' : 'Sign In'}
                        onPress={handleAuth}
                        loading={loading}
                        style={styles.button}
                    />

                    {!isSignUp && (
                        <TouchableOpacity
                            onPress={async () => {
                                if (!email) {
                                    setDebugMessage('ERROR: Enter email first');
                                    Alert.alert('Error', 'Please enter your email first');
                                    return;
                                }
                                setLoading(true);
                                setDebugMessage('STATUS: Starting reset process...');
                                try {
                                    const redirectUrl = Platform.OS === 'web'
                                        ? window.location.origin + '/reset-password'
                                        : 'thebecomingmethod://reset-password';

                                    setDebugMessage(`STATUS: Requesting reset for ${email}...`);

                                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                        redirectTo: redirectUrl,
                                    });

                                    if (error) {
                                        setDebugMessage(`SERVER ERROR: ${error.message}`);
                                        Alert.alert('Error', error.message);
                                    } else {
                                        setDebugMessage('SUCCESS: Email sent! Check your inbox.');
                                        Alert.alert('Success', 'Check your email for the reset link!');
                                    }
                                } catch (err: any) {
                                    setDebugMessage(`CRASH: ${err.message || 'Unknown error'}`);
                                    Alert.alert('Error', 'An unexpected error occurred. Check the console.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            style={styles.forgotContainer}
                        >
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => setIsSignUp(!isSignUp)}
                        style={styles.toggleContainer}
                    >
                        <Text style={styles.toggleText}>
                            {isSignUp
                                ? 'Already have an account? Sign In'
                                : "Don't have an account? Sign Up"}
                        </Text>
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
    forgotContainer: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    forgotText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    debugBanner: {
        backgroundColor: 'rgba(255,102,0,0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    debugText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
