import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/themeStore';
import { darkColors, lightColors, spacing, radius, typography, shadows, animation } from '@/constants/theme';

/**
 * Returns the active color palette plus all design-system tokens.
 * Theme mode is persisted in themeStore (Zustand + AsyncStorage).
 *
 * Usage:
 *   const { colors, spacing, radius, typography, isDark } = useTheme();
 */
export function useTheme() {
    const themeMode   = useThemeStore((s) => s.themeMode);
    const systemScheme = useColorScheme();

    const isDark =
        themeMode === 'system'
            ? systemScheme === 'dark'
            : themeMode === 'dark';

    const colors = isDark ? darkColors : lightColors;

    return {
        isDark,
        colors,
        spacing,
        radius,
        typography,
        shadows,
        animation,
    };
}
