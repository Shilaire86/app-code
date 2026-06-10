import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface GuideBannerProps {
    title: string;
    body: string;
    onDismiss: () => void;
    primaryCta?: { label: string; onPress: () => void };
    dismissLabel?: string;
}

export function GuideBanner({
    title,
    body,
    onDismiss,
    primaryCta,
    dismissLabel = 'Got it',
}: GuideBannerProps) {
    const { colors, spacing, radius } = useTheme();

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary + '44',
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
            },
        ]}>
            <View style={styles.headerRow}>
                <View style={styles.titleRow}>
                    <Ionicons name="compass-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                </View>
                <TouchableOpacity
                    onPress={onDismiss}
                    style={[styles.dismissButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss tip"
                >
                    <Text style={[styles.dismissText, { color: colors.primary }]}>{dismissLabel}</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

            {!!primaryCta && (
                <TouchableOpacity
                    onPress={primaryCta.onPress}
                    style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                    accessibilityRole="button"
                >
                    <Text style={styles.primaryButtonText}>{primaryCta.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        flexShrink: 1,
    },
    dismissButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 32,
        justifyContent: 'center',
    },
    dismissText: {
        fontSize: 12,
        fontWeight: '800',
    },
    body: {
        fontSize: 13,
        lineHeight: 19,
    },
    primaryButton: {
        marginTop: 12,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
    },
});
