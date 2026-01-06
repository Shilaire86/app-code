import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function NewMindsetScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [content, setContent] = useState('');
    const [feeling, setFeeling] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const feelings = [
        { id: 'motivated', icon: '⚡️', label: 'Motivated' },
        { id: 'steady', icon: '⚖️', label: 'Steady' },
        { id: 'tired', icon: '😴', label: 'Tired' },
        { id: 'challenging', icon: '🌋', label: 'Challenging' },
        { id: 'clarity', icon: '💎', label: 'Clarity' },
    ];

    async function handleSubmit() {
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            // Map our UI state to the database schema (prompt/response)
            const { error } = await supabase
                .from('mindset_entries')
                .insert({
                    user_id: user?.id,
                    prompt: 'Daily Reflection', // Default prompt for now
                    response: feeling ? `${feeling.toUpperCase()}: ${content}` : content,
                    entry_date: new Date().toISOString().split('T')[0],
                });

            if (error) throw error;

            // Refresh profile to update points
            if (user) {
                useProfileStore.getState().fetchProfile(user.id);
            }

            Alert.alert("Reflected", "Your mindset has been recorded. +2 Becoming Points earned.");
            router.back();
        } catch (error) {
            console.error('Error submitting mindset:', error);
            Alert.alert('Error', 'Failed to save reflection');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Daily Reflection',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>How are you showing up today?</Text>
                <View style={styles.feelingContainer}>
                    {feelings.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.feelingItem, feeling === f.id && styles.feelingSelected]}
                            onPress={() => setFeeling(f.id)}
                        >
                            <Text style={styles.feelingIcon}>{f.icon}</Text>
                            <Text style={styles.feelingLabel}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Log your mindset</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={6}
                    placeholder="Write your reflection here..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={content}
                    onChangeText={setContent}
                />

                <TouchableOpacity
                    style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>Save Reflection</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
    },
    label: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    feelingContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: theme.spacing.xl,
    },
    feelingItem: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        width: '30%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    feelingSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(255,102,0,0.1)',
    },
    feelingIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    feelingLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 150,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: theme.spacing.xxl,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    submitDisabled: {
        opacity: 0.5,
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
