import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const REFLECTION_QUESTIONS = [
    { id: 'wins', label: 'Wins', icon: 'trophy', color: '#FFD700', prompt: 'What victories did you achieve this week?' },
    { id: 'challenges', label: 'Challenges', icon: 'barbell', color: '#FF6B6B', prompt: 'What obstacles did you face and how did you overcome them?' },
    { id: 'lessons', label: 'Lessons', icon: 'bulb', color: '#4ECDC4', prompt: 'What did you learn about yourself?' },
    { id: 'focus', label: 'Next Week Focus', icon: 'arrow-forward', color: '#45B7D1', prompt: 'What will you focus on next week?' },
];

export default function WeeklyReflectionScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [existingReflection, setExistingReflection] = useState<any>(null);

    // Get current week start date (Sunday)
    const getWeekStart = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek.toISOString().split('T')[0];
    };

    useEffect(() => {
        fetchExistingReflection();
    }, []);

    async function fetchExistingReflection() {
        try {
            const weekStart = getWeekStart();
            const { data, error } = await supabase
                .from('reflections')
                .select('*')
                .eq('user_id', user?.id)
                .eq('week_start', weekStart)
                .maybeSingle();

            if (data) {
                setExistingReflection(data);
                setAnswers({
                    wins: data.wins || '',
                    challenges: data.challenges || '',
                    lessons: data.lessons || '',
                    focus: data.focus || '',
                });
            }
        } catch (error) {
            console.error('[reflection] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        const hasContent = Object.values(answers).some(v => v.trim());
        if (!hasContent) {
            Alert.alert('Empty Reflection', 'Please write at least one reflection.');
            return;
        }

        setIsSubmitting(true);
        try {
            const weekStart = getWeekStart();
            const payload = {
                user_id: user?.id,
                week_start: weekStart,
                wins: answers.wins?.trim() || null,
                challenges: answers.challenges?.trim() || null,
                lessons: answers.lessons?.trim() || null,
                focus: answers.focus?.trim() || null,
            };

            if (existingReflection) {
                const { error } = await supabase
                    .from('reflections')
                    .update(payload)
                    .eq('id', existingReflection.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('reflections')
                    .insert(payload);
                if (error) throw error;
            }

            Alert.alert('Reflected', 'Your weekly reflection has been saved.');
            router.back();
        } catch (error) {
            console.error('[reflection] Submit error:', error);
            Alert.alert('Error', 'Failed to save reflection');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Weekly Reflection',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.weekBadge}>
                    <Ionicons name="calendar" size={16} color={theme.colors.primary} />
                    <Text style={styles.weekText}>Week of {new Date(getWeekStart()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>

                {REFLECTION_QUESTIONS.map((q) => (
                    <View key={q.id} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name={q.icon as any} size={18} color={q.color} />
                            <Text style={[styles.labelText, { color: q.color }]}>{q.label}</Text>
                        </View>
                        <Text style={styles.promptText}>{q.prompt}</Text>
                        <TextInput
                            style={styles.textArea}
                            multiline
                            numberOfLines={3}
                            placeholder="Write your thoughts..."
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={answers[q.id] || ''}
                            onChangeText={(text) => setAnswers({ ...answers, [q.id]: text })}
                        />
                    </View>
                ))}

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>
                            {existingReflection ? 'Update Reflection' : 'Save Reflection'}
                        </Text>
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.lg,
    },
    weekBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignSelf: 'center',
        marginBottom: theme.spacing.xl,
    },
    weekText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.xs,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    promptText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: theme.spacing.sm,
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 80,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
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
