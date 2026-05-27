import { View, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Card — The Becoming Method design system v3 (Neumorphic)
//
// Variants:
//   default   — neumorphic raised surface: dual shadow (iOS) / elevation (Android)
//               no borders, background = colors.background
//   elevated  — surfaceElevated bg, subtle drop shadow (modals / sheets)
//   accent    — same as default + bronze-tinted left border accent
//   ghost     — transparent bg, no border (layout grouping)
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'accent' | 'ghost';
    padding?: number;
    style?: ViewStyle;
}

export function Card({
    children,
    variant = 'default',
    padding,
    style,
}: CardProps) {
    const { colors, spacing, radius, isDark } = useTheme();
    const pad = padding !== undefined ? padding : spacing.lg;

    if (variant === 'ghost') {
        return (
            <View style={[styles.card, { backgroundColor: 'transparent', borderRadius: radius.xl, padding: pad }, style]}>
                {children}
            </View>
        );
    }

    if (variant === 'elevated') {
        return (
            <View style={[styles.card, {
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.xl,
                padding: pad,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
                elevation: 4,
            }, style]}>
                {children}
            </View>
        );
    }

    if (variant === 'accent') {
        // Neumorphic + bronze left accent bar
        return (
            <View style={[style, { borderRadius: radius.xl, overflow: 'hidden' }]}>
                <View style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    backgroundColor: colors.primary, zIndex: 1,
                }} />
                <Card variant="default" padding={pad} style={{ paddingLeft: pad + 3 }}>
                    {children}
                </Card>
            </View>
        );
    }

    // ── default: full neumorphic raised ─────────────────────────────────────
    const bg = colors.background;

    if (Platform.OS !== 'ios') {
        return (
            <View style={[style, styles.card, {
                backgroundColor: bg,
                borderRadius: radius.xl,
                padding: pad,
                elevation: 4,
            }]}>
                {children}
            </View>
        );
    }

    // Forge dark (#1C1C1E): charcoal base — white highlight slightly more visible
    // than pure-black Volt; dark shadow slightly softer since bg isn't pure black.
    // Forge light (#EFE9E1): warm linen — white highlight prominent, dark shadow soft.
    const lightShadow: ViewStyle = isDark ? {
        shadowColor:   '#FFFFFF',
        shadowOffset:  { width: -3, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius:  7,
    } : {
        shadowColor:   '#FFFFFF',
        shadowOffset:  { width: -4, height: -4 },
        shadowOpacity: 0.78,
        shadowRadius:  10,
    };

    const darkShadow: ViewStyle = isDark ? {
        shadowColor:   '#000000',
        shadowOffset:  { width: 5, height: 5 },
        shadowOpacity: 0.55,
        shadowRadius:  14,
    } : {
        shadowColor:   '#000000',
        shadowOffset:  { width: 5, height: 5 },
        shadowOpacity: 0.09,
        shadowRadius:  14,
    };

    return (
        <View style={[style, styles.card, lightShadow, { borderRadius: radius.xl, backgroundColor: bg }]}>
            <View style={[darkShadow, { borderRadius: radius.xl, backgroundColor: bg }]}>
                <View style={{ borderRadius: radius.xl, backgroundColor: bg, overflow: 'hidden', padding: pad }}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
    },
});
