import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { getTierLabel } from '@/lib/tier-gating';
import { SubscriptionTier } from '@/stores/profileStore';

export function UpgradePrompt({
    title,
    body,
    requiredTier,
    onUpgradePress,
    onLearnMorePress,
}: {
    title: string;
    body: string;
    requiredTier: SubscriptionTier;
    onUpgradePress: () => void;
    onLearnMorePress: () => void;
}) {
    const theme = useTheme();
    const styles = createStyles(theme);
    const tierLabel = getTierLabel(requiredTier);
    const upgradeLabel = `Upgrade to ${tierLabel}`;

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.iconWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.textWrap}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.body}>{body}</Text>
                    <Text style={styles.req}>Requires: {tierLabel}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onUpgradePress}>
                <Text style={styles.primaryText}>{upgradeLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLink} onPress={onLearnMorePress}>
                <Text style={styles.secondaryText}>Learn what you get</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: theme.spacing.lg,
    },
    row: { flexDirection: 'row', gap: 12 },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,187,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    textWrap: { flex: 1, gap: 6 },
    title: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    body: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
    req: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    primaryButton: {
        marginTop: 14,
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    primaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    secondaryLink: { marginTop: 10, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: theme.colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
});
