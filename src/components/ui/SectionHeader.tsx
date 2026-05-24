import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — The Becoming Method design system v2
// Uses the new `label` typography token instead of ad-hoc inline styles.
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
    title: string;
    description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
    const { colors, spacing, typography } = useTheme();

    return (
        <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>
                {title}
            </Text>
            {description && (
                <Text
                    style={[
                        typography.caption,
                        { color: colors.textTertiary, marginTop: 3 },
                    ]}
                >
                    {description}
                </Text>
            )}
        </View>
    );
}
