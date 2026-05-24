import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Input — The Becoming Method design system v2
// ─────────────────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = ({
    label,
    error,
    helperText,
    style,
    ...props
}: InputProps) => {
    const { colors, spacing, radius, typography } = useTheme();

    return (
        <View style={[styles.container, { marginBottom: spacing.md }]}>
            {label && (
                <Text
                    style={[
                        typography.label,
                        {
                            color:        colors.textSecondary,
                            marginBottom: spacing.sm,
                        },
                    ]}
                >
                    {label}
                </Text>
            )}
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.surface,
                        borderRadius:    radius.md,
                        borderColor:     error ? colors.error : colors.borderMid,
                        paddingHorizontal: spacing.md,
                    },
                    props.multiline && {
                        height:     100,
                        paddingTop: spacing.sm,
                    },
                ]}
            >
                <TextInput
                    style={[
                        styles.input,
                        { ...typography.body, color: colors.text },
                        props.multiline && { textAlignVertical: 'top' },
                        style,
                    ]}
                    placeholderTextColor={colors.textTertiary}
                    {...props}
                />
            </View>
            {error ? (
                <Text
                    style={[
                        typography.caption,
                        {
                            color:      colors.error,
                            marginTop:  spacing.xs,
                            marginLeft: spacing.xs,
                        },
                    ]}
                >
                    {error}
                </Text>
            ) : helperText ? (
                <Text
                    style={[
                        typography.caption,
                        {
                            color:      colors.textSecondary,
                            marginTop:  spacing.xs,
                            marginLeft: spacing.xs,
                        },
                    ]}
                >
                    {helperText}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        borderWidth: 1,
        minHeight:   52,
        justifyContent: 'center',
    },
    input: {
        width: '100%',
    },
});
