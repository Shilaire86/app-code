import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Card — The Becoming Method design system v2
//
// Variants:
//   default   — surface bg, hairline border  (most dashboard cards)
//   elevated  — surfaceElevated bg, no border (modals, sheets)
//   accent    — surface bg + primary-tinted border  (CTA / featured cards)
//   ghost     — transparent bg, no border    (layout grouping without chrome)
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'accent' | 'ghost';
    /** Override padding. Defaults to spacing.lg (24). */
    padding?: number;
    style?: ViewStyle;
}

export function Card({
    children,
    variant = 'default',
    padding,
    style,
}: CardProps) {
    const { colors, spacing, radius } = useTheme();

    const pad = padding !== undefined ? padding : spacing.lg;

    const variantStyle = (() => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.surfaceElevated,
                    borderWidth:     0,
                    borderRadius:    radius.xl,
                };
            case 'accent':
                return {
                    backgroundColor: colors.surface,
                    borderWidth:     1,
                    borderColor:     colors.borderMid,
                    borderRadius:    radius.lg,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                    borderWidth:     0,
                    borderRadius:    radius.lg,
                };
            case 'default':
            default:
                return {
                    backgroundColor: colors.surface,
                    borderWidth:     1,
                    borderColor:     colors.border,
                    borderRadius:    radius.lg,
                };
        }
    })();

    return (
        <View
            style={[
                styles.card,
                variantStyle,
                { padding: pad },
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
    },
});
