import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// StageBadge — The Becoming Method design system v2
//
// Displays the user's current Becoming Stage with correct color treatment
// in both dark and light mode. Each stage has a primary color and a soft
// background tint defined in the palette — no magic strings needed here.
//
// Stages:  initiate | practitioner | devoted | embodied
// Sizes:   sm | md (default)
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 'initiate' | 'practitioner' | 'devoted' | 'embodied';

const STAGE_LABELS: Record<Stage, string> = {
    initiate:     'Initiate',
    practitioner: 'Practitioner',
    devoted:      'Devoted',
    embodied:     'Embodied',
};

interface StageBadgeProps {
    stage: Stage | string;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}

export function StageBadge({ stage, size = 'md', style }: StageBadgeProps) {
    const { colors, radius } = useTheme();

    const key = (stage ?? 'initiate').toLowerCase() as Stage;
    const label = STAGE_LABELS[key] ?? stage;

    // Resolve colors from palette — each stage has `{stage}` and `{stage}Soft`
    const textColor = (colors as any)[key]       ?? colors.textSecondary;
    const bgColor   = (colors as any)[`${key}Soft`] ?? colors.surfaceElevated;

    const containerStyle: ViewStyle[] = [
        styles.base,
        { backgroundColor: bgColor, borderRadius: radius.full },
        size === 'sm' && styles.sizeSm,
        size === 'md' && styles.sizeMd,
        style,
    ].filter(Boolean) as ViewStyle[];

    const labelStyle: TextStyle[] = [
        styles.text,
        { color: textColor },
        size === 'sm' && styles.textSm,
        size === 'md' && styles.textMd,
    ].filter(Boolean) as TextStyle[];

    return (
        <View style={containerStyle}>
            <Text style={labelStyle}>{label.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizeSm: {
        paddingHorizontal: 8,
        paddingVertical:   2,
    },
    sizeMd: {
        paddingHorizontal: 10,
        paddingVertical:   4,
    },
    text: {
        fontFamily:    'Inter_600SemiBold',
        fontWeight:    '600',
        letterSpacing: 0.7,
    },
    textSm: {
        fontSize:   9,
        lineHeight: 14,
    },
    textMd: {
        fontSize:   10,
        lineHeight: 16,
    },
});
