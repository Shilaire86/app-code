import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacityProps,
    View,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Button — The Becoming Method design system v2
//
// Variants:  primary | secondary | outline | ghost | danger
// Sizes:     sm | md | lg
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
    /** Render an icon to the left of the label */
    leadingIcon?: React.ReactNode;
    /** Render an icon to the right of the label */
    trailingIcon?: React.ReactNode;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    style,
    leadingIcon,
    trailingIcon,
    ...props
}: ButtonProps) {
    const { colors, spacing, radius, typography } = useTheme();

    // ── Container ────────────────────────────────────────────────────────────
    const sizeStyles: Record<string, ViewStyle> = {
        sm: { paddingHorizontal: spacing.md,  paddingVertical: 9,   minHeight: 36, borderRadius: radius.md },
        md: { paddingHorizontal: spacing.lg,  paddingVertical: 13,  minHeight: 44, borderRadius: radius.md },
        lg: { paddingHorizontal: spacing.xl,  paddingVertical: 16,  minHeight: 52, borderRadius: radius.lg },
    };

    const variantContainerStyles: Record<string, ViewStyle> = {
        primary:   { backgroundColor: colors.primary },
        secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderMid },
        outline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderMid },
        ghost:     { backgroundColor: 'transparent' },
        danger:    { backgroundColor: colors.errorSoft, borderWidth: 1, borderColor: colors.error },
    };

    // ── Label ────────────────────────────────────────────────────────────────
    const sizeTypography: Record<string, TextStyle> = {
        sm: { ...(typography.buttonSm as TextStyle) },
        md: { ...(typography.button   as TextStyle) },
        lg: { ...(typography.button   as TextStyle), fontSize: 18 },
    };

    const variantTextColors: Record<string, TextStyle> = {
        primary:   { color: '#FFFFFF' },
        secondary: { color: colors.text },
        outline:   { color: colors.text },
        ghost:     { color: colors.primary },
        danger:    { color: colors.error },
    };

    const containerStyle: ViewStyle[] = [
        styles.base,
        sizeStyles[size],
        variantContainerStyles[variant],
        fullWidth ? styles.fullWidth : undefined,
        disabled || loading ? styles.disabled : undefined,
        style as ViewStyle,
    ].filter(Boolean) as ViewStyle[];

    const textStyle: TextStyle[] = [
        sizeTypography[size],
        variantTextColors[variant],
    ];

    const spinnerColor =
        variant === 'primary' ? '#FFFFFF' : colors.primary;

    return (
        <TouchableOpacity
            style={containerStyle}
            disabled={disabled || loading}
            activeOpacity={0.72}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={spinnerColor} size="small" />
            ) : (
                <View style={styles.inner}>
                    {leadingIcon && (
                        <View style={styles.iconLeft}>{leadingIcon}</View>
                    )}
                    <Text style={textStyle}>{title}</Text>
                    {trailingIcon && (
                        <View style={styles.iconRight}>{trailingIcon}</View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.45,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconLeft: {
        marginRight: 7,
    },
    iconRight: {
        marginLeft: 7,
    },
});
