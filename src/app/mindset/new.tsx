import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getDailyPrompts, getRandomPrompt } from '@/constants/mindsetPrompts';

export default function NewMindsetScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [gratitude, setGratitude] = useState('');
    const [intention, setIntention] = useState('');
    const [reflection, setReflection] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prompts, setPrompts] = useState(() => getDailyPrompts());

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
                useProfileStore.getState().fetchProfile(user.id);
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
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Gratitude Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="heart" size={18} color="#FF6B6B" />
                            <Text style={[styles.labelText, { color: '#FF6B6B' }]}>Gratitude</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('gratitude')}>
                            <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.gratitude.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What are you grateful for?"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={gratitude}
                        onChangeText={setGratitude}
                    />
                </View>

                {/* Intention Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="compass" size={18} color="#4ECDC4" />
                            <Text style={[styles.labelText, { color: '#4ECDC4' }]}>Intention</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('intention')}>
                            <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.intention.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What is your intention today?"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={intention}
                        onChangeText={setIntention}
                    />
                </View>

                {/* Reflection Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLabel}>
                            <Ionicons name="bulb" size={18} color="#FFEAA7" />
                            <Text style={[styles.labelText, { color: '#FFEAA7' }]}>Reflection</Text>
                        </View>
                        <TouchableOpacity onPress={() => refreshPrompt('reflection')}>
                            <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{prompts.reflection.text}</Text>
                    <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={3}
                        placeholder="What insights do you have?"
                        placeholderTextColor="rgba(255,255,255,0.2)"
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    promptText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: theme.spacing.sm,
        lineHeight: 20,
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
