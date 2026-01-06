import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacityProps,
} from 'react-native';
import { theme } from '@/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const buttonStyles = [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${variant}`],
        styles[`textSize_${size}`],
        disabled && styles.textDisabled,
    ];

    return (
        <TouchableOpacity
            style={buttonStyles}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.text}
                />
            ) : (
                <Text style={textStyles}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    // Variants
    primary: {
        backgroundColor: theme.colors.primary,
    },
    secondary: {
        backgroundColor: theme.colors.surface,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    ghost: {
        backgroundColor: 'transparent',
    },

    // Sizes
    size_sm: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 36,
    },
    size_md: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 44,
    },
    size_lg: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        minHeight: 52,
    },

    fullWidth: {
        width: '100%',
    },

    disabled: {
        opacity: 0.5,
    },

    // Text styles
    text: {
        ...theme.typography.button,
        textAlign: 'center',
    },
    text_primary: {
        color: theme.colors.text,
    },
    text_secondary: {
        color: theme.colors.text,
    },
    text_outline: {
        color: theme.colors.text,
    },
    text_ghost: {
        color: theme.colors.primary,
    },

    textSize_sm: {
        fontSize: 14,
    },
    textSize_md: {
        fontSize: 16,
    },
    textSize_lg: {
        fontSize: 18,
    },

    textDisabled: {
        opacity: 1, // Opacity handled by container
    },
});
