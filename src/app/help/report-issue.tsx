import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
    { key: 'bug', label: 'Bug / Something Broken', icon: 'bug-outline' as const },
    { key: 'feature_request', label: 'Feature Request', icon: 'bulb-outline' as const },
    { key: 'account_issue', label: 'Account Issue', icon: 'person-outline' as const },
    { key: 'content_issue', label: 'Content Issue', icon: 'document-text-outline' as const },
    { key: 'other', label: 'Other', icon: 'chatbox-ellipses-outline' as const },
];

export default function ReportIssueScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit() {
        if (!category) {
            showAlert('Required', 'Please select a category.');
            return;
        }
        if (!subject.trim()) {
            showAlert('Required', 'Please enter a subject.');
            return;
        }
        if (!description.trim()) {
            showAlert('Required', 'Please describe the issue.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user?.id,
                    category,
                    subject: subject.trim(),
                    description: description.trim(),
                });

            if (error) throw error;

            showAlert(
                '✅ Ticket Submitted',
                'Thank you for reporting this. Our team will review your issue and get back to you.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Error submitting ticket:', error);
            showAlert('Error', 'Failed to submit your report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Report an Issue',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }}
            />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.infoBox}>
                    <Ionicons name="shield-checkmark" size={28} color={theme.colors.primary} />
                    <Text style={styles.infoTitle}>We're here to help</Text>
                    <Text style={styles.infoText}>
                        Describe the issue you're experiencing and we'll investigate it. 
                        Most issues are resolved within 24–48 hours.
                    </Text>
                </View>

                {/* Category Selector */}
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map(cat => {
                        const isActive = category === cat.key;
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                onPress={() => setCategory(cat.key)}
                            >
                                <Ionicons
                                    name={cat.icon}
                                    size={16}
                                    color={isActive ? '#FFF' : theme.colors.textSecondary}
                                />
                                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Subject */}
                <Text style={styles.sectionLabel}>Subject</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Brief summary of the issue"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={120}
                />

                {/* Description */}
                <Text style={styles.sectionLabel}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Please describe the issue in detail. Include steps to reproduce if it's a bug."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={2000}
                />
                <Text style={styles.charCount}>{description.length}/2000</Text>

                {/* Submit */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!category || !subject.trim() || !description.trim() || isSubmitting) && styles.disabledButton,
                    ]}
                    onPress={handleSubmit}
                    disabled={!category || !subject.trim() || !description.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color="#FFF" />
                            <Text style={styles.submitText}>Submit Report</Text>
                        </>
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
        paddingBottom: 60,
    },
    infoBox: {
        backgroundColor: 'rgba(0,187,255,0.06)',
        padding: theme.spacing.xl,
        borderRadius: theme.radius.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.12)',
    },
    infoTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginTop: theme.spacing.sm,
    },
    infoText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    sectionLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.lg,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        minHeight: 44,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    categoryTextActive: {
        color: '#FFF',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    textArea: {
        minHeight: 140,
        paddingTop: theme.spacing.md,
    },
    charCount: {
        color: theme.colors.textTertiary,
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
