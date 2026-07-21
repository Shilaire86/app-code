import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { goBackOr } from '@/lib/navigation';

const REFLECTION_QUESTIONS = [
    { id: 'wins',       label: 'Wins',            icon: 'trophy',        colorKey: 'mindset',  prompt: 'What victories did you achieve this week?' },
    { id: 'challenges', label: 'Challenges',       icon: 'barbell',       colorKey: 'error',    prompt: 'What obstacles did you face and how did you overcome them?' },
    { id: 'lessons',    label: 'Lessons',          icon: 'bulb',          colorKey: 'progress', prompt: 'What did you learn about yourself?' },
    { id: 'focus',      label: 'Next Week Focus',  icon: 'arrow-forward', colorKey: 'info',     prompt: 'What will you focus on next week?' },
];

export default function WeeklyReflectionScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [existingReflection, setExistingReflection] = useState<any>(null);
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

    const getColor = (key: string): string => (colors as any)[key] || colors.primary;

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
            showAlert('Empty Reflection', 'Please write at least one reflection.');
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

            showAlert('Reflected', 'Your weekly reflection has been saved.');
            router.back();
        } catch (error) {
            console.error('[reflection] Submit error:', error);
            showAlert('Error', 'Failed to save reflection');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{
                    headerShown: true,
                    headerTitle: 'Weekly Reflection',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }} />
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Weekly Reflection',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.weekBadge}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={styles.weekText}>
                        Week of {new Date(getWeekStart()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>

                {REFLECTION_QUESTIONS.map((q) => {
                    const qColor = getColor(q.colorKey);
                    return (
                        <View key={q.id} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name={q.icon as any} size={18} color={qColor} />
                                <Text style={[styles.labelText, { color: qColor }]}>{q.label}</Text>
                            </View>
                            <Text style={styles.promptText}>{q.prompt}</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="Write your thoughts..."
                                placeholderTextColor={colors.textTertiary}
                                value={answers[q.id] || ''}
                                onChangeText={(text) => setAnswers({ ...answers, [q.id]: text })}
                            />
                        </View>
                    );
                })}

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

const createStyles = ({ colors, spacing, radius, typography }: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        centered: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        content: {
            padding: spacing.lg,
        },
        weekBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.surface,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            alignSelf: 'center',
            marginBottom: spacing.xl,
        },
        weekText: {
            ...typography.bodySmallMedium,
            color: colors.text,
        },
        section: {
            marginBottom: spacing.lg,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: spacing.xs,
        },
        labelText: {
            ...typography.label,
        },
        promptText: {
            ...typography.bodySmall,
            color: colors.textSecondary,
            fontStyle: 'italic',
            marginBottom: spacing.sm,
        },
        textArea: {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.text,
            fontSize: 16,
            textAlignVertical: 'top',
            minHeight: 80,
            borderWidth: 1,
            borderColor: colors.borderMid,
        },
        submitButton: {
            backgroundColor: colors.primary,
            padding: spacing.lg,
            borderRadius: radius.md,
            alignItems: 'center',
            marginTop: spacing.md,
        },
        submitDisabled: {
            opacity: 0.5,
        },
        submitText: {
            ...typography.button,
            color: '#FFF',
        },
    });
