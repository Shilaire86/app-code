import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface SectionHeaderProps {
    title: string;
    description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    title: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    description: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
});
