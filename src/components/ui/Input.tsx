import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
} from 'react-native';
import { theme } from '@/constants/theme';

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
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    error ? styles.inputError : null,
                    props.multiline ? styles.multiline : null,
                ]}
            >
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={theme.colors.textTertiary}
                    {...props}
                />
            </View>
            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : helperText ? (
                <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
        width: '100%',
    },
    label: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    inputContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 56,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    input: {
        ...theme.typography.body,
        color: theme.colors.text,
        width: '100%',
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    multiline: {
        height: 100,
        paddingTop: theme.spacing.sm,
        textAlignVertical: 'top',
    },
    errorText: {
        ...theme.typography.caption,
        color: theme.colors.error,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    helperText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
});
