import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getDailyPrompts, getRandomPrompt } from '@/constants/mindsetPrompts';

export default function NewMindsetScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const fetchProfile = useProfileStore(s => s.fetchProfile);
    const [gratitude, setGratitude] = useState('');
    const [intention, setIntention] = useState('');
    const [reflection, setReflection] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prompts, setPrompts] = useState(() => getDailyPrompts());
    const { colors, spacing, radius, typography } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography });

    const refreshPrompt = (category: 'gratitude' | 'intention' | 'reflection') => {
        setPrompts(prev => ({
            ...prev,
            [category]: getRandomPrompt(category),
        }));
    };

    async function handleSubmit() {
        if (!gratitude.trim() && !intention.trim() && !reflection.trim()) {
            Alert.alert('Empty Entry', 'Please write at least one reflection.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('mindset_entries')
                .insert({
                    user_id: user?.id,
                    gratitude: gratitude.trim() || null,
                    intention: intention.trim() || null,
                    reflection: reflection.trim() || null,
                    entry_date: new Date().toISOString().split('T')[0],
                });

            if (error) throw error;

            if (user) {
                void fetchProfile(user.id);
            }

            Alert.alert("Reflected", "Your mindset has been recorded. Great work!");
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
                headerTitle: 'New Entry',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Gratitude Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="heart" size={18} color={colors.error} />
                            <Text style={[styles.labelText, { color: colors.error }]}>Gratitude</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('gratitude')}>
                            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.gratitude.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What are you grateful for?"
                        placeholderTextColor={colors.textTertiary}
                        value={gratitude}
                        onChangeText={setGratitude}
                    />
                </View>

                {/* Intention Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="compass" size={18} color={colors.progress} />
                            <Text style={[styles.labelText, { color: colors.progress }]}>Intention</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('intention')}>
                            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.intention.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What is your intention today?"
                        placeholderTextColor={colors.textTertiary}
                        value={intention}
                        onChangeText={setIntention}
                    />
                </View>

                {/* Reflection Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="bulb" size={18} color={colors.primary} />
                            <Text style={[styles.labelText, { color: colors.primary }]}>Reflection</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('reflection')}>
                            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.reflection.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What insights do you have?"
                        placeholderTextColor={colors.textTertiary}
                        value={reflection}
                        onChangeText={setReflection}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>Save Entry</Text>
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
        content: {
            padding: spacing.lg,
        },
        section: {
            marginBottom: spacing.xl,
        },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
        },
        sectionLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        labelText: {
            ...typography.label,
        },
        promptText: {
            ...typography.bodySmall,
            color: colors.textSecondary,
            fontStyle: 'italic',
            marginBottom: spacing.sm,
            lineHeight: 20,
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
