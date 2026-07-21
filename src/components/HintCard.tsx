import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function HintCard({
    title,
    body,
    onDismiss,
    primaryCta,
    dismissLabel = 'Got it',
}: {
    title: string;
    body: string;
    onDismiss: () => void;
    primaryCta?: { label: string; onPress: () => void };
    dismissLabel?: string;
}) {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onDismiss} style={styles.dismissButton} accessibilityRole="button">
                    <Text style={styles.dismissText}>{dismissLabel}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.body}>{body}</Text>

            {!!primaryCta && (
                <TouchableOpacity
                    onPress={primaryCta.onPress}
                    style={styles.primaryButton}
                    accessibilityRole="button"
                >
                    <Text style={styles.primaryButtonText}>{primaryCta.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(0,187,255,0.20)',
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    dismissButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(0,0,0,0.14)',
        minHeight: 36,
        justifyContent: 'center',
    },
    dismissText: { color: theme.colors.primary, fontSize: 12, fontWeight: '900' },
    body: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18, marginTop: 8 },
    primaryButton: {
        marginTop: 12,
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    primaryButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
