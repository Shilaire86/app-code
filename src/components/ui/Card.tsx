import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';
import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
    return (
        <View style={[styles.card, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});
