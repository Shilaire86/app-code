import React from 'react';
import { View, Platform, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// NeuCard — Neumorphic card primitive
//
// raised (default):
//   iOS  — two nested Views carrying opposite-direction shadows:
//             outer: white highlight, offset top-left (-3,-3)
//             inner: dark depth,      offset bottom-right (4,4)
//           Together they create the classic dual-shadow neumorphic pop.
//   Android — falls back to standard elevation (RN shadow API is iOS-only)
//
// inset:
//   A slightly darker/lighter bg to suggest a recessed surface (progress
//   tracks, input fields). No shadows needed.
//
// Usage:
//   <NeuCard style={{ padding: 16, gap: 12 }} onPress={handlePress}>
//     ...content...
//   </NeuCard>
//
//   // With outer layout constraints (flex, width, margin):
//   <NeuCard containerStyle={{ flex: 1 }} style={{ padding: 16 }}>
//     ...
//   </NeuCard>
// ─────────────────────────────────────────────────────────────────────────────

export interface NeuCardProps {
    children: React.ReactNode;
    variant?: 'raised' | 'inset';
    /** Border radius. Defaults to 20. */
    radius?: number;
    /** Inner content styles: padding, alignItems, gap, etc. */
    style?: StyleProp<ViewStyle>;
    /** Outer wrapper styles: flex, width, height, margin. */
    containerStyle?: StyleProp<ViewStyle>;
    onPress?: () => void;
    activeOpacity?: number;
}

export function NeuCard({
    children,
    variant = 'raised',
    radius: r = 20,
    style,
    containerStyle,
    onPress,
    activeOpacity = 0.82,
}: NeuCardProps) {
    const { colors, isDark } = useTheme();

    const bg = variant === 'inset'
        ? (colors as any).neuInset as string
        : colors.background;

    const inner = (
        <View style={[{ borderRadius: r, backgroundColor: bg, overflow: 'hidden' }, style]}>
            {children}
        </View>
    );

    // ── Inset variant — just a different bg, no shadows ─────────────────────
    if (variant === 'inset') {
        const wrap = (
            <View style={[containerStyle, { borderRadius: r }]}>
                {inner}
            </View>
        );
        return onPress
            ? <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>{wrap}</TouchableOpacity>
            : wrap;
    }

    // ── Android — elevation fallback ─────────────────────────────────────────
    if (Platform.OS !== 'ios') {
        const androidWrap = (
            <View style={[containerStyle, { borderRadius: r, backgroundColor: bg, elevation: 4 }]}>
                {inner}
            </View>
        );
        return onPress
            ? <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>{androidWrap}</TouchableOpacity>
            : androidWrap;
    }

    // ── iOS — two-layer dual shadow ──────────────────────────────────────────
    // The outer View holds the white highlight (top-left).
    // The inner View holds the dark depth shadow (bottom-right).
    // Both must have backgroundColor (transparent views don't cast shadows on iOS).
    // The overflow:'hidden' lives only on the innermost content view so it
    // clips children at the border radius without clipping the shadow layers.

    // Forge dark (#1C1C1E): charcoal base needs a touch more white highlight
    // and slightly softer dark shadow vs pure-black Volt.
    // Forge light (#EFE9E1): warm linen with prominent white highlight.
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

    const layered = (
        <View style={[containerStyle, lightShadow, { borderRadius: r, backgroundColor: bg }]}>
            <View style={[darkShadow, { borderRadius: r, backgroundColor: bg }]}>
                {inner}
            </View>
        </View>
    );

    return onPress
        ? <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>{layered}</TouchableOpacity>
        : layered;
}
