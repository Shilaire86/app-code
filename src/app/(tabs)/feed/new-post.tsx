import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { createUserPost } from '@/services/feed';

type PostType = 'thread' | 'workout_share' | 'milestone_share';

const POST_TYPES: { key: PostType; label: string; icon: string; description: string }[] = [
    { key: 'thread',           label: 'Thread',   icon: 'chatbubbles-outline',  description: 'Share a thought or question' },
    { key: 'workout_share',    label: 'Workout',  icon: 'barbell-outline',      description: 'Share a workout' },
    { key: 'milestone_share',  label: 'Milestone', icon: 'trophy-outline',      description: 'Celebrate a win' },
];

const BANNED_PATTERNS = [
    /\b(hate|kys|kill\s*your\s*self|slur)\b/i,
];

function containsBannedContent(text: string): boolean {
    return BANNED_PATTERNS.some(p => p.test(text));
}

export default function NewPostScreen() {
    const theme = useTheme();
    const { colors, spacing, radius, typography } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();

    const [postType, setPostType] = useState<PostType>('thread');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const canSubmit = content.trim().length >= 10 && agreed && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit || !user?.id) return;

        const fullText = `${title} ${content}`;
        if (containsBannedContent(fullText)) {
            Alert.alert(
                'Post Blocked',
                'Your post contains content that violates our community guidelines. Please review and try again.',
            );
            return;
        }

        try {
            setSubmitting(true);
            await createUserPost(
                user.id,
                content.trim(),
                postType,
                title.trim() || undefined,
            );
            router.back();
        } catch (error) {
            console.error('[NewPost] Failed to create post:', error);
            Alert.alert('Error', 'Failed to share your post. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'New Post',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: '#FFF',
                headerRight: () => (
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={[styles.headerPost, !canSubmit && styles.headerPostDisabled]}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={styles.headerPostText}>Post</Text>
                        }
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                {/* Post type selector */}
                <View style={styles.typeRow}>
                    {POST_TYPES.map(pt => (
                        <TouchableOpacity
                            key={pt.key}
                            style={[styles.typeChip, postType === pt.key && styles.typeChipActive]}
                            onPress={() => setPostType(pt.key)}
                        >
                            <Ionicons
                                name={pt.icon as any}
                                size={14}
                                color={postType === pt.key ? '#FFF' : colors.textSecondary}
                            />
                            <Text style={[styles.typeChipText, postType === pt.key && styles.typeChipTextActive]}>
                                {pt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title (optional) */}
                <TextInput
                    style={styles.titleInput}
                    placeholder="Title (optional)"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={120}
                />

                {/* Body */}
                <TextInput
                    style={styles.bodyInput}
                    placeholder={
                        postType === 'workout_share'
                            ? "What did you train today? Sets, weights, how it felt..."
                            : postType === 'milestone_share'
                            ? "What milestone did you hit? How long did it take?"
                            : "What's on your mind? Share a thought, question, or update..."
                    }
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                />
                <Text style={styles.charCount}>{content.length}/1000</Text>

                {/* Guidelines acknowledgment */}
                <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(v => !v)}>
                    <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                        {agreed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                    <Text style={styles.agreeText}>
                        I agree to the{' '}
                        <Text style={styles.agreeLink} onPress={() => router.push('/legal/community')}>
                            Community Guidelines
                        </Text>
                        {' '}and confirm this post follows them.
                    </Text>
                </TouchableOpacity>

                {/* Guidelines reminder */}
                <View style={styles.guidelineBox}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={styles.guidelineText}>
                        Keep it respectful. No harassment, hate speech, spam, or off-topic content.
                        Posts that violate guidelines will be removed and may result in account review.
                    </Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = ({ colors, spacing, radius, typography }: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scroll: {
            padding: spacing.lg,
            paddingBottom: 60,
        },
        headerPost: {
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: radius.md,
            marginRight: 4,
        },
        headerPostDisabled: {
            opacity: 0.4,
        },
        headerPostText: {
            color: '#FFF',
            fontWeight: '800',
            fontSize: 14,
        },
        typeRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.lg,
        },
        typeChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.full ?? 99,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            backgroundColor: 'transparent',
        },
        typeChipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        typeChipText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        typeChipTextActive: {
            color: '#FFF',
        },
        titleInput: {
            color: '#FFF',
            fontSize: 22,
            fontWeight: '800',
            marginBottom: spacing.md,
            paddingBottom: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.07)',
        },
        bodyInput: {
            color: 'rgba(255,255,255,0.85)',
            fontSize: 16,
            lineHeight: 24,
            minHeight: 160,
        },
        charCount: {
            color: 'rgba(255,255,255,0.2)',
            fontSize: 11,
            textAlign: 'right',
            marginTop: spacing.sm,
            marginBottom: spacing.xl,
        },
        agreeRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: spacing.lg,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.25)',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 1,
        },
        checkboxChecked: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        agreeText: {
            flex: 1,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            lineHeight: 18,
        },
        agreeLink: {
            color: colors.primary,
            fontWeight: '700',
        },
        guidelineBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: `${colors.primary}12`,
            borderRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: `${colors.primary}25`,
        },
        guidelineText: {
            flex: 1,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12,
            lineHeight: 17,
        },
    });
